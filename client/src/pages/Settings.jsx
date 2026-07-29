import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Camera, Mail, Moon, Sun, Upload, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateUserProfile } from '../redux/slices/authSlice';

export default function Settings() {
  const dispatch = useDispatch();
  const { user } = useSelector(s => s.auth);
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({
    firstName: (user?.name || 'Alex').split(' ')[0],
    lastName: (user?.name || 'Rivers').split(' ').slice(1).join(' ') || 'Rivers',
    email: user?.email || '',
    jobTitle: 'Senior Project Manager',
  });
  const [avatarData, setAvatarData] = useState(user?.avatar || '');

  // Dark mode — synced with AppLayout
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme-dark') === 'true');

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('theme-dark', String(next));
    document.documentElement.classList.toggle('dark', next);
    window.dispatchEvent(new Event('theme-change'));
  };

  const [notifPrefs, setNotifPrefs] = useState({ taskAssigned: true, mentions: true, deadlines: true, weeklyDigest: false });
  const [saving, setSaving] = useState(false);

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Avatar file size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarData(reader.result);
      toast.success('Avatar selected. Click "Save Changes" to apply.');
    };
    reader.readAsDataURL(file);
  };

  const [role, setRole] = useState(user?.role || 'member');

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await dispatch(updateUserProfile({
        name: `${profile.firstName} ${profile.lastName}`.trim(),
        avatar: avatarData,
        role,
      })).unwrap();
      toast.success('Profile updated! Role set to ' + (role === 'admin' ? 'Admin' : 'Member'));
    } catch (err) {
      toast.error(err || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const initials = `${profile.firstName[0] || ''}${profile.lastName[0] || ''}`.toUpperCase();

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div className="page-title">Account Settings</div>
        <div className="page-sub">Manage your profile, permissions, and app preferences.</div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        {/* Profile Info */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>Profile Information</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 20 }}>Update your photo, personal details, and account role.</div>

          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <div style={{ position: 'relative' }}>
              {avatarData ? (
                <img
                  src={avatarData}
                  alt="Avatar"
                  style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }}
                />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 700, color: 'white' }}>
                  {initials}
                </div>
              )}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', cursor: 'pointer' }}
                title="Change Avatar"
              >
                <Camera size={12} color="white" />
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Profile Picture</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 8 }}>JPG, PNG or GIF. Max size of 2MB</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ display: 'none' }}
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={12} /> Upload New
                </button>
                {avatarData && (
                  <button type="button" className="btn btn-ghost btn-sm link" onClick={() => setAvatarData('')}>
                    <Trash2 size={12} /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input className="form-input" value={profile.firstName} onChange={e => setProfile({ ...profile, firstName: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input className="form-input" value={profile.lastName} onChange={e => setProfile({ ...profile, lastName: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
                  <input className="form-input" style={{ paddingLeft: 36 }} value={profile.email} disabled />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Account Role (Permissions)</label>
                <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="admin">Admin (Full Access)</option>
                  <option value="member">Member (Standard Access)</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Job Title</label>
              <input className="form-input" value={profile.jobTitle} onChange={e => setProfile({ ...profile, jobTitle: e.target.value })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </form>
        </div>

        <div className="divider" />

        {/* App Preferences */}
        <div style={{ marginTop: 24, marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>App Preferences</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 20 }}>Customize your workspace experience.</div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
            <div>
              <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                {darkMode ? <Moon size={15} /> : <Sun size={15} />} Dark Mode
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Switch between light and dark themes.</div>
            </div>
            <button
              type="button"
              className={`toggle ${darkMode ? 'on' : ''}`}
              onClick={toggleDark}
            />
          </div>
        </div>

        <div className="divider" />

        {/* Notification Preferences */}
        <div style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>Notifications</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 20 }}>Control which updates you receive.</div>

          {[
            { key: 'taskAssigned', label: 'Task Assigned', desc: 'When a new task is assigned to you' },
            { key: 'mentions', label: 'Mentions', desc: 'When someone mentions you in a comment' },
            { key: 'deadlines', label: 'Upcoming Deadlines', desc: '24h before a task is due' },
            { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Summary of your week every Monday' },
          ].map((n, i) => (
            <div key={n.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <button
                type="button"
                onClick={() => setNotifPrefs({ ...notifPrefs, [n.key]: !notifPrefs[n.key] })}
                style={{ width: 20, height: 20, borderRadius: '50%', background: notifPrefs[n.key] ? 'var(--accent)' : 'var(--border)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .2s' }}
              >
                {notifPrefs[n.key] && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </button>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{n.label}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{n.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
