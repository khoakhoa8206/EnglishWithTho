// src/components/common/FileArchiveDrawer.jsx
import { useState, useEffect } from 'react';
import { fileArchiveService } from '../../services/fileArchiveService';


export default function FileArchiveDrawer({ teacherId, section, onClose }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    fileArchiveService.getFiles(teacherId, section)
      .then(setFiles)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [teacherId, section]);


  const handleDelete = async (fileId) => {
    if (!window.confirm('Xóa file này khỏi kho lưu trữ?')) return;
    await fileArchiveService.deleteFile(fileId);
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };


  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 440,
      background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
      zIndex: 1000, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #EFE6D6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#332C35' }}>🗂️ Kho lưu trữ</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8A7F72' }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
        {loading ? (
          <p style={{ color: '#8A7F72', fontSize: 13.5 }}>Đang tải...</p>
        ) : files.length === 0 ? (
          <p style={{ color: '#8A7F72', fontSize: 13.5, textAlign: 'center', marginTop: 40 }}>Chưa có file nào trong kho.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {files.map(f => (
              <div key={f.id} style={{ border: '1px solid #EFE6D6', borderRadius: 10, padding: '12px 14px', background: '#FDFAF5' }}>
                <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 14, color: '#332C35' }}>{f.displayName}</p>
                <p style={{ margin: '0 0 4px', fontSize: 12.5, color: '#566B58' }}>{f.title}</p>
                <p style={{ margin: '0 0 10px', fontSize: 11.5, color: '#B0A8A0' }}>
                  {f.fileType?.toUpperCase()} · {f.fileSize ? `${Math.round(f.fileSize / 1024)} KB` : ''} · {f.uploadedAt}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {f.fileType !== 'question_bank' && (
                    <a
                      href={f.fileUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid #566B58', background: '#fff', color: '#566B58', fontSize: 12.5, fontWeight: 700, textAlign: 'center', textDecoration: 'none' }}
                    >
                      ⬇ Tải về
                    </a>
                  )}
                  {f.fileType === 'question_bank' && (
                    <span style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid #566B58', background: '#F5EDE0', color: '#566B58', fontSize: 12.5, fontWeight: 700, textAlign: 'center' }}>
                      📋 Ngân hàng câu hỏi
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(f.id)}
                    style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #FBD5D5', background: '#FEF3F3', color: '#C24949', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}