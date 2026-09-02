-- ============================================================
-- Migration 008: Disable RLS hoàn toàn (Name-Only Login Mode)
-- App dùng name-only login, không có auth.uid() → RLS với
-- auth.uid() sẽ block mọi query từ anon client.
-- Authorization được xử lý ở service layer (frontend).
-- ============================================================

-- 1. Xóa tất cả RLS policies sai trên assignments
DROP POLICY IF EXISTS "students_read_own_assignments"   ON public.assignments;
DROP POLICY IF EXISTS "teachers_manage_own_assignments" ON public.assignments;

-- 2. Disable RLS trên assignments (nếu đã enable)
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;

-- 3. Xóa RLS policies sai trên vocab_exercise_files
DROP POLICY IF EXISTS "teacher_insert_vocab_exercise_files" ON public.vocab_exercise_files;
DROP POLICY IF EXISTS "teacher_select_vocab_exercise_files" ON public.vocab_exercise_files;
DROP POLICY IF EXISTS "teacher_delete_vocab_exercise_files" ON public.vocab_exercise_files;

-- 4. Disable RLS trên vocab_exercise_files
ALTER TABLE public.vocab_exercise_files DISABLE ROW LEVEL SECURITY;

-- 5. Đảm bảo các bảng khác không bị enable RLS ngầm
ALTER TABLE public.profiles          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_students    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocab_topics      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabularies      DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_topics    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_materials DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_attempts  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_answers   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks           DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tuition_records   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents         DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress  DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- NOTE: Nếu muốn bật RLS sau này khi chuyển sang Supabase Auth,
-- cần thêm auth.uid() mapping vào profiles.id và viết lại policies.
-- ============================================================
