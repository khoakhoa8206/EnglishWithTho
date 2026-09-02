// src/components/common/FileUploader.jsx
import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

const ALLOWED = {
  word:  { ext: ['.doc', '.docx'], mime: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], label: 'Word (.doc, .docx)' },
  pdf:   { ext: ['.pdf'], mime: ['application/pdf'], label: 'PDF (.pdf)' },
  audio: { ext: ['.mp3', '.m4a', '.wav', '.ogg'], mime: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg'], label: 'Audio (.mp3, .m4a, .wav)' },
  image: { ext: ['.jpg', '.jpeg', '.png', '.webp', '.gif'], mime: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], label: 'Ảnh (.jpg, .png, .webp)' },
};

const MAX_MB = { word: 20, pdf: 30, audio: 100, image: 10 };

/**
 * FileUploader — kéo thả + click chọn file, upload thẳng Supabase Storage
 *
 * Props:
 *   accept      {'word'|'pdf'|'audio'|'image'}  — loại file cho phép
 *   bucket      {string}                         — Supabase storage bucket
 *   folder      {string}                         — subfolder trong bucket (VD: 'listening')
 *   onSuccess   {fn}  — (url: string, path: string, file: File) => void
 *   onError     {fn}  — (message: string) => void
 *   disabled    {boolean}
 *   label       {string}  — text trong dropzone (tuỳ chọn)
 */
export default function FileUploader({
  accept = 'pdf',
  bucket = 'documents',
  folder = '',
  onSuccess,
  onError,
  disabled = false,
  label,
}) {
  const inputRef     = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [file, setFile]         = useState(null);
  const [progress, setProgress] = useState(0);     // 0-100
  const [uploading, setUploading] = useState(false);
  const [done, setDone]         = useState(false);

  const allowed = ALLOWED[accept] || ALLOWED.pdf;
  const maxMB   = MAX_MB[accept] || 20;

  // Validate file
  const validate = (f) => {
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!allowed.ext.includes(ext)) {
      return `Chỉ chấp nhận: ${allowed.label}`;
    }
    if (!allowed.mime.includes(f.type) && f.type !== '') {
      return `Loại file không hợp lệ (MIME: ${f.type})`;
    }
    if (f.size > maxMB * 1024 * 1024) {
      return `File quá lớn — tối đa ${maxMB} MB`;
    }
    return null;
  };

  const upload = async (f) => {
    const err = validate(f);
    if (err) { onError?.(err); return; }

    setFile(f);
    setProgress(0);
    setDone(false);
    setUploading(true);

    try {
      const safeName = `${Date.now()}_${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const storagePath = folder ? `${folder}/${safeName}` : safeName;

      // Supabase Storage upload (không có progress natively, dùng fake progress)
      const ticker = setInterval(() => setProgress(p => Math.min(p + 15, 85)), 200);

      const { data, error: upErr } = await supabase.storage
        .from(bucket)
        .upload(storagePath, f, { cacheControl: '3600', upsert: false });

      clearInterval(ticker);

      if (upErr) throw new Error(upErr.message);

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      const publicUrl = urlData?.publicUrl || '';

      setProgress(100);
      setDone(true);
      setUploading(false);
      onSuccess?.(publicUrl, storagePath, f);
    } catch (e) {
      setUploading(false);
      setProgress(0);
      setFile(null);
      onError?.(e.message || 'Upload thất bại');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled || uploading) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) upload(dropped);
  };

  const handleChange = (e) => {
    const chosen = e.target.files?.[0];
    if (chosen) upload(chosen);
    e.target.value = '';
  };

  const reset = () => { setFile(null); setProgress(0); setDone(false); };

  return (
    <div>
      {/* Dropzone */}
      {!done && (
        <div
          onClick={() => !disabled && !uploading && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); !disabled && setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragging ? '#566B58' : '#D0C8BC'}`,
            borderRadius: 12,
            padding: '28px 20px',
            textAlign: 'center',
            cursor: disabled || uploading ? 'default' : 'pointer',
            background: dragging ? '#F0EEE8' : '#FDFAF5',
            transition: 'border-color 0.2s, background 0.2s',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <div style={{ fontSize: 30, marginBottom: 8 }}>
            {uploading ? '⏳' : accept === 'audio' ? '🎵' : accept === 'image' ? '🖼️' : '📄'}
          </div>
          <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 14, color: '#4A3F35' }}>
            {label || (uploading ? `Đang tải lên ${file?.name || ''}...` : <><b>Nhấn để chọn file</b> hoặc kéo thả vào đây</>)}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#8A7F72' }}>
            {allowed.label} · Tối đa {maxMB} MB
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={allowed.ext.join(',')}
        style={{ display: 'none' }}
        onChange={handleChange}
        disabled={disabled || uploading}
      />

      {/* Progress bar */}
      {uploading && (
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 6, borderRadius: 999, background: '#EFE6D6', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 999,
              background: 'linear-gradient(90deg, #768E78, #566B58)',
              width: `${progress}%`, transition: 'width 0.2s',
            }} />
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 11.5, color: '#8A7F72' }}>
            {progress < 100 ? `Đang tải lên... ${progress}%` : 'Hoàn tất ✓'}
          </p>
        </div>
      )}

      {/* Done state */}
      {done && file && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', borderRadius: 10,
          background: '#EDFBF1', border: '1px solid #A3D9B1', marginTop: 4,
        }}>
          <div style={{ fontSize: 13, color: '#1E6B3C', fontWeight: 500 }}>
            ✅ {file.name}
          </div>
          <button
            onClick={reset}
            aria-label="Xóa file"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#8A7F72' }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}