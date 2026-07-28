import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts';
import api from '../services/api';

const PIE_COLORS = ['#22C55E', '#3B82F6', '#6B7280', '#E5484D'];
const MEMBER_COLORS = ['#6366F1', '#22C55E', '#F59E0B', '#E5484D', '#8B5CF6'];
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
      counts[WEEK_DAYS[dayIdx]] = (counts[WEEK_DAYS[dayIdx]] || 0) + 1;
    }
  });
  return WEEK_DAYS.map(d => ({ day: d, tasks: counts[d] }));
}

export default function Analytics() {
  const [stats, setStats]         = useState(null);
  const [chartData, setChartData] = useState([]);
  const [members, setMembers]     = useState([]);
  const [weekData, setWeekData]   = useState([]);
  const [pieData, setPieData]     = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, chartRes, tasksRes, membersRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/chart-data'),
          api.get('/tasks?limit=100'),
          api.get('/dashboard/member-stats'),
        ]);

        if (statsRes.data?.stats) {
          const s = statsRes.data.stats;
          setStats(s);
          const total = s.tasks.total || 1;
          setPieData([
            { name: 'Completed',   value: s.tasks.completed  },
            { name: 'In Progress', value: s.tasks.inProgress },
            { name: 'Todo',        value: s.tasks.todo       },
            { name: 'Blocked',     value: s.tasks.blocked    },
          ]);
        }

        if (chartRes.data?.chartData) setChartData(chartRes.data.chartData);
        if (tasksRes.data?.tasks)     setWeekData(buildWeekData(tasksRes.data.tasks));
        if (membersRes.data?.members) setMembers(membersRes.data.members);
      } catch (err) {
        console.error('Analytics fetch error', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

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
          <div className="page-title">Productivity Analytics</div>
          <div className="page-sub">Deep dive into team performance and project velocity</div>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { icon: '✅', value: stats?.tasks?.completed  ?? '—', label: 'Completed Tasks',  trend: `${stats?.tasks?.total ?? 0} total`,         up: true  },
          { icon: '⚡', value: stats?.tasks?.inProgress ?? '—', label: 'In Progress',       trend: `${stats?.projects?.active ?? 0} projects`,   up: true  },
          { icon: '📊', value: stats?.projects?.total   ?? '—', label: 'Total Projects',    trend: `${stats?.projects?.completed ?? 0} done`,     up: true  },
          { icon: '⚠️', value: stats?.tasks?.overdue    ?? '—', label: 'Overdue Tasks',     trend: stats?.tasks?.overdue > 0 ? 'Action needed' : 'On track', up: false },
        ].map(s => (
          <div key={s.label} className="card">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: s.up ? '#22C55E' : '#E5484D' }}>{s.trend}</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, lineHeight: 1 }}>
              {loading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : s.value}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginBottom: 20 }}>
        {/* Weekly bar chart */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div className="section-title">Tasks Created This Week</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-3)' }}>
              <span>✓</span> Live Data
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="tasks" fill="#6366F1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 8 }}>Task Status Distribution</div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
              <div className="spinner" />
            </div>
          ) : totalTasks === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 0' }}>No tasks yet</div>
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
                    {pieWithPct.filter(d => d.value > 0).map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} tasks`, '']} contentStyle={{ border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', marginTop: 8 }}>
                {pieWithPct.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-2)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i], flexShrink: 0 }} />
                    {d.name} <strong>{d.pct}%</strong>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Per-project bar chart */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 20 }}>Tasks by Project</div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
              <div className="spinner" />
            </div>
          ) : chartData.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: 40 }}>No project data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="completed"  fill="#22C55E" radius={[3,3,0,0]} name="Completed" />
                <Bar dataKey="inProgress" fill="#3B82F6" radius={[3,3,0,0]} name="In Progress" />
                <Bar dataKey="todo"       fill="#6B7280" radius={[3,3,0,0]} name="Todo" />
                <Bar dataKey="blocked"    fill="#E5484D" radius={[3,3,0,0]} name="Blocked" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Team member performance */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div className="section-title">Team Performance</div>
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><div className="spinner" /></div>
          ) : members.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem', padding: 20 }}>
              No team data yet
            </div>
          ) : (
            members.map((m, i) => (
              <div key={m._id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
                <div
                  className="avatar avatar-sm"
                  style={{ background: MEMBER_COLORS[i % MEMBER_COLORS.length], fontSize: '0.6rem', flexShrink: 0 }}
                >
                  {m.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{m.name}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: m.completionRate >= 70 ? '#22C55E' : m.completionRate >= 40 ? '#F59E0B' : '#E5484D' }}>
                      {m.completionRate}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${m.completionRate}%`,
                        background: m.completionRate >= 70 ? '#22C55E' : m.completionRate >= 40 ? '#F59E0B' : '#E5484D',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 2 }}>
                    {m.completed}/{m.total} tasks
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
