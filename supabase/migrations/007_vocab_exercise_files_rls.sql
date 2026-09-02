-- Bug 1: Thêm RLS policies cho bảng vocab_exercise_files
-- Chạy trong Supabase → SQL Editor

-- Cho phép teacher insert hàng của chính mình
CREATE POLICY "teacher_insert_vocab_exercise_files"
  ON vocab_exercise_files
  FOR INSERT
  WITH CHECK (teacher_id = auth.uid());

-- Cho phép teacher select hàng của chính mình
CREATE POLICY "teacher_select_vocab_exercise_files"
  ON vocab_exercise_files
  FOR SELECT
  USING (teacher_id = auth.uid());

-- Cho phép teacher delete hàng của chính mình
CREATE POLICY "teacher_delete_vocab_exercise_files"
  ON vocab_exercise_files
  FOR DELETE
  USING (teacher_id = auth.uid());
