// src/Admin_Dashboard/Book_Catalog.jsx
// Full-featured Book Catalog — LIBRASCAN Library Management System
// Supabase DB + Storage · QR Code · Image Upload · CRUD · View/Edit/Delete

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, supabaseAdmin } from '../supabaseClient';
import QRCode from 'qrcode';
import { extractAbstractText } from '../ocrClient';

// ─── Constants ────────────────────────────────────────────────────────────────
const G  = '#C9A84C';
const GP = '#F5E4A8';
const BUCKET = 'book-images';

const SHELF_LOCATIONS = [
  'All Book',
  'Filipiniana Section',
  'Circulation Section',
  'Reference Section',
  'Thesis/Capstone',
  'Online Book Section',
];

const GENRES = [
  'Fiction',
  'Non-Fiction',
  'Science',
  'Technology',
  'History',
  'Education',
  'Thesis/Capstone',
  'Others',
];

const EMPTY_FORM = {
  title: '',
  volume_title: '',
  authors: '',
  publisher: '',
  place_of_publication: '',
  year: new Date().getFullYear(),
  volume_number: '',
  edition: '',
  isbn: '',
  shelf_location: SHELF_LOCATIONS[0],
  pages: '',
  genre: GENRES[0],
  copies: 1,
  color: '',
  abstract_image_url: '',
  abstract_text: '',
  cover_image_url: '',
  qr_code_url: '',
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const Ic = {
  search:   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  plus:     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit:     <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  eye:      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  qr:       <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3"/></svg>,
  download: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  close:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  upload:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  book:     <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  refresh:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-3.26"/></svg>,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function uploadImage(file, folder = 'covers') {
  const ext  = file.name.split('.').pop();
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  // Use supabaseAdmin to bypass storage RLS policies
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function generateAndUploadQR(value) {
  const dataUrl = await QRCode.toDataURL(value, { width: 300, margin: 2, color: { dark: '#5A0000', light: '#FDF8F0' } });
  const res     = await fetch(dataUrl);
  const blob    = await res.blob();
  const safeVal = value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  const file    = new File([blob], `qr_${safeVal}.png`, { type: 'image/png' });
  return uploadImage(file, 'qrcodes');
}

// Generate a QR data URL for a specific copy (ISBN + copy number), returns { dataUrl, label }
async function generateCopyQR(isbn, copyNum, title) {
  const base  = isbn?.trim() || title?.trim() || 'BOOK';
  const value = `${base}-COPY${String(copyNum).padStart(3, '0')}`;
  const dataUrl = await QRCode.toDataURL(value, { width: 400, margin: 2, color: { dark: '#5A0000', light: '#FDF8F0' } });
  return { dataUrl, label: value };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toast({ message, type = 'success' }) {
  if (!message) return null;
  const colors = {
    success: { bg: 'rgba(30,0,0,0.95)', border: 'rgba(201,168,76,0.40)', dot: '#81c784' },
    error:   { bg: 'rgba(100,0,0,0.96)', border: 'rgba(239,154,154,0.40)', dot: '#ef9a9a' },
  };
  const c = colors[type] || colors.success;
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9999,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 12, padding: '13px 20px',
      display: 'flex', alignItems: 'center', gap: 10,
      fontFamily: 'var(--font-sans)', fontSize: 13, color: GP,
      boxShadow: '0 10px 32px rgba(40,0,0,0.44)',
      animation: 'lm-toast-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      maxWidth: 340,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {message}
    </div>
  );
}

function StatusBadge({ status }) {
  const avail = status === 'Available';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
      fontFamily: 'var(--font-sans)',
      background: avail ? 'rgba(46,125,50,0.10)' : 'rgba(198,40,40,0.10)',
      color: avail ? '#5a9e5c' : '#c0564e',
      border: `1px solid ${avail ? 'rgba(90,158,92,0.25)' : 'rgba(192,86,78,0.25)'}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
      {status || 'Available'}
    </span>
  );
}

function FieldLabel({ children, required }) {
  return (
    <label style={{
      display: 'block', fontFamily: 'var(--font-sans)',
      fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em',
      textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 5,
    }}>
      {children}{required && <span style={{ color: '#c0564e', marginLeft: 3 }}>*</span>}
    </label>
  );
}

const inputStyle = (error) => ({
  width: '100%', padding: '9px 12px',
  background: 'var(--cream-light)', color: 'var(--text-primary)',
  border: `1px solid ${error ? 'rgba(192,86,78,0.5)' : 'var(--border-cream)'}`,
  borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-sans)',
  outline: 'none', transition: 'border-color 0.18s',
  boxSizing: 'border-box',
});

function ImageUploadField({ label, value, preview, onFileChange, accept = 'image/*' }) {
  const ref = useRef();
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div
        onClick={() => ref.current?.click()}
        style={{
          border: '1.5px dashed rgba(139,0,0,0.28)', borderRadius: 10,
          padding: preview ? 0 : '18px 12px',
          cursor: 'pointer', textAlign: 'center',
          background: 'rgba(253,248,240,0.7)',
          transition: 'border-color 0.18s, background 0.18s',
          overflow: 'hidden', position: 'relative',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(139,0,0,0.55)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(139,0,0,0.28)'}
      >
        {preview ? (
          <div style={{ position: 'relative' }}>
            <img src={preview} alt="preview"
              style={{ width: '100%', maxHeight: 130, objectFit: 'cover', display: 'block' }} />
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(90,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.18s',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0}
            >
              <span style={{ color: GP, fontSize: 12, fontFamily: 'var(--font-sans)' }}>
                {Ic.upload} Change
              </span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--text-dim)', opacity: 0.6 }}>{Ic.upload}</span>
            <span style={{ fontSize: 11.5, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)' }}>
              Click to upload
            </span>
            {value && <span style={{ fontSize: 10, color: 'var(--text-dim)', wordBreak: 'break-all' }}>Has existing image</span>}
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onFileChange(f); e.target.value = ''; }} />
    </div>
  );
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────
function BookFormModal({ book, onClose, onSaved }) {
  const isEdit = Boolean(book?.id);
  const [form, setForm]         = useState(book ? { ...EMPTY_FORM, ...book } : { ...EMPTY_FORM });
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [apiErr, setApiErr]     = useState('');
  const [coverFile, setCoverFile]    = useState(null);
  const [abstractFile, setAbstractFile] = useState(null);
  const [coverPreview, setCoverPreview]    = useState(book?.cover_image_url || '');
  const [abstractPreview, setAbstractPreview] = useState(book?.abstract_image_url || '');
  // abstract_text is stored as JSON string: { heading, paragraphs, keywords }
  const parseAbstractText = (v) => {
    if (!v) return null;
    if (typeof v === 'object') return v;
    try { return JSON.parse(v); } catch { return { heading: '', paragraphs: [v], keywords: [] }; }
  };
  const [abstractData, setAbstractData]   = useState(() => parseAbstractText(book?.abstract_text));
  const [abstractOcrLoading, setAbstractOcrLoading] = useState(false);
  const [abstractOcrError,   setAbstractOcrError]   = useState('');
  const [abstractOcrProgress, setAbstractOcrProgress] = useState('');
  const [qrProgress, setQrProgress] = useState('');

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  const handleCoverFile = (f) => {
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  };
  const handleAbstractFile = async (f) => {
    setAbstractFile(f);
    setAbstractPreview(URL.createObjectURL(f));
    setAbstractOcrLoading(true);
    setAbstractOcrError('');
    try {
      const structured = await extractAbstractText(f, (pct, status) => {
        // Live Tesseract progress fed into the loading label
        const label = status?.replace(/_/g, ' ') || 'processing';
        setAbstractOcrProgress(`${label} — ${pct}%`);
      });
      setAbstractData(structured);
      setForm(prev => ({ ...prev, abstract_text: JSON.stringify(structured) }));
    } catch (err) {
      setAbstractOcrError('Could not read text from image: ' + (err.message || 'Unknown error'));
    } finally {
      setAbstractOcrLoading(false);
      setAbstractOcrProgress('');
    }
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim())   e.title   = 'Title is required.';
    if (!form.authors.trim()) e.authors = 'Author(s) required.';
    return e;
  };

  const handleSave = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true); setApiErr('');
    try {
      const payload = { ...form };

      // Auto-compute status from copies
      payload.status = parseInt(payload.copies) > 0 ? 'Available' : 'Borrowed';

      // Upload images via supabaseAdmin (bypasses storage RLS)
      if (coverFile) {
        payload.cover_image_url = await uploadImage(coverFile, 'covers');
      }
      if (abstractFile) {
        payload.abstract_image_url = await uploadImage(abstractFile, 'abstracts');
      }
      // Persist extracted abstract text (stored as JSON string)
      if (abstractData) {
        payload.abstract_text = JSON.stringify(abstractData);
      }
      // Generate + upload QR
      const qrValue = form.isbn?.trim() || form.title?.trim();
      if (qrValue) {
        setQrProgress('Generating QR…');
        payload.qr_code_url = await generateAndUploadQR(qrValue);
        setQrProgress('');
      }

      const { id, ...rest } = payload;

      // supabaseAdmin uses the service-role key — fully bypasses RLS on the books table
      if (isEdit) {
        const { error } = await supabaseAdmin.from('books').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin.from('books').insert(rest);
        if (error) throw error;
      }

      onSaved();
      onClose();
    } catch (err) {
      setApiErr(err.message || 'An unexpected error occurred.');
    } finally {
      setSaving(false);
      setQrProgress('');
    }
  };

  // Section divider
  const SectionTitle = ({ children }) => (
    <div style={{
      fontFamily: 'var(--font-display)', fontSize: 11.5, letterSpacing: '0.1em',
      textTransform: 'uppercase', color: 'var(--maroon-mid)',
      borderBottom: '1px solid rgba(139,0,0,0.13)',
      paddingBottom: 8, marginBottom: 14, marginTop: 6,
    }}>{children}</div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(20,0,0,0.55)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 1000, padding: '24px 16px', overflowY: 'auto',
      backdropFilter: 'blur(4px)',
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--cream)', borderRadius: 14,
        border: '1px solid rgba(139,0,0,0.20)',
        boxShadow: '0 20px 60px rgba(30,0,0,0.38)',
        width: '100%', maxWidth: 720,
        animation: 'lm-fade-in 0.25s ease',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px',
          background: 'linear-gradient(135deg, var(--maroon-deep), var(--maroon-mid))',
          borderBottom: '1px solid rgba(201,168,76,0.20)',
          borderRadius: '14px 14px 0 0',
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.40),transparent)' }} />
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 600,
              color: '#F5E4A8', letterSpacing: '0.05em',
            }}>
              {isEdit ? 'Edit Book Record' : 'Add New Book'}
            </h2>
            <p style={{ fontSize: 12, color: 'rgba(245,228,168,0.65)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>
              {isEdit ? 'Update the book information below.' : 'Fill in the details to add a new book to the catalog.'}
            </p>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(245,228,168,0.10)', border: '1px solid rgba(245,228,168,0.18)',
            color: 'rgba(245,228,168,0.70)', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.18s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,228,168,0.22)'; e.currentTarget.style.color = '#F5E4A8'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,228,168,0.10)'; e.currentTarget.style.color = 'rgba(245,228,168,0.70)'; }}
          >
            {Ic.close}
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 24px', maxHeight: 'calc(90vh - 140px)', overflowY: 'auto' }}>
          {apiErr && (
            <div style={{
              background: 'rgba(139,0,0,0.08)', border: '1px solid rgba(139,0,0,0.22)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              fontSize: 12.5, color: 'var(--maroon-light)', fontFamily: 'var(--font-sans)',
            }}>{apiErr}</div>
          )}

          <SectionTitle>Book Information</SectionTitle>
          {/* Title */}
          <div style={{ marginBottom: 14 }}>
            <FieldLabel required>Book Title</FieldLabel>
            <input style={inputStyle(errors.title)} value={form.title}
              onChange={e => set('title', e.target.value)} placeholder="Enter book title" />
            {errors.title && <span style={{ fontSize: 11, color: '#c0564e', fontFamily: 'var(--font-sans)' }}>{errors.title}</span>}
          </div>
          {/* Volume Title */}
          <div style={{ marginBottom: 14 }}>
            <FieldLabel>Volume Title</FieldLabel>
            <input style={inputStyle()} value={form.volume_title}
              onChange={e => set('volume_title', e.target.value)} placeholder="Volume title (if any)" />
          </div>
          {/* Authors */}
          <div style={{ marginBottom: 14 }}>
            <FieldLabel required>Authors</FieldLabel>
            <input style={inputStyle(errors.authors)} value={form.authors}
              onChange={e => set('authors', e.target.value)} placeholder="e.g. Cormen, Leiserson, Rivest" />
            {errors.authors && <span style={{ fontSize: 11, color: '#c0564e', fontFamily: 'var(--font-sans)' }}>{errors.authors}</span>}
          </div>
          {/* Publisher + Place */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <FieldLabel>Publisher</FieldLabel>
              <input style={inputStyle()} value={form.publisher}
                onChange={e => set('publisher', e.target.value)} placeholder="Publisher name" />
            </div>
            <div>
              <FieldLabel>Place of Publication</FieldLabel>
              <input style={inputStyle()} value={form.place_of_publication}
                onChange={e => set('place_of_publication', e.target.value)} placeholder="City, Country" />
            </div>
          </div>
          {/* Year + Volume + Edition */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <FieldLabel>Year Published</FieldLabel>
              <input style={inputStyle()} type="number" min="1800" max={new Date().getFullYear() + 1}
                value={form.year} onChange={e => set('year', e.target.value)} />
            </div>
            <div>
              <FieldLabel>Volume Number</FieldLabel>
              <input style={inputStyle()} value={form.volume_number}
                onChange={e => set('volume_number', e.target.value)} placeholder="e.g. Vol. 2" />
            </div>
            <div>
              <FieldLabel>Edition</FieldLabel>
              <input style={inputStyle()} value={form.edition}
                onChange={e => set('edition', e.target.value)} placeholder="e.g. 3rd" />
            </div>
          </div>
          {/* ISBN + Pages */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <FieldLabel>ISBN</FieldLabel>
              <input style={inputStyle()} value={form.isbn}
                onChange={e => set('isbn', e.target.value)} placeholder="978-x-xxx-xxxxx-x" />
            </div>
            <div>
              <FieldLabel>Total Pages</FieldLabel>
              <input style={inputStyle()} type="number" min="1"
                value={form.pages} onChange={e => set('pages', e.target.value)} placeholder="e.g. 512" />
            </div>
          </div>

          <SectionTitle>Classification</SectionTitle>
          {/* Shelf + Genre */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <FieldLabel>Shelf Location</FieldLabel>
              <select style={{ ...inputStyle(), appearance: 'none', cursor: 'pointer' }}
                value={form.shelf_location} onChange={e => set('shelf_location', e.target.value)}>
                {SHELF_LOCATIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Genre</FieldLabel>
              <select style={{ ...inputStyle(), appearance: 'none', cursor: 'pointer' }}
                value={form.genre} onChange={e => set('genre', e.target.value)}>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          {/* Copies + Color — Status is auto-computed */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
            <div>
              <FieldLabel>Copies</FieldLabel>
              <input style={inputStyle()} type="number" min="0"
                value={form.copies} onChange={e => set('copies', e.target.value)} />
            </div>
            <div>
              <FieldLabel>Color</FieldLabel>
              <input style={inputStyle()} value={form.color}
                onChange={e => set('color', e.target.value)} placeholder="e.g. Red" />
            </div>
          </div>
          {/* Auto status preview */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
            padding: '8px 12px', borderRadius: 8,
            background: parseInt(form.copies) > 0 ? 'rgba(46,125,50,0.07)' : 'rgba(192,86,78,0.07)',
            border: `1px solid ${parseInt(form.copies) > 0 ? 'rgba(90,158,92,0.22)' : 'rgba(192,86,78,0.22)'}`,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: parseInt(form.copies) > 0 ? '#5a9e5c' : '#c0564e' }} />
            <span style={{ fontSize: 12, fontFamily: 'var(--font-sans)', color: 'var(--text-muted)' }}>
              Status will be set to <strong style={{ color: parseInt(form.copies) > 0 ? '#5a9e5c' : '#c0564e' }}>
                {parseInt(form.copies) > 0 ? 'Available' : 'Borrowed'}
              </strong> — automatically based on copies
            </span>
          </div>

          <SectionTitle>Images & Media</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
            <ImageUploadField
              label="Cover Image"
              value={form.cover_image_url}
              preview={coverPreview}
              onFileChange={handleCoverFile}
            />
            <ImageUploadField
              label="Abstract Image"
              value={form.abstract_image_url}
              preview={abstractPreview}
              onFileChange={handleAbstractFile}
            />
          </div>
          {/* OCR status */}
          {abstractOcrLoading && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
              padding: '10px 14px', borderRadius: 9,
              background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.24)',
              fontSize: 12.5, color: 'var(--maroon-mid)', fontFamily: 'var(--font-sans)',
            }}>
              <span style={{ width: 14, height: 14, border: '2px solid rgba(139,0,0,0.18)', borderTopColor: 'var(--maroon-mid)', borderRadius: '50%', animation: 'lm-spin 0.65s linear infinite', display: 'inline-block', flexShrink: 0 }} />
              {abstractOcrProgress || 'Initializing OCR engine… please wait'}
            </div>
          )}
          {abstractOcrError && !abstractOcrLoading && (
            <div style={{
              marginBottom: 10, padding: '9px 13px', borderRadius: 8,
              background: 'rgba(192,86,78,0.08)', border: '1px solid rgba(192,86,78,0.25)',
              fontSize: 12, color: '#c0564e', fontFamily: 'var(--font-sans)',
            }}>
              ⚠ {abstractOcrError}
            </div>
          )}
          {abstractData && !abstractOcrLoading && (
            <div style={{ marginBottom: 12 }}>
              <FieldLabel>Extracted Abstract — Preview</FieldLabel>
              <div style={{
                border: '1px solid rgba(139,0,0,0.15)', borderRadius: 9,
                background: 'rgba(253,248,240,0.8)', padding: '14px 16px',
                maxHeight: 200, overflowY: 'auto',
              }}>
                {abstractData.heading && (
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--maroon-deep)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-sans)', textAlign: 'center' }}>
                    {abstractData.heading}
                  </div>
                )}
                {(abstractData.paragraphs || []).map((p, i) => {
                  const isSub = abstractData.subheadings?.includes(p);
                  return isSub ? (
                    <div key={i} style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--maroon-mid)', fontFamily: 'var(--font-sans)', marginTop: 8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{p}</div>
                  ) : (
                    <p key={i} style={{ fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.75, marginBottom: 8, fontFamily: 'Georgia,serif', textAlign: 'justify', textIndent: '1.5em' }}>{p}</p>
                  );
                })}
                {abstractData.keywords?.length > 0 && (
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)', marginRight: 2 }}>Keywords:</span>
                    {abstractData.keywords.map((k, i) => (
                      <span key={i} style={{ fontSize: 10.5, background: 'rgba(139,0,0,0.08)', color: 'var(--maroon-mid)', padding: '2px 8px', borderRadius: 12, fontFamily: 'var(--font-sans)' }}>{k}</span>
                    ))}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 10.5, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)' }}>
                ✓ Text extracted successfully. This will be saved and shown in the book details view.
              </span>
            </div>
          )}
          <p style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)', marginTop: 4 }}>
            A QR code will be auto-generated from the ISBN (or title if no ISBN) and saved to storage.
          </p>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
          padding: '16px 24px',
          borderTop: '1px solid rgba(139,0,0,0.12)',
          background: 'rgba(253,248,240,0.6)',
          borderRadius: '0 0 14px 14px',
        }}>
          {qrProgress && (
            <span style={{ fontSize: 11.5, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)', marginRight: 'auto' }}>
              {qrProgress}
            </span>
          )}
          <button onClick={onClose} disabled={saving} style={{
            padding: '9px 20px', borderRadius: 8, fontSize: 13,
            border: '1px solid rgba(139,0,0,0.22)', background: 'transparent',
            color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', cursor: 'pointer',
            transition: 'all 0.18s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,0,0,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: '1px solid rgba(201,168,76,0.45)',
            background: saving ? 'rgba(139,0,0,0.5)' : 'linear-gradient(135deg,#8B0000,#5A0000)',
            color: GP, fontFamily: 'var(--font-sans)', cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 7,
            boxShadow: '0 3px 12px rgba(80,0,0,0.30)', transition: 'all 0.18s',
          }}>
            {saving
              ? <><span style={{ width: 13, height: 13, border: `2px solid rgba(245,228,168,0.3)`, borderTopColor: GP, borderRadius: '50%', animation: 'lm-spin 0.65s linear infinite', display: 'inline-block' }}/> Saving…</>
              : (isEdit ? 'Save Changes' : 'Add Book')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View Details Modal ───────────────────────────────────────────────────────
// ─── Parse abstract_text from DB (may be JSON string or plain text) ──────────
function parseAbstractData(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return { heading: '', paragraphs: [raw], keywords: [] }; }
}

function ViewModal({ book, onClose, onEdit }) {
  const [qrModalOpen, setQrModalOpen]           = useState(false);
  const [abstractModalOpen, setAbstractModalOpen] = useState(false);
  const [copyQRs, setCopyQRs]                   = useState([]);
  const [generatingCopyQRs, setGeneratingCopyQRs] = useState(false);
  const [selectedCopyQR, setSelectedCopyQR]     = useState(null);
  const [dlFormat, setDlFormat]                 = useState('png');

  const copies      = parseInt(book.copies) || 1;
  const abstractData = parseAbstractData(book.abstract_text);
  const hasAbstract  = !!(book.abstract_image_url || abstractData);

  const handleOpenQrModal = async () => {
    setQrModalOpen(true);
    if (copyQRs.length === 0) {
      setGeneratingCopyQRs(true);
      try {
        const results = [];
        for (let i = 1; i <= copies; i++) {
          const { dataUrl, label } = await generateCopyQR(book.isbn, i, book.title);
          results.push({ dataUrl, label, copyNum: i });
        }
        setCopyQRs(results);
        setSelectedCopyQR(results[0]);
      } catch {
        // fallback to stored QR
      } finally {
        setGeneratingCopyQRs(false);
      }
    } else {
      if (!selectedCopyQR) setSelectedCopyQR(copyQRs[0]);
    }
  };

  // Download a single copy QR to the browser's file explorer (Downloads folder)
  const downloadCopyQR = (qr, format = 'png') => {
    if (!qr) return;
    const canvas   = document.createElement('canvas');
    const img      = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Render at 2× for crisp printing
      const scale = 2;
      canvas.width  = img.naturalWidth  * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // White/cream background (required for JPG, looks good for PNG too)
      ctx.fillStyle = '#FDF8F0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Label text at bottom
      const labelH = Math.round(36 * scale);
      ctx.fillStyle = '#FDF8F0';
      ctx.fillRect(0, canvas.height - labelH, canvas.width, labelH);
      ctx.fillStyle = '#5A0000';
      ctx.font      = `${Math.round(11 * scale)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(qr.label, canvas.width / 2, canvas.height - Math.round(10 * scale));

      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
      const quality  = format === 'jpg' ? 0.96 : undefined;

      // Trigger browser Save dialog → Downloads / file explorer
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href    = url;
        a.download = `LIBRASCAN_${qr.label}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, mimeType, quality);
    };
    img.onerror = () => {
      // Fallback: direct dataUrl download if canvas fails (e.g. CORS)
      const a   = document.createElement('a');
      a.href    = qr.dataUrl;
      a.download = `LIBRASCAN_${qr.label}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    img.src = qr.dataUrl;
  };

  // Download all copy QRs one by one (staggered to avoid browser pop-up blocking)
  const downloadAllCopyQRs = (format = 'png') => {
    copyQRs.forEach((qr, i) => setTimeout(() => downloadCopyQR(qr, format), i * 350));
  };

  const detail = (label, value) => value ? (
    <div style={{ marginBottom: 10 }}>
      <div style={{
        fontSize: 9.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase',
        color: 'var(--text-dim)', marginBottom: 2, fontFamily: 'var(--font-sans)',
      }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{value}</div>
    </div>
  ) : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(20,0,0,0.60)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24, backdropFilter: 'blur(4px)',
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--cream)', borderRadius: 14,
        border: '1px solid rgba(139,0,0,0.18)',
        boxShadow: '0 20px 60px rgba(30,0,0,0.42)',
        width: '100%', maxWidth: 740, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        animation: 'lm-fade-in 0.22s ease',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px',
          background: 'linear-gradient(135deg, var(--maroon-deep), var(--maroon-mid))',
          borderBottom: '1px solid rgba(201,168,76,0.20)',
          borderRadius: '14px 14px 0 0',
          flexShrink: 0, position: 'relative',
        }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg,transparent,rgba(201,168,76,0.40),transparent)' }} />
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600,
              color: '#F5E4A8', letterSpacing: '0.05em',
            }}>Book Details</h2>
            <p style={{ fontSize: 11.5, color: 'rgba(245,228,168,0.65)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>
              Full record from the catalog
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => onEdit(book)} style={{
              padding: '7px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 500,
              border: '1px solid rgba(245,228,168,0.25)', background: 'rgba(245,228,168,0.12)',
              color: '#F5E4A8', fontFamily: 'var(--font-sans)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.18s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,228,168,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,228,168,0.12)'}
            >
              {Ic.edit} Edit
            </button>
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(245,228,168,0.10)', border: '1px solid rgba(245,228,168,0.18)',
              color: 'rgba(245,228,168,0.70)', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.18s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,228,168,0.22)'; e.currentTarget.style.color = '#F5E4A8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,228,168,0.10)'; e.currentTarget.style.color = 'rgba(245,228,168,0.70)'; }}
            >{Ic.close}</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', gap: 0, overflowY: 'auto', flex: 1 }}>
          {/* Left: images */}
          <div style={{
            width: 200, flexShrink: 0, padding: '20px 16px',
            borderRight: '1px solid rgba(139,0,0,0.10)',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            {/* Cover */}
            <div>
              <div style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase',
                color: 'var(--text-dim)', marginBottom: 6, fontFamily: 'var(--font-sans)',
              }}>Cover</div>
              <div style={{
                width: '100%', height: 160, borderRadius: 8, overflow: 'hidden',
                border: '1px solid rgba(139,0,0,0.15)',
                background: 'linear-gradient(135deg,rgba(139,0,0,0.10),rgba(201,168,76,0.06))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {book.cover_image_url
                  ? <img src={book.cover_image_url} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: 'var(--text-dim)', opacity: 0.4 }}>{Ic.book}</span>
                }
              </div>
            </div>
            {/* Abstract thumbnail — shown if image OR extracted text exists */}
            {hasAbstract && (
              <div>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6, fontFamily: 'var(--font-sans)' }}>Abstract</div>
                <div
                  onClick={() => setAbstractModalOpen(true)}
                  title="Click to read the full abstract"
                  style={{
                    width: '100%', height: 120, borderRadius: 8, overflow: 'hidden',
                    border: '2px solid rgba(139,0,0,0.18)', cursor: 'pointer', position: 'relative',
                    background: book.abstract_image_url ? 'transparent' : 'linear-gradient(135deg,rgba(139,0,0,0.08),rgba(201,168,76,0.06))',
                    transition: 'border-color 0.18s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(139,0,0,0.45)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(139,0,0,0.18)'}
                >
                  {book.abstract_image_url ? (
                    <img src={book.abstract_image_url} alt="abstract" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Georgia,serif', lineHeight: 1.6, overflow: 'hidden' }}>
                      {abstractData?.heading && <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 4, color: 'var(--maroon-mid)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{abstractData.heading}</div>}
                      {abstractData?.paragraphs?.[0]?.slice(0, 140)}{abstractData?.paragraphs?.[0]?.length > 140 ? '…' : ''}
                    </div>
                  )}
                  {/* hover overlay */}
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(80,0,0,0.62)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
                    opacity: 0, transition: 'opacity 0.18s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F5E4A8" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    <span style={{ fontSize: 11, color: '#F5E4A8', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Read Abstract</span>
                  </div>
                </div>
              </div>
            )}
            {/* QR */}
            <div>
              <div style={{
                fontSize: 9.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase',
                color: 'var(--text-dim)', marginBottom: 6, fontFamily: 'var(--font-sans)',
              }}>QR Codes ({copies} {copies === 1 ? 'Copy' : 'Copies'})</div>
              <div
                onClick={handleOpenQrModal}
                style={{
                  width: '100%', height: 100, borderRadius: 8, overflow: 'hidden',
                  border: '1px solid rgba(139,0,0,0.15)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg,rgba(139,0,0,0.06),rgba(201,168,76,0.04))',
                  flexDirection: 'column', gap: 4,
                }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--maroon-mid)" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3"/></svg>
                <span style={{ fontSize: 10, color: 'var(--maroon-mid)', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>
                  View & Download QRs
                </span>
              </div>
            </div>
          </div>

          {/* Right: details */}
          <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--maroon-deep)',
                lineHeight: 1.3, marginBottom: 4, letterSpacing: '0.03em',
              }}>{book.title}</h3>
              {book.volume_title && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
                  {book.volume_title}
                </div>
              )}
              <div style={{ marginTop: 10 }}><StatusBadge status={book.status} /></div>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px',
              borderTop: '1px solid rgba(139,0,0,0.10)', paddingTop: 18,
            }}>
              {[
                ['Authors', book.authors],
                ['Publisher', book.publisher],
                ['Place of Publication', book.place_of_publication],
                ['Year Published', book.year],
                ['Volume Number', book.volume_number],
                ['Edition', book.edition],
                ['ISBN', book.isbn],
                ['Total Pages', book.pages],
                ['Shelf Location', book.shelf_location],
                ['Genre', book.genre],
                ['Copies', book.copies],
                ['Color', book.color],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} style={{ marginBottom: 14 }}>
                  <div style={{
                    fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
                    color: 'var(--text-dim)', marginBottom: 3, fontFamily: 'var(--font-sans)',
                  }}>{label}</div>
                  <div style={{ fontSize: 13.5, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
            {book.created_at && (
              <div style={{
                marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(139,0,0,0.08)',
                fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)', textAlign: 'center',
              }}>
                Added on {new Date(book.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Abstract Text Modal */}
      {abstractModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(20,0,0,0.78)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1200, backdropFilter: 'blur(6px)', padding: 24,
        }}
          onClick={() => setAbstractModalOpen(false)}
        >
          <div style={{
            background: 'var(--cream)', borderRadius: 14, padding: 0,
            border: '1px solid rgba(139,0,0,0.22)',
            boxShadow: '0 20px 60px rgba(30,0,0,0.55)',
            maxWidth: 680, width: '100%', maxHeight: '85vh',
            display: 'flex', flexDirection: 'column',
            animation: 'lm-fade-in 0.2s ease',
          }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '16px 22px', borderRadius: '14px 14px 0 0',
              background: 'linear-gradient(135deg,var(--maroon-deep),var(--maroon-mid))',
              borderBottom: '1px solid rgba(201,168,76,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, position: 'relative',
            }}>
              <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: 15, color: '#F5E4A8',
                letterSpacing: '0.10em', textTransform: 'uppercase',
                textAlign: 'center', margin: 0,
              }}>
                {abstractData?.heading ? abstractData.heading.toUpperCase() : 'ABSTRACT'}
              </h3>
              <button onClick={() => setAbstractModalOpen(false)} style={{
                position: 'absolute', right: 16,
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(245,228,168,0.10)', border: '1px solid rgba(245,228,168,0.18)',
                color: 'rgba(245,228,168,0.80)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{Ic.close}</button>
            </div>
            {/* Body — two-panel: image left + formatted text right */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

              {/* ── Left: Original Image ── */}
              {book.abstract_image_url && (
                <div style={{
                  width: 210, flexShrink: 0, padding: '16px 14px',
                  borderRight: '1px solid rgba(139,0,0,0.10)',
                  display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(253,248,240,0.5)',
                }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: 'var(--font-sans)' }}>
                    Original Scan
                  </div>
                  <div style={{ flex: 1, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(139,0,0,0.12)', minHeight: 200, background: '#fff' }}>
                    <img src={book.abstract_image_url} alt="abstract" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                </div>
              )}

              {/* ── Right: Formatted Abstract Text ── */}
              <div style={{ flex: 1, padding: '28px 32px', overflowY: 'auto', background: '#FFFDF8' }}>
                {abstractData ? (
                  <>
                    {/* ── Heading block ── */}
                    <div style={{ marginBottom: 22, textAlign: 'center' }}>
                      {abstractData.heading ? (
                        <div style={{
                          fontFamily: '"Georgia", "Times New Roman", serif',
                          fontSize: 22, fontWeight: 700,
                          color: '#5A0000',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          marginBottom: 10,
                          lineHeight: 1.2,
                        }}>
                          {abstractData.heading}
                        </div>
                      ) : (
                        /* Fallback: use the book section type from header */
                        <div style={{
                          fontFamily: '"Georgia", "Times New Roman", serif',
                          fontSize: 20, fontWeight: 700,
                          color: '#5A0000', letterSpacing: '0.10em',
                          textTransform: 'uppercase', marginBottom: 10,
                        }}>
                          {book.title}
                        </div>
                      )}

                      {/* Gold rule */}
                      <div style={{
                        width: 56, height: 2, margin: '0 auto 12px',
                        background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
                        borderRadius: 2,
                      }} />

                      {/* Book byline */}
                      <div style={{
                        fontSize: 12.5, color: '#7a5c3a',
                        fontFamily: '"Georgia", serif', fontStyle: 'italic',
                        letterSpacing: '0.02em',
                      }}>
                        {book.title}{book.authors ? ` — ${book.authors}` : ''}
                      </div>
                    </div>

                    {/* ── Divider ── */}
                    <div style={{
                      borderTop: '1px solid rgba(139,0,0,0.12)',
                      marginBottom: 20,
                    }} />

                    {/* ── Body paragraphs ── */}
                    <div>
                      {(abstractData.paragraphs || []).map((para, i) => {
                        const isSubhead = abstractData.subheadings?.includes(para);
                        if (isSubhead) {
                          return (
                            <div key={i} style={{
                              fontSize: 13.5, fontWeight: 700,
                              color: '#6B0000',
                              fontFamily: '"Georgia", serif',
                              letterSpacing: '0.06em',
                              marginTop: 22, marginBottom: 10,
                              textTransform: 'uppercase',
                              borderBottom: '1px solid rgba(139,0,0,0.10)',
                              paddingBottom: 6,
                            }}>
                              {para}
                            </div>
                          );
                        }
                        return (
                          <p key={i} style={{
                            fontSize: 14.5,
                            color: '#2c1a0e',
                            fontFamily: '"Georgia", "Times New Roman", serif',
                            lineHeight: 2.0,
                            textAlign: 'justify',
                            textIndent: '2.2em',
                            margin: '0 0 14px 0',
                            wordSpacing: '0.02em',
                          }}>
                            {para}
                          </p>
                        );
                      })}
                    </div>

                    {/* ── Keywords ── */}
                    {abstractData.keywords?.length > 0 && (
                      <div style={{
                        marginTop: 22, paddingTop: 16,
                        borderTop: '1px solid rgba(139,0,0,0.10)',
                      }}>
                        <div style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
                          textTransform: 'uppercase', color: '#7a5c3a',
                          fontFamily: 'var(--font-sans)', marginBottom: 10,
                        }}>
                          Keywords
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                          {abstractData.keywords.map((kw, i) => (
                            <span key={i} style={{
                              fontSize: 11.5, padding: '4px 13px', borderRadius: 14,
                              background: 'rgba(139,0,0,0.06)',
                              border: '1px solid rgba(139,0,0,0.16)',
                              color: '#6B0000',
                              fontFamily: 'var(--font-sans)', fontWeight: 500,
                              fontStyle: 'italic',
                            }}>
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 12, color: 'var(--text-dim)' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 6 }}>No abstract text extracted yet</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>
                        To extract text: click <strong>Edit</strong> on this book, then<br/>
                        re-upload the abstract image — OCR will read it automatically.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per-Copy QR Modal */}
      {qrModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(20,0,0,0.78)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1200, backdropFilter: 'blur(6px)', padding: 24,
        }}
          onClick={() => setQrModalOpen(false)}
        >
          <div style={{
            background: 'var(--cream)', borderRadius: 14, padding: 0,
            border: '1px solid rgba(139,0,0,0.20)',
            boxShadow: '0 20px 60px rgba(30,0,0,0.55)',
            maxWidth: 620, width: '100%', maxHeight: '88vh',
            display: 'flex', flexDirection: 'column',
            animation: 'lm-fade-in 0.2s ease',
          }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '16px 22px', borderRadius: '14px 14px 0 0',
              background: 'linear-gradient(135deg,var(--maroon-deep),var(--maroon-mid))',
              borderBottom: '1px solid rgba(201,168,76,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: '#F5E4A8', letterSpacing: '0.04em', marginBottom: 2 }}>
                  QR Codes — {copies} {copies === 1 ? 'Copy' : 'Copies'}
                </h3>
                <p style={{ fontSize: 11, color: 'rgba(245,228,168,0.65)', fontFamily: 'var(--font-sans)' }}>
                  Each copy has a unique QR: ISBN + Copy Number
                </p>
              </div>
              <button onClick={() => setQrModalOpen(false)} style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(245,228,168,0.10)', border: '1px solid rgba(245,228,168,0.18)',
                color: 'rgba(245,228,168,0.80)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{Ic.close}</button>
            </div>

            {/* Body */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Copy list */}
              <div style={{
                width: 140, flexShrink: 0, overflowY: 'auto', padding: '12px 8px',
                borderRight: '1px solid rgba(139,0,0,0.10)',
              }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)', fontFamily: 'var(--font-sans)', padding: '0 6px 8px' }}>
                  Select Copy
                </div>
                {generatingCopyQRs ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 16 }}>
                    <span style={{ width: 18, height: 18, border: '2px solid rgba(139,0,0,0.2)', borderTopColor: 'var(--maroon-mid)', borderRadius: '50%', animation: 'lm-spin 0.65s linear infinite', display: 'inline-block' }} />
                    <span style={{ fontSize: 10.5, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)', textAlign: 'center' }}>Generating…</span>
                  </div>
                ) : copyQRs.map(qr => (
                  <button key={qr.copyNum} onClick={() => setSelectedCopyQR(qr)} style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 12,
                    fontFamily: 'var(--font-sans)', cursor: 'pointer', textAlign: 'left',
                    border: selectedCopyQR?.copyNum === qr.copyNum ? '1px solid rgba(139,0,0,0.30)' : '1px solid transparent',
                    background: selectedCopyQR?.copyNum === qr.copyNum ? 'rgba(139,0,0,0.08)' : 'transparent',
                    color: selectedCopyQR?.copyNum === qr.copyNum ? 'var(--maroon-mid)' : 'var(--text-muted)',
                    fontWeight: selectedCopyQR?.copyNum === qr.copyNum ? 600 : 400,
                    marginBottom: 2, transition: 'all 0.15s',
                  }}>
                    Copy #{qr.copyNum}
                  </button>
                ))}
              </div>

              {/* QR Preview */}
              <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, overflowY: 'auto' }}>
                {generatingCopyQRs ? (
                  <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-sans)', fontSize: 13 }}>Generating unique QR codes…</div>
                ) : selectedCopyQR ? (
                  <>
                    <img src={selectedCopyQR.dataUrl} alt={selectedCopyQR.label}
                      style={{ width: 220, height: 220, objectFit: 'contain', borderRadius: 10, border: '1px solid rgba(139,0,0,0.12)' }} />
                    <div style={{
                      fontFamily: 'monospace', fontSize: 11.5, color: 'var(--text-muted)',
                      background: 'rgba(139,0,0,0.05)', padding: '5px 14px', borderRadius: 6,
                      border: '1px solid rgba(139,0,0,0.10)',
                    }}>
                      {selectedCopyQR.label}
                    </div>
                    {/* Download buttons */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {[['PNG', 'png'], ['JPG', 'jpg']].map(([label, fmt]) => (
                        <button key={fmt} onClick={() => downloadCopyQR(selectedCopyQR, fmt)} style={{
                          padding: '8px 18px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                          border: '1px solid rgba(201,168,76,0.40)',
                          background: 'linear-gradient(135deg,#8B0000,#5A0000)',
                          color: GP, fontFamily: 'var(--font-sans)', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                        }}>
                          {Ic.download} Save as {label}
                        </button>
                      ))}
                    </div>
                    {copies > 1 && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[['PNG', 'png'], ['JPG', 'jpg']].map(([label, fmt]) => (
                          <button key={fmt} onClick={() => downloadAllCopyQRs(fmt)} style={{
                            padding: '7px 16px', borderRadius: 8, fontSize: 11.5,
                            border: '1px solid rgba(139,0,0,0.25)', background: 'transparent',
                            color: 'var(--maroon-mid)', fontFamily: 'var(--font-sans)', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            transition: 'background 0.15s',
                          }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,0,0,0.06)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {Ic.download} All Copies ({label})
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────
function DeleteModal({ book, loading, onClose, onConfirm }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(20,0,0,0.60)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(4px)',
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--cream)', borderRadius: 14, padding: '28px 28px 22px',
        border: '1px solid rgba(139,0,0,0.22)', maxWidth: 400, width: '100%',
        boxShadow: '0 20px 60px rgba(30,0,0,0.44)',
        animation: 'lm-fade-in 0.22s ease', textAlign: 'center',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px',
          background: 'rgba(192,86,78,0.10)', border: '1px solid rgba(192,86,78,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#c0564e',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </div>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--maroon-deep)',
          marginBottom: 8,
        }}>Delete Book Record</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', lineHeight: 1.6 }}>
          Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>"{book.title}"</strong>?
          This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
          <button onClick={onClose} disabled={loading} style={{
            padding: '9px 22px', borderRadius: 8, fontSize: 13,
            border: '1px solid rgba(139,0,0,0.20)', background: 'transparent',
            color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', cursor: 'pointer',
            transition: 'all 0.18s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,0,0,0.05)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >Cancel</button>
          <button onClick={onConfirm} disabled={loading} style={{
            padding: '9px 22px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: '1px solid rgba(192,86,78,0.35)',
            background: loading ? 'rgba(192,86,78,0.5)' : 'linear-gradient(135deg,#c0564e,#922)',
            color: '#fff', fontFamily: 'var(--font-sans)', cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            {loading
              ? <><span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'lm-spin 0.65s linear infinite', display: 'inline-block' }}/> Deleting…</>
              : 'Delete Book'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Book_Catalog() {
  const [books, setBooks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [genreFilter, setGenreFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [shelfFilter, setShelfFilter]   = useState('all');

  const [showForm, setShowForm]     = useState(false);
  const [editBook, setEditBook]     = useState(null);
  const [viewBook, setViewBook]     = useState(null);
  const [deleteBook, setDeleteBook] = useState(null);
  const [deleting, setDeleting]     = useState(false);

  const [toast, setToast]   = useState({ msg: '', type: 'success' });
  const toastRef = useRef();

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast({ msg: '', type: 'success' }), 3200);
  };

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setBooks(data || []);
    } catch (err) {
      showToast('Failed to load books: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const handleSaved = () => {
    fetchBooks();
    showToast(editBook ? 'Book updated successfully.' : 'Book added successfully.');
  };

  const handleDelete = async () => {
    if (!deleteBook) return;
    setDeleting(true);
    try {
      // supabaseAdmin bypasses RLS — safe to delete without policy restrictions
      const { error } = await supabaseAdmin.from('books').delete().eq('id', deleteBook.id);
      if (error) throw error;
      setBooks(b => b.filter(x => x.id !== deleteBook.id));
      setDeleteBook(null);
      showToast('Book deleted successfully.');
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (book) => {
    setViewBook(null);
    setEditBook(book);
    setShowForm(true);
  };
  const openAdd = () => {
    setEditBook(null);
    setShowForm(true);
  };

  // Derive auto-status from copies so the filter always works correctly
  const booksWithStatus = books.map(b => ({
    ...b,
    status: parseInt(b.copies) > 0 ? 'Available' : 'Borrowed',
  }));

  // Filtering
  const filtered = booksWithStatus.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q || [b.title, b.authors, b.isbn, b.publisher].join(' ').toLowerCase().includes(q);
    const matchGenre  = genreFilter === 'all' || b.genre === genreFilter;
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchShelf  = shelfFilter === 'all' || b.shelf_location === shelfFilter;
    return matchSearch && matchGenre && matchStatus && matchShelf;
  });

  // Action button style
  const actionBtn = (variant) => {
    const variants = {
      view:   { color: '#5a7eb5', bg: 'rgba(90,126,181,0.10)', border: 'rgba(90,126,181,0.22)', hover: 'rgba(90,126,181,0.18)' },
      edit:   { color: 'var(--maroon-mid)', bg: 'rgba(139,0,0,0.07)', border: 'rgba(139,0,0,0.20)', hover: 'rgba(139,0,0,0.14)' },
      delete: { color: '#c0564e', bg: 'rgba(192,86,78,0.07)', border: 'rgba(192,86,78,0.20)', hover: 'rgba(192,86,78,0.14)' },
      qr:     { color: G, bg: 'rgba(201,168,76,0.08)', border: 'rgba(201,168,76,0.24)', hover: 'rgba(201,168,76,0.16)' },
    };
    const v = variants[variant];
    return {
      base: {
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 9px', borderRadius: 6, fontSize: 11.5, fontWeight: 500,
        fontFamily: 'var(--font-sans)', cursor: 'pointer',
        border: `1px solid ${v.border}`, background: v.bg, color: v.color,
        transition: 'background 0.15s, transform 0.12s',
      },
      hover: v.hover,
    };
  };

  const ActionBtn = ({ variant, onClick, children }) => {
    const s = actionBtn(variant);
    const [hov, setHov] = useState(false);
    return (
      <button
        onClick={onClick}
        style={{ ...s.base, background: hov ? s.hover : s.base.background, transform: hov ? 'translateY(-1px)' : 'none' }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >{children}</button>
    );
  };

  // Stats for header
  const totalBooks    = booksWithStatus.length;
  const totalCopies   = booksWithStatus.reduce((s, b) => s + (parseInt(b.copies) || 0), 0);
  const availableCount = booksWithStatus.filter(b => b.status === 'Available').length;

  const selectStyle = {
    padding: '8px 12px', borderRadius: 8,
    border: '1px solid var(--border-cream)',
    background: 'var(--cream-light)', color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)', fontSize: 12.5,
    cursor: 'pointer', appearance: 'none', outline: 'none',
  };

  return (
    <div className="lm-module">
      <Toast message={toast.msg} type={toast.type} />

      {/* ── Header ── */}
      <div className="lm-module-header">
        <div>
          <h2 className="lm-module-title">Book Catalog</h2>
          <p className="lm-module-subtitle">
            Manage the library's full collection — add, edit, view, and remove records.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={fetchBooks} title="Refresh" style={{
            padding: '9px 11px', borderRadius: 8, fontSize: 12,
            border: '1px solid rgba(139,0,0,0.20)', background: 'transparent',
            color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            transition: 'all 0.18s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,0,0,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {Ic.refresh}
          </button>
          <button onClick={openAdd} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            border: '1px solid rgba(201,168,76,0.40)',
            background: 'linear-gradient(135deg,#8B0000,#5A0000)',
            color: GP, fontFamily: 'var(--font-sans)', cursor: 'pointer',
            boxShadow: '0 3px 12px rgba(80,0,0,0.25)', transition: 'all 0.18s',
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 5px 18px rgba(80,0,0,0.38)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 3px 12px rgba(80,0,0,0.25)'; e.currentTarget.style.transform = 'none'; }}
          >
            {Ic.plus} Add Book
          </button>
        </div>
      </div>

      {/* ── Summary Chips ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Titles', value: totalBooks },
          { label: 'Total Copies', value: totalCopies },
          { label: 'Available', value: availableCount },
          { label: 'Borrowed', value: totalBooks - availableCount },
        ].map(({ label, value }) => (
          <div key={label} style={{
            padding: '8px 16px', borderRadius: 8,
            background: 'linear-gradient(135deg,rgba(139,0,0,0.06),rgba(201,168,76,0.04))',
            border: '1px solid rgba(139,0,0,0.12)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--maroon-mid)', fontFamily: 'var(--font-display)' }}>
              {loading ? '—' : value}
            </span>
            <span style={{ fontSize: 11.5, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center',
        padding: '14px 16px', borderRadius: 10,
        background: 'linear-gradient(135deg,rgba(139,0,0,0.04),rgba(201,168,76,0.03))',
        border: '1px solid rgba(139,0,0,0.10)',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-dim)', pointerEvents: 'none',
          }}>{Ic.search}</span>
          <input
            type="text" placeholder="Search title, author, ISBN…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              ...selectStyle, width: '100%', paddingLeft: 32,
            }}
          />
        </div>
        {/* Genre filter */}
        <select style={selectStyle} value={genreFilter} onChange={e => setGenreFilter(e.target.value)}>
          <option value="all">All Genres</option>
          {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        {/* Status filter */}
        <select style={selectStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="Available">Available</option>
          <option value="Borrowed">Borrowed</option>
        </select>
        {/* Shelf filter */}
        <select style={selectStyle} value={shelfFilter} onChange={e => setShelfFilter(e.target.value)}>
          <option value="all">All Shelves</option>
          {SHELF_LOCATIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{
          marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-dim)',
          fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
        }}>
          {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="lm-loading">
          <div className="lm-spinner" />
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading catalog…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="lm-empty">
          <div className="lm-empty-icon">📚</div>
          <div className="lm-empty-text">No books found</div>
          <div className="lm-empty-sub">
            {search ? 'Try a different search term or clear filters.' : 'Add your first book to get started.'}
          </div>
        </div>
      ) : (
        <div style={{
          borderRadius: 10, border: '1px solid rgba(139,0,0,0.13)',
          overflow: 'hidden', boxShadow: '0 2px 12px rgba(30,0,0,0.07)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                background: 'linear-gradient(135deg, #8B0000, #6B0000)',
                borderBottom: '2px solid rgba(201,168,76,0.35)',
              }}>
                {['Book Title', 'Authors', 'ISBN', 'Copies', 'Status', 'Action'].map((h, i) => (
                  <th key={h} style={{
                    padding: '13px 16px', textAlign: i === 3 ? 'center' : 'left',
                    fontFamily: 'var(--font-sans)', fontSize: 11,
                    fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
                    color: '#F5E4A8', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((book, idx) => (
                <TableRow
                  key={book.id}
                  book={book}
                  idx={idx}
                  onView={() => setViewBook(book)}
                  onEdit={() => openEdit(book)}
                  onDelete={() => setDeleteBook(book)}
                  ActionBtn={ActionBtn}
                  Ic={Ic}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ── */}
      {showForm && (
        <BookFormModal
          book={editBook}
          onClose={() => { setShowForm(false); setEditBook(null); }}
          onSaved={handleSaved}
        />
      )}
      {viewBook && (
        <ViewModal
          book={viewBook}
          onClose={() => setViewBook(null)}
          onEdit={openEdit}
        />
      )}
      {deleteBook && (
        <DeleteModal
          book={deleteBook}
          loading={deleting}
          onClose={() => setDeleteBook(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

// ─── Table Row (extracted to allow clean hover state) ─────────────────────────
function TableRow({ book, idx, onView, onEdit, onDelete, ActionBtn, Ic }) {
  const [hov, setHov] = useState(false);
  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onView}
      style={{
        background: hov ? 'rgba(139,0,0,0.04)' : (idx % 2 === 0 ? 'transparent' : 'rgba(139,0,0,0.015)'),
        borderBottom: '1px solid rgba(139,0,0,0.07)',
        cursor: 'pointer', transition: 'background 0.14s',
      }}
    >
      {/* Title */}
      <td style={{ padding: '11px 16px', maxWidth: 240 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {book.cover_image_url ? (
            <img src={book.cover_image_url} alt=""
              style={{ width: 32, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid rgba(139,0,0,0.15)', flexShrink: 0 }} />
          ) : (
            <div style={{
              width: 32, height: 40, borderRadius: 4, flexShrink: 0,
              background: 'linear-gradient(135deg,rgba(139,0,0,0.14),rgba(201,168,76,0.08))',
              border: '1px solid rgba(139,0,0,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-dim)',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
          )}
          <div>
            <div style={{
              fontWeight: 600, fontSize: 13, color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170,
            }}>{book.title}</div>
            {book.edition && <div style={{ fontSize: 10.5, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)' }}>{book.edition} Ed.</div>}
          </div>
        </div>
      </td>
      {/* Authors */}
      <td style={{ padding: '11px 16px' }}>
        <span style={{
          fontSize: 12.5, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'block', maxWidth: 160,
        }}>{book.authors || '—'}</span>
      </td>
      {/* ISBN */}
      <td style={{ padding: '11px 16px' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
          {book.isbn || '—'}
        </span>
      </td>
      {/* Copies */}
      <td style={{ padding: '11px 16px', textAlign: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--maroon-mid)', fontFamily: 'var(--font-sans)' }}>
          {book.copies ?? '—'}
        </span>
      </td>
      {/* Status */}
      <td style={{ padding: '11px 16px' }}>
        <StatusBadge status={book.status} />
      </td>
      {/* Action */}
      <td style={{ padding: '11px 16px' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap' }}>
          <ActionBtn variant="edit" onClick={onEdit}>{Ic.edit} Edit</ActionBtn>
          <ActionBtn variant="delete" onClick={onDelete}>{Ic.trash}</ActionBtn>
        </div>
      </td>
    </tr>
  );
}