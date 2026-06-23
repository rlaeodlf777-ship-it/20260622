-- Supabase SQL Editor에서 실행하세요.
-- Table Editor → lotto_draws

create table if not exists public.lotto_draws (
  id uuid primary key default gen_random_uuid(),
  numbers integer[] not null,
  source text not null default 'random' check (source in ('random', 'saju')),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lotto_draws_created_at_idx on public.lotto_draws (created_at desc);

alter table public.lotto_draws enable row level security;

-- 서버(service role)에서만 쓰는 경우 anon 정책은 생략 가능.
-- 클라이언트에서 직접 읽기가 필요하면 아래 정책을 추가하세요.
-- create policy "Allow public read" on public.lotto_draws for select using (true);
