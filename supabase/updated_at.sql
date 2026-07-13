-- ────────────────────────────────────────────────────────────────────────────
--  Server-side защита от stale upsert-ов.
--
--  Проблема: два клиента редактируют одну сущность оффлайн; их outbox-очереди
--  отдают upsert-ы серверу в порядке восстановления сети. Без сравнения меток
--  побеждает тот, кто дошёл до сервера позже — а его данные могут быть старше.
--
--  Решение: у каждой таблицы есть колонка updated_at, клиент штампует её при
--  каждом изменении (см. attachSync в lib/cloud.js). BEFORE UPDATE-триггер
--  сравнивает NEW.updated_at с OLD.updated_at:
--   - если новый строго старше — RETURN NULL, update молча пропускается
--     (outbox считает операцию успешной, второй клиент дошлёт свежие данные);
--   - иначе NEW.updated_at принимается как есть.
--
--  Для INSERT триггер не срабатывает — новая запись всегда проходит.
--  Клиенты без метки (старая версия приложения) продолжают работать: если
--  NEW.updated_at IS NULL — пропускаем как обычно, ставим now() чтобы у записи
--  всегда была валидная метка.
--
--  Применить один раз в Supabase SQL Editor.
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Колонка updated_at во всех синхронизируемых таблицах.
--    Если колонка уже есть — ALTER молча пропустит (IF NOT EXISTS).
do $$
declare
  t text;
  tables text[] := array[
    'price_types', 'warehouses', 'cells', 'products',
    'customers', 'suppliers', 'employees', 'orders',
    'invoices', 'documents', 'movements', 'shifts', 'audit'
  ];
begin
  foreach t in array tables loop
    execute format(
      'alter table if exists public.%I add column if not exists updated_at timestamptz not null default now()',
      t
    );
    -- Индекс не критичен, но полезен для realtime и отладки.
    execute format(
      'create index if not exists %I on public.%I (updated_at desc)',
      t || '_updated_at_idx', t
    );
  end loop;
end $$;

-- 2. Триггер-функция. RETURN NULL в BEFORE UPDATE = отменить update без ошибки.
create or replace function public.enforce_updated_at()
returns trigger language plpgsql as $$
begin
  if new.updated_at is null then
    new.updated_at := greatest(old.updated_at + interval '1 microsecond', now());
    return new;
  end if;
  if new.updated_at < old.updated_at then
    -- Stale: клиент прислал более старую версию — молча игнорируем.
    -- Клиенту не отдаём ошибку: outbox не должен зациклиться. Свежие
    -- данные придут через realtime или следующий bootstrap.
    return null;
  end if;
  return new;
end $$;

-- 3. Навесить триггер на все таблицы. Пересоздание идемпотентно.
do $$
declare
  t text;
  tables text[] := array[
    'price_types', 'warehouses', 'cells', 'products',
    'customers', 'suppliers', 'employees', 'orders',
    'invoices', 'documents', 'movements', 'shifts', 'audit'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists enforce_updated_at on public.%I', t);
    execute format(
      'create trigger enforce_updated_at before update on public.%I ' ||
      'for each row execute function public.enforce_updated_at()',
      t
    );
  end loop;
end $$;

-- 4. Заполнить updated_at у существующих записей — иначе клиенты, читающие
--    свежий снапшот, получат NULL и merge всегда даст localWins.
do $$
declare
  t text;
  tables text[] := array[
    'price_types', 'warehouses', 'cells', 'products',
    'customers', 'suppliers', 'employees', 'orders',
    'invoices', 'documents', 'movements', 'shifts', 'audit'
  ];
begin
  foreach t in array tables loop
    execute format(
      'update public.%I set updated_at = now() where updated_at is null',
      t
    );
  end loop;
end $$;
