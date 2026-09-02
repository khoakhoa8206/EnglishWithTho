// src/pages/student/DocumentsPage.jsx
import { useState, useCallback } from 'react';
import { studentDocumentService } from '../../services/studentDocumentService';
import { useAuth } from '@/hooks/useAuth';
import { useAsyncData } from '@/hooks/useAsyncData';
import Loading from '@/components/common/Loading';
import ErrorState from '@/components/common/ErrorState';
import EmptyState from '@/components/common/EmptyState';
import BackButton from '@/components/common/BackButton';

const FILE_ICONS = { PDF: '📄', Word: '📝', MP3: '🎵' };

export default function DocumentsPage() {
  const { profile } = useAuth();
  const studentId = profile?.id;
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFn = useCallback(
    () => studentDocumentService.getStudentDocuments(studentId),
    [studentId]
  );

  const { data: documents = [], loading, error, refetch } = useAsyncData(
    fetchFn,
    [studentId],
    { skip: !studentId, initial: [] }
  );

  const filtered = searchQuery.trim()
    ? documents.filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : documents;

  if (!studentId) {
    return <EmptyState icon="🔒" title="Vui lòng đăng nhập" />;
  }

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1180, margin: '0 auto' }}>
      <BackButton to="/student/home" />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#332C35', margin: 0 }}>Kho Tài liệu Học tập 📄</h1>
        <p style={{ fontSize: 13.5, color: '#8A7F72', margin: '4px 0 0' }}>
          Tải về giáo trình, tài liệu tham khảo và bài tập từ giáo viên
        </p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #EFE6D6', borderRadius: 16, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Tìm kiếm tài liệu..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              flex: 1, padding: '8px 14px', fontSize: 13.5,
              borderRadius: 10, border: '1px solid #EFE6D6', outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {loading ? (
          <Loading text="Đang tải tài liệu..." />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="📭" title="Chưa có tài liệu nào" message="Giáo viên sẽ chia sẻ tài liệu ở đây." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(item => (
              <div key={item.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', borderRadius: 12,
                border: '1px solid #EFE6D6', background: '#FDFAF5',
                flexWrap: 'wrap', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#8A7F72' }}>Lớp: {item.className}</span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#332C35', margin: '0 0 4px', wordBreak: 'break-word' }}>
                    {FILE_ICONS[item.fileType] || '📎'} {item.title}
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#8A7F72' }}>
                    {item.fileType}{item.fileSize ? ` · ${item.fileSize}` : ''} · {item.createdAt}
                  </div>
                </div>
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 16px', borderRadius: 8,
                    background: '#566B58', color: '#fff',
                    fontSize: 12.5, fontWeight: 700, textDecoration: 'none',
                    flexShrink: 0, whiteSpace: 'nowrap',
                  }}
                >
                  Tải về 📥
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}