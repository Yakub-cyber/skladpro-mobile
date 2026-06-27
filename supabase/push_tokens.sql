-- ── Токены устройств для push (этап 2, Firebase/FCM) ─────────────────────────
-- Мобильное приложение сохраняет сюда FCM-токен устройства. Edge Function
-- send-push берёт токены и шлёт уведомления через FCM, когда приложение закрыто.
-- Запустите в Supabase → SQL Editor → Run.

create table if not exists public.push_tokens (
  token       text primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  company_id  uuid references public.companies(id) on delete cascade,
  platform    text default 'android',
  updated_at  timestamptz default now()
);

alter table public.push_tokens enable row level security;

-- Каждый пользователь управляет только своими токенами
drop policy if exists "push_tokens_own" on public.push_tokens;
create policy "push_tokens_own" on public.push_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists idx_push_tokens_user on public.push_tokens(user_id);
create index if not exists idx_push_tokens_company on public.push_tokens(company_id);

-- Готово.
