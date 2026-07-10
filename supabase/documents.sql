-- ── Документы склада (приход / расход / инвентаризация / перемещение / списание) ─
-- Мобильное приложение хранит документы локально и синхронизирует их в облако.
-- Пока таблицы нет — код это переживает (документы работают только локально),
-- после применения этого SQL документы начнут синхронизироваться между устройствами.
-- Схема выведена из структуры объекта документа в store/useStore.js (createDocument).
-- Запустите в Supabase → SQL Editor → Run. Идемпотентно.

create table if not exists public.documents (
  id                text primary key,                    -- uid('d…') — строковый id, не uuid
  company_id        uuid not null references public.companies(id) on delete cascade,
  no                text,                                 -- номер документа (ПР-2026-0007)
  type              text,                                 -- тип: приход/расход/инвентаризация/…
  status            text default 'draft',                 -- draft | posted | cancelled
  items             jsonb default '[]'::jsonb,            -- позиции документа
  to_warehouse_id   text,                                 -- склад назначения (для перемещений)
  reason            text,
  note              text,
  total_qty         numeric default 0,
  by                text,                                 -- кто создал (authUserId)
  created_at        timestamptz default now(),
  posted_at         timestamptz,
  cancelled_at      timestamptz
);

alter table public.documents enable row level security;

-- Документы видны и редактируются только внутри своей компании
-- (auth_company_id() — та же helper-функция, что и у остальных таблиц проекта).
drop policy if exists "documents_company" on public.documents;
create policy "documents_company" on public.documents
  for all to authenticated
  using (company_id = auth_company_id())
  with check (company_id = auth_company_id());

create index if not exists idx_documents_company on public.documents(company_id);

-- Готово.
