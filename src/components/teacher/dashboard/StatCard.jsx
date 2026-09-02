// src/components/teacher/dashboard/StatCard.jsx
import React from 'react';

export const StatCard = ({ label, value, subtext, icon, iconBg }) => {
  return (
    <div className="bg-white border border-[#F1DDE8] rounded-[16px] p-[16px_18px] shadow-[0_4px_18px_rgba(196,90,140,0.08)]">
      <div className="flex items-center justify-between mb-2">
        <span className="font-['Quicksand'] text-[12px] text-[#8E8492] font-semibold">{label}</span>
        <div 
          className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center" 
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </div>
      </div>
      <p className="font-['Quicksand'] text-[24px] font-bold text-[#332C35] my-0">{value}</p>
      {subtext && <span className="text-[11.5px] font-semibold text-[#8E8492] mt-1 block">{subtext}</span>}
    </div>
  );
};