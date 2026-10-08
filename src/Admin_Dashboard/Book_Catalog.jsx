import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, supabaseAdmin } from '../supabaseClient';
import QRCode from 'qrcode';
import { extractAbstractText } from '../ocrClient';
import { useAuth } from '../Login_SignUp/useAuth';

const G  = '#C9A84C';
const GP = '#F5E4A8';
const BUCKET = 'book-images';

const SHELF_LOCATIONS = [
  'Filipiniana Section',
  'Circulation Section',
  'Reference Section',
  'Online Book Section',
];

const GENRES = [
  'Fiction',
  'Non-Fiction',
  'Science',
  'Technology',
  'History',
  'Education',
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
  call_number: '',
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
  clock:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  boxes:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>,
  wrench:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a4 4 0 1 0-5.4 5.4L2 19l3 3 7.3-7.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-2-2z"/></svg>,
  alert:    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
};

async function uploadImage(file, folder = 'covers') {
  const ext  = file.name.split('.').pop();
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
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

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function generateCopyQR(copyId, copyNum) {
  const dataUrl = await QRCode.toDataURL(copyId, { width: 400, margin: 2, color: { dark: '#5A0000', light: '#FDF8F0' } });
  return { dataUrl, label: copyId, copyNum, copy_id: copyId };
}

function slugifyTitle(title) {
  return (title || 'Untitled')
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 40) || 'Untitled';
}


/**
 * Recomputes a book's aggregate `copies`/`status` from its actual
 * book_copies rows and writes them back — same reconciliation the
 * per-book copy-QR modal already does after a copy is added/removed,
 * pulled out here so the Inventory tab can reuse it without duplicating
 * the write logic in two places.
 */
async function recomputeBookAggregate(bookId) {
  const { data: freshCopies } = await supabaseAdmin
    .from('book_copies').select('status').eq('book_id', bookId);
  const totalAfter     = (freshCopies || []).length;
  const availableAfter = (freshCopies || []).filter(c => c.status === 'Available').length;
  await supabaseAdmin.from('books').update({
    copies: totalAfter,
    status: availableAfter > 0 ? 'Available' : 'Borrowed',
  }).eq('id', bookId);
}

/**
 * Ensures a book has one book_copies row (with its own copy_id + QR) for
 * every unit counted in its `copies` field. Mirrors the lazy generation
 * that already happens the first time a manager opens a book's QR-codes
 * view — reused here so the Inventory tab can back-fill tracking for
 * copies that were added (via the Copies field) but never had their
 * individual records generated yet.
 */
async function ensureBookCopies(book) {
  const target = parseInt(book.copies) || 0;
  const { data: existing, error } = await supabaseAdmin
    .from('book_copies')
    .select('copy_id, copy_number')
    .eq('book_id', book.id)
    .order('copy_number', { ascending: true });
  if (error) throw error;

  let allCopies = existing || [];
  if (allCopies.length < target) {
    const existingNums = allCopies.map(c => c.copy_number);
    const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
    const toCreate = target - allCopies.length;
    const newRows = [];
    for (let i = 0; i < toCreate; i++) {
      const copyNum = nextNum + i;
      const copyId  = generateUUID();
      const { dataUrl } = await generateCopyQR(copyId, copyNum);
      const qrBlob  = await (await fetch(dataUrl)).blob();
      const qrFile  = new File([qrBlob], `qr_${copyId}.png`, { type: 'image/png' });
      const qrUrl   = await uploadImage(qrFile, 'qrcodes');
      newRows.push({ book_id: book.id, copy_id: copyId, copy_number: copyNum, qr_code_url: qrUrl, status: 'Available' });
    }
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('book_copies').insert(newRows).select('copy_id, copy_number');
    if (insErr) throw insErr;
    allCopies = [...allCopies, ...(inserted || [])];
  }
  return allCopies;
}

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

function FieldLabel({ children, required, center }) {
  return (
    <label style={{
      display: 'block', textAlign: center ? 'center' : 'left', fontFamily: 'var(--font-sans)',
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

function BookFormModal({ book, onClose, onSaved }) {
  // Phase 9 — campus isolation
  const { profile } = useAuth();
  const campusId = profile?.campus_id ?? null;

  const isEdit = Boolean(book?.id);
  const [form, setForm]         = useState(book ? { ...EMPTY_FORM, ...book } : { ...EMPTY_FORM });
  const [errors, setErrors]     = useState({});
  const [saving, setSaving]     = useState(false);
  const [apiErr, setApiErr]     = useState('');
  const [coverFile, setCoverFile]    = useState(null);
  const [abstractFile, setAbstractFile] = useState(null);
  const [coverPreview, setCoverPreview]    = useState(book?.cover_image_url || '');
  const [abstractPreview, setAbstractPreview] = useState(book?.abstract_image_url || '');
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
      const { _availableCopies, available_copies: _ac, ...formClean } = form;
      const payload = { ...formClean };
      const newCopiesCount = parseInt(payload.copies) || 0;

      payload.status = newCopiesCount > 0 ? 'Available' : 'Borrowed';

      if (coverFile) {
        payload.cover_image_url = await uploadImage(coverFile, 'covers');
      }
      if (abstractFile) {
        payload.abstract_image_url = await uploadImage(abstractFile, 'abstracts');
      }
      if (abstractData) {
        payload.abstract_text = JSON.stringify(abstractData);
      }
      const qrValue = form.isbn?.trim() || form.title?.trim();
      if (qrValue) {
        setQrProgress('Generating book QR…');
        payload.qr_code_url = await generateAndUploadQR(qrValue);
        setQrProgress('');
      }

      const { id, ...rest } = payload;
      let bookId = id;

      if (isEdit) {
        const { error } = await supabaseAdmin.from('books').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        // Phase 9: stamp campus_id so this book belongs to the librarian's campus
        // New books are registered as "pending" — they hold a spot in the catalog
        // (copies + QR codes are generated below as usual) but are only counted
        // as officially part of the collection once a Super Admin confirms the
        // registration from the Super Admin > Books > Pending Requests tab.
        const insertPayload = {
          ...rest,
          ...(campusId ? { campus_id: campusId } : {}),
          registration_status: 'pending',
        };
        const { data: inserted, error } = await supabaseAdmin
          .from('books').insert(insertPayload).select('id').single();
        if (error) throw error;
        bookId = inserted.id;
      }

      let existingCopies = [];
      if (bookId) {
        const { data: fetchedCopies } = await supabaseAdmin
          .from('book_copies')
          .select('copy_id, copy_number, status')
          .eq('book_id', bookId)
          .order('copy_number', { ascending: true });
        existingCopies = fetchedCopies || [];
      }

      const existingCount = existingCopies.length;

      if (newCopiesCount > existingCount) {
        const copiesToCreate = newCopiesCount - existingCount;
        const nextCopyNumber = existingCount > 0
          ? Math.max(...existingCopies.map(c => c.copy_number)) + 1
          : 1;

        setQrProgress(`Generating ${copiesToCreate} copy QR code${copiesToCreate > 1 ? 's' : ''}…`);
        const copyRows = [];
        for (let i = 0; i < copiesToCreate; i++) {
          const copyNum  = nextCopyNumber + i;
          const copyId   = generateUUID();
          const { dataUrl } = await generateCopyQR(copyId, copyNum);
          const qrBlob  = await (await fetch(dataUrl)).blob();
          const qrFile  = new File([qrBlob], `qr_${copyId}.png`, { type: 'image/png' });
          const qrUrl   = await uploadImage(qrFile, 'qrcodes');
          copyRows.push({
            book_id:      bookId,
            copy_id:      copyId,
            copy_number:  copyNum,
            qr_code_url:  qrUrl,
            status:       'Available',
          });
        }
        const { error: copyErr } = await supabaseAdmin.from('book_copies').insert(copyRows);
        if (copyErr) throw copyErr;
        setQrProgress('');

      } else if (newCopiesCount < existingCount) {
        const surplus = existingCount - newCopiesCount;
        const deletable = [...existingCopies]
          .reverse()                        
          .filter(c => c.status === 'Available')
          .slice(0, surplus);

        if (deletable.length > 0) {
          const { error: delErr } = await supabaseAdmin
            .from('book_copies')
            .delete()
            .in('copy_id', deletable.map(c => c.copy_id));
          if (delErr) throw delErr;
        }
      }

      if (bookId) {
        const { data: freshCopies } = await supabaseAdmin
          .from('book_copies').select('status').eq('book_id', bookId);
        const totalAfter     = (freshCopies || []).length;
        const availableAfter = (freshCopies || []).filter(c => c.status === 'Available').length;
        const syncPayload = {
          copies: totalAfter,
          status: availableAfter > 0 ? 'Available' : (totalAfter > 0 ? 'Borrowed' : 'Borrowed'),
        };
        const { error: syncErr } = await supabaseAdmin.from('books').update(syncPayload).eq('id', bookId);
        if (syncErr) {
          console.warn('[Book_Catalog] sync warning:', syncErr.message);
        }
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

  const SectionTitle = ({ children, center }) => (
    <div style={{
      fontFamily: 'var(--font-display)', fontSize: 11.5, letterSpacing: '0.1em',
      textTransform: 'uppercase', color: 'var(--maroon-mid)', textAlign: center ? 'center' : 'left',
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
              color: '#F5E4A8', letterSpacing: '0.05em', textAlign: 'left', margin: 0,
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

        <div style={{ padding: '22px 24px', maxHeight: 'calc(90vh - 140px)', overflowY: 'auto', textAlign: 'left' }}>
          {apiErr && (
            <div style={{
              background: 'rgba(139,0,0,0.08)', border: '1px solid rgba(139,0,0,0.22)',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              fontSize: 12.5, color: 'var(--maroon-light)', fontFamily: 'var(--font-sans)',
            }}>{apiErr}</div>
          )}

          <SectionTitle center>Book Information</SectionTitle>
          <div style={{ marginBottom: 14 }}>
            <FieldLabel required>Book Title</FieldLabel>
            <input style={inputStyle(errors.title)} value={form.title}
              onChange={e => set('title', e.target.value)} placeholder="Enter book title" />
            {errors.title && <span style={{ fontSize: 11, color: '#c0564e', fontFamily: 'var(--font-sans)' }}>{errors.title}</span>}
          </div>
          <div style={{ marginBottom: 14 }}>
            <FieldLabel>Volume Title</FieldLabel>
            <input style={inputStyle()} value={form.volume_title}
              onChange={e => set('volume_title', e.target.value)} placeholder="Volume title (if any)" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <FieldLabel required>Authors</FieldLabel>
            <input style={inputStyle(errors.authors)} value={form.authors}
              onChange={e => set('authors', e.target.value)} placeholder="e.g. Cormen, Leiserson, Rivest" />
            {errors.authors && <span style={{ fontSize: 11, color: '#c0564e', fontFamily: 'var(--font-sans)' }}>{errors.authors}</span>}
          </div>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <FieldLabel>Call Number</FieldLabel>
              <input style={inputStyle()} value={form.call_number}
                onChange={e => set('call_number', e.target.value)} placeholder="e.g. QA76.73.J38 2020" />
            </div>
          </div>

          <SectionTitle center>Classification</SectionTitle>
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

          <SectionTitle center>Images & Media</SectionTitle>
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

        </div>

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

function parseAbstractData(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return { heading: '', paragraphs: [raw], keywords: [] }; }
}

/**
 * Merges paragraph fragments that were split mid-sentence by OCR.
 * A fragment is considered "incomplete" if it does not end with
 * sentence-terminating punctuation (. ! ? :) — those get joined
 * with the next fragment using a single space.
 */
function mergeFragmentedParagraphs(paragraphs = [], subheadings = []) {
  const merged = [];
  let buffer = '';

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const isSubhead = subheadings?.includes(para);

    if (isSubhead) {
      
      if (buffer.trim()) { merged.push(buffer.trim()); buffer = ''; }
      merged.push(para);
      continue;
    }

    const trimmed = para.trim();
    if (!trimmed) continue;

    if (buffer) {
     
      buffer = buffer + ' ' + trimmed;
    } else {
      buffer = trimmed;
    }

  
    const lastChar = buffer.trimEnd().slice(-1);
    const isComplete = /[.!?:]/.test(lastChar);

    if (isComplete) {
      merged.push(buffer.trim());
      buffer = '';
    }

  }

  if (buffer.trim()) merged.push(buffer.trim());

  return merged;
}

function ViewModal({ book, onClose, onEdit }) {
  const [qrModalOpen, setQrModalOpen]           = useState(false);
  const [copyQRs, setCopyQRs]                   = useState([]);
  const [generatingCopyQRs, setGeneratingCopyQRs] = useState(false);
  const [qrIndex, setQrIndex]                   = useState(0);
  const selectedCopyQR = copyQRs[qrIndex] || null;

  const copies      = parseInt(book.copies) || 1;
  const abstractData = parseAbstractData(book.abstract_text);
  const hasAbstract  = !!(book.abstract_image_url || abstractData);

  // One distinct glyph per fact field, so the details grid reads at a glance
  // instead of repeating the same book icon in every chip.
  const FACT_ICONS = {
    'Publisher':            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 21V7l8-4 8 4v14"/><path d="M4 21h16"/><path d="M9 21v-6h6v6"/><path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01"/></svg>,
    'Place of Publication': <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>,
    'Year Published':       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>,
    'Volume Number':        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l9 4.5-9 4.5-9-4.5 9-4.5z"/><path d="M3 12l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5"/></svg>,
    'Edition':              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3h9l5 5v13H6z"/><path d="M15 3v5h5"/></svg>,
    'ISBN':                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5v14M8 5v14M11 5v14M13 5v14M17 5v14M20 5v14"/></svg>,
    'Call Number':          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.6 12.7L12.7 20.6a2 2 0 0 1-2.8 0l-7.5-7.5a2 2 0 0 1 0-2.8L10.3 2.4a2 2 0 0 1 1.4-.6H19a2 2 0 0 1 2 2v6.5a2 2 0 0 1-.4 1.4z"/><circle cx="15.5" cy="7.5" r="1.5"/></svg>,
    'Total Pages':          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h8"/></svg>,
    'Shelf Location':       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.3"/></svg>,
    'Genre':                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
    'Copies':               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M4 16V5a1.5 1.5 0 0 1 1.5-1.5H15"/></svg>,
    'Color':                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21a9 9 0 1 1 0-18c4 0 8 2.5 8 6.5 0 2-1.5 3.5-3.5 3.5H15a1.5 1.5 0 0 0-1 2.6c.4.4.6.9.6 1.4 0 1.1-1 2-2.6 2z"/><circle cx="7.5" cy="10.5" r="1" fill="currentColor" stroke="none"/><circle cx="11" cy="7" r="1" fill="currentColor" stroke="none"/><circle cx="15.5" cy="8" r="1" fill="currentColor" stroke="none"/></svg>,
  };

  const handleOpenQrModal = async () => {
    setQrModalOpen(true);
    if (copyQRs.length === 0) {
      setGeneratingCopyQRs(true);
      try {
        const { data: dbCopies, error } = await supabaseAdmin
          .from('book_copies')
          .select('copy_id, copy_number, qr_code_url, status')
          .eq('book_id', book.id)
          .order('copy_number', { ascending: true });

        if (error) throw error;

        let allCopies = dbCopies || [];

        if (allCopies.length < copies) {
          const existingNums = allCopies.map(c => c.copy_number);
          const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
          const toCreate = copies - allCopies.length;
          const newRows = [];

          for (let i = 0; i < toCreate; i++) {
            const copyNum = nextNum + i;
            const copyId  = generateUUID();
            const { dataUrl } = await generateCopyQR(copyId, copyNum);
            const qrBlob  = await (await fetch(dataUrl)).blob();
            const qrFile  = new File([qrBlob], `qr_${copyId}.png`, { type: 'image/png' });
            const qrUrl   = await uploadImage(qrFile, 'qrcodes');
            newRows.push({ book_id: book.id, copy_id: copyId, copy_number: copyNum,
                           qr_code_url: qrUrl, status: 'Available' });
          }

          const { data: inserted, error: insErr } = await supabaseAdmin
            .from('book_copies').insert(newRows).select('copy_id, copy_number, qr_code_url, status');
          if (insErr) throw insErr;
          allCopies = [...allCopies, ...(inserted || [])];
        }

        // book_copies.status can fall out of sync with what's actually
        // checked out (e.g. a status update silently failing during
        // approval — see the same caveat in fetchBooks above), so cross-
        // check against 'borrowings' the same way the catalog list does,
        // just scoped to this book's copies instead of the whole list.
        const { data: activeBorrowings } = await supabaseAdmin
          .from('borrowings')
          .select('copy_label')
          .eq('book_id', book.id)
          .ilike('status', 'borrowed');
        const borrowedCopyIds = new Set((activeBorrowings || []).map(r => r.copy_label));

        const results = await Promise.all(allCopies.map(async (c) => {
          const { dataUrl } = await generateCopyQR(c.copy_id, c.copy_number);
          return {
            dataUrl,                 
            label:       c.copy_id,
            copyNum:     c.copy_number,
            copy_id:     c.copy_id,
            status:      borrowedCopyIds.has(c.copy_id) ? 'Borrowed' : c.status,
            qr_code_url: c.qr_code_url,
          };
        }));

        setCopyQRs(results);
        setQrIndex(0);
      } catch (err) {
        console.error('[Book_Catalog] QR modal error:', err);
      } finally {
        setGeneratingCopyQRs(false);
      }
    } else {
      setQrIndex(0);
    }
  };

  const goPrevCopyQR = () => setQrIndex(i => Math.max(0, i - 1));
  const goNextCopyQR = () => setQrIndex(i => Math.min(copyQRs.length - 1, i + 1));

  const downloadCopyQR = (qr, format = 'png') => {
    if (!qr) return;
    const titleSlug = slugifyTitle(book?.title);
    const canvas   = document.createElement('canvas');
    const img      = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = 2;
      canvas.width  = img.naturalWidth  * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;

      // Extra strip at the top to show the book title, so the saved
      // image is easy to identify at a glance.
      const titleH = Math.round(28 * scale);
      const labelH = Math.round(36 * scale);
      const fullHeight = canvas.height + titleH;
      canvas.height = fullHeight;

      ctx.fillStyle = '#FDF8F0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#5A0000';
      ctx.font      = `bold ${Math.round(13 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      const maxTitleWidth = canvas.width - Math.round(20 * scale);
      let titleText = book?.title || 'Untitled';
      while (ctx.measureText(titleText).width > maxTitleWidth && titleText.length > 3) {
        titleText = titleText.slice(0, -1);
      }
      if (titleText !== (book?.title || 'Untitled')) titleText = titleText.slice(0, -1) + '…';
      ctx.fillText(titleText, canvas.width / 2, Math.round(19 * scale));

      ctx.drawImage(img, 0, titleH, img.naturalWidth * scale, img.naturalHeight * scale);

      ctx.fillStyle = '#FDF8F0';
      ctx.fillRect(0, canvas.height - labelH, canvas.width, labelH);
      ctx.fillStyle = '#5A0000';
      ctx.font      = `${Math.round(11 * scale)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`Copy #${qr.copyNum} | ${(qr.copy_id || qr.label).slice(0, 8)}…`, canvas.width / 2, canvas.height - Math.round(10 * scale));

      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
      const quality  = format === 'jpg' ? 0.96 : undefined;

      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href    = url;
        a.download = `${titleSlug}_Copy${qr.copyNum}_${(qr.copy_id || qr.label).slice(0, 8)}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }, mimeType, quality);
    };
    img.onerror = () => {
      const a   = document.createElement('a');
      a.href    = qr.dataUrl;
      a.download = `${titleSlug}_Copy${qr.copyNum}_${(qr.copy_id || qr.label).slice(0, 8)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    img.src = qr.dataUrl;
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
    <div className="bd-overlay" style={{
      position: 'fixed', inset: 0, background: 'rgba(20,0,0,0.60)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24, backdropFilter: 'blur(4px)',
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bd-modal" style={{
        background: 'var(--cream)', borderRadius: 14,
        border: '1px solid rgba(139,0,0,0.18)',
        boxShadow: '0 20px 60px rgba(30,0,0,0.42)',
        width: '100%', maxWidth: 740, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        animation: 'lm-fade-in 0.22s ease',
      }}>
        <div className="bd-head" style={{
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
              color: '#F5E4A8', letterSpacing: '0.05em', textAlign: 'left',
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

        <div className="bd-body" style={{ display: 'flex', gap: 14, overflowY: 'auto', flex: 1, padding: 16, alignItems: 'flex-start' }}>
          {/* Side card — same bordered, rounded-panel language as the Browse Catalog Book Details popup */}
          <div className="bd-side" style={{
            width: 220, flexShrink: 0, padding: '18px 14px 16px',
            border: '1px solid rgba(139,0,0,0.18)', borderRadius: 14,
            background: 'rgba(255,255,255,0.55)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            position: 'sticky', top: 0,
          }}>
            <div style={{ width: '100%' }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6, fontFamily: 'var(--font-sans)', textAlign: 'left' }}>Cover</div>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '160 / 204', flexShrink: 0 }}>
                {book.cover_image_url ? (
                  <img src={book.cover_image_url} alt="cover" style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'contain', borderRadius: 3, filter: 'drop-shadow(0 6px 10px rgba(50,0,0,0.30))',
                  }} />
                ) : (
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: 8,
                    background: 'linear-gradient(135deg,rgba(139,0,0,0.10),rgba(201,168,76,0.06))',
                    border: '1px solid rgba(139,0,0,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', opacity: 0.5,
                  }}>{Ic.book}</div>
                )}
              </div>
            </div>

            {/* Copies total — plain label, left-aligned like the rest of the side card */}
            <div style={{ width: '100%', textAlign: 'left', fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              {copies} cop{copies === 1 ? 'y' : 'ies'} total
            </div>

            {/* View & Download QRs — same slot/weight as the student card's favorite button, repurposed for the librarian workflow */}
            <button
              onClick={handleOpenQrModal}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', minHeight: 40, padding: '0 14px', borderRadius: 8, cursor: 'pointer',
                background: 'linear-gradient(180deg,#7A1414,#5C0D0D)', color: '#FFF6DF',
                border: '1px solid #4A0000', boxShadow: '0 3px 8px rgba(80,0,0,0.25)',
                fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 600, transition: 'filter 0.18s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.14)'}
              onMouseLeave={e => e.currentTarget.style.filter = 'none'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3"/></svg>
              View & Download QRs
            </button>

            {/* Original Scan — plain preview of the abstract page, same object-fit as the cover; the full text already reads below in the details panel */}
            {hasAbstract && (
              <div style={{ width: '100%' }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 6, fontFamily: 'var(--font-sans)', textAlign: 'left' }}>Original Scan</div>
                <div style={{
                  width: '100%', aspectRatio: '160 / 204', borderRadius: 8, overflow: 'hidden',
                  border: '1px solid rgba(139,0,0,0.18)', position: 'relative',
                  background: book.abstract_image_url ? '#fff' : 'linear-gradient(135deg,rgba(139,0,0,0.08),rgba(201,168,76,0.06))',
                }}>
                  {book.abstract_image_url ? (
                    <img src={book.abstract_image_url} alt="abstract" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, padding: '10px 12px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Georgia,serif', lineHeight: 1.6, overflow: 'hidden', textAlign: 'left' }}>
                      {abstractData?.heading && <div style={{ fontWeight: 700, fontSize: 10, marginBottom: 4, color: 'var(--maroon-mid)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{abstractData.heading}</div>}
                      {abstractData?.paragraphs?.[0]?.slice(0, 140)}{abstractData?.paragraphs?.[0]?.length > 140 ? '…' : ''}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bd-main" style={{
            flex: 1, minWidth: 0, padding: '20px 22px 22px', overflowY: 'auto',
            border: '1px solid rgba(139,0,0,0.18)', borderRadius: 14, background: 'rgba(255,255,255,0.55)',
          }}>
            <div style={{ marginBottom: 16, textAlign: 'left' }}>
              <h3 style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(20px,2.4vw,24px)', fontWeight: 700, color: 'var(--text-primary)',
                lineHeight: 1.2, marginBottom: 6, textAlign: 'left',
              }}>{book.title}</h3>
              <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', textAlign: 'left' }}>
                by {book.authors || '—'}
              </div>
              {book.volume_title && (
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-serif)', marginTop: 2, textAlign: 'left' }}>
                  {book.volume_title}
                </div>
              )}
              {book.registration_status === 'pending' && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8,
                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                  fontFamily: 'var(--font-sans)', background: 'rgba(201,168,76,0.16)', color: '#8a6d1f',
                  border: '1px solid rgba(201,168,76,0.35)',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                  Awaiting Super Admin Confirmation
                </span>
              )}
            </div>

            {/* Facts grid — icon-chip cards, same visual language as the Browse Catalog facts panel */}
            <div className="bd-facts" style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px', padding: '14px 16px',
              border: '1px solid rgba(139,0,0,0.16)', borderRadius: 12, background: 'rgba(255,255,255,0.45)',
            }}>
              {[
                ['Publisher', book.publisher],
                ['Place of Publication', book.place_of_publication],
                ['Year Published', book.year],
                ['Volume Number', book.volume_number],
                ['Edition', book.edition],
                ['ISBN', book.isbn],
                ['Call Number', book.call_number],
                ['Total Pages', book.pages],
                ['Shelf Location', book.shelf_location],
                ['Genre', book.genre],
                ['Copies', book.copies],
                ['Color', book.color],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                  <div style={{
                    flex: 'none', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--maroon-deep)', background: 'rgba(255,255,255,0.70)', border: '1px solid rgba(139,0,0,0.18)', borderRadius: 9,
                  }}>{FACT_ICONS[label] || Ic.book}</div>
                  <div style={{ minWidth: 0, textAlign: 'left' }}>
                    <div style={{
                      fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
                      color: 'var(--text-dim)', fontFamily: 'var(--font-sans)',
                    }}>{label}</div>
                    <div style={{ marginTop: 1, fontSize: 13, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', overflowWrap: 'anywhere' }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Abstract content — shown inline under the details, same as the Browse Catalog Book Details layout */}
            {abstractData && (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 10px',
                  fontFamily: 'var(--font-sans)', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.2em',
                  textTransform: 'uppercase', color: 'var(--text-dim)', textAlign: 'left',
                }}>
                  {Ic.book}
                  <span>{abstractData.heading || 'Abstract'}</span>
                  <span style={{ flex: 1, height: 1, background: 'rgba(139,0,0,0.16)' }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  {mergeFragmentedParagraphs(abstractData.paragraphs, abstractData.subheadings).map((para, i) => {
                    const isSubhead = abstractData.subheadings?.includes(para);
                    return isSubhead ? (
                      <div key={i} style={{
                        fontSize: 12.5, fontWeight: 700, color: 'var(--maroon-mid)', fontFamily: 'var(--font-sans)',
                        letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 16, marginBottom: 8,
                      }}>{para}</div>
                    ) : (
                      <p key={i} style={{
                        margin: '0 0 12px', fontSize: 13.5, lineHeight: 1.75,
                        color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)', textAlign: 'left',
                      }}>{para}</p>
                    );
                  })}
                </div>
                {abstractData.keywords?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 6 }}>
                    {abstractData.keywords.map((kw, i) => (
                      <span key={i} style={{
                        fontSize: 11.5, padding: '4px 13px', borderRadius: 14,
                        background: 'rgba(139,0,0,0.06)', border: '1px solid rgba(139,0,0,0.16)',
                        color: 'var(--maroon-mid)', fontFamily: 'var(--font-sans)', fontWeight: 500, fontStyle: 'italic',
                      }}>{kw}</span>
                    ))}
                  </div>
                )}
              </>
            )}

            {book.created_at && (
              <div style={{
                marginTop: 16, paddingTop: 12, borderTop: '1px solid rgba(139,0,0,0.08)',
                fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)', textAlign: 'left',
              }}>
                Added on {new Date(book.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            )}
          </div>
        </div>
      </div>

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
            maxWidth: 360, width: '100%', maxHeight: '88vh',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            animation: 'lm-fade-in 0.2s ease',
          }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '14px 20px', borderRadius: '14px 14px 0 0',
              background: 'linear-gradient(135deg,var(--maroon-deep),var(--maroon-mid))',
              borderBottom: '1px solid rgba(201,168,76,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: '#F5E4A8', letterSpacing: '0.04em' }}>
                {generatingCopyQRs || !selectedCopyQR ? 'QR Code' : `Copy #${selectedCopyQR.copyNum}`}
              </h3>
              <button onClick={() => setQrModalOpen(false)} style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(245,228,168,0.10)', border: '1px solid rgba(245,228,168,0.18)',
                color: 'rgba(245,228,168,0.80)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{Ic.close}</button>
            </div>

            <div style={{ padding: '26px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, overflowY: 'auto' }}>
              {generatingCopyQRs ? (
                <div style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-sans)', fontSize: 13, padding: '40px 0' }}>Generating unique QR codes…</div>
              ) : selectedCopyQR ? (
                <>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
                    color: 'var(--maroon-mid)', letterSpacing: '0.03em', textAlign: 'center',
                    textTransform: 'uppercase',
                  }}>
                    {book?.title}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={goPrevCopyQR}
                      disabled={qrIndex === 0}
                      title="Previous copy"
                      style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid rgba(139,0,0,0.20)',
                        background: qrIndex === 0 ? 'rgba(139,0,0,0.04)' : 'rgba(139,0,0,0.08)',
                        color: qrIndex === 0 ? 'rgba(90,0,0,0.25)' : 'var(--maroon-mid)',
                        cursor: qrIndex === 0 ? 'not-allowed' : 'pointer',
                        visibility: copyQRs.length > 1 ? 'visible' : 'hidden',
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>

                    <img src={selectedCopyQR.dataUrl} alt={selectedCopyQR.label}
                      style={{ width: 220, height: 220, objectFit: 'contain', borderRadius: 10, border: '1px solid rgba(139,0,0,0.12)', background: '#FDF8F0' }} />

                    <button
                      onClick={goNextCopyQR}
                      disabled={qrIndex >= copyQRs.length - 1}
                      title="Next copy"
                      style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid rgba(139,0,0,0.20)',
                        background: qrIndex >= copyQRs.length - 1 ? 'rgba(139,0,0,0.04)' : 'rgba(139,0,0,0.08)',
                        color: qrIndex >= copyQRs.length - 1 ? 'rgba(90,0,0,0.25)' : 'var(--maroon-mid)',
                        cursor: qrIndex >= copyQRs.length - 1 ? 'not-allowed' : 'pointer',
                        visibility: copyQRs.length > 1 ? 'visible' : 'hidden',
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </div>

                  {copyQRs.length > 1 && (
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)' }}>
                      Copy {qrIndex + 1} of {copyQRs.length}
                    </div>
                  )}

                  <div style={{
                    fontFamily: 'monospace', fontSize: 10, color: 'var(--text-dim)',
                    textAlign: 'center', wordBreak: 'break-all', maxWidth: 260,
                  }}>
                    {selectedCopyQR.copy_id || selectedCopyQR.label}
                  </div>

                  <button onClick={() => downloadCopyQR(selectedCopyQR, 'png')} style={{
                    padding: '10px 28px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: '1px solid rgba(139,0,0,0.20)',
                    background: 'rgba(139,0,0,0.06)',
                    color: 'var(--maroon-mid)', fontFamily: 'var(--font-sans)', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    {Ic.download} Download QR
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DeleteModal({ book, loading, onClose, onConfirm }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(10,0,0,0.78)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(8px)',
      animation: 'lm-fade-in 0.2s ease',
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--cream)', borderRadius: 20, width: '100%', maxWidth: 380,
        border: '2px solid rgba(201,168,76,0.35)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
        animation: 'lm-modal-in 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        overflow: 'hidden',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #8B0000, #6B0000)',
          padding: '18px 24px', borderBottom: '2px solid rgba(201,168,76,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: '#F5E4A8', fontWeight: 700 }}>Delete Book Record</div>
            <div style={{ fontSize: 11.5, color: 'rgba(245,228,168,0.6)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>This action cannot be undone</div>
          </div>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div style={{
            padding: '12px 14px', borderRadius: 10, marginBottom: 18,
            background: 'rgba(139,0,0,0.06)', border: '1px solid rgba(139,0,0,0.15)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a0000', fontFamily: 'var(--font-sans)', marginBottom: 3 }}>{book.title}</div>
            <div style={{ fontSize: 12, color: '#6b4040', fontFamily: 'var(--font-sans)' }}>Are you sure you want to delete this book?</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={onClose} disabled={loading} style={{
              padding: '12px', borderRadius: 10, border: '1.5px solid rgba(139,0,0,0.2)',
              background: 'transparent', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 600, color: '#8B0000',
            }}>Cancel</button>
            <button onClick={onConfirm} disabled={loading} style={{
              padding: '12px', borderRadius: 10, border: 'none',
              background: loading ? 'rgba(139,0,0,0.35)' : 'linear-gradient(135deg, #8B0000, #6B0000)',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 700, color: '#F5E4A8',
              boxShadow: loading ? 'none' : '0 4px 14px rgba(139,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}>
              {loading
                ? <><span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'lm-spin 0.65s linear infinite', display: 'inline-block' }}/> Deleting…</>
                : 'Delete Book'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Book_Catalog() {
  // Phase 9 — campus isolation
  const { profile } = useAuth();
  const campusId = profile?.campus_id ?? null;

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

  // 'book' = officially registered catalog · 'inventory' = every individual
  // physical copy (book_copies) · 'pending' = new titles submitted for
  // Super Admin confirmation, not yet counted as part of the collection.
  const [activeTab, setActiveTab] = useState('book');

  // Inventory tab — per-copy records, separate from the aggregate `books` list above.
  const [copies, setCopies]                       = useState([]);
  const [copiesLoading, setCopiesLoading]         = useState(true);
  const [copiesToGenerate, setCopiesToGenerate]   = useState([]); // books whose Copies count is ahead of tracked rows
  const [generatingMissing, setGeneratingMissing] = useState(false);
  const [copyActionId, setCopyActionId]           = useState(null); // copy_id currently being fixed/deleted
  const [qrPreviewCopy, setQrPreviewCopy]         = useState(null);
  const [invSort, setInvSort]                   = useState({ key: 'title', dir: 'asc' }); // Inventory tab sorting

  const [toast, setToast]   = useState({ msg: '', type: 'success' });
  const toastRef = useRef();

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast({ msg: '', type: 'success' }), 3200);
  };

  const fetchBooks = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      let qBooks    = supabase.from('books').select('*').order('created_at', { ascending: false });
      let qCopies   = supabaseAdmin.from('book_copies').select('book_id, status, books!inner(campus_id)');
      // Active borrowings are the source of truth for what's actually out on loan —
      // book_copies.status can fall out of sync (e.g. a status update silently fails
      // during approval), so we cross-check against 'borrowings' to make sure books
      // that are genuinely borrowed always get counted here too. Fetched without a
      // join (status matched case-insensitively, filtered to this campus below using
      // the book ids we already have) so it can't silently come back empty.
      let qBorrowed = supabaseAdmin.from('borrowings').select('book_id, status').ilike('status', 'borrowed');
      if (campusId) {
        qBooks  = qBooks.eq('campus_id', campusId);
        qCopies = qCopies.eq('books.campus_id', campusId);
      }
      const [
        { data: booksData, error: booksErr },
        { data: copiesData },
        { data: borrowedData, error: borrowedErr },
      ] = await Promise.all([qBooks, qCopies, qBorrowed]);
      if (booksErr) throw booksErr;
      if (borrowedErr) console.warn('[Book_Catalog] borrowings fetch error:', borrowedErr.message);

      const copiesMap = {};
      (copiesData || []).forEach(c => {
        if (!copiesMap[c.book_id]) copiesMap[c.book_id] = { total: 0, available: 0 };
        copiesMap[c.book_id].total += 1;
        if (c.status === 'Available') copiesMap[c.book_id].available += 1;
      });

      const bookIdSet = new Set((booksData || []).map(b => b.id));
      const borrowedCountMap = {};
      (borrowedData || []).forEach(r => {
        if (!bookIdSet.has(r.book_id)) return; // keep it scoped to this campus's books
        borrowedCountMap[r.book_id] = (borrowedCountMap[r.book_id] || 0) + 1;
      });

      const merged = (booksData || []).map(b => {
        const activeBorrowed = borrowedCountMap[b.id] || 0;
        const counts = copiesMap[b.id];
        const total = counts ? counts.total : (parseInt(b.copies) || 0);
        // Never let "available" exceed what active borrowings say is actually out,
        // even if book_copies.status wasn't updated correctly.
        const available = Math.max(0, Math.min(counts ? counts.available : total, total - activeBorrowed));
        if (!counts && !activeBorrowed) return b;
        return {
          ...b,
          copies:           total,
          available_copies: available,
          status:           available > 0 ? 'Available' : (total > 0 ? 'Borrowed' : b.status),
        };
      });

      setBooks(merged);
    } catch (err) {
      showToast('Failed to load books: ' + err.message, 'error');
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [campusId]);

  useEffect(() => { fetchBooks(true); }, [fetchBooks]);

  useEffect(() => {
    const silentRefresh = () => fetchBooks(false);
    const ch = supabase
      .channel('catalog-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'book_copies' }, silentRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'borrowings'  }, silentRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books'       }, silentRefresh)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchBooks]);

  // Loads every individual copy (book_copies) for the Inventory tab, joined
  // with its parent book's display info, and cross-checks status against
  // active borrowings the same way fetchBooks/ViewModal already do so a
  // stale book_copies.status doesn't show a copy as Borrowed forever.
  const fetchCopies = useCallback(async (showSpinner = true) => {
    if (showSpinner) setCopiesLoading(true);
    try {
      // Fetched as two plain queries and joined in JS below, rather than
      // embedding books!inner(...) inside the book_copies select — this
      // schema has more than one foreign key between book_copies and
      // books, which makes PostgREST's embed shorthand ambiguous.
      let qAllBooks = supabaseAdmin
        .from('books')
        .select('id, title, edition, isbn, call_number, authors, shelf_location, genre, cover_image_url, copies, campus_id, registration_status')
        .neq('registration_status', 'pending');
      if (campusId) qAllBooks = qAllBooks.eq('campus_id', campusId);

      const qCopyRows = supabaseAdmin
        .from('book_copies')
        .select('copy_id, copy_number, status, qr_code_url, book_id')
        .order('copy_number', { ascending: true });

      const qActiveBorrowed = supabaseAdmin.from('borrowings').select('copy_label').ilike('status', 'borrowed');

      const [{ data: allBooks, error: booksErr }, { data: rows, error }, { data: activeBorrowings }] =
        await Promise.all([qAllBooks, qCopyRows, qActiveBorrowed]);
      if (booksErr) throw booksErr;
      if (error) throw error;

      const bookMap = {};
      (allBooks || []).forEach(b => { bookMap[b.id] = b; });

      const borrowedSet = new Set((activeBorrowings || []).map(r => r.copy_label));
      // Scoped to this campus's registered books via bookMap, since the
      // book_copies query above has no campus/registration filter of its own.
      const registeredRows = (rows || []).filter(r => bookMap[r.book_id]);

      const withStatus = registeredRows.map(r => ({
        copy_id:     r.copy_id,
        copy_number: r.copy_number,
        qr_code_url: r.qr_code_url,
        book_id:     r.book_id,
        book:        bookMap[r.book_id],
        status:      borrowedSet.has(r.copy_id) ? 'Borrowed' : (r.status || 'Available'),
        // Stored as Borrowed but no active loan actually references it —
        // almost always the sync issue called out elsewhere in this file.
        stale:       r.status === 'Borrowed' && !borrowedSet.has(r.copy_id),
      })).sort((a, b) => (a.book?.title || '').localeCompare(b.book?.title || '') || a.copy_number - b.copy_number);

      setCopies(withStatus);

      const trackedCountByBook = {};
      registeredRows.forEach(r => { trackedCountByBook[r.book_id] = (trackedCountByBook[r.book_id] || 0) + 1; });
      const shortfalls = (allBooks || []).filter(b => (parseInt(b.copies) || 0) > (trackedCountByBook[b.id] || 0));
      setCopiesToGenerate(shortfalls);
    } catch (err) {
      showToast('Failed to load inventory: ' + err.message, 'error');
    } finally {
      if (showSpinner) setCopiesLoading(false);
    }
  }, [campusId]);

  useEffect(() => { fetchCopies(true); }, [fetchCopies]);

  useEffect(() => {
    const silentRefresh = () => fetchCopies(false);
    const ch = supabase
      .channel('inventory-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'book_copies' }, silentRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'borrowings'  }, silentRefresh)
      // A Super Admin approving a registration only flips books.registration_status
      // (book_copies rows already exist), so without this the Inventory tab never
      // heard about the approval and the new copies stayed hidden until a refresh.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'books'       }, silentRefresh)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchCopies]);

  // Safety net, same idea as the Dashboard's notification poll: if Realtime
  // replication is switched off for a table, postgres_changes never fires. This
  // quietly re-syncs the Book and Inventory tabs every few seconds while the
  // page is visible (and instantly when the tab regains focus), so an approved
  // book still shows up on its own without a manual refresh.
  useEffect(() => {
    const refreshBoth = () => {
      if (document.visibilityState !== 'visible') return;
      fetchBooks(false);
      fetchCopies(false);
    };
    const pollId = setInterval(refreshBoth, 6000);
    document.addEventListener('visibilitychange', refreshBoth);
    return () => {
      clearInterval(pollId);
      document.removeEventListener('visibilitychange', refreshBoth);
    };
  }, [fetchBooks, fetchCopies]);

  // Back-fills book_copies rows (with their own QR) for books whose Copies
  // count is ahead of how many individual records exist — the "Generate"
  // banner action in the Inventory tab.
  const handleGenerateMissing = async () => {
    if (!copiesToGenerate.length || generatingMissing) return;
    setGeneratingMissing(true);
    try {
      for (const b of copiesToGenerate) {
        await ensureBookCopies(b);
      }
      showToast('Inventory records generated for all pending copies.');
      fetchCopies(false);
      fetchBooks(false);
    } catch (err) {
      showToast('Could not generate copy records: ' + err.message, 'error');
    } finally {
      setGeneratingMissing(false);
    }
  };

  // Manual correction for a copy stuck showing Borrowed with no matching
  // active loan (see `stale` above) — puts it back on the shelf in inventory.
  const handleMarkCopyAvailable = async (copy) => {
    const confirmed = window.confirm(
      `Mark Copy #${copy.copy_number} of "${copy.book?.title}" as Available?\n\nOnly do this if the copy is physically back on the shelf but its status didn't update automatically.`
    );
    if (!confirmed) return;
    setCopyActionId(copy.copy_id);
    try {
      const { error } = await supabaseAdmin.from('book_copies').update({ status: 'Available' }).eq('copy_id', copy.copy_id);
      if (error) throw error;
      await recomputeBookAggregate(copy.book_id);
      showToast(`Copy #${copy.copy_number} marked Available.`);
      fetchCopies(false);
      fetchBooks(false);
    } catch (err) {
      showToast('Update failed: ' + err.message, 'error');
    } finally {
      setCopyActionId(null);
    }
  };

  // Same rule as the per-book copy QR modal: only an Available copy can be
  // removed from inventory; a Borrowed one must be returned first.
  const handleDeleteCopy = async (copy) => {
    if (copy.status === 'Borrowed') {
      showToast('Cannot delete a borrowed copy. Return it first.', 'error');
      return;
    }
    const confirmed = window.confirm(`Delete Copy #${copy.copy_number} of "${copy.book?.title}"?\n\nThis permanently removes this copy's QR code and record.`);
    if (!confirmed) return;
    setCopyActionId(copy.copy_id);
    try {
      const { error: brErr } = await supabaseAdmin.from('borrow_requests').delete().eq('copy_id', copy.copy_id);
      if (brErr) throw brErr;
      const { error } = await supabaseAdmin.from('book_copies').delete().eq('copy_id', copy.copy_id);
      if (error) throw error;
      await recomputeBookAggregate(copy.book_id);
      showToast(`Copy #${copy.copy_number} removed from inventory.`);
      fetchCopies(false);
      fetchBooks(false);
    } catch (err) {
      showToast('Delete failed: ' + err.message, 'error');
    } finally {
      setCopyActionId(null);
    }
  };

  const handleSaved = () => {
    fetchBooks();
    showToast(editBook
      ? 'Book updated successfully.'
      : 'Book submitted for registration — awaiting Super Admin confirmation.');
  };

  const handleDelete = async () => {
    if (!deleteBook) return;
    setDeleting(true);
    try {
      
      const { data: copies, error: copiesErr } = await supabaseAdmin
        .from('book_copies')
        .select('copy_id')
        .eq('book_id', deleteBook.id);
      if (copiesErr) throw copiesErr;

      const copyIds = (copies || []).map(c => c.copy_id);

      
      if (copyIds.length > 0) {
        const { error: brErr } = await supabaseAdmin
          .from('borrow_requests')
          .delete()
          .in('copy_id', copyIds);
        if (brErr) throw brErr;
      }

 
      if (copyIds.length > 0) {
        const { error: bcErr } = await supabaseAdmin
          .from('book_copies')
          .delete()
          .in('copy_id', copyIds);
        if (bcErr) throw bcErr;
      }

     
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

  // Books added by this librarian start life as "pending" until a Super Admin
  // confirms/registers them (see handleSave's insert payload above). Legacy
  // rows without the column (pre-migration) are treated as already registered.
  const pendingBooks  = books.filter(b => b.registration_status === 'pending');
  const registeredBooks = books.filter(b => b.registration_status !== 'pending');

  const booksWithStatus = registeredBooks.map(b => {
    const avail = b.available_copies !== null && b.available_copies !== undefined
      ? parseInt(b.available_copies)
      : parseInt(b.copies) || 0;
    const total = parseInt(b.copies) || 0;
    return {
      ...b,
      status: avail > 0 ? 'Available' : (total > 0 ? 'Borrowed' : 'Borrowed'),
    };
  });

  const filtered = booksWithStatus.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q || [b.title, b.authors, b.isbn, b.call_number, b.publisher].join(' ').toLowerCase().includes(q);
    const matchGenre  = genreFilter === 'all' || b.genre === genreFilter;
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchShelf  = shelfFilter === 'all' || b.shelf_location === shelfFilter;
    return matchSearch && matchGenre && matchStatus && matchShelf;
  });

  const pendingFiltered = pendingBooks.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q || [b.title, b.authors, b.isbn, b.call_number, b.publisher].join(' ').toLowerCase().includes(q);
    const matchGenre  = genreFilter === 'all' || b.genre === genreFilter;
    return matchSearch && matchGenre;
  });

  const invFiltered = copies.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || [c.book?.title, c.book?.authors, c.book?.isbn, c.copy_id, String(c.copy_number)]
      .join(' ').toLowerCase().includes(q);
    const matchGenre  = genreFilter  === 'all' || c.book?.genre === genreFilter;
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchShelf  = shelfFilter  === 'all' || c.book?.shelf_location === shelfFilter;
    return matchSearch && matchGenre && matchStatus && matchShelf;
  });

  // Inventory sorting — applied on top of the filters above. The default
  // (Book Title A–Z, then copy number) is the same order the list had before.
  const invSorted = [...invFiltered].sort((a, b) => {
    const getVal = INV_SORT_FIELDS[invSort.key] || INV_SORT_FIELDS.title;
    const dir = invSort.dir === 'desc' ? -1 : 1;
    const cmp = (x, y) => (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y)));
    const primary = cmp(getVal(a), getVal(b)) * dir;
    if (primary) return primary;
    // Ties: keep copies of the same book together, in copy order.
    return cmp(a.book?.title || '', b.book?.title || '') || (a.copy_number - b.copy_number);
  });

  const handleInvSort = (key) =>
    setInvSort(prev => (prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: 'asc' }));

  const actionBtn = (variant) => {
    const variants = {
      view:   { color: '#5a7eb5', bg: 'rgba(90,126,181,0.10)', border: 'rgba(90,126,181,0.22)', hover: 'rgba(90,126,181,0.18)' },
      edit:   { color: 'var(--maroon-mid)', bg: 'rgba(139,0,0,0.07)', border: 'rgba(139,0,0,0.20)', hover: 'rgba(139,0,0,0.14)' },
      delete: { color: '#c0564e', bg: 'rgba(192,86,78,0.07)', border: 'rgba(192,86,78,0.20)', hover: 'rgba(192,86,78,0.14)' },
      qr:     { color: G, bg: 'rgba(201,168,76,0.08)', border: 'rgba(201,168,76,0.24)', hover: 'rgba(201,168,76,0.16)' },
      fix:    { color: '#5a9e5c', bg: 'rgba(90,158,92,0.08)', border: 'rgba(90,158,92,0.24)', hover: 'rgba(90,158,92,0.16)' },
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

  const totalBooks      = booksWithStatus.length;
  const totalCopies     = booksWithStatus.reduce((s, b) => s + (parseInt(b.copies) || 0), 0);
  const availableCount  = booksWithStatus.reduce((s, b) => {
    // parseInt() returns NaN (not null/undefined) when available_copies is
    // missing, so `??` never falls through — check with Number.isFinite instead.
    const parsed = parseInt(b.available_copies);
    const av = Number.isFinite(parsed) ? parsed : (b.status === 'Available' ? (parseInt(b.copies) || 0) : 0);
    return s + av;
  }, 0);
  const borrowedCount   = totalCopies - availableCount;

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

      <div className="bc-stats" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Titles', value: totalBooks },
          { label: 'Total Copies', value: totalCopies },
          { label: 'Available', value: availableCount },
          { label: 'Borrowed', value: borrowedCount },
        ].map(({ label, value }) => (
          <div key={label} className="bc-stat" style={{
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
        <div className="bc-actions" style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
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

      <div className="bc-filters" style={{
        display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center',
        padding: '14px 16px', borderRadius: 10,
        background: 'linear-gradient(135deg,rgba(139,0,0,0.04),rgba(201,168,76,0.03))',
        border: '1px solid rgba(139,0,0,0.10)',
      }}>
        <div className="bc-search" style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
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
        <select className="bc-select" style={selectStyle} value={genreFilter} onChange={e => setGenreFilter(e.target.value)}>
          <option value="all">All Genres</option>
          {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        {(activeTab === 'book' || activeTab === 'inventory') && (
          <>
            <select className="bc-select" style={selectStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="Available">Available</option>
              <option value="Borrowed">Borrowed</option>
            </select>
            <select className="bc-select" style={selectStyle} value={shelfFilter} onChange={e => setShelfFilter(e.target.value)}>
              <option value="all">All Shelves</option>
              {SHELF_LOCATIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </>
        )}
        {activeTab === 'inventory' && (
          <select
            className="bc-select"
            style={selectStyle}
            value={`${invSort.key}:${invSort.dir}`}
            onChange={e => { const [key, dir] = e.target.value.split(':'); setInvSort({ key, dir }); }}
            aria-label="Sort inventory"
          >
            <option value="title:asc">Sort: Book Title (A–Z)</option>
            <option value="title:desc">Sort: Book Title (Z–A)</option>
            <option value="copy:asc">Sort: Copy No. (Low–High)</option>
            <option value="copy:desc">Sort: Copy No. (High–Low)</option>
            <option value="copyid:asc">Sort: Copy ID (A–Z)</option>
            <option value="copyid:desc">Sort: Copy ID (Z–A)</option>
            <option value="shelf:asc">Sort: Shelf Location (A–Z)</option>
            <option value="shelf:desc">Sort: Shelf Location (Z–A)</option>
            <option value="status:asc">Sort: Status (Available first)</option>
            <option value="status:desc">Sort: Status (Borrowed first)</option>
          </select>
        )}
        <span className="bc-count" style={{
          marginLeft: 'auto', fontSize: 11.5, color: 'var(--text-dim)',
          fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
        }}>
          {activeTab === 'book'
            ? `${filtered.length} ${filtered.length === 1 ? 'record' : 'records'}`
            : activeTab === 'inventory'
            ? `${invFiltered.length} ${invFiltered.length === 1 ? 'copy' : 'copies'}`
            : `${pendingFiltered.length} awaiting confirmation`}
        </span>
      </div>

      <div className="bc-tabs" style={{ display: 'flex', gap: 28, marginBottom: 20, borderBottom: '1.5px solid rgba(139,0,0,0.12)' }}>
        {[
          { key: 'book',      label: 'Book',            icon: Ic.book,  count: null },
          { key: 'inventory', label: 'Inventory',       icon: Ic.boxes, count: copies.length || null },
          { key: 'pending',   label: 'Unregister book', icon: Ic.clock, count: pendingBooks.length },
        ].map(t => (
          <button key={t.key} className="bc-tab" onClick={() => setActiveTab(t.key)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '0 0 11px', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: 700,
            border: 'none', borderBottom: `2.5px solid ${activeTab === t.key ? '#8B0000' : 'transparent'}`,
            background: 'transparent',
            color: activeTab === t.key ? '#8B0000' : 'var(--maroon-mid)',
            marginBottom: -1.5,
            transition: 'all 0.16s',
          }}>
            <span style={{ display: 'flex', alignItems: 'center' }}>{t.icon}</span>
            {t.label}
            {!!t.count && (
              <span style={{
                minWidth: 20, height: 20, padding: '0 6px', borderRadius: 999,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
                background: 'rgba(139,0,0,0.12)', color: '#8B0000',
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'inventory' ? (
        <InventoryPanel
          loading={copiesLoading}
          rows={invSorted}
          sort={invSort}
          onSort={handleInvSort}
          hasAny={copies.length > 0}
          search={search}
          shortfalls={copiesToGenerate}
          onGenerateMissing={handleGenerateMissing}
          generating={generatingMissing}
          onFix={handleMarkCopyAvailable}
          onDelete={handleDeleteCopy}
          onViewQr={setQrPreviewCopy}
          actionId={copyActionId}
          ActionBtn={ActionBtn}
          Ic={Ic}
        />
      ) : activeTab === 'pending' ? (
        loading ? (
          <div className="lm-loading">
            <div className="lm-spinner" />
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading catalog…</span>
          </div>
        ) : pendingFiltered.length === 0 ? (
          <div className="lm-empty">
            <div className="lm-empty-icon">🕓</div>
            <div className="lm-empty-text">Nothing pending</div>
            <div className="lm-empty-sub">
              {search ? 'Try a different search term.' : 'Books you add will appear here until a Super Admin confirms the registration.'}
            </div>
          </div>
        ) : (
          <div className="bc-tbl-wrap" style={{
            borderRadius: 10, border: '1px solid rgba(201,168,76,0.35)',
            overflow: 'hidden', boxShadow: '0 2px 12px rgba(30,0,0,0.07)',
          }}>
            <table className="bc-tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{
                  background: 'linear-gradient(135deg, #8B0000, #6B0000)',
                  borderBottom: '2px solid rgba(201,168,76,0.35)',
                }}>
                  {['Book Title', 'Authors', 'ISBN', 'Call No.', 'Copies', 'Submitted', 'Status', 'Action'].map((h, i) => (
                    <th key={h} style={{
                      padding: '13px 16px', textAlign: 'left',
                      fontFamily: 'var(--font-sans)', fontSize: 11,
                      fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
                      color: '#F5E4A8', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingFiltered.map((book, idx) => (
                  <PendingRow
                    key={book.id}
                    book={book}
                    idx={idx}
                    onView={() => setViewBook(book)}
                    onWithdraw={() => setDeleteBook(book)}
                    ActionBtn={ActionBtn}
                    Ic={Ic}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : loading ? (
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
        <div className="bc-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 20,
        }}>
          {filtered.map(book => (
            <BookCard
              key={book.id}
              book={book}
              onView={() => setViewBook(book)}
              onEdit={() => openEdit(book)}
              onDelete={() => setDeleteBook(book)}
              Ic={Ic}
            />
          ))}
        </div>
      )}

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
      {qrPreviewCopy && (
        <CopyQrPreviewModal copy={qrPreviewCopy} onClose={() => setQrPreviewCopy(null)} />
      )}
    </div>
  );
}

function BookCard({ book, onView, onEdit, onDelete, Ic }) {
  const [hov, setHov] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const total = parseInt(book.copies) ?? 0;
  const avail = book.available_copies !== null && book.available_copies !== undefined
    ? parseInt(book.available_copies)
    : (book.status === 'Available' ? total : 0);

  const menuItemStyle = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '9px 12px', border: 'none', background: 'transparent', cursor: 'pointer',
    fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 500,
    color: 'var(--text-primary)', textAlign: 'left', transition: 'background 0.14s',
  };

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onView}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column', minWidth: 0,
        background: "#FDF3E3 url('/BookCover.png') center/cover no-repeat",
        border: `1px solid ${hov ? 'rgba(107,0,0,0.32)' : 'rgba(107,0,0,0.14)'}`,
        borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
        boxShadow: hov ? '0 16px 34px rgba(80,0,0,0.20)' : '0 2px 6px rgba(80,0,0,0.08), 0 10px 28px rgba(80,0,0,0.10)',
        transform: hov ? 'translateY(-6px)' : 'none',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
      }}
    >
      {/* 3-dot menu — replaces the bookmark/save icon, same corner spot as the student card's save button */}
      <div ref={menuRef} style={{ position: 'absolute', top: 8, right: 10, zIndex: 3 }} onClick={e => e.stopPropagation()}>
        <button onClick={() => setMenuOpen(o => !o)} title="More actions" style={{
          width: 32, height: 32, padding: 0, borderRadius: 7,
          background: '#6B0000', color: '#FFF6DF', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 3px 8px rgba(40,0,0,0.30)', transition: 'transform 0.18s ease, background 0.18s ease',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.background = '#7B0000'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = '#6B0000'; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
          </svg>
        </button>
        {menuOpen && (
          <div style={{
            position: 'absolute', top: 37, right: 0, minWidth: 130,
            background: 'var(--cream)', border: '1px solid rgba(139,0,0,0.18)', borderRadius: 8,
            boxShadow: '0 10px 26px rgba(30,0,0,0.20)', overflow: 'hidden', zIndex: 10,
          }}>
            <button
              onClick={() => { setMenuOpen(false); onEdit(); }}
              style={menuItemStyle}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,0,0,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {Ic.edit} Edit
            </button>
            <button
              onClick={() => { setMenuOpen(false); onDelete(); }}
              style={{ ...menuItemStyle, color: '#c0564e', borderTop: '1px solid rgba(139,0,0,0.08)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(192,86,78,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {Ic.trash} Delete
            </button>
          </div>
        )}
      </div>

      {/* Cover — fixed book proportion, same margins as the student catalog card so the background art frames it */}
      <div style={{ position: 'relative', flexShrink: 0, margin: '9.4% 10.3% 0', aspectRatio: '270 / 385' }}>
        {book.cover_image_url ? (
          <img src={book.cover_image_url} alt="" style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'contain', borderRadius: 2,
          }} />
        ) : (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 4,
            background: 'linear-gradient(135deg,rgba(139,0,0,0.14),rgba(201,168,76,0.08))',
            border: '1px solid rgba(139,0,0,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)',
          }}>
            {Ic.book}
          </div>
        )}
      </div>

      {/* Info — left-aligned, same as Browse Catalog */}
      <div style={{ padding: '14px 10.3% 0', textAlign: 'left' }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700,
          color: 'var(--maroon-deep)', lineHeight: 1.3, minHeight: '2.6em', textAlign: 'left',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {book.title}
        </div>
        <div style={{
          fontSize: 12, color: 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font-sans)', textAlign: 'left',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {book.authors || '—'}
        </div>
        <div style={{ marginTop: 9 }}>
          <span style={{
            fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-sans)',
            color: 'var(--text-muted)',
          }}>
            {book.status || 'Available'}: {avail}/{total} copies
          </span>
        </div>
      </div>

      {/* View Details — full-width bar pinned to the bottom, same footer as Browse Catalog */}
      <div style={{ marginTop: 'auto', padding: '12px 4.1% 4.5%' }}>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onView(); }}
          style={{
            display: 'block', width: '100%', height: 32, border: 0, borderRadius: 4, cursor: 'pointer',
            background: '#6B0000', color: '#fff',
            fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, transition: 'background 0.18s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#560000'}
          onMouseLeave={e => e.currentTarget.style.background = '#6B0000'}
        >
          View Details
        </button>
      </div>
    </div>
  );
}

function PendingRow({ book, idx, onView, onWithdraw, ActionBtn, Ic }) {
  const [hov, setHov] = useState(false);
  const submitted = book.created_at
    ? new Date(book.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';
  return (
    <tr
      className="bc-trow"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onView}
      style={{
        background: hov ? 'rgba(201,168,76,0.08)' : (idx % 2 === 0 ? 'transparent' : 'rgba(201,168,76,0.03)'),
        borderBottom: '1px solid rgba(139,0,0,0.07)',
        cursor: 'pointer', transition: 'background 0.14s',
      }}
    >
      <td className="bc-td bc-td-title" data-label="Title" style={{ padding: '11px 16px', maxWidth: 240, textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {book.cover_image_url ? (
            <img src={book.cover_image_url} alt=""
              style={{ width: 32, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid rgba(139,0,0,0.15)', flexShrink: 0 }} />
          ) : (
            <div style={{
              width: 32, height: 40, borderRadius: 4, flexShrink: 0,
              background: 'linear-gradient(135deg,rgba(201,168,76,0.20),rgba(139,0,0,0.08))',
              border: '1px solid rgba(139,0,0,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-dim)',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
          )}
          <div style={{
            fontWeight: 600, fontSize: 13, color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170,
          }}>{book.title}</div>
        </div>
      </td>
      <td className="bc-td" data-label="Authors" style={{ padding: '11px 16px', textAlign: 'left' }}>
        <span style={{
          fontSize: 12.5, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'block', maxWidth: 160,
        }}>{book.authors || '—'}</span>
      </td>
      <td className="bc-td" data-label="ISBN" style={{ padding: '11px 16px', textAlign: 'left' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
          {book.isbn || '—'}
        </span>
      </td>
      <td className="bc-td" data-label="Call No." style={{ padding: '11px 16px', textAlign: 'left' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: '0.04em' }}>
          {book.call_number || '—'}
        </span>
      </td>
      <td className="bc-td" data-label="Copies" style={{ padding: '11px 16px', textAlign: 'left' }}>
        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--maroon-mid)' }}>
          {parseInt(book.copies) || 0}
        </span>
      </td>
      <td className="bc-td" data-label="Submitted" style={{ padding: '11px 16px', textAlign: 'left' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>{submitted}</span>
      </td>
      <td className="bc-td" data-label="Status" style={{ padding: '11px 16px', textAlign: 'left' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
          fontFamily: 'var(--font-sans)', background: 'rgba(201,168,76,0.16)', color: '#8a6d1f',
          border: '1px solid rgba(201,168,76,0.35)',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
          Awaiting Confirmation
        </span>
      </td>
      <td className="bc-td bc-td-actions" data-label="Action" style={{ padding: '11px 16px', textAlign: 'left' }} onClick={e => e.stopPropagation()}>
        <ActionBtn variant="delete" onClick={onWithdraw}>{Ic.trash} Withdraw</ActionBtn>
      </td>
    </tr>
  );
}
// ============================================================================
// Inventory tab — full per-copy management (book_copies), separate from the
// aggregate "Book" tab above. Lets a manager see and correct the status of
// every individual physical copy in the collection, view its QR code, or
// remove a single copy without touching the rest of that book's stock.
// ============================================================================

// Column -> value used by the Inventory sorting (toolbar dropdown + clickable headers).
const INV_SORT_FIELDS = {
  title:  c => c.book?.title || '',
  copy:   c => c.copy_number ?? 0,
  copyid: c => c.copy_id || '',
  shelf:  c => c.book?.shelf_location || '',
  status: c => c.status || '',
};

function InventoryPanel({
  loading, rows, hasAny, search, shortfalls, onGenerateMissing, generating,
  onFix, onDelete, onViewQr, actionId, ActionBtn, Ic, sort, onSort,
}) {
  if (loading) {
    return (
      <div className="lm-loading">
        <div className="lm-spinner" />
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading inventory…</span>
      </div>
    );
  }

  return (
    <div>
      {shortfalls.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
          padding: '12px 16px', borderRadius: 10,
          background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.32)',
        }}>
          <span style={{ color: '#8a6d1f', flexShrink: 0 }}>{Ic.alert}</span>
          <div style={{ flex: 1, fontSize: 12.5, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
            <strong style={{ color: '#8a6d1f' }}>{shortfalls.length}</strong> {shortfalls.length === 1 ? 'title has' : 'titles have'} more copies than tracked inventory records — generate QR codes and per-copy tracking for them.
          </div>
          <button onClick={onGenerateMissing} disabled={generating} style={{
            flexShrink: 0, padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
            border: '1px solid rgba(201,168,76,0.45)', background: generating ? 'rgba(201,168,76,0.25)' : 'rgba(201,168,76,0.18)',
            color: '#8a6d1f', fontFamily: 'var(--font-sans)', cursor: generating ? 'default' : 'pointer',
          }}>
            {generating ? 'Generating…' : 'Generate Missing'}
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="lm-empty">
          <div className="lm-empty-icon">📦</div>
          <div className="lm-empty-text">No copies found</div>
          <div className="lm-empty-sub">
            {!hasAny
              ? 'Individual copy records are generated the first time a book is added or its QR codes are viewed.'
              : search ? 'Try a different search term.' : 'Try a different filter.'}
          </div>
        </div>
      ) : (
        <div className="bc-tbl-wrap" style={{
          borderRadius: 10, border: '1px solid rgba(139,0,0,0.14)',
          overflow: 'hidden', boxShadow: '0 2px 12px rgba(30,0,0,0.07)',
        }}>
          <table className="bc-tbl" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                background: 'linear-gradient(135deg, #8B0000, #6B0000)',
                borderBottom: '2px solid rgba(201,168,76,0.35)',
              }}>
                {[
                  { label: 'Book Title',     key: 'title'  },
                  { label: 'Copy',           key: 'copy'   },
                  { label: 'Copy ID',        key: 'copyid' },
                  { label: 'Shelf Location', key: 'shelf'  },
                  { label: 'Status',         key: 'status' },
                  { label: 'Action',         key: null     },
                ].map(h => (
                  <th key={h.label}
                    onClick={h.key ? () => onSort(h.key) : undefined}
                    aria-sort={h.key && sort?.key === h.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    title={h.key ? `Sort by ${h.label}` : undefined}
                    style={{
                      padding: '13px 16px', textAlign: 'left',
                      fontFamily: 'var(--font-sans)', fontSize: 11,
                      fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
                      color: '#F5E4A8', whiteSpace: 'nowrap',
                      cursor: h.key ? 'pointer' : 'default', userSelect: 'none',
                    }}>
                    {h.label}
                    {h.key && (
                      <span style={{ marginLeft: 6, fontSize: 9, opacity: sort?.key === h.key ? 1 : 0.45 }}>
                        {sort?.key === h.key ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((copy, idx) => (
                <InventoryRow
                  key={copy.copy_id}
                  copy={copy}
                  idx={idx}
                  busy={actionId === copy.copy_id}
                  onFix={() => onFix(copy)}
                  onDelete={() => onDelete(copy)}
                  onViewQr={() => onViewQr(copy)}
                  ActionBtn={ActionBtn}
                  Ic={Ic}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InventoryRow({ copy, idx, busy, onFix, onDelete, onViewQr, ActionBtn, Ic }) {
  const [hov, setHov] = useState(false);
  const book = copy.book || {};
  return (
    <tr
      className="bc-trow"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? 'rgba(139,0,0,0.04)' : (idx % 2 === 0 ? 'transparent' : 'rgba(139,0,0,0.015)'),
        borderBottom: '1px solid rgba(139,0,0,0.07)',
        transition: 'background 0.14s',
      }}
    >
      <td className="bc-td bc-td-title" data-label="Title" style={{ padding: '11px 16px', maxWidth: 240, textAlign: 'left' }}>
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
          <div style={{
            fontWeight: 600, fontSize: 13, color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 170,
          }}>{book.title || 'Untitled'}</div>
        </div>
      </td>
      <td className="bc-td" data-label="Copy" style={{ padding: '11px 16px', textAlign: 'left' }}>
        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-sans)', color: 'var(--maroon-mid)' }}>
          #{copy.copy_number}
        </span>
      </td>
      <td className="bc-td" data-label="Copy ID" style={{ padding: '11px 16px', textAlign: 'left' }}>
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'monospace', letterSpacing: '0.02em' }}>
          {(copy.copy_id || '').slice(0, 8)}…
        </span>
      </td>
      <td className="bc-td" data-label="Shelf Location" style={{ padding: '11px 16px', textAlign: 'left' }}>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
          {book.shelf_location || '—'}
        </span>
      </td>
      <td className="bc-td" data-label="Status" style={{ padding: '11px 16px', textAlign: 'left' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
          <StatusBadge status={copy.status} />
          {copy.stale && (
            <span style={{ fontSize: 10, color: '#8a6d1f', fontFamily: 'var(--font-sans)' }}>
              No active loan found
            </span>
          )}
        </div>
      </td>
      <td className="bc-td bc-td-actions" data-label="Action" style={{ padding: '11px 16px', textAlign: 'left' }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap' }}>
          <ActionBtn variant="qr" onClick={onViewQr}>{Ic.qr} QR</ActionBtn>
          {copy.stale && (
            <ActionBtn variant="fix" onClick={busy ? undefined : onFix}>{Ic.wrench} {busy ? '…' : 'Mark Available'}</ActionBtn>
          )}
          {copy.status === 'Available' && (
            <ActionBtn variant="delete" onClick={busy ? undefined : onDelete}>{Ic.trash}</ActionBtn>
          )}
        </div>
      </td>
    </tr>
  );
}

function CopyQrPreviewModal({ copy, onClose }) {
  const book = copy.book || {};
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(20,0,0,0.60)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100, padding: 24, backdropFilter: 'blur(4px)',
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--cream)', borderRadius: 14,
        border: '1px solid rgba(139,0,0,0.18)',
        boxShadow: '0 20px 60px rgba(30,0,0,0.42)',
        width: '100%', maxWidth: 340,
        display: 'flex', flexDirection: 'column',
        animation: 'lm-fade-in 0.22s ease',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          background: 'linear-gradient(135deg, var(--maroon-deep), var(--maroon-mid))',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#F5E4A8' }}>
            Copy #{copy.copy_number}
          </div>
          <button onClick={onClose} style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'rgba(245,228,168,0.10)', border: '1px solid rgba(245,228,168,0.18)',
            color: 'rgba(245,228,168,0.70)', fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>✕</button>
        </div>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <div style={{
            fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)', marginBottom: 14,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{book.title || 'Untitled'}</div>
          {copy.qr_code_url ? (
            <img src={copy.qr_code_url} alt="QR code"
              style={{ width: 200, height: 200, objectFit: 'contain', margin: '0 auto', display: 'block', borderRadius: 8, border: '1px solid rgba(139,0,0,0.15)' }} />
          ) : (
            <div style={{ fontSize: 12.5, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)' }}>
              No QR code generated yet for this copy.
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'monospace', marginTop: 12 }}>
            {copy.copy_id}
          </div>
          {copy.qr_code_url && (
            <a href={copy.qr_code_url} download target="_blank" rel="noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14,
              padding: '8px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
              border: '1px solid rgba(139,0,0,0.20)', background: 'rgba(139,0,0,0.06)',
              color: 'var(--maroon-mid)', fontFamily: 'var(--font-sans)', textDecoration: 'none',
            }}>Download QR</a>
          )}
        </div>
      </div>
    </div>
  );
}