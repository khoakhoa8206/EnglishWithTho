// src/components/teacher/dashboard/DashboardTable.jsx
import React from 'react';

const getInitials = (name) => {
  if (!name) return 'HS';
  return name.split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase();
};

export const DashboardTable = ({ data, loading }) => {
  if (loading) {
    return <div className="p-8 text-center text-[#8E8492]">Đang tải dữ liệu...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-[#8E8492]">Không tìm thấy dữ liệu phù hợp.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[#F1DDE8] text-left text-[#8E8492] text-[11.5px] font-semibold uppercase tracking-wider">
            <th className="py-2 px-2.5">Học sinh</th>
            <th className="py-2 px-2.5">Lớp</th>
            <th className="py-2 px-2.5">Bài tập</th>
            <th className="py-2 px-2.5">Điểm số</th>
            <th className="py-2 px-2.5">Thời gian làm</th>
            <th className="py-2 px-2.5">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.id} className="border-b border-[#F1DDE8] hover:bg-[#FDEEF4] transition-colors">
              <td className="py-2.5 px-2.5 text-[#332C35]">
                <div className="flex items-center gap-2.5">
                  <div className="w-[28px] h-[28px] rounded-full bg-[#C9D4F5] color-[#5F73C4] flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                    {getInitials(row.studentName)}
                  </div>
                  <span className="font-medium">{row.studentName}</span>
                </div>
              </td>
              <td className="py-2.5 px-2.5 text-[#332C35]">{row.className}</td>
              <td className="py-2.5 px-2.5 text-[#332C35]">{row.assignmentTitle}</td>
              <td className="py-2.5 px-2.5 text-[#332C35] font-semibold">
                {row.score !== null && row.score !== undefined ? row.score.toFixed(1) : '—'}
              </td>
              <td className="py-2.5 px-2.5 text-[#332C35]">{row.duration}</td>
              <td className="py-2.5 px-2.5">
                {row.status === 'Hoàn thành' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-bold bg-[#DDF3E7] text-[#2E9767]">
                    Hoàn thành
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-bold bg-[#FBE1E1] text-[#C24949]">
                    Chưa làm
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};