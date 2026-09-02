# Mochi Study

Nền tảng học tập IELTS cho giáo viên và học sinh.

## Cài đặt

```bash
npm install
cp .env.example .env
# Điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY
npm run dev
```

## Cấu trúc

Xem `AI_CODING_SPEC.md` để biết kiến trúc chi tiết.

## Database

Chạy migration trong `supabase/migrations/001_initial_schema.sql` trên Supabase SQL Editor.
