import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, supabaseAdmin } from '../supabaseClient';


const G    = '#C9A84C';
const GP   = '#F5E4A8';
const MAR  = '#8B0000';
const MAR2 = '#6B0000';
const CREAM = '#FAF6EE';

const nowISO  = () => new Date().toISOString();
const today   = () => new Date().toISOString().split('T')[0];
const fmtFull = (iso) => iso
  ? new Date(iso).toLocaleString('en-PH', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:true })
  : '—';


async function syncBooksFromCopies(bookId) {
  const { data: allCopies } = await supabaseAdmin
    .from('book_copies').select('status').eq('book_id', bookId);
  const total     = (allCopies || []).length;
  const available = (allCopies || []).filter(c => c.status === 'Available').length;
  const newStatus = available === 0 ? 'Borrowed' : 'Available';

  const { error: fullErr } = await supabaseAdmin.from('books').update({
    copies: total, available_copies: available, status: newStatus,
  }).eq('id', bookId);

  if (fullErr && (fullErr.code === '42703' || fullErr.message?.includes('available_copies'))) {
    await supabaseAdmin.from('books').update({ copies: total, status: newStatus }).eq('id', bookId);
  }
  return { total, available };
}


function StatusPill({ status }) {
  const cfg = {
    pending:  { bg:'rgba(201,168,76,0.12)', color:'#b08020', border:'rgba(201,168,76,0.30)' },
    approved: { bg:'rgba(46,125,50,0.10)',  color:'#3a7e3c', border:'rgba(90,158,92,0.28)' },
    rejected: { bg:'rgba(139,0,0,0.10)',    color:'#a03030', border:'rgba(139,0,0,0.25)'   },
  }[status?.toLowerCase()] || { bg:'rgba(0,0,0,0.05)', color:'#666', border:'rgba(0,0,0,0.1)' };

  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
      fontFamily:'var(--font-sans)', letterSpacing:'0.05em', textTransform:'capitalize',
      background:cfg.bg, color:cfg.color, border:`1px solid ${cfg.border}`,
    }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:cfg.color, flexShrink:0 }}/>
      {status || 'unknown'}
    </span>
  );
}


function ConfirmDialog({ req, action, onConfirm, onCancel, busy }) {
  if (!req || !action) return null;
  const isApprove = action === 'approve';
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:4000,
      background:'rgba(10,0,0,0.80)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }}>
      <div style={{
        background:CREAM, borderRadius:20, width:'100%', maxWidth:400,
        border:`2px solid rgba(201,168,76,0.35)`,
        boxShadow:'0 24px 64px rgba(0,0,0,0.55)',
        overflow:'hidden',
      }}>
    
        <div style={{
          background:`linear-gradient(135deg,${MAR},${MAR2})`,
          padding:'18px 24px', display:'flex', alignItems:'center', gap:12,
          borderBottom:`2px solid rgba(201,168,76,0.25)`,
        }}>
          <span style={{ fontSize:22 }}>{isApprove ? '✅' : '🚫'}</span>
          <div>
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:15, color:GP, fontWeight:700 }}>
              {isApprove ? 'Approve Request' : 'Reject Request'}
            </div>
            <div style={{ fontSize:11.5, color:'rgba(245,228,168,0.6)', fontFamily:'var(--font-sans)', marginTop:2 }}>
              {isApprove
                ? 'This will mark the book as borrowed.'
                : 'Book availability will not change.'}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 24px' }}>
          <div style={{
            padding:'12px 14px', borderRadius:10, marginBottom:18,
            background:`rgba(139,0,0,0.05)`, border:'1px solid rgba(139,0,0,0.12)',
          }}>
            <div style={{ fontSize:13.5, fontWeight:700, color:'#1a0000', fontFamily:'var(--font-sans)', marginBottom:3 }}>
              {req.book_title}
            </div>
            <div style={{ fontSize:12, color:'#6b4040', fontFamily:'var(--font-sans)' }}>
              {req.student_name}
            </div>
          </div>

          {/* Warning note for reject */}
          {!isApprove && (
            <div style={{
              padding:'10px 13px', borderRadius:9, marginBottom:14,
              background:'rgba(139,0,0,0.07)', border:'1.5px dashed rgba(139,0,0,0.25)',
              display:'flex', alignItems:'flex-start', gap:8,
            }}>
              <span style={{ fontSize:15, flexShrink:0 }}>⚠️</span>
              <span style={{ fontSize:12, color:'#7a2020', fontFamily:'var(--font-sans)', lineHeight:1.5 }}>
                This will permanently reject this borrow request. The student will need to submit a new request. This action cannot be undone.
              </span>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <button
              onClick={onCancel}
              disabled={busy}
              style={{
                padding:'12px', borderRadius:10, cursor:'pointer',
                border:`1.5px solid rgba(139,0,0,0.2)`, background:'transparent',
                fontFamily:'var(--font-sans)', fontSize:13.5, fontWeight:600, color:MAR,
                opacity: busy ? 0.5 : 1,
              }}
            >Cancel</button>
            <button
              onClick={onConfirm}
              disabled={busy}
              style={{
                padding:'12px', borderRadius:10, border:'none', cursor:'pointer',
                background: isApprove
                  ? 'linear-gradient(135deg,#2e7d32,#1b5e20)'
                  : `linear-gradient(135deg,${MAR},${MAR2})`,
                fontFamily:'var(--font-sans)', fontSize:13.5, fontWeight:700, color:GP,
                boxShadow: isApprove ? '0 4px 14px rgba(46,125,50,0.35)' : '0 4px 14px rgba(139,0,0,0.3)',
                opacity: busy ? 0.7 : 1,
              }}
            >
              {busy ? 'Processing…' : isApprove ? 'Approve' : 'Yes, Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestRow({ req, onApprove, onReject }) {
  const [hov, setHov] = useState(false);
  const isPending = req.status === 'pending';

  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? '#FFFFFF' : CREAM,
        borderBottom:'1px solid rgba(139,0,0,0.07)',
        transition:'background 0.15s',
        boxShadow: hov ? 'inset 3px 0 0 0 #C9A84C' : 'inset 3px 0 0 0 transparent',
      }}
    >
      <td style={{ padding:'11px 14px' }}>
        <span style={{ fontSize:12, fontFamily:'monospace', color:'#7a4040', fontWeight:600 }}>
          {req.student_number || req.student_id || '—'}
        </span>
      </td>
      <td style={{ padding:'11px 14px' }}>
        <div style={{ fontSize:13, fontWeight:700, color:'#1a0000', fontFamily:'var(--font-sans)' }}>
          {req.student_name || '—'}
        </div>
        {req.student_program && (
          <div style={{ fontSize:10.5, color:'#9a7070', fontFamily:'var(--font-sans)', marginTop:1 }}>
            {req.student_program}
          </div>
        )}
      </td>
      <td style={{ padding:'11px 14px', maxWidth:200 }}>
        <div style={{ fontSize:13, color:'#2a0a0a', fontFamily:'var(--font-sans)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {req.book_title || '—'}
        </div>
        {req.copy_label && (
          <div style={{ fontSize:10.5, fontFamily:'monospace', color:'#9a7070', marginTop:1 }}>
            {req.copy_label}
          </div>
        )}
      </td>
      <td style={{ padding:'11px 14px' }}>
        <div style={{ fontSize:12, color:'#5a3030', fontFamily:'var(--font-sans)', whiteSpace:'nowrap' }}>
          {fmtFull(req.created_at)}
        </div>
      </td>
      <td style={{ padding:'11px 14px' }}>
        <StatusPill status={req.status} />
      </td>
      <td style={{ padding:'11px 14px', textAlign:'center' }} onClick={e => e.stopPropagation()}>
        {isPending ? (
          <div style={{ display:'flex', gap:7, justifyContent:'center' }}>
        
            <button
              onClick={() => onApprove(req)}
              title="Approve borrow request"
              style={{
                display:'inline-flex', alignItems:'center', gap:5,
                padding:'5px 12px', borderRadius:8, cursor:'pointer',
                border:'1.5px solid rgba(46,125,50,0.30)',
                background:'rgba(46,125,50,0.08)',
                fontFamily:'var(--font-sans)', fontSize:11, fontWeight:700,
                color:'#3a7e3c', transition:'all 0.15s',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Approve
            </button>
            {/* REJECT */}
            <button
              onClick={() => onReject(req)}
              title="Reject borrow request"
              style={{
                display:'inline-flex', alignItems:'center', gap:5,
                padding:'5px 12px', borderRadius:8, cursor:'pointer',
                border:`1.5px solid rgba(139,0,0,0.20)`,
                background:'transparent',
                fontFamily:'var(--font-sans)', fontSize:11, fontWeight:700,
                color:MAR, transition:'all 0.15s',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Reject
            </button>
          </div>
        ) : (
          <span style={{ fontSize:11.5, color:'#9a7070', fontFamily:'var(--font-sans)', fontStyle:'italic' }}>
            {req.status === 'approved' ? 'Approved' : 'Rejected'}
          </span>
        )}
      </td>
    </tr>
  );
}


export default function BorrowRequests({ onBadgeCount }) {
  const [requests,    setRequests]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState('pending');  
  const [confirm,     setConfirm]     = useState(null);      
  const [busy,        setBusy]        = useState(false);
  const [banner,      setBanner]      = useState(null);        
  const bannerTimer = useRef(null);


  const loadRequests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabaseAdmin
      .from('borrow_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) console.error('[BorrowRequests] load error:', error.message);
    const rows = data || [];
    setRequests(rows);
    const pendingCount = rows.filter(r => r.status === 'pending').length;
    onBadgeCount?.(pendingCount);
    setLoading(false);
  }, [onBadgeCount]);

 
  useEffect(() => {
    loadRequests();

    const ch = supabase
      .channel('borrow-requests-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'borrow_requests' },
        (payload) => {
          const newRow = payload.new;
          setRequests(prev => {
          
            if (prev.some(r => r.id === newRow.id)) return prev;
            const updated = [newRow, ...prev];
            const pendingCount = updated.filter(r => r.status === 'pending').length;
            onBadgeCount?.(pendingCount);
            return updated;
          });
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'borrow_requests' },
        (payload) => {
          const updatedRow = payload.new;
          setRequests(prev => {
            const updated = prev.map(r => r.id === updatedRow.id ? updatedRow : r);
            const pendingCount = updated.filter(r => r.status === 'pending').length;
            onBadgeCount?.(pendingCount);
            return updated;
          });
        }
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'borrow_requests' },
        (payload) => {
          const deletedId = payload.old?.id;
          setRequests(prev => {
            const updated = prev.filter(r => r.id !== deletedId);
            const pendingCount = updated.filter(r => r.status === 'pending').length;
            onBadgeCount?.(pendingCount);
            return updated;
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(ch);
  }, [loadRequests, onBadgeCount]);


  const showBanner = (msg, ok = true) => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setBanner({ msg, ok });
    bannerTimer.current = setTimeout(() => setBanner(null), 3500);
  };


  const handleApprove = async () => {
    if (!confirm?.req) return;
    const req = confirm.req;
    setBusy(true);

    try {
      const bookId = req.book_id;
      if (!bookId) throw new Error('No book_id on this request. Cannot approve.');

      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      let resolvedCopyId = UUID_RE.test(req.copy_id) ? req.copy_id : null;

      if (!resolvedCopyId) {
      
        const { data: availCopies, error: findErr } = await supabaseAdmin
          .from('book_copies')
          .select('copy_id, status')
          .eq('book_id', bookId)
          .eq('status', 'Available')
          .limit(1);

        if (findErr) throw new Error(`Could not fetch copies: ${findErr.message}`);
        if (!availCopies || availCopies.length === 0) {
          showBanner('No available copies left for this book. Approval cancelled.', false);
          setConfirm(null);
          setBusy(false);
          return;
        }
        resolvedCopyId = availCopies[0].copy_id;
      } else {
    
        const { data: copyRow } = await supabaseAdmin
          .from('book_copies')
          .select('status')
          .eq('copy_id', resolvedCopyId)
          .maybeSingle();
        if (copyRow?.status === 'Borrowed') {
          showBanner('This copy was already borrowed. Approval cancelled.', false);
          setConfirm(null);
          setBusy(false);
          return;
        }
      }


      const { error: reqErr } = await supabaseAdmin
        .from('borrow_requests')
        .update({ status: 'approved', reviewed_at: nowISO() })
        .eq('id', req.id);
      if (reqErr) throw new Error(`Request update failed: ${reqErr.message}`);


      const { error: copyErr } = await supabaseAdmin
        .from('book_copies')
        .update({ status: 'Borrowed' })
        .eq('copy_id', resolvedCopyId);
      if (copyErr) throw new Error(`Copy update failed: ${copyErr.message}`);


      await syncBooksFromCopies(bookId);


      const { data: existing } = await supabaseAdmin
        .from('borrowings')
        .select('id')
        .eq('student_id', req.student_id)
        .eq('book_id', req.book_id)
        .is('returned_at', null)
        .maybeSingle();

      if (!existing) {
        const borrowingPayload = {
          student_id:        req.student_id      || null,
          student_number:    req.student_number  || req.student_id || null,
          student_name:      req.student_name    || null,
          student_program:   req.student_program || '',
          student_email:     req.student_email   || null,
          book_id:           bookId,
          book_title:        req.book_title      || null,
          copy_label:        resolvedCopyId,
          status:            'Borrowed',
          borrowed_at:       nowISO(),
          returned_at:       null,
          date:              today(),
        };
     
        Object.keys(borrowingPayload).forEach(k => {
          if (borrowingPayload[k] === undefined) delete borrowingPayload[k];
        });

        const { error: borrowErr } = await supabaseAdmin
          .from('borrowings')
          .insert([borrowingPayload]);

        if (borrowErr) {
          console.warn('[BorrowRequests] borrowings insert failed (non-fatal):', borrowErr.message);
        }
      }

      showBanner(`✅ Approved — "${req.book_title}" is now marked as borrowed.`);
      await loadRequests();

    } catch (err) {
      console.error('[BorrowRequests] approve error:', err);
      showBanner(`❌ ${err.message}`, false);
    }

    setConfirm(null);
    setBusy(false);
  };


  const handleReject = async () => {
    if (!confirm?.req) return;
    const req = confirm.req;
    setBusy(true);

    try {
      const { error: reqErr } = await supabaseAdmin
        .from('borrow_requests')
        .update({ status: 'rejected', reviewed_at: nowISO() })
        .eq('id', req.id);
      if (reqErr) throw new Error(`Rejection failed: ${reqErr.message}`);

      showBanner(`Request for "${req.book_title}" was rejected. Book availability unchanged.`);
      await loadRequests();

    } catch (err) {
      console.error('[BorrowRequests] reject error:', err);
      showBanner(`❌ ${err.message}`, false);
    }

    setConfirm(null);
    setBusy(false);
  };

 
  const displayed = filter === 'all'
    ? requests
    : requests.filter(r => r.status === filter);

  const pendingCount = requests.filter(r => r.status === 'pending').length;


  return (
    <div style={{ fontFamily:'var(--font-sans)' }}>

   
      {banner && (
        <div style={{
          margin:'0 0 16px', padding:'12px 18px', borderRadius:10,
          background: banner.ok ? 'rgba(46,125,50,0.10)' : 'rgba(139,0,0,0.08)',
          border:`1.5px solid ${banner.ok ? 'rgba(90,158,92,0.30)' : 'rgba(139,0,0,0.20)'}`,
          color: banner.ok ? '#2e6b30' : MAR,
          fontSize:13, fontWeight:600,
        }}>
          {banner.msg}
        </div>
      )}

  
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        flexWrap:'wrap', gap:10, marginBottom:16,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{
            fontFamily:"'Cinzel',serif", fontSize:15, fontWeight:700, color:MAR,
          }}>Borrow Requests</div>
          {pendingCount > 0 && (
            <span style={{
              padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:800,
              background:`rgba(201,168,76,0.18)`, color:'#b08020',
              border:'1px solid rgba(201,168,76,0.30)',
            }}>{pendingCount} pending</span>
          )}
        </div>

        {/* Filter tabs */}
        <div style={{ display:'flex', gap:6 }}>
          {['pending','approved','rejected','all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding:'5px 13px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600,
                fontFamily:'var(--font-sans)', textTransform:'capitalize',
                border: filter === f ? `1.5px solid ${MAR}` : '1.5px solid rgba(139,0,0,0.15)',
                background: filter === f ? `rgba(139,0,0,0.08)` : 'transparent',
                color: filter === f ? MAR : '#9a7070',
                transition:'all 0.15s',
              }}
            >{f}</button>
          ))}
        </div>
      </div>

   
      {loading ? (
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'48px 0', justifyContent:'center' }}>
          <div className="lm-spinner" />
          <span style={{ color:'var(--text-muted)', fontSize:13 }}>Loading requests…</span>
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ textAlign:'center', padding:'52px 24px' }}>
          <div style={{ fontSize:36, marginBottom:10 }}>📋</div>
          <div style={{ fontFamily:"'Cinzel',serif", fontSize:14, color:MAR, marginBottom:6 }}>
            {filter === 'pending' ? 'No pending requests' : `No ${filter} requests`}
          </div>
          <div style={{ fontSize:12.5, color:'var(--text-dim)' }}>
            {filter === 'pending'
              ? 'Students can submit borrow requests from the mobile app.'
              : 'Switch the filter to see other requests.'}
          </div>
        </div>
      ) : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:720 }}>
            <thead>
              <tr style={{ background:`linear-gradient(135deg,${MAR},${MAR2})` }}>
                {['Student No.','Student Name','Book / Copy','Requested At','Status','Actions'].map(h => (
                  <th key={h} style={{
                    padding:'12px 14px', textAlign:'left',
                    fontFamily:'var(--font-sans)', fontSize:10.5, fontWeight:800,
                    letterSpacing:'0.12em', textTransform:'uppercase',
                    color:GP, whiteSpace:'nowrap',
                    borderBottom:`2.5px solid rgba(201,168,76,0.4)`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(req => (
                <RequestRow
                  key={req.id}
                  req={req}
                  onApprove={r => setConfirm({ req: r, action:'approve' })}
                  onReject={r  => setConfirm({ req: r, action:'reject'  })}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

     
      {confirm && (
        <ConfirmDialog
          req={confirm.req}
          action={confirm.action}
          onConfirm={confirm.action === 'approve' ? handleApprove : handleReject}
          onCancel={() => setConfirm(null)}
          busy={busy}
        />
      )}
    </div>
  );
}