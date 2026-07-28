import { useState, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Paperclip, Upload, Trash2, Download, File, Image, FileText } from 'lucide-react';

const MAX_SIZE = 2 * 1024 * 1024; // 2MB

function formatBytes(bytes) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mimeType = '') {
  if (mimeType.startsWith('image/')) return <Image size={16} style={{ color: '#6366F1' }} />;
  if (mimeType === 'application/pdf')  return <FileText size={16} style={{ color: '#E5484D' }} />;
  return <File size={16} style={{ color: '#6B7280' }} />;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]); // strip data URI prefix
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AttachmentsPanel({ taskId, attachments = [], currentUser, onAttachmentAdded, onAttachmentDeleted }) {
  const [dragging,   setDragging]   = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const inputRef = useRef(null);

  const handleFiles = async (files) => {
    const file = files[0];
    if (!file) return;

    if (file.size > MAX_SIZE) {
      toast.error(`File too large. Max 2MB (this file is ${formatBytes(file.size)})`);
      return;
    }

    setUploading(true);
    try {
      const data = await readFileAsBase64(file);
      const res = await api.post(`/tasks/${taskId}/attachments`, {
        name:     file.name,
        size:     file.size,
        mimeType: file.type || 'application/octet-stream',
        data,
      });
      if (res.data?.attachment) {
        onAttachmentAdded?.(res.data.attachment);
        toast.success(`"${file.name}" uploaded`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId, name) => {
    try {
      await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
      onAttachmentDeleted?.(attachmentId);
      toast.success(`"${name}" removed`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const downloadAttachment = (attachment) => {
    const link = document.createElement('a');
    link.href     = `data:${attachment.mimeType};base64,${attachment.data}`;
    link.download = attachment.name;
    link.click();
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-3)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Paperclip size={13} /> Attachments ({attachments.length})
      </div>

      {/* Drop zone */}
      <div
        onDragEnter={e => { e.preventDefault(); setDragging(true); }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          background: dragging ? 'var(--accent)10' : 'var(--bg)',
          borderRadius: 10, padding: '18px 16px',
          textAlign: 'center', cursor: 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          marginBottom: attachments.length > 0 ? 12 : 0,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
        />
        {uploading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-2)' }}>
            <div className="spinner" style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: '0.85rem' }}>Uploading…</span>
          </div>
        ) : (
          <>
            <Upload size={20} style={{ color: 'var(--text-3)', marginBottom: 6 }} />
            <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', fontWeight: 500 }}>
              {dragging ? 'Drop to upload' : 'Click or drag & drop a file'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>
              Images, PDF, Word, Excel — max 2MB
            </div>
          </>
        )}
      </div>

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {attachments.map(att => {
            const isOwn = att.uploadedBy?._id === currentUser?._id || att.uploadedBy === currentUser?._id;
            return (
              <div
                key={att._id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}
              >
                <div style={{ flexShrink: 0 }}>{fileIcon(att.mimeType)}</div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{
                    fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-1)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {att.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 1 }}>
                    {formatBytes(att.size)} · {att.uploadedBy?.name || 'Unknown'}
                  </div>
                </div>
                <button
                  onClick={() => downloadAttachment(att)}
                  title="Download"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-3)', padding: 4, borderRadius: 4, display: 'flex',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                >
                  <Download size={14} />
                </button>
                {isOwn && (
                  <button
                    onClick={() => handleDelete(att._id, att.name)}
                    title="Remove"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-3)', padding: 4, borderRadius: 4, display: 'flex',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#E5484D'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
