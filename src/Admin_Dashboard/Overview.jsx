import { useState, useEffect, useCallback } from 'react';
import { supabase, supabaseAdmin } from '../supabaseClient';
import { useAuth } from '../Login_SignUp/AuthContext';

const Icon = {
  users:  (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  books:  (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  borrow: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  attend: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
};

function relTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

const SCROLL_STYLE = `
  .lm-activity-scroll::-webkit-scrollbar { width: 5px; }
  .lm-activity-scroll::-webkit-scrollbar-track { background: rgba(139,0,0,0.04); border-radius: 99px; }
  .lm-activity-scroll::-webkit-scrollbar-thumb { background: rgba(139,0,0,0.22); border-radius: 99px; }
  .lm-activity-scroll::-webkit-scrollbar-thumb:hover { background: rgba(139,0,0,0.40); }

  
  .lm-overview-bottom {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 18px;
    margin-top: 18px;
    align-items: start;
  }

  
  .lm-activity-card {
    display: flex;
    flex-direction: column;
    border-radius: var(--radius-lg);
    border: 1px solid rgba(139,0,0,0.13);
    box-shadow: 0 2px 12px rgba(30,0,0,0.07);
    overflow: hidden;
    max-height: 480px;
    min-height: 0;
    text-align: left;
  }

  .lm-activity-header {
    flex-shrink: 0;
    background: linear-gradient(135deg, #8B0000, #6B0000);
    border-bottom: 2px solid rgba(201,168,76,0.35);
    padding: 13px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  
  .lm-activity-scroll {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    scrollbar-width: thin;
    scrollbar-color: rgba(139,0,0,0.22) rgba(139,0,0,0.04);
  }

  
  .lm-right-col {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  
  .lm-confirm-overlay {
    position: fixed; inset: 0; z-index: 1000;
    background: rgba(20,0,0,0.45);
    display: flex; align-items: center; justify-content: center;
  }
  .lm-confirm-box {
    background: var(--cream-light, #fff8f0);
    border: 1px solid rgba(139,0,0,0.18);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(30,0,0,0.18);
    padding: 28px 28px 22px;
    max-width: 360px; width: 90%;
    font-family: var(--font-sans);
  }
  .lm-confirm-title {
    font-size: 14px; font-weight: 700; color: #8B0000;
    margin-bottom: 8px;
  }
  .lm-confirm-body {
    font-size: 12.5px; color: var(--text-primary, #333);
    line-height: 1.55; margin-bottom: 20px;
  }
  .lm-confirm-actions {
    display: flex; gap: 10px; justify-content: flex-end;
  }
`;

export default function Overview({ onNavigate }) {
  // Phase 9 — campus isolation: every stat/activity query below is scoped
  // to the signed-in librarian's own campus_id so campuses never see each
  // other's books, students, borrowings, or attendance history.
  const { profile } = useAuth();
  const campusId = profile?.campus_id ?? null;

  const [stats,         setStats]         = useState({ users: 0, books: 0, borrowed: 0, attendance: 0, available: 0, overdue: 0, newUsers: 0, pending: 0 });
  const [activity,      setActivity]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [actLoading,    setActLoading]    = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null); 

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      let qUsers    = supabase.from('profiles').select('id', { count: 'exact' });
      let qBooks    = supabase.from('books').select('id', { count: 'exact' });
      let qBorrowed = supabaseAdmin.from('borrowings').select('id', { count: 'exact' }).eq('status', 'Borrowed');
      let qAttend   = supabase.from('attendance_logs').select('id', { count: 'exact' }).eq('date', todayStr);
      let qCopies   = supabaseAdmin.from('book_copies').select('status, books!inner(campus_id)');
      let qOverdue  = supabaseAdmin.from('borrowings').select('id', { count: 'exact' }).eq('status', 'overdue');
      let qNewUsers = supabase.from('profiles').select('id', { count: 'exact' }).gte('created_at', todayStr);
      let qPending  = supabaseAdmin.from('borrowings').select('id', { count: 'exact' }).eq('status', 'pending');

      if (campusId) {
        qUsers    = qUsers.eq('campus_id', campusId);
        qBooks    = qBooks.eq('campus_id', campusId);
        qBorrowed = qBorrowed.eq('campus_id', campusId);
        qAttend   = qAttend.eq('campus_id', campusId);
        qCopies   = qCopies.eq('books.campus_id', campusId);
        qOverdue  = qOverdue.eq('campus_id', campusId);
        qNewUsers = qNewUsers.eq('campus_id', campusId);
        qPending  = qPending.eq('campus_id', campusId);
      }

      const [
        { count: users    },
        { count: books    },
        { count: borrowed },
        { count: attend   },
        { data: copiesData },
        { count: overdue  },
        { count: newUsers },
        { count: pending  },
      ] = await Promise.all([qUsers, qBooks, qBorrowed, qAttend, qCopies, qOverdue, qNewUsers, qPending]);
      const available = (copiesData || []).filter(c => c.status === 'Available').length;
      setStats({
        users: users || 0, books: books || 0, borrowed: borrowed || 0,
        attendance: attend || 0, available: available || 0,
        overdue: overdue || 0, newUsers: newUsers || 0, pending: pending || 0,
      });
    } catch {
      setStats({ users: 0, books: 0, borrowed: 0, attendance: 0, available: 0, overdue: 0, newUsers: 0, pending: 0 });
    } finally { setLoading(false); }
  }, [campusId]);

  const loadActivity = useCallback(async () => {
    setActLoading(true);
    try {
      let qBorrows = supabaseAdmin.from('borrowings')
        .select('id, status, borrowed_at, returned_at, student_name, book_title')
        .order('borrowed_at', { ascending: false }).limit(500);
      let qNewProfiles = supabase.from('profiles')
        .select('id, first_name, last_name, created_at')
        .order('created_at', { ascending: false }).limit(200);
      let qVisits = supabase.from('attendance_logs')
        .select('id, full_name, time_in')
        .order('time_in', { ascending: false }).limit(200);
      let qNewBooks = supabase.from('books')
        .select('id, title, authors, copies, created_at')
        .order('created_at', { ascending: false }).limit(200);
      let qCopyChanges = supabaseAdmin.from('book_copies')
        .select('id, status, updated_at, book_id, books!inner(title, campus_id)')
        .order('updated_at', { ascending: false }).limit(200);

      if (campusId) {
        qBorrows      = qBorrows.eq('campus_id', campusId);
        qNewProfiles  = qNewProfiles.eq('campus_id', campusId);
        qVisits       = qVisits.eq('campus_id', campusId);
        qNewBooks     = qNewBooks.eq('campus_id', campusId);
        qCopyChanges  = qCopyChanges.eq('books.campus_id', campusId);
      }

      const [
        { data: borrows     },
        { data: newProfiles },
        { data: visits      },
        { data: newBooks    },
        { data: copyChanges },
      ] = await Promise.all([qBorrows, qNewProfiles, qVisits, qNewBooks, qCopyChanges]);

      const events = [];

      (borrows || []).forEach(b => {
        const name = b.student_name || 'A student';
        const book = b.book_title   || 'a book';
        const statusLower = (b.status || '').toLowerCase();
        if ((statusLower === 'returned' || statusLower === 'return') && b.returned_at) {
          events.push({ text: `${name} returned "${book}"`, ts: b.returned_at, color: '#64b5f6', tag: 'Return' });
          events.push({ text: `${name} borrowed "${book}"`, ts: b.borrowed_at, color: '#81c784', tag: 'Borrow' });
        } else if (b.borrowed_at) {
          const overdue = statusLower === 'overdue';
          events.push({ text: `${name} borrowed "${book}"`, ts: b.borrowed_at, color: overdue ? '#ff8a65' : '#81c784', tag: overdue ? 'Overdue' : 'Borrow' });
        }
      });

      (newProfiles || []).forEach(p => {
        const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'A user';
        events.push({ text: `${name} registered a new account`, ts: p.created_at, color: '#E8C97A', tag: 'User' });
      });

      (visits || []).forEach(v => {
        events.push({ text: `${v.full_name || 'A visitor'} checked in to the library`, ts: v.time_in, color: '#ce93d8', tag: 'Visit' });
      });

      (newBooks || []).forEach(b => {
        const title   = b.title   || 'a book';
        const authors = b.authors ? ` by ${b.authors}` : '';
        const copies  = b.copies  ? ` (${b.copies} ${b.copies === 1 ? 'copy' : 'copies'})` : '';
        events.push({ text: `"${title}"${authors} added to catalog${copies}`, ts: b.created_at, color: '#4db6ac', tag: 'Catalog' });
      });

      (copyChanges || []).forEach(c => {
        const title = c.books?.title || 'a book';
        if (c.status === 'Available') {
          events.push({ text: `A copy of "${title}" became available`, ts: c.updated_at, color: '#aed581', tag: 'Available' });
        } else if (c.status === 'Overdue') {
          events.push({ text: `A copy of "${title}" is overdue`, ts: c.updated_at, color: '#ff8a65', tag: 'Overdue' });
        }
      });

      events.sort((a, b) => new Date(b.ts) - new Date(a.ts));
      setActivity(events);
    } catch {
      setActivity([]);
    } finally { setActLoading(false); }
  }, [campusId]);

  useEffect(() => { loadStats(); loadActivity(); }, [loadStats, loadActivity]);

  useEffect(() => {
    const ch = supabase.channel('overview-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_logs' }, () => { loadStats(); loadActivity(); })
      .on('postgres_changes', { event: '*',      schema: 'public', table: 'borrowings'      }, () => { loadStats(); loadActivity(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles'        }, () => { loadStats(); loadActivity(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'books'           }, () => { loadStats(); loadActivity(); })
      .on('postgres_changes', { event: '*',      schema: 'public', table: 'book_copies'     }, () => { loadStats(); loadActivity(); })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [loadStats, loadActivity]);

  const STAT_CARDS = [
    { label: 'Total Users',      value: stats.users,      icon: Icon.users,  sub: 'Registered accounts' },
    { label: 'Books in Catalog', value: stats.books,      icon: Icon.books,  sub: 'Total collection'    },
    { label: 'Books Borrowed',   value: stats.borrowed,   icon: Icon.borrow, sub: 'Currently borrowed today'   },
    { label: "Today's Visitors", value: stats.attendance, icon: Icon.attend, sub: 'Attendance today'    },
  ];

  const QUICK_STATS = [
    { label: 'Available Books',  value: stats.available, color: '#aed581' },
    { label: 'Overdue Returns',  value: stats.overdue,   color: '#ff8a65' },
    { label: 'New Users Today',  value: stats.newUsers,  color: '#E8C97A' },
    { label: 'Pending Requests', value: stats.pending,   color: '#ce93d8' },
  ];

  return (
    <div className="lm-module">
      <style>{SCROLL_STYLE}</style>

      <div className="lm-stats-grid">
        {STAT_CARDS.map(({ label, value, icon, sub }) => (
          <div key={label} className="lm-stat-card">
            <div className="lm-stat-icon">{icon(20)}</div>
            <div className="lm-stat-label">{label}</div>
            <div className="lm-stat-value">
              {loading
                ? <div className="lm-spinner" style={{ width: 18, height: 18 }} />
                : value.toLocaleString()}
            </div>
            <div className="lm-stat-sub">{sub}</div>
          </div>
        ))}
      </div>

      <div className="lm-overview-bottom">

        <div className="lm-activity-card">

          <div className="lm-activity-header">
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.10em', textTransform: 'uppercase', color: '#F5E4A8',
            }}>
              Recent Activity
            </span>
            {!actLoading && activity.length > 0 && (
              <span style={{
                background: 'rgba(201,168,76,0.22)', border: '1px solid rgba(201,168,76,0.40)',
                color: '#F5E4A8', fontSize: 10, fontWeight: 700,
                fontFamily: 'var(--font-sans)', letterSpacing: '0.06em',
                padding: '2px 8px', borderRadius: 99,
              }}>
                {activity.length.toLocaleString()} events
              </span>
            )}
          </div>

          <div className="lm-activity-scroll">
            {actLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 16px', background: 'var(--cream-light)' }}>
                <div className="lm-spinner" style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Loading activity…</span>
              </div>
            ) : activity.length === 0 ? (
              <div style={{ padding: '20px 16px', fontSize: 12.5, color: 'var(--text-dim)', background: 'var(--cream-light)' }}>
                No recent activity found.
              </div>
            ) : (
              activity.map((a, i) => (
                <div
                  key={i}
                  onClick={() => setConfirmDelete({ item: a, index: i })}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 16px',
                    borderBottom: '1px solid rgba(139,0,0,0.07)',
                    backgroundColor: i % 2 === 0 ? 'var(--cream-light)' : 'rgba(139,0,0,0.03)',
                    transition: 'background 0.14s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,0,0,0.06)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--cream-light)' : 'rgba(139,0,0,0.03)'}
                >
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: a.color, flexShrink: 0,
                    boxShadow: `0 0 5px ${a.color}`,
                  }} />
                  {a.tag && (
                    <span style={{
                      flexShrink: 0, fontSize: 9.5, fontWeight: 700,
                      fontFamily: 'var(--font-sans)', letterSpacing: '0.07em',
                      textTransform: 'uppercase', padding: '2px 7px', borderRadius: 99,
                      background: `${a.color}22`, color: a.color,
                      border: `1px solid ${a.color}55`, whiteSpace: 'nowrap',
                    }}>
                      {a.tag}
                    </span>
                  )}
                  <div style={{ flex: 1, fontSize: 12.5, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
                    {a.text}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'var(--font-sans)' }}>
                    {relTime(a.ts)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lm-right-col">

          <div className="lm-panel" style={{ marginBottom: 0 }}>
            <div className="lm-panel-title">Quick Stats</div>
            <div className="lm-quick-stats">
              {QUICK_STATS.map(({ label, value, color }) => (
                <div key={label} className="lm-quick-stat">
                  <span className="lm-quick-stat-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: color, boxShadow: `0 0 4px ${color}`, display: 'inline-block',
                    }} />
                    {label}
                  </span>
                  <span className="lm-quick-stat-value">
                    {loading
                      ? <span style={{ display: 'inline-block', width: 20, height: 10, borderRadius: 4, background: 'rgba(139,0,0,0.10)', verticalAlign: 'middle' }} />
                      : value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="lm-panel" style={{ marginBottom: 0 }}>
            <div className="lm-panel-title">Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Add New Book',  tab: 'catalog' },
                { label: 'Register User', tab: 'users'   },
                { label: 'View Reports',  tab: 'reports' },
              ].map(({ label, tab }) => (
                <button
                  key={tab}
                  className="lm-btn lm-btn--ghost"
                  style={{ width: '100%', justifyContent: 'flex-start', fontSize: 12.5 }}
                  onClick={() => onNavigate?.(tab)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
      {confirmDelete && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            background: 'rgba(10,0,0,0.78)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
          onClick={() => setConfirmDelete(null)}
        >
          <div
            style={{
              background: '#FAF6EE', borderRadius: 20, width: '100%', maxWidth: 380,
              border: '2px solid rgba(201,168,76,0.35)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
              overflow: 'hidden',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              background: 'linear-gradient(135deg, #8B0000, #6B0000)',
              padding: '18px 24px', borderBottom: '2px solid rgba(201,168,76,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: '#F5E4A8', fontWeight: 700 }}>Delete Activity Entry</div>
                <div style={{ fontSize: 11.5, color: 'rgba(245,228,168,0.6)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>This action cannot be undone</div>
              </div>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{
                padding: '12px 14px', borderRadius: 10, marginBottom: 18,
                background: 'rgba(139,0,0,0.06)', border: '1px solid rgba(139,0,0,0.15)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a0000', fontFamily: 'var(--font-sans)' }}>{confirmDelete.item.text}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  onClick={() => setConfirmDelete(null)}
                  style={{
                    padding: '12px', borderRadius: 10, border: '1.5px solid rgba(139,0,0,0.2)',
                    background: 'transparent', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600, color: '#8B0000',
                  }}
                >Cancel</button>
                <button
                  onClick={() => {
                    setActivity(prev => prev.filter((_, i) => i !== confirmDelete.index));
                    setConfirmDelete(null);
                  }}
                  style={{
                    padding: '12px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #8B0000, #6B0000)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 700, color: '#F5E4A8',
                    boxShadow: '0 4px 14px rgba(139,0,0,0.3)',
                  }}
                >Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}