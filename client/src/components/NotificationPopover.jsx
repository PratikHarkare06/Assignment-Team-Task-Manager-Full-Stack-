import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Bell, CheckCheck, X, MessageSquare, CheckSquare, Info } from 'lucide-react';

function notifIcon(type) {
  if (type === 'mention') return <MessageSquare size={14} style={{ color: '#8B5CF6' }} />;
  if (type === 'task')    return <CheckSquare size={14} style={{ color: '#22C55E' }} />;
  return <Info size={14} style={{ color: '#3B82F6' }} />;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationPopover({ onClose, onNotificationClick }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const popoverRef                        = useRef(null);

  const fetchNotifs = () => {
    setLoading(true);
    api.get('/notifications')
      .then(res => {
        if (res.data?.success) setNotifications(res.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [onClose]);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All marked as read');
    } catch {
      toast.error('Failed to update notifications');
    }
  };

  const markOneRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute', top: 'calc(100% + 10px)', right: 0,
        width: 360, background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, boxShadow: '0 12px 36px rgba(0,0,0,0.22)',
        zIndex: 9999, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        maxHeight: 440,
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1)' }}>
          <Bell size={16} /> Notifications
          {unreadCount > 0 && (
            <span style={{
              background: 'var(--accent)', color: 'white', fontSize: '0.65rem',
              fontWeight: 700, borderRadius: '50%', padding: '1px 6px',
            }}>
              {unreadCount} new
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              title="Mark all as read"
              style={{
                background: 'none', border: 'none', color: 'var(--accent)',
                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <CheckCheck size={14} /> Read all
            </button>
          )}
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 2, display: 'flex' }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 30, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '30px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.84rem' }}>
            No notifications right now
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n._id}
              onClick={() => {
                markOneRead(n._id);
                if (n.relatedId) onNotificationClick?.(n.relatedId);
              }}
              style={{
                display: 'flex', gap: 12, padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                background: n.isRead ? 'transparent' : 'var(--accent)08',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = n.isRead ? 'transparent' : 'var(--accent)08'}
            >
              <div style={{ marginTop: 2, flexShrink: 0 }}>{notifIcon(n.type)}</div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{
                  fontSize: '0.84rem', fontWeight: n.isRead ? 500 : 700,
                  color: 'var(--text-1)', marginBottom: 2,
                }}>
                  {n.title}
                </div>
                <div style={{
                  fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.4,
                  overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {n.body}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 4 }}>
                  {timeAgo(n.createdAt)}
                </div>
              </div>
              {!n.isRead && (
                <div style={{
                  width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)',
                  flexShrink: 0, marginTop: 6,
                }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
