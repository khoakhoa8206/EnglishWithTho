-- ============================================================
-- MOCHI STUDY — FRESH SCHEMA (Name-Only Mode)
-- File: supabase/migrations/001_fresh_schema.sql
--
-- ⚠️  DÙNG FILE NÀY ĐỂ TẠO DATABASE MỚI HOÀN TOÀN
--     Chạy toàn bộ file này trên Supabase SQL Editor
--     hoặc dùng Supabase CLI: supabase db reset
--
-- ĐẶC ĐIỂM:
--   - KHÔNG dùng auth.users / Supabase Auth
--   - KHÔNG có email / password trong bất kỳ bảng nào
--   - profiles.id tự sinh UUID (gen_random_uuid())
--   - Đăng nhập chỉ bằng full_name
--   - RLS disabled (name-only mode không có server-side identity)
--   - Tất cả authorization xử lý ở service layer / frontend
-- ============================================================


-- ============================================================
-- BƯỚC 0: DỌN DẸP NẾU CÓ BẢNG CŨ (an toàn khi chạy fresh)
-- ============================================================

drop function if exists public.update_streak(uuid, date) cascade;
drop function if exists public.is_teacher() cascade;
drop function if exists public.find_profile_by_name(text) cascade;
drop function if exists public.submit_attempt(uuid, uuid, jsonb, timestamptz, timestamptz) cascade;
drop function if exists public.get_leaderboard(uuid) cascade;
drop function if exists public.get_student_summary(uuid) cascade;
drop function if exists public.generate_tuition_months(uuid) cascade;

drop table if exists public.student_progress cascade;
drop table if exists public.assignment_answers cascade;
drop table if exists public.assignment_attempts cascade;
drop table if exists public.assignment_questions cascade;
drop table if exists public.assignments cascade;
drop table if exists public.documents cascade;
drop table if exists public.tuition_records cascade;
drop table if exists public.streaks cascade;
drop table if exists public.listening_materials cascade;
drop table if exists public.grammar_questions cascade;
drop table if exists public.grammar_topics cascade;
drop table if exists public.vocabularies cascade;
drop table if exists public.vocab_topics cascade;
drop table if exists public.class_students cascade;
drop table if exists public.classes cascade;
drop table if exists public.profiles cascade;


-- ============================================================
-- 1. PROFILES
-- ============================================================
-- Không tham chiếu auth.users.
-- full_name là định danh đăng nhập (case-insensitive unique).
-- ============================================================

create table public.profiles (
  id           uuid        primary key default gen_random_uuid(),
  role         text        not null check (role in ('teacher', 'student')),
  full_name    text        not null,
  start_date   date,
  monthly_fee  integer,
  created_at   timestamptz not null default now()
);

-- UNIQUE case-insensitive cho full_name (đây là khóa đăng nhập)
create unique index profiles_full_name_unique
  on public.profiles (lower(trim(full_name)));

-- Index tìm kiếm nhanh theo tên
create index profiles_full_name_search
  on public.profiles using gin (to_tsvector('simple', full_name));

comment on table public.profiles is
  'Người dùng hệ thống. Không liên kết auth.users. Đăng nhập bằng full_name.';
comment on column public.profiles.full_name is
  'Tên đăng nhập. Unique case-insensitive. Không được trùng.';
comment on column public.profiles.monthly_fee is
  'Học phí hàng tháng (VND). Chỉ áp dụng với role=student.';


-- ============================================================
-- 2. CLASSES
-- ============================================================

create table public.classes (
  id         uuid        primary key default gen_random_uuid(),
  teacher_id uuid        not null references public.profiles(id) on delete cascade,
  name       text        not null,
  created_at timestamptz not null default now()
);

create index classes_teacher_id_idx on public.classes (teacher_id);

comment on table public.classes is 'Lớp học do teacher quản lý.';


-- ============================================================
-- 3. CLASS_STUDENTS  (nhiều-nhiều: class ↔ student)
-- ============================================================

create table public.class_students (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id)  on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),

  unique (class_id, student_id)
);

create index class_students_class_id_idx   on public.class_students (class_id);
create index class_students_student_id_idx on public.class_students (student_id);

comment on table public.class_students is 'Học sinh thuộc lớp nào.';


-- ============================================================
-- 4. VOCAB_TOPICS
-- ============================================================

create table public.vocab_topics (
  id         uuid        primary key default gen_random_uuid(),
  teacher_id uuid        not null references public.profiles(id) on delete cascade,
  name       text        not null,
  created_at timestamptz not null default now()
);

create index vocab_topics_teacher_id_idx on public.vocab_topics (teacher_id);

comment on table public.vocab_topics is 'Chủ đề từ vựng do teacher tạo.';


-- ============================================================
-- 5. VOCABULARIES
-- ============================================================

create table public.vocabularies (
  id             uuid        primary key default gen_random_uuid(),
  topic_id       uuid        not null references public.vocab_topics(id) on delete cascade,
  word           text        not null,
  part_of_speech text,       -- noun/verb/adjective/adverb/phrase/phrasal verb/...
  ipa            text,
  meaning_vi     text        not null,
  example        text,
  source_context text,
  audio_url      text,       -- Supabase Storage path (optional TTS)
  sort_order     integer     not null default 0,
  created_at     timestamptz not null default now()
);

-- Expression unique index phải tách riêng (không dùng được trong CREATE TABLE)
create unique index vocabularies_word_unique_per_topic
  on public.vocabularies (topic_id, lower(trim(word)));

create index vocabularies_topic_id_idx on public.vocabularies (topic_id);

comment on table public.vocabularies is
  'Từ vựng trong từng chủ đề. Unique per topic (case-insensitive).';


-- ============================================================
-- 6. GRAMMAR_TOPICS
-- ============================================================

create table public.grammar_topics (
  id          uuid        primary key default gen_random_uuid(),
  teacher_id  uuid        not null references public.profiles(id) on delete cascade,
  name        text        not null,
  structure   text,        -- Cấu trúc ngữ pháp
  explanation text,        -- Giải thích
  examples    text,        -- Ví dụ (có thể là markdown/text)
  published   boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index grammar_topics_teacher_id_idx on public.grammar_topics (teacher_id);

comment on table public.grammar_topics is
  'Chủ đề ngữ pháp. Teacher review trước khi publish.';


-- ============================================================
-- 7. GRAMMAR_QUESTIONS  (ngân hàng câu hỏi ngữ pháp)
-- ============================================================

create table public.grammar_questions (
  id         uuid        primary key default gen_random_uuid(),
  topic_id   uuid        not null references public.grammar_topics(id) on delete cascade,
  question   text        not null,
  options    jsonb,       -- ["A","B","C","D"] cho trắc nghiệm
  correct    text        not null,
  question_type text     not null default 'multiple_choice' check (
                           question_type in ('multiple_choice', 'fill_in_blank', 'dictation')
                         ),
  difficulty text        not null check (
                           difficulty in ('nhan_biet', 'van_dung', 'van_dung_cao')
                         ),
  created_at timestamptz not null default now()
);

create index grammar_questions_topic_id_idx      on public.grammar_questions (topic_id);
create index grammar_questions_difficulty_idx    on public.grammar_questions (difficulty);

comment on table public.grammar_questions is
  'Câu hỏi ngữ pháp phân theo độ khó. Dùng để tạo assignment.';


-- ============================================================
-- 8. LISTENING_MATERIALS
-- ============================================================

create table public.listening_materials (
  id         uuid        primary key default gen_random_uuid(),
  teacher_id uuid        not null references public.profiles(id) on delete cascade,
  title      text        not null,
  audio_url  text,        -- Supabase Storage path
  script     text,        -- Script đầy đủ (AI dùng để tạo câu hỏi)
  created_at timestamptz not null default now()
);

create index listening_materials_teacher_id_idx on public.listening_materials (teacher_id);

comment on table public.listening_materials is
  'Tài liệu nghe. AI phân tích script để tạo câu hỏi, không phân tích audio.';


-- ============================================================
-- 9. ASSIGNMENTS
-- ============================================================

create table public.assignments (
  id              uuid        primary key default gen_random_uuid(),
  teacher_id      uuid        not null references public.profiles(id) on delete cascade,
  class_id        uuid        not null references public.classes(id)   on delete cascade,
  title           text        not null,

  assignment_type text        not null check (
                                assignment_type in (
                                  'vocabulary',
                                  'grammar',
                                  'listening',
                                  'review'
                                )
                              ),

  -- Nguồn dữ liệu (optional links)
  vocab_topic_id       uuid references public.vocab_topics(id)      on delete set null,
  grammar_topic_id     uuid references public.grammar_topics(id)    on delete set null,
  listening_material_id uuid references public.listening_materials(id) on delete set null,

  deadline        timestamptz,
  created_at      timestamptz not null default now()
);

create index assignments_teacher_id_idx  on public.assignments (teacher_id);
create index assignments_class_id_idx    on public.assignments (class_id);
create index assignments_type_idx        on public.assignments (assignment_type);
create index assignments_deadline_idx    on public.assignments (deadline);

comment on table public.assignments is
  'Bài tập được giao cho lớp. Một assignment thuộc một lớp và một loại.';


-- ============================================================
-- 10. ASSIGNMENT_QUESTIONS
-- ============================================================

create table public.assignment_questions (
  id            uuid    primary key default gen_random_uuid(),
  assignment_id uuid    not null references public.assignments(id) on delete cascade,

  question      text    not null,
  options       jsonb,  -- trắc nghiệm: ["A","B","C","D"]
  correct       text    not null,

  question_type text    not null check (
                          question_type in (
                            'multiple_choice',  -- trắc nghiệm
                            'fill_in_blank',    -- điền vào chỗ trống
                            'dictation',        -- chính tả (listening)
                            'matching'          -- ghép đôi (vocab part 2)
                          )
                        ),

  difficulty    text    check (difficulty in ('nhan_biet', 'van_dung', 'van_dung_cao')),
  sort_order    integer not null default 0,

  -- Metadata bổ sung (optional)
  hint          text,   -- gợi ý (không dùng trong thi)
  explanation   text    -- giải thích đáp án (hiển thị sau khi nộp)
);

create index assignment_questions_assignment_id_idx on public.assignment_questions (assignment_id);
create index assignment_questions_sort_order_idx    on public.assignment_questions (assignment_id, sort_order);

comment on table public.assignment_questions is
  'Câu hỏi trong assignment. Có thể là trắc nghiệm, điền vào chỗ trống, dictation, ghép đôi.';


-- ============================================================
-- 11. ASSIGNMENT_ATTEMPTS
-- ============================================================
-- Chỉ tạo khi student nhấn "Hoàn thành bài tập"
-- Thoát trang / refresh KHÔNG tạo attempt
-- ============================================================

create table public.assignment_attempts (
  id              uuid        primary key default gen_random_uuid(),
  assignment_id   uuid        not null references public.assignments(id) on delete cascade,
  student_id      uuid        not null references public.profiles(id)   on delete cascade,

  attempt_number  integer     not null default 1,

  score           numeric(5,2),     -- 0.00 – 100.00
  correct_count   integer     not null default 0,
  wrong_count     integer     not null default 0,
  total_questions integer     not null default 0,

  started_at      timestamptz,
  completed_at    timestamptz not null default now(),
  duration_seconds integer,

  passed          boolean     not null default false  -- score >= 80

);

create index assignment_attempts_assignment_id_idx on public.assignment_attempts (assignment_id);
create index assignment_attempts_student_id_idx    on public.assignment_attempts (student_id);
create index assignment_attempts_completed_at_idx  on public.assignment_attempts (completed_at);

-- Auto-số thứ tự attempt
create or replace function public.set_attempt_number()
returns trigger
language plpgsql
as $$
begin
  select coalesce(max(attempt_number), 0) + 1
  into new.attempt_number
  from public.assignment_attempts
  where assignment_id = new.assignment_id
    and student_id    = new.student_id;
  return new;
end;
$$;

create trigger trg_set_attempt_number
  before insert on public.assignment_attempts
  for each row execute function public.set_attempt_number();

comment on table public.assignment_attempts is
  'Lịch sử nộp bài. Chỉ tạo khi student nhấn Hoàn thành. Không tạo khi thoát giữa chừng.';


-- ============================================================
-- 12. ASSIGNMENT_ANSWERS
-- ============================================================

create table public.assignment_answers (
  id             uuid    primary key default gen_random_uuid(),
  attempt_id     uuid    not null references public.assignment_attempts(id) on delete cascade,
  question_id    uuid    not null references public.assignment_questions(id) on delete cascade,
  student_answer text,
  is_correct     boolean not null default false,

  unique (attempt_id, question_id)
);

create index assignment_answers_attempt_id_idx  on public.assignment_answers (attempt_id);
create index assignment_answers_question_id_idx on public.assignment_answers (question_id);

comment on table public.assignment_answers is
  'Câu trả lời từng câu hỏi trong một lần nộp bài.';


-- ============================================================
-- 13. STREAKS
-- ============================================================

create table public.streaks (
  id               uuid    primary key default gen_random_uuid(),
  student_id       uuid    not null unique references public.profiles(id) on delete cascade,
  current_streak   integer not null default 0,
  longest_streak   integer not null default 0,
  last_active_date date,
  created_at       timestamptz not null default now()
);

comment on table public.streaks is
  'Chuỗi học tập liên tiếp. Reset về 0 nếu bỏ một ngày.';


-- ============================================================
-- 14. TUITION_RECORDS
-- ============================================================

create table public.tuition_records (
  id         uuid        primary key default gen_random_uuid(),
  student_id uuid        not null references public.profiles(id) on delete cascade,
  month      date        not null,   -- Luôn là ngày 01 của tháng (yyyy-mm-01)
  paid       boolean     not null default false,
  paid_at    timestamptz,
  amount     integer,                -- Lấy từ profiles.monthly_fee tại thời điểm tạo
  note       text,
  created_at timestamptz not null default now(),

  unique (student_id, month)
);

create index tuition_records_student_id_idx on public.tuition_records (student_id);
create index tuition_records_month_idx      on public.tuition_records (month);

comment on table public.tuition_records is
  'Học phí theo tháng. month luôn là ngày 01 (ví dụ: 2026-01-01).';


-- ============================================================
-- 15. DOCUMENTS
-- ============================================================

create table public.documents (
  id         uuid        primary key default gen_random_uuid(),
  teacher_id uuid        not null references public.profiles(id) on delete cascade,
  class_id   uuid        references public.classes(id) on delete set null, -- null = tài liệu chung
  title      text        not null,
  file_url   text        not null,  -- Supabase Storage path
  file_type  text,                   -- 'pdf' | 'docx' | ...
  file_size  bigint,                 -- bytes
  created_at timestamptz not null default now()
);

create index documents_teacher_id_idx on public.documents (teacher_id);
create index documents_class_id_idx   on public.documents (class_id);

comment on table public.documents is
  'Tài liệu PDF/Word upload bởi teacher. class_id null = tài liệu chung cho mọi lớp.';


-- ============================================================
-- 16. STUDENT_PROGRESS  (trạng thái làm bài theo assignment)
-- ============================================================
-- Dùng để lưu draft progress (tạm thời) khi học đang làm dở
-- Xóa khi student hoàn thành (attempt được tạo)
-- ============================================================

create table public.student_progress (
  id            uuid        primary key default gen_random_uuid(),
  student_id    uuid        not null references public.profiles(id) on delete cascade,
  assignment_id uuid        not null references public.assignments(id) on delete cascade,
  started_at    timestamptz not null default now(),
  draft_data    jsonb,      -- progress tạm thời, không phải điểm chính thức
  updated_at    timestamptz not null default now(),

  unique (student_id, assignment_id)
);

create index student_progress_student_id_idx    on public.student_progress (student_id);
create index student_progress_assignment_id_idx on public.student_progress (assignment_id);

comment on table public.student_progress is
  'Tiến trình làm bài tạm thời. Không tính điểm. Xóa sau khi nộp bài.';


-- ============================================================
-- STORED FUNCTIONS & PROCEDURES
-- ============================================================


-- ------------------------------------------------------------
-- F1. find_profile_by_name(name text)
-- Dùng cho login: tìm profile theo tên (case-insensitive)
-- ------------------------------------------------------------

create or replace function public.find_profile_by_name(p_name text)
returns table (
  id         uuid,
  role       text,
  full_name  text,
  start_date date,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select id, role, full_name, start_date, created_at
  from public.profiles
  where lower(trim(full_name)) = lower(trim(p_name))
  limit 1;
$$;

comment on function public.find_profile_by_name is
  'Tìm profile theo tên (case-insensitive). Dùng cho name-only login.';


-- ------------------------------------------------------------
-- F2. update_streak(student_id, date)
-- Gọi sau mỗi lần student nhấn "Hoàn thành"
-- ------------------------------------------------------------

create or replace function public.update_streak(
  p_student_id uuid,
  p_date       date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last  date;
  v_cur   integer;
  v_long  integer;
  v_result jsonb;
begin
  select last_active_date, current_streak, longest_streak
  into   v_last, v_cur, v_long
  from   public.streaks
  where  student_id = p_student_id;

  -- Chưa có streak → tạo mới
  if not found then
    insert into public.streaks (student_id, current_streak, longest_streak, last_active_date)
    values (p_student_id, 1, 1, p_date);

    return jsonb_build_object(
      'current_streak', 1,
      'longest_streak', 1,
      'last_active_date', p_date,
      'action', 'created'
    );
  end if;

  -- Đã hoạt động hôm nay → không thay đổi
  if v_last = p_date then
    return jsonb_build_object(
      'current_streak', v_cur,
      'longest_streak', v_long,
      'last_active_date', v_last,
      'action', 'already_active_today'
    );
  end if;

  -- Hôm qua có hoạt động → streak tăng
  if v_last = p_date - interval '1 day' then
    v_cur := v_cur + 1;
  else
    -- Bỏ ít nhất 1 ngày → reset
    v_cur := 1;
  end if;

  v_long := greatest(v_long, v_cur);

  update public.streaks
  set current_streak   = v_cur,
      longest_streak   = v_long,
      last_active_date = p_date
  where student_id = p_student_id;

  return jsonb_build_object(
    'current_streak', v_cur,
    'longest_streak', v_long,
    'last_active_date', p_date,
    'action', case when v_cur = 1 then 'reset' else 'incremented' end
  );
end;
$$;

comment on function public.update_streak is
  'Cập nhật streak sau khi student hoàn thành bài. Trả về jsonb với current_streak.';


-- ------------------------------------------------------------
-- F3. submit_attempt(...)
-- Hàm trung tâm: nhận answers từ client, tính điểm server-side,
-- tạo attempt + answers, cập nhật streak, xóa draft progress
-- ------------------------------------------------------------

create or replace function public.submit_attempt(
  p_assignment_id  uuid,
  p_student_id     uuid,
  p_answers        jsonb,  -- [{"question_id": "...", "student_answer": "..."}]
  p_started_at     timestamptz,
  p_completed_at   timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt_id     uuid;
  v_total          integer := 0;
  v_correct        integer := 0;
  v_wrong          integer := 0;
  v_score          numeric(5,2);
  v_passed         boolean;
  v_duration       integer;
  v_ans            jsonb;
  v_question_id    uuid;
  v_student_answer text;
  v_correct_answer text;
  v_is_correct     boolean;
  v_question_type  text;
  v_streak_result  jsonb;
begin

  -- Validate: assignment tồn tại
  if not exists (select 1 from public.assignments where id = p_assignment_id) then
    raise exception 'Assignment không tồn tại: %', p_assignment_id;
  end if;

  -- Validate: student tồn tại và có role student
  if not exists (
    select 1 from public.profiles
    where id = p_student_id and role = 'student'
  ) then
    raise exception 'Student không tồn tại: %', p_student_id;
  end if;

  -- Validate: student thuộc lớp của assignment này
  if not exists (
    select 1
    from public.assignments a
    join public.class_students cs on cs.class_id = a.class_id
    where a.id = p_assignment_id
      and cs.student_id = p_student_id
  ) then
    raise exception 'Student không thuộc lớp của assignment này.';
  end if;

  -- Tính thời gian làm bài
  v_duration := extract(epoch from (p_completed_at - p_started_at))::integer;

  -- Tính điểm server-side (không tin client)
  for v_ans in select * from jsonb_array_elements(p_answers)
  loop
    v_question_id    := (v_ans->>'question_id')::uuid;
    v_student_answer := v_ans->>'student_answer';

    select correct, question_type
    into   v_correct_answer, v_question_type
    from   public.assignment_questions
    where  id = v_question_id
      and  assignment_id = p_assignment_id;

    if not found then
      continue; -- bỏ qua câu hỏi không hợp lệ
    end if;

    v_total := v_total + 1;

    -- So sánh đáp án (case-insensitive, trim)
    v_is_correct := lower(trim(v_student_answer)) = lower(trim(v_correct_answer));

    if v_is_correct then
      v_correct := v_correct + 1;
    else
      v_wrong := v_wrong + 1;
    end if;

  end loop;

  -- Tránh chia 0
  if v_total = 0 then
    v_score  := 0;
    v_passed := false;
  else
    v_score  := round((v_correct::numeric / v_total::numeric) * 100, 2);
    v_passed := v_score >= 80;
  end if;

  -- Tạo attempt
  insert into public.assignment_attempts (
    assignment_id, student_id,
    score, correct_count, wrong_count, total_questions,
    started_at, completed_at, duration_seconds, passed
  )
  values (
    p_assignment_id, p_student_id,
    v_score, v_correct, v_wrong, v_total,
    p_started_at, p_completed_at, v_duration, v_passed
  )
  returning id into v_attempt_id;

  -- Lưu từng câu trả lời
  for v_ans in select * from jsonb_array_elements(p_answers)
  loop
    v_question_id    := (v_ans->>'question_id')::uuid;
    v_student_answer := v_ans->>'student_answer';

    select correct into v_correct_answer
    from   public.assignment_questions
    where  id = v_question_id and assignment_id = p_assignment_id;

    if found then
      v_is_correct := lower(trim(v_student_answer)) = lower(trim(v_correct_answer));

      insert into public.assignment_answers (
        attempt_id, question_id, student_answer, is_correct
      )
      values (
        v_attempt_id, v_question_id, v_student_answer, v_is_correct
      )
      on conflict (attempt_id, question_id) do update
        set student_answer = excluded.student_answer,
            is_correct     = excluded.is_correct;
    end if;
  end loop;

  -- Cập nhật streak
  v_streak_result := public.update_streak(p_student_id, current_date);

  -- Xóa draft progress
  delete from public.student_progress
  where student_id    = p_student_id
    and assignment_id = p_assignment_id;

  return jsonb_build_object(
    'attempt_id',       v_attempt_id,
    'score',            v_score,
    'correct_count',    v_correct,
    'wrong_count',      v_wrong,
    'total_questions',  v_total,
    'passed',           v_passed,
    'duration_seconds', v_duration,
    'streak',           v_streak_result
  );

end;
$$;

comment on function public.submit_attempt is
  'Nộp bài: tính điểm server-side, tạo attempt + answers, update streak, xóa draft. KHÔNG tin score từ client.';


-- ------------------------------------------------------------
-- F4. get_leaderboard(assignment_id)
-- Xếp hạng: đúng nhiều nhất, nhanh nhất (chỉ passed)
-- ------------------------------------------------------------

create or replace function public.get_leaderboard(p_assignment_id uuid)
returns table (
  rank             bigint,
  student_id       uuid,
  student_name     text,
  correct_count    integer,
  duration_seconds integer,
  completed_at     timestamptz,
  attempt_number   integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    row_number() over (
      order by aa.correct_count desc, aa.duration_seconds asc
    )                   as rank,
    aa.student_id,
    p.full_name         as student_name,
    aa.correct_count,
    aa.duration_seconds,
    aa.completed_at,
    aa.attempt_number
  from public.assignment_attempts aa
  join public.profiles p on p.id = aa.student_id
  where aa.assignment_id = p_assignment_id
    and aa.passed = true
  order by aa.correct_count desc, aa.duration_seconds asc;
$$;

comment on function public.get_leaderboard is
  'Leaderboard: chỉ học sinh passed, xếp theo đúng DESC → nhanh ASC.';


-- ------------------------------------------------------------
-- F5. get_student_summary(student_id)
-- Tổng kết học sinh: streak, bài đã làm, phân loại
-- ------------------------------------------------------------

create or replace function public.get_student_summary(p_student_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'streak', (
      select jsonb_build_object(
        'current_streak',  coalesce(current_streak, 0),
        'longest_streak',  coalesce(longest_streak, 0),
        'last_active_date', last_active_date
      )
      from public.streaks
      where student_id = p_student_id
    ),
    'this_month', (
      select jsonb_build_object(
        'total_attempts',   count(*),
        'total_correct',    sum(correct_count),
        'assignments_done', count(distinct assignment_id),
        'by_type', (
          select jsonb_object_agg(assignment_type, cnt)
          from (
            select a.assignment_type, count(*) as cnt
            from public.assignment_attempts aa2
            join public.assignments a on a.id = aa2.assignment_id
            where aa2.student_id = p_student_id
              and date_trunc('month', aa2.completed_at) = date_trunc('month', now())
            group by a.assignment_type
          ) sub
        )
      )
      from public.assignment_attempts aa
      where aa.student_id = p_student_id
        and date_trunc('month', aa.completed_at) = date_trunc('month', now())
    ),
    'all_time', (
      select jsonb_build_object(
        'total_attempts',   count(*),
        'total_correct',    sum(correct_count),
        'total_passed',     count(*) filter (where passed = true)
      )
      from public.assignment_attempts
      where student_id = p_student_id
    )
  );
$$;

comment on function public.get_student_summary is
  'Tổng kết học sinh: streak, tháng này, toàn thời gian.';


-- ------------------------------------------------------------
-- F6. generate_tuition_months(student_id)
-- Tạo tuition_records từ start_date → tháng hiện tại
-- Gọi khi thêm học sinh mới hoặc khi teacher vào xem
-- ------------------------------------------------------------

create or replace function public.generate_tuition_months(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start_date date;
  v_monthly_fee integer;
  v_month date;
  v_today date := date_trunc('month', current_date)::date;
begin
  select start_date, monthly_fee
  into   v_start_date, v_monthly_fee
  from   public.profiles
  where  id = p_student_id and role = 'student';

  if not found or v_start_date is null then
    return;
  end if;

  v_month := date_trunc('month', v_start_date)::date;

  while v_month <= v_today loop
    insert into public.tuition_records (student_id, month, paid, amount)
    values (p_student_id, v_month, false, v_monthly_fee)
    on conflict (student_id, month) do nothing;

    v_month := v_month + interval '1 month';
  end loop;
end;
$$;

comment on function public.generate_tuition_months is
  'Tạo các tháng học phí từ start_date đến hiện tại. Safe to call nhiều lần (ON CONFLICT DO NOTHING).';


-- ------------------------------------------------------------
-- F7. check_name_available(name text)
-- Kiểm tra tên chưa bị dùng trước khi tạo profile mới
-- ------------------------------------------------------------

create or replace function public.check_name_available(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles
    where lower(trim(full_name)) = lower(trim(p_name))
  );
$$;

comment on function public.check_name_available is
  'Kiểm tra tên chưa tồn tại trong profiles. True = còn trống.';


-- ------------------------------------------------------------
-- F8. get_class_assignments_for_student(student_id)
-- Lấy danh sách assignment của lớp student đang học + trạng thái
-- ------------------------------------------------------------

create or replace function public.get_class_assignments_for_student(p_student_id uuid)
returns table (
  assignment_id   uuid,
  title           text,
  assignment_type text,
  deadline        timestamptz,
  created_at      timestamptz,
  class_name      text,
  attempt_count   bigint,
  last_score      numeric,
  passed          boolean,
  status          text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id            as assignment_id,
    a.title,
    a.assignment_type,
    a.deadline,
    a.created_at,
    c.name          as class_name,
    count(aa.id)    as attempt_count,
    max(aa.score)   as last_score,
    bool_or(aa.passed) as passed,
    case
      when count(aa.id) = 0 then 'chua_lam'
      when bool_or(aa.passed) then 'hoan_thanh'
      else 'chua_dat'
    end             as status
  from public.class_students cs
  join public.assignments a    on a.class_id = cs.class_id
  join public.classes c        on c.id = cs.class_id
  left join public.assignment_attempts aa
    on aa.assignment_id = a.id and aa.student_id = p_student_id
  where cs.student_id = p_student_id
  group by a.id, a.title, a.assignment_type, a.deadline, a.created_at, c.name
  order by a.created_at desc;
$$;

comment on function public.get_class_assignments_for_student is
  'Assignment của student kèm trạng thái: chua_lam | chua_dat | hoan_thanh.';


-- ============================================================
-- RLS: DISABLED (Name-Only Mode)
-- Authorization được xử lý ở service layer
-- ============================================================

-- KHÔNG enable RLS cho bất kỳ bảng nào
-- Lý do: name-only login không có server-side identity
-- Tất cả authorization check ở frontend + service layer

-- Nếu sau này chuyển sang Supabase Auth, enable RLS và thêm policies
-- Ví dụ:
--   alter table public.profiles enable row level security;
--   create policy "..." on public.profiles ...;


-- ============================================================
-- SEED DATA — TEACHER MẶC ĐỊNH
-- ============================================================

insert into public.profiles (role, full_name)
values ('teacher', 'Hoagttho1411')
on conflict (lower(trim(full_name))) do nothing;

insert into public.profiles (role, full_name)
values ('student', 'Nguyễn Đăng Khoa')
on conflict (lower(trim(full_name))) do nothing;


-- ============================================================
-- VERIFY SCHEMA (hiển thị các bảng đã tạo)
-- ============================================================

select
  table_name,
  (select count(*) from information_schema.columns c
   where c.table_schema = 'public' and c.table_name = t.table_name) as column_count
from information_schema.tables t
where table_schema = 'public'
  and table_type = 'BASE TABLE'
order by table_name;
