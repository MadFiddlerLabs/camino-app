-- Copied from scripts/sql/api-counters.sql (applied to production 2026-07-04).
create table if not exists public.api_counters (
  bucket text primary key,
  count integer not null default 0,
  expires_at timestamptz not null
);

alter table public.api_counters enable row level security;
revoke all on table public.api_counters from anon, authenticated;

create or replace function public.bump_counter(p_bucket text, p_window_seconds integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into api_counters as c (bucket, count, expires_at)
  values (p_bucket, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (bucket) do update
    set count = case when c.expires_at < now() then 1 else c.count + 1 end,
        expires_at = case when c.expires_at < now()
                          then now() + make_interval(secs => p_window_seconds)
                          else c.expires_at end
  returning c.count into v_count;

  -- Opportunistic GC: ~1% of calls sweep buckets whose window closed over a day ago.
  if random() < 0.01 then
    delete from api_counters where expires_at < now() - interval '1 day';
  end if;

  return v_count;
end
$$;

revoke execute on function public.bump_counter(text, integer) from public, anon, authenticated;
grant execute on function public.bump_counter(text, integer) to service_role;
