import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { io } from 'socket.io-client';
import { Plus, Search, MoreHorizontal, Users, Activity, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_TABS = ['All', 'Admins', 'Members', 'Guest'];
const COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#E5484D', '#8B5CF6', '#EC4899'];

const SAMPLE = [
  { name: 'Sarah Je...', email: 'sarah.j@mo...', role: 'Admin', joined: 'Oct 2023', online: true, tasks: 12, activity: 'High' },
  { name: 'Marcus C...', email: 'm.chen@mo...', role: 'Member', joined: 'Nov 2023', online: true, tasks: 21, activity: 'High' },
  { name: 'Elena Ro...', email: 'elena.r@mo...', role: 'Member', joined: 'Jan 2024', online: false, tasks: 6, activity: 'Normal' },
  { name: 'David Park', email: 'd.park@mo...', role: 'Member', joined: 'Feb 2024', online: true, tasks: 4, activity: 'Low' },
  { name: 'Riley Coo...', email: 'r.coop@mo...', role: 'Member', joined: 'Mar 2024', online: false, tasks: 21, activity: 'High' },
  { name: 'Jordan S...', email: 'j.smith@mo...', role: 'Admin', joined: 'Sep 2023', online: true, tasks: 6, activity: 'Normal' },
];

export default function Team() {
  const [members, setMembers] = useState(SAMPLE);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('All');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  useEffect(() => {
    // Fetch initial users
    api.get('/users').then(r => {
      if (r.data?.users?.length) setMembers(r.data.users.map((u, i) => ({
        _id: u._id,
        name: u.name || 'User', email: u.email, role: u.role === 'admin' ? 'Admin' : 'Member',
        joined: new Date(u.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        online: Math.random() > 0.4, tasks: Math.floor(Math.random() * 20 + 1), activity: ['High', 'Normal', 'Low'][i % 3],
      })));
    }).catch(() => {});

    // Set up WebSocket connection for real-time updates
    const socketUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace('/api', '');
    const socket = io(socketUrl);

    socket.on('member_added', (newUser) => {
      const formattedUser = {
        _id: newUser._id,
        name: newUser.name || 'User',
        email: newUser.email,
        role: newUser.role === 'admin' ? 'Admin' : 'Member',
        joined: new Date(newUser.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        online: true,
        tasks: 0,
        activity: 'New',
      };
      
      setMembers(prev => [formattedUser, ...prev]);
      toast.success(`${formattedUser.name} joined the team!`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleRoleChange = async (memberId, newRole) => {
    if (!memberId) return;
    try {
      const lowerRole = newRole.toLowerCase();
      await api.put(`/users/${memberId}/role`, { role: lowerRole });
      setMembers(prev => prev.map(m => m._id === memberId ? { ...m, role: newRole } : m));
      toast.success('Member role updated');
    } catch {
      toast.error('Failed to update role');
    }
  };

  const filtered = members.filter(m => {
    const matchSearch = m.name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase());
    const matchTab = tab === 'All' || m.role === tab.slice(0, -1) || (tab === 'Admins' && m.role === 'Admin') || (tab === 'Members' && m.role === 'Member');
    return matchSearch && matchTab;
  });

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users/invite', { email: inviteEmail, role: inviteRole });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setShowInvite(false);
      setInviteEmail('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send invitation');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Team Management</div>
          <div className="page-sub">Manage your workspace members and their permissions</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="search-box" style={{ minWidth: 220 }}>
            <Search size={14} />
            <input placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
            <Plus size={15} /> Invite Member
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Members', value: members.length, sub: '↑ 3 this month' },
          { label: 'Active Now', value: members.filter(m => m.online).length, sub: '● Live tracking', subColor: '#22C55E' },
          { label: 'Pending Invites', value: 5, sub: 'Awaiting response' },
          { label: 'Team Efficiency', value: '92%', sub: '', accent: true },
        ].map(s => (
          <div key={s.label} className="card">
            <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: s.accent ? 'var(--accent)' : 'var(--text-1)', lineHeight: 1 }}>{s.value}</div>
            {s.sub && <div style={{ fontSize: '0.75rem', color: s.subColor || 'var(--text-3)', marginTop: 6 }}>{s.sub}</div>}
            {s.accent && <div className="progress-bar" style={{ marginTop: 8 }}><div className="progress-fill" style={{ width: '92%' }} /></div>}
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div className="section-title">All Members</div>
        <div className="tab-group">
          {ROLE_TABS.map(t => (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </div>

      {/* Member cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {filtered.map((m, i) => (
          <div key={i} className="card" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div className="avatar avatar-lg" style={{ background: COLORS[i % COLORS.length] }}>
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: m.online ? '#22C55E' : '#D1D5DB', border: '2px solid white', position: 'absolute', bottom: 0, right: 0 }} />
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ padding: '2px 4px', flexShrink: 0 }}>
                <MoreHorizontal size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <select
                value={m.role}
                onChange={e => handleRoleChange(m._id, e.target.value)}
                style={{
                  background: m.role === 'Admin' ? '#E5484D18' : 'var(--bg)',
                  color: m.role === 'Admin' ? '#E5484D' : 'var(--text-2)',
                  border: `1px solid ${m.role === 'Admin' ? '#E5484D40' : 'var(--border)'}`,
                  borderRadius: 6, padding: '2px 8px',
                  fontSize: '0.75rem', fontWeight: 600,
                  cursor: 'pointer', outline: 'none',
                }}
              >
                <option value="Member">Member</option>
                <option value="Admin">Admin</option>
              </select>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Joined {m.joined}</span>
            </div>

            <div className="divider" style={{ margin: '12px 0' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 2 }}>Tasks</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.tasks}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 2 }}>Activity</div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.activity}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Invitations */}
      <div className="card">
        <div className="section-title" style={{ marginBottom: 16 }}>Pending Invitations</div>
        <table className="data-table">
          <thead>
            <tr><th>EMAIL ADDRESS</th><th>ROLE ASSIGNED</th><th>SENT DATE</th><th>ACTIONS</th></tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ color: 'var(--text-3)', fontSize: '0.85rem' }} colSpan={4}>No pending invitations</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="modal-overlay" onClick={() => setShowInvite(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Invite Member</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowInvite(false)}>✕</button>
            </div>
            <form onSubmit={handleInvite}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="input-icon">
                    <Mail size={15} />
                    <input className="form-input" type="email" placeholder="colleague@company.com"
                      value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowInvite(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Send Invite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
