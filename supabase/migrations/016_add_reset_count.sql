-- 016_add_reset_count.sql
-- Thêm cột theo dõi số lần học sinh bị reset khi ra khỏi tab lúc làm bài

alter table public.assignment_attempts
  add column if not exists reset_count integer not null default 0;

comment on column public.assignment_attempts.reset_count is
  'Số lần học sinh bị reset bài do ra khỏi tab/app quá 5 lần trong một lần làm bài.';