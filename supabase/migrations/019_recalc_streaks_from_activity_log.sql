-- 019_recalc_streaks_from_activity_log.sql
-- Tính lại bảng streaks từ streak_activity_log (đúng như trang Quản lý Streak của giáo viên).
-- Sửa dữ liệu cũ: trước đây giáo viên xóa ngày thì log bị xóa nhưng streaks không được cập nhật,
-- nên học sinh vẫn thấy chuỗi cũ. Logic giống streakService.recalcStreak():
--   current_streak = chuỗi liên tiếp kết thúc hôm nay hoặc hôm qua (giờ VN), ngược lại 0
--   longest_streak = chuỗi liên tiếp dài nhất trong log
-- Chạy lại nhiều lần vẫn an toàn.

with days as (
  select student_id, activity_date,
         activity_date - (row_number() over (partition by student_id order by activity_date))::int as grp
  from public.streak_activity_log
),
runs as (
  select student_id, max(activity_date) as run_end, count(*)::int as len
  from days
  group by student_id, grp
),
agg as (
  select student_id,
         coalesce(max(len) filter (
           where run_end >= (now() at time zone 'Asia/Ho_Chi_Minh')::date - 1
         ), 0)            as cur,
         max(len)         as longest,
         max(run_end)     as last_active
  from runs
  group by student_id
)
insert into public.streaks (student_id, current_streak, longest_streak, last_active_date)
select student_id, cur, longest, last_active from agg
on conflict (student_id) do update
  set current_streak   = excluded.current_streak,
      longest_streak   = excluded.longest_streak,
      last_active_date = excluded.last_active_date;

-- Học sinh đã bị giáo viên xóa hết ngày trong log → reset về 0
update public.streaks s
set current_streak = 0, longest_streak = 0, last_active_date = null
where not exists (
  select 1 from public.streak_activity_log l where l.student_id = s.student_id
);
