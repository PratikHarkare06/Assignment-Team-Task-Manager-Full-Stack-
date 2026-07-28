import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, FolderOpen, CheckSquare, Clock, AlertCircle } from 'lucide-react';

const PIE_COLORS = ['#22C55E', '#3B82F6', '#6B7280', '#E5484D'];

function StatCard({ color, icon: Icon, trend, trendUp, value, label }) {
  return (
    <div className="card stat-card">
      <div className="stat-card-header">
        <div className="stat-dot" style={{ background: color }} />
        <span className={`stat-trend ${trendUp ? 'up' : 'down'}`}>
          {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {trend}
        </span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildWeekData(tasks) {
  const today = new Date();
  const counts = {};
  WEEK_DAYS.forEach(d => (counts[d] = 0));
  tasks.forEach(t => {
    if (!t.createdAt) return;
    const d = new Date(t.createdAt);
    const diff = Math.round((today - d) / 86400000);
    if (diff >= 0 && diff < 7) {
      const dayIdx = (today.getDay() - 1 - diff + 14) % 7;
      const dayName = WEEK_DAYS[dayIdx];
      counts[dayName] = (counts[dayName] || 0) + 1;
    }
  });
  return WEEK_DAYS.map(d => ({ day: d, tasks: counts[d] }));
}

const MEMBER_COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#E5484D', '#8B5CF6'];

export default function Dashboard() {
  const { user } = useSelector(s => s.auth);
  const navigate = useNavigate();

  const [stats, setStats]           = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [members, setMembers]       = useState([]);
  const [trendData, setTrendData]   = useState([]);
  const [pieData, setPieData]       = useState([]);
  const [tab, setTab]               = useState('Week');
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, tasksRes, membersRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/tasks?limit=50'),
          api.get('/dashboard/member-stats'),
        ]);

        if (statsRes.data?.stats) {
          const s = statsRes.data.stats;
          setStats(s);

          // Build real pie data from task status counts
          setPieData([
            { name: 'Completed',   value: s.tasks.completed  },
            { name: 'In Progress', value: s.tasks.inProgress },
            { name: 'Todo',        value: s.tasks.todo       },
            { name: 'Blocked',     value: s.tasks.blocked    },
          ]);
        }

        if (tasksRes.data?.tasks) {
          const allTasks = tasksRes.data.tasks;
          setRecentTasks(allTasks.slice(0, 4));
          setTrendData(buildWeekData(allTasks));
        }

        if (membersRes.data?.members) {
          setMembers(membersRes.data.members);
        }
      } catch (err) {
        console.error('Dashboard fetch error', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const firstName = user?.name?.split(' ')[0] || 'there';

  const totalTasks = stats?.tasks?.total || 0;
  const pieWithPct = pieData.map(d => ({
    ...d,
    pct: totalTasks > 0 ? Math.round((d.value / totalTasks) * 100) : 0,
  }));

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Welcome back, {firstName}</div>
          <div className="page-sub">Here's what's happening with your projects today.</div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard color="#6366F1" trendUp={true}  trend={`${stats?.projects?.total ?? 0}`}          value={stats?.projects?.total      ?? '—'} label="Total Projects" />
        <StatCard color="#22C55E" trendUp={true}  trend={`${stats?.tasks?.total ?? 0} total`}        value={stats?.tasks?.inProgress    ?? '—'} label="Active Tasks" />
        <StatCard color="#22C55E" trendUp={true}  trend={`${stats?.tasks?.myTasks ?? 0} assigned`}   value={stats?.tasks?.completed     ?? '—'} label="Completed Tasks" />
        <StatCard color="#E5484D" trendUp={false} trend={stats?.tasks?.overdue > 0 ? 'Needs attention' : 'All on time'} value={stats?.tasks?.overdue ?? '—'} label="Overdue Tasks" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginBottom: 24 }}>
        {/* Area Chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div className="section-title">Tasks Created This Week</div>
            <div className="tab-group">
              {['Week', 'Month', 'Year'].map(t => (
                <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
              <Area type="monotone" dataKey="tasks" stroke="#6366F1" strokeWidth={2.5} fill="url(#grad)" dot={{ r: 4, fill: '#6366F1', strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 8 }}>Task Status</div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
              <div className="spinner" />
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={pieWithPct.filter(d => d.value > 0)}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={75}
                    dataKey="value" strokeWidth={0}
                  >
                    {pieWithPct.filter(d => d.value > 0).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} tasks`, '']} contentStyle={{ border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              {totalTasks === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.8rem' }}>No tasks yet</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', marginTop: 8 }}>
                  {pieWithPct.map((d, i) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-2)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i], flexShrink: 0 }} />
                      {d.name} <strong>{d.pct}%</strong>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Tasks */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="section-title">Recent Tasks</div>
            <button className="btn btn-ghost btn-sm link" onClick={() => navigate('/tasks')}>View All</button>
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><div className="spinner" /></div>
          ) : recentTasks.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem', padding: 20 }}>
              No tasks yet. Create your first task!
            </div>
          ) : (
            recentTasks.map((t, i) => (
              <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < recentTasks.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div className="avatar" style={{ background: MEMBER_COLORS[i % MEMBER_COLORS.length] }}>
                  {(t.assignedTo?.name || t.createdBy?.name || 'U').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>
                    {t.projectId?.title || 'No project'}
                  </div>
                </div>
                <div className={`badge ${t.status === 'completed' ? 'badge-green' : t.status === 'in-progress' ? 'badge-blue' : t.status === 'blocked' ? 'badge-red' : 'badge-gray'}`} style={{ fontSize: '0.7rem', flexShrink: 0 }}>
                  {t.status}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Team Performance */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Team Performance</div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><div className="spinner" /></div>
          ) : members.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem', padding: 20 }}>
              No team members with tasks yet.
            </div>
          ) : (
            members.map((m, i) => (
              <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div className="avatar" style={{ background: MEMBER_COLORS[i % MEMBER_COLORS.length], flexShrink: 0 }}>
                  {m.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{m.name}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: m.completionRate >= 70 ? '#22C55E' : m.completionRate >= 40 ? '#F59E0B' : '#E5484D' }}>
                      {m.completionRate}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${m.completionRate}%`,
                        background: m.completionRate >= 70 ? '#22C55E' : m.completionRate >= 40 ? '#F59E0B' : '#E5484D',
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 2 }}>
                    {m.completed} / {m.total} tasks completed
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
