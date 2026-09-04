-- Thêm cột upload_id vào file_archive để liên kết với ngân hàng câu hỏi
ALTER TABLE public.file_archive
ADD COLUMN IF NOT EXISTS upload_id UUID REFERENCES public.question_bank_uploads(id) ON DELETE SET NULL;

-- Thêm cột file_url vào question_bank_uploads để lưu link file gốc
ALTER TABLE public.question_bank_uploads
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Index tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS file_archive_upload_id_idx ON public.file_archive(upload_id);
