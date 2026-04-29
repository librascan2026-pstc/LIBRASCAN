// src/Admin_Dashboard/OnlineCatalog.jsx
// Extracted from Dashboard.jsx — self-contained catalog module.
// Requires CSS classes injected by Dashboard.jsx.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const G  = '#C9A84C';
const GP = '#F5E4A8';

function Toast({ message }) {
  if (!message) return null;
  return <div className="lm-toast">{message}</div>;
}

function StatusBadge({ available }) {
  return (
    <span className="lm-status-badge" style={{
      background: available ? 'rgba(46,125,50,0.12)' : 'rgba(198,40,40,0.12)',
      color: available ? '#81c784' : '#ef9a9a',
      border: `1px solid ${available ? 'rgba(129,199,132,0.25)' : 'rgba(239,154,154,0.25)'}`,
    }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:'currentColor', display:'inline-block' }}/>
      {available ? 'Available' : 'Checked Out'}
    </span>
  );
}

const Icon = {
  search: (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  plus:   (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit:   (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash:  (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  eye:    (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff: (s=16) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
};

const GENRES = ['Fiction','Non-Fiction','Science','Technology','History','Philosophy','Literature','Mathematics','Engineering','Social Science','Arts','Reference'];

const SAMPLE_BOOKS = [
  { id:'b1', title:'Introduction to Algorithms', author:'Cormen, Leiserson, Rivest, Stein', genre:'Technology', isbn:'978-0-262-03384-8', publisher:'MIT Press', year:2022, copies:3, available:true, description:'A comprehensive introduction to algorithms.' },
  { id:'b2', title:'Database System Concepts', author:'Abraham Silberschatz', genre:'Technology', isbn:'978-0-07-802215-9', publisher:'McGraw-Hill', year:2020, copies:2, available:false, description:'The definitive resource for database systems.' },
  { id:'b3', title:'Discrete Mathematics', author:'Kenneth H. Rosen', genre:'Mathematics', isbn:'978-0-07-338309-5', publisher:'McGraw-Hill', year:2019, copies:4, available:true, description:'Covers mathematical foundations of computer science.' },
  { id:'b4', title:'The Great Gatsby', author:'F. Scott Fitzgerald', genre:'Literature', isbn:'978-0-7432-7356-5', publisher:'Scribner', year:1925, copies:2, available:true, description:'A story of the American dream.' },
  { id:'b5', title:'Clean Code', author:'Robert C. Martin', genre:'Technology', isbn:'978-0-13-235088-4', publisher:'Prentice Hall', year:2008, copies:2, available:false, description:'A handbook of agile software craftsmanship.' },
  { id:'b6', title:'Sapiens: A Brief History', author:'Yuval Noah Harari', genre:'History', isbn:'978-0-06-231609-7', publisher:'Harper Perennial', year:2015, copies:1, available:true, description:'How Homo sapiens came to dominate Earth.' },
];

function BookModal({ book, onClose, onSave }) {
  const isEdit = Boolean(book?.id);
  const [form, setForm] = useState({
    title: book?.title || '', author: book?.author || '', isbn: book?.isbn || '',
    genre: book?.genre || GENRES[0], publisher: book?.publisher || '',
    year: book?.year || new Date().getFullYear(), copies: book?.copies || 1,
    available: book?.available !== undefined ? book.available : true,
    description: book?.description || '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiErr, setApiErr] = useState('');

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const validate = () => {
    const errs = {};
    if (!form.title.trim())  errs.title  = 'Title is required.';
    if (!form.author.trim()) errs.author = 'Author is required.';
    return errs;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true); setApiErr('');
    try { await onSave({ ...form, id: book?.id }); onClose(); }
    catch (err) { setApiErr(err.message || 'An error occurred.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="lm-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="lm-modal" style={{ maxWidth: 580 }}>
        <div className="lm-modal-header">
          <h2 className="lm-modal-title">{isEdit ? 'Edit Book' : 'Add New Book'}</h2>
          <button className="lm-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="lm-modal-body">
          {apiErr && <div className="lm-error-banner">{apiErr}</div>}
          <div className="lm-form-group">
            <label className="lm-label">Title *</label>
            <input className={`lm-input${errors.title ? ' lm-input--error' : ''}`}
              value={form.title} onChange={e => set('title', e.target.value)} placeholder="Book title" />
            {errors.title && <span className="lm-field-error">{errors.title}</span>}
          </div>
          <div className="lm-form-row">
            <div className="lm-form-group">
              <label className="lm-label">Author *</label>
              <input className={`lm-input${errors.author ? ' lm-input--error' : ''}`}
                value={form.author} onChange={e => set('author', e.target.value)} placeholder="Author name" />
              {errors.author && <span className="lm-field-error">{errors.author}</span>}
            </div>
            <div className="lm-form-group">
              <label className="lm-label">ISBN</label>
              <input className="lm-input" value={form.isbn} onChange={e => set('isbn', e.target.value)} placeholder="978-x-xxx-xxxxx-x" />
            </div>
          </div>
          <div className="lm-form-row">
            <div className="lm-form-group">
              <label className="lm-label">Genre</label>
              <select className="lm-select" value={form.genre} onChange={e => set('genre', e.target.value)} style={{ width:'100%', borderRadius:10 }}>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="lm-form-group">
              <label className="lm-label">Publisher</label>
              <input className="lm-input" value={form.publisher} onChange={e => set('publisher', e.target.value)} placeholder="Publisher name" />
            </div>
          </div>
          <div className="lm-form-row">
            <div className="lm-form-group">
              <label className="lm-label">Year Published</label>
              <input className="lm-input" type="number" value={form.year} min="1800" max={new Date().getFullYear()}
                onChange={e => set('year', e.target.value)} />
            </div>
            <div className="lm-form-group">
              <label className="lm-label">Total Copies</label>
              <input className="lm-input" type="number" value={form.copies} min="1"
                onChange={e => set('copies', e.target.value)} />
            </div>
          </div>
          <div className="lm-form-group">
            <label className="lm-label">Availability</label>
            <div style={{ display:'flex', gap:12 }}>
              {[{ v: true, label:'Available' }, { v: false, label:'Checked Out' }].map(({ v, label }) => (
                <label key={label} style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:13, color:'var(--text-muted)' }}>
                  <input type="radio" checked={form.available === v} onChange={() => set('available', v)} style={{ accentColor: G }} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="lm-form-group">
            <label className="lm-label">Description</label>
            <textarea className="lm-textarea" value={form.description}
              onChange={e => set('description', e.target.value)} placeholder="Brief description of the book…" />
          </div>
        </div>
        <div className="lm-modal-footer">
          <button className="lm-btn lm-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="lm-btn lm-btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Book')}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteBookModal({ book, loading, onClose, onConfirm }) {
  return (
    <div className="lm-modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="lm-modal lm-modal--sm">
        <div className="lm-modal-header">
          <h2 className="lm-modal-title" style={{ color:'#ef9a9a' }}>Remove Book</h2>
          <button className="lm-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="lm-modal-body">
          <p style={{ color:'rgba(245,228,168,0.8)', fontSize:14, lineHeight:1.65, margin:0 }}>
            Remove <strong style={{ color:GP }}>"{book?.title}"</strong> from the catalog?<br/>
            <span style={{ fontSize:12, color:'rgba(239,154,154,0.7)', fontStyle:'italic' }}>This action cannot be undone.</span>
          </p>
        </div>
        <div className="lm-modal-footer">
          <button className="lm-btn lm-btn--ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="lm-btn lm-btn--danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Removing…' : 'Remove Book'}
          </button>
        </div>
      </div>
    </div>
  );
}

const getEmoji = (genre) => {
  const map = { Technology:'💻', Mathematics:'📐', Literature:'📖', History:'🏛️', Science:'🔬', Philosophy:'🧠', Fiction:'✨', Arts:'🎨', Engineering:'⚙️', Reference:'📚' };
  return map[genre] || '📗';
};

export default function OnlineCatalog({ onStatsRefresh }) {
  const [books,      setBooks]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [availFilter, setAvailFilter] = useState('all');
  const [showModal,  setShowModal]  = useState(false);
  const [modalBook,  setModalBook]  = useState(null);
  const [deleteBook, setDeleteBook] = useState(null);
  const [deleting,   setDeleting]   = useState(false);
  const [toast,      setToast]      = useState('');
  const [viewMode,   setViewMode]   = useState('grid');

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('books').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setBooks(data || []);
    } catch {
      setBooks(SAMPLE_BOOKS);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadBooks(); }, [loadBooks]);

  const handleSave = async (formData) => {
    if (formData.id) {
      const { error } = await supabase.from('books').update({ ...formData, updated_at: new Date().toISOString() }).eq('id', formData.id);
      if (error) throw error;
      showToast('✓ Book updated.');
    } else {
      const { error } = await supabase.from('books').insert({ ...formData, created_at: new Date().toISOString() });
      if (error) throw error;
      showToast('✓ Book added to catalog.');
    }
    await loadBooks(); onStatsRefresh?.();
  };

  const handleDelete = async () => {
    if (!deleteBook) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('books').delete().eq('id', deleteBook.id);
      if (error) throw error;
      showToast('✓ Book removed.'); setDeleteBook(null);
      await loadBooks(); onStatsRefresh?.();
    } catch (err) { showToast('⚠ ' + err.message); }
    finally { setDeleting(false); }
  };

  const uniqueGenres = ['all', ...new Set(books.map(b => b.genre).filter(Boolean))];
  const filtered = books.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q || [b.title, b.author, b.isbn].join(' ').toLowerCase().includes(q);
    const matchGenre = genreFilter === 'all' || b.genre === genreFilter;
    const matchAvail = availFilter === 'all' || (availFilter === 'available' ? b.available : !b.available);
    return matchSearch && matchGenre && matchAvail;
  });

  return (
    <div className="lm-module">
      <Toast message={toast} />
      <div className="lm-module-header">
        <div>
          <h2 className="lm-module-title">Online Catalog</h2>
          <p className="lm-module-subtitle">Browse, search, and manage the library's book collection.</p>
        </div>
        <button className="lm-btn lm-btn--primary" onClick={() => { setModalBook(null); setShowModal(true); }}>
          {Icon.plus(14)} Add Book
        </button>
      </div>

      <div className="lm-filters">
        <div className="lm-search-wrap">
          <span className="lm-search-icon">{Icon.search(14)}</span>
          <input className="lm-search" type="text" placeholder="Search books, authors, ISBN…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="lm-select lm-select--sm" value={genreFilter} onChange={e => setGenreFilter(e.target.value)}>
          {uniqueGenres.map(g => <option key={g} value={g}>{g === 'all' ? 'All Genres' : g}</option>)}
        </select>
        <select className="lm-select lm-select--sm" value={availFilter} onChange={e => setAvailFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="out">Checked Out</option>
        </select>
        <span className="lm-count">{filtered.length} {filtered.length === 1 ? 'book' : 'books'}</span>
        <div style={{ display:'flex', gap:4, marginLeft:'auto' }}>
          {['grid','list'].map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{
              padding:'7px 10px', borderRadius:8, border:'1px solid',
              borderColor: viewMode === mode ? 'rgba(201,168,76,0.4)' : 'rgba(201,168,76,0.12)',
              background: viewMode === mode ? 'rgba(201,168,76,0.12)' : 'transparent',
              color: viewMode === mode ? G : 'var(--text-dim)',
              cursor:'pointer', fontSize:11, fontFamily:'var(--font-sans)',
            }}>
              {mode === 'grid' ? '⊞' : '☰'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="lm-loading"><div className="lm-spinner"/><span style={{ color:'var(--text-muted)', fontSize:13 }}>Loading catalog…</span></div>
      ) : filtered.length === 0 ? (
        <div className="lm-empty">
          <div className="lm-empty-icon">📚</div>
          <div className="lm-empty-text">No books found</div>
          {search && <div className="lm-empty-sub">Try a different search term</div>}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="lm-book-grid">
          {filtered.map(b => (
            <div key={b.id} className="lm-book-card">
              <div className="lm-book-cover" style={{ background:'linear-gradient(135deg,rgba(139,0,0,0.2),rgba(201,168,76,0.08))' }}>
                {getEmoji(b.genre)}
              </div>
              <div className="lm-book-info">
                <div className="lm-book-title">{b.title}</div>
                <div className="lm-book-author">{b.author}</div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', marginBottom:6 }}>
                  {b.genre && <span className="lm-book-genre">{b.genre}</span>}
                  <StatusBadge available={b.available} />
                </div>
                {b.copies && (
                  <div style={{ fontSize:10.5, color:'var(--text-dim)', fontFamily:'var(--font-sans)', marginBottom:8 }}>
                    {b.copies} cop{b.copies === 1 ? 'y' : 'ies'} · {b.year || '—'}
                  </div>
                )}
                <div className="lm-book-actions">
                  <button className="lm-table-btn lm-table-btn--edit" style={{ flex:1, justifyContent:'center' }}
                    onClick={() => { setModalBook(b); setShowModal(true); }}>
                    {Icon.edit(12)} Edit
                  </button>
                  <button className="lm-table-btn lm-table-btn--delete" style={{ flex:1, justifyContent:'center' }}
                    onClick={() => setDeleteBook(b)}>
                    {Icon.trash(12)} Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="lm-table-wrap">
          <table className="lm-table">
            <thead>
              <tr>
                <th>Title</th><th>Author</th><th>Genre</th><th>ISBN</th>
                <th>Year</th><th>Copies</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id}>
                  <td style={{ maxWidth:200 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:20 }}>{getEmoji(b.genre)}</span>
                      <span style={{ fontWeight:600, color:'var(--text-primary)', fontSize:13 }}>{b.title}</span>
                    </div>
                  </td>
                  <td className="lm-cell-muted" style={{ fontSize:12 }}>{b.author}</td>
                  <td>{b.genre && <span className="lm-book-genre">{b.genre}</span>}</td>
                  <td className="lm-cell-muted" style={{ fontFamily:'var(--font-sans)', fontSize:11 }}>{b.isbn || '—'}</td>
                  <td className="lm-cell-muted lm-cell-date">{b.year || '—'}</td>
                  <td className="lm-cell-muted lm-cell-date">{b.copies || 1}</td>
                  <td><StatusBadge available={b.available}/></td>
                  <td>
                    <div className="lm-table-actions">
                      <button className="lm-table-btn lm-table-btn--edit" onClick={() => { setModalBook(b); setShowModal(true); }}>
                        {Icon.edit(12)} Edit
                      </button>
                      <button className="lm-table-btn lm-table-btn--delete" onClick={() => setDeleteBook(b)}>
                        {Icon.trash(12)} Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && <BookModal book={modalBook} onClose={() => setShowModal(false)} onSave={handleSave}/>}
      {deleteBook && <ConfirmDeleteBookModal book={deleteBook} loading={deleting} onClose={() => setDeleteBook(null)} onConfirm={handleDelete}/>}
    </div>
  );
}