-- 017_streak_activity_log_and_upload_id_text.sql
-- 1. Bảng log ngày hoạt động cho streak (giáo viên xem/khôi phục)

create table if not exists public.streak_activity_log (
  id            bigserial primary key,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  activity_date date not null,
  source        text default 'system',  -- 'system' | 'manual_teacher'
  created_at    timestamptz default now(),
  unique(student_id, activity_date)
);

create index if not exists streak_activity_log_student_date_idx
  on public.streak_activity_log(student_id, activity_date);

alter table public.streak_activity_log disable row level security;

-- 2. Đổi upload_id sang TEXT để chứa giá trị đặc biệt '__ALL__'
--    (cần drop FK trước vì cột đang là UUID có ràng buộc khóa ngoại)

do $$
declare
  c record;
begin
  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.vocab_topic_assignments'::regclass
      and contype = 'f'
      and conkey = array[(select attnum from pg_attribute where attrelid = 'public.vocab_topic_assignments'::regclass and attname = 'upload_id')]
  loop
    execute format('alter table public.vocab_topic_assignments drop constraint %I', c.conname);
  end loop;

  for c in
    select conname
    from pg_constraint
    where conrelid = 'public.vocab_topic_ex4_assignments'::regclass
      and contype = 'f'
      and conkey = array[(select attnum from pg_attribute where attrelid = 'public.vocab_topic_ex4_assignments'::regclass and attname = 'upload_id')]
  loop
    execute format('alter table public.vocab_topic_ex4_assignments drop constraint %I', c.conname);
  end loop;
end;
$$;

alter table public.vocab_topic_assignments
  alter column upload_id type text;

alter table public.vocab_topic_ex4_assignments
  alter column upload_id type text;