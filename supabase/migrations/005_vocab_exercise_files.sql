-- Lưu file bài tập 4 (vận dụng) gắn với topic từ vựng
create table if not exists public.vocab_exercise_files (
  id            uuid        primary key default gen_random_uuid(),
  topic_id      uuid        not null references public.vocab_topics(id) on delete cascade,
  teacher_id    uuid        not null references public.profiles(id) on delete cascade,
  title         text        not null,
  questions     jsonb       not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists vocab_exercise_files_topic_id_idx on public.vocab_exercise_files (topic_id);

comment on table public.vocab_exercise_files is
  'Bài tập vận dụng (bài 4) gắn với chủ đề từ vựng. Parse từ .docx bằng Mammoth, không qua AI.';
