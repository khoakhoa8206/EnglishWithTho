-- 018_backfill_streak_activity_log.sql
-- Backfill streak_activity_log từ dữ liệu cũ trong bảng streaks,
-- để trang Quản lý Streak hiện màu cam cho những chuỗi đã có trước khi bảng log được tạo.
--
-- current_streak = số ngày LIÊN TIẾP tính đến last_active_date,
-- nên ta tái tạo đúng N ngày cuối (kết thúc tại last_active_date).

insert into public.streak_activity_log (student_id, activity_date, source)
select s.student_id,
       (s.last_active_date - (g - 1) * interval '1 day')::date as activity_date,
       'backfill'
from public.streaks s
cross join lateral generate_series(1, s.current_streak) as g
where s.current_streak > 0
  and s.last_active_date is not null
on conflict (student_id, activity_date) do nothing;