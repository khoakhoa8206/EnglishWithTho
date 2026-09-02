// src/pages/student/TuitionPage.jsx
import { useCallback } from 'react';
import { tuitionService } from '../../services/tuitionService';
import { useAuth } from '@/hooks/useAuth';
import { useAsyncData } from '@/hooks/useAsyncData';
import Loading from '@/components/common/Loading';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';

const MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'];

function fmtVND(n) {
  if (!n) return '—';
  return new Intl.NumberFormat('vi-VN').format(n) + ' đ';
}

export default function StudentTuitionPage() {
  const { profile } = useAuth();
  const studentId = profile?.id;

  const fetchFn = useCallback(
    () => tuitionService.getStudentTuitionByYear(studentId),
    [studentId]
  );

  const { data, loading, error, refetch } = useAsyncData(
    fetchFn, [studentId], { skip: !studentId }
  );

  if (!studentId) return <EmptyState icon="🔒" title="Vui lòng đăng nhập" />;
  if (loading)    return <Loading fullPage text="Đang tải học phí..." />;
  if (error)      return <ErrorState message={error} onRetry={refetch} />;
  if (!data)      return null;

  const { startDate, monthlyFee, className, recordsByYear } = data;
  const years = Object.keys(recordsByYear).map(Number).sort((a, b) => b - a);

  // Tính tổng
  let totalPaid = 0, totalUnpaid = 0;
  Object.values(recordsByYear).flat().forEach(r => {
    if (r.paid) totalPaid += (r.amount || monthlyFee || 0);
    else        totalUnpaid += (r.amount || monthlyFee || 0);
  });

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 20px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#332C35', margin: '0 0 4px' }}>
        💳 Học phí
      </h1>

      {/* Thông tin đầu trang */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #EFE6D6',
        padding: '18px 22px', marginBottom: 20, marginTop: 16,
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12,
      }}>
        {startDate && (
          <InfoItem label="Bắt đầu học" value={new Date(startDate).toLocaleDateString('vi-VN')} />
        )}
        <InfoItem label="Học phí" value={fmtVND(monthlyFee)} sub="(mỗi tháng)" />
        {className && className !== '—' && (
          <InfoItem label="Lớp học" value={className} />
        )}
      </div>

      {/* Tổng kết */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#EDFBF1', border: '1px solid #A3D9B1', borderRadius: 14, padding: '14px 18px' }}>
          <div style={{ fontSize: 12, color: '#1E6B3C', fontWeight: 600 }}>Đã thanh toán</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1E6B3C', marginTop: 4 }}>{fmtVND(totalPaid)}</div>
        </div>
        <div style={{ background: '#FDF0F0', border: '1px solid #F0B0B0', borderRadius: 14, padding: '14px 18px' }}>
          <div style={{ fontSize: 12, color: '#A83232', fontWeight: 600 }}>Còn lại</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#A83232', marginTop: 4 }}>{fmtVND(totalUnpaid)}</div>
        </div>
      </div>

      {/* Bảng theo năm */}
      {years.length === 0 ? (
        <EmptyState icon="💳" title="Chưa có dữ liệu học phí" message="Giáo viên sẽ cập nhật học phí tại đây." />
      ) : years.map(year => (
        <YearGrid key={year} year={year} records={recordsByYear[year] || []} />
      ))}

      <p style={{ fontSize: 12, color: '#B0A8A0', textAlign: 'center', marginTop: 20 }}>
        Chỉ giáo viên mới có thể cập nhật trạng thái thanh toán.
      </p>
    </div>
  );
}

function InfoItem({ label, value, sub }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#8A7F72', fontWeight: 600, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#4A3F35' }}>
        {value}
        {sub && <span style={{ fontSize: 11, fontWeight: 400, color: '#8A7F72', marginLeft: 4 }}>{sub}</span>}
      </div>
    </div>
  );
}

function YearGrid({ year, records }) {
  const paidCount = records.filter(r => r.paid).length;

  return (
    <div style={{
      background: '#fff', borderRadius: 16, border: '1px solid #EFE6D6',
      padding: '18px 22px', marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#4A3F35' }}>Năm {year}</div>
        <div style={{ fontSize: 12, color: '#8A7F72' }}>
          {paidCount}/{records.length} tháng đã đóng
        </div>
      </div>

      {/* Grid 12 ô */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 8,
      }}>
        {MONTHS.map((label, i) => {
          const rec = records.find(r => new Date(r.month).getUTCMonth() === i);
          if (!rec) {
            return (
              <div key={i} style={{
                aspectRatio: '1', borderRadius: 12,
                background: '#F5F5F5', border: '2px dashed #E8E8E8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0.35,
              }}>
                <span style={{ fontSize: 12, color: '#B0A8A0', fontWeight: 600 }}>{label}</span>
              </div>
            );
          }
          return (
            <div key={i} style={{
              aspectRatio: '1', borderRadius: 12,
              border: `2px solid ${rec.paid ? '#388E3C' : '#DDD'}`,
              background: rec.paid ? '#E8F5E9' : '#fff',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: rec.paid ? '#2E7D32' : '#4A3F35' }}>
                {label}
              </span>
              {rec.paid && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: '#8A7F72' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#E8F5E9', border: '2px solid #388E3C', display: 'inline-block' }} />
          Đã đóng
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: '#fff', border: '2px solid #DDD', display: 'inline-block' }} />
          Chưa đóng
        </span>
      </div>
    </div>
  );
}