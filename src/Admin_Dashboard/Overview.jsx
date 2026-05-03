// src/Admin_Dashboard/Overview.jsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const G  = '#C9A84C';
const GP = '#F5E4A8';

const Icon = {
  users:  (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  books:  (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  borrow: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  attend: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
};

const ACTIVITY = [
  { text: 'Maria Santos borrowed "Introduction to Algorithms"', time: '10 min ago', color: '#81c784' },
  { text: 'Juan de la Cruz returned "Database Systems"',       time: '34 min ago', color: '#64b5f6' },
  { text: 'Ana Gomez registered a new account',                time: '1 hr ago',   color: '#E8C97A' },
  { text: 'Pedro Reyes borrowed "Clean Code"',                 time: '2 hrs ago',  color: '#81c784' },
  { text: 'Admin updated book catalog — 3 titles added',       time: '3 hrs ago',  color: '#ce93d8' },
  { text: 'Overdue notice sent to 2 students',                 time: 'Yesterday',  color: '#ef9a9a' },
];


export default function Overview({ onNavigate }) {
  const [stats, setStats] = useState({ users: 0, books: 0, borrowed: 0, attendance: 0 });
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { count: users  },
        { count: books  },
        { count: borrow },
        { count: attend },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('books').select('*', { count: 'exact', head: true }),
        supabase.from('borrowings').select('*', { count: 'exact', head: true }).eq('status', 'borrowed'),
        supabase.from('attendance').select('*', { count: 'exact', head: true }),
      ]);
      setStats({ users: users || 0, books: books || 0, borrowed: borrow || 0, attendance: attend || 0 });
    } catch {
      setStats({ users: 128, books: 1_240, borrowed: 34, attendance: 57 });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const STAT_CARDS = [
    { label: 'Total Users',       value: stats.users,      icon: Icon.users,  sub: 'Registered accounts' },
    { label: 'Books in Catalog',  value: stats.books,      icon: Icon.books,  sub: 'Total collection' },
    { label: 'Books Borrowed',    value: stats.borrowed,   icon: Icon.borrow, sub: 'Currently on loan' },
    { label: 'Today\'s Visitors', value: stats.attendance, icon: Icon.attend, sub: 'Attendance today' },
  ];

  return (
    <div className="lm-module">


      {/* Stat Cards */}
      <div className="lm-stats-grid">
        {STAT_CARDS.map(({ label, value, icon, sub }) => (
          <div key={label} className="lm-stat-card">
            <div className="lm-stat-icon">{icon(20)}</div>
            <div className="lm-stat-label">{label}</div>
            <div className="lm-stat-value">
              {loading ? <div className="lm-spinner" style={{ width:18,height:18 }}/> : value.toLocaleString()}
            </div>
            <div className="lm-stat-sub">{sub}</div>
          </div>
        ))}
      </div>

      {/* Bottom grid: recent activity + quick stats */}
      <div className="lm-overview-grid">
        {/* Recent Activity */}
        <div className="lm-panel" style={{ marginBottom: 0 }}>
          <div className="lm-panel-title">Recent Activity</div>
          <div className="lm-activity-list">
            {ACTIVITY.map((a, i) => (
              <div key={i} className="lm-activity-item">
                <div className="lm-activity-dot" style={{ background: a.color }} />
                <div className="lm-activity-text">{a.text}</div>
                <div className="lm-activity-time">{a.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <div className="lm-panel" style={{ marginBottom: 16 }}>
            <div className="lm-panel-title">Quick Stats</div>
            <div className="lm-quick-stats">
              {[
                { label: 'Available Books',    value: stats.books - stats.borrowed },
                { label: 'Overdue Returns',    value: 3 },
                { label: 'New Users Today',    value: 2 },
                { label: 'Pending Requests',   value: 5 },
              ].map(({ label, value }) => (
                <div key={label} className="lm-quick-stat">
                  <span className="lm-quick-stat-label">{label}</span>
                  <span className="lm-quick-stat-value">{loading ? '—' : value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lm-panel" style={{ marginBottom: 0 }}>
            <div className="lm-panel-title">Quick Actions</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {[
                { label:'Add New Book',    tab:'catalog' },
                { label:'Register User',  tab:'users' },
                { label:'View Reports',   tab:'reports' },
              ].map(({ label, tab }) => (
                <button key={tab} className="lm-btn lm-btn--ghost"
                  style={{ width:'100%', justifyContent:'flex-start', fontSize:12.5 }}
                  onClick={() => onNavigate?.(tab)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}