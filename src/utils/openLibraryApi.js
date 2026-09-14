// src/utils/openLibraryApi.js
// ─── Open Library integration (official Search API only) ───
//
// This talks ONLY to openlibrary.org's public Search API. It never scrapes
// the website and never stores book content — it just fetches lightweight
// metadata (title/author/cover/availability) for display, and hands back a
// link to the official Open Library / Internet Archive page for reading or
// borrowing. No Supabase writes happen here.
//
// Docs: https://openlibrary.org/dev/docs/api/search

const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json';
const COVERS_BASE_URL = 'https://covers.openlibrary.org/b/id';

// Keep requests small and fast — this is a "show a handful of relevant
// external results alongside the real catalog" feature, not a mirror of
// Open Library's database.
const DEFAULT_LIMIT = 8;
const REQUEST_TIMEOUT_MS = 6000;

// Only ask the API for the fields we actually use. `availability` is the
// field that turns on Open Library's Search API tie-in to the archive.org
// lending status (open / borrow_available / borrow_unavailable / etc.) —
// requesting it here means we don't need a second network call.
const SEARCH_FIELDS = [
  'key',
  'title',
  'author_name',
  'first_publish_year',
  'isbn',
  'subject',
  'cover_i',
  'ebook_access',
  'ia',
  'availability',
].join(',');

/**
 * Turn one Open Library `availability` block (or, if that's missing, the
 * coarser `ebook_access` flag) into a single normalized status our UI can
 * branch on. We never assume a book is readable — if we don't have a clear
 * signal, we mark it restricted/unknown rather than showing a fake button.
 */
function resolveAvailability(doc) {
  const av = doc.availability || null;
  const identifier = av?.identifier || doc.ia?.[0] || null;
  const status = av?.status || null;

  // Preferred path: the real archive.org-backed status from `availability`.
  if (status === 'open') {
    return {
      status: 'open',
      label: 'Read Free',
      canRead: true,
      canBorrow: false,
      actionUrl: identifier ? `https://archive.org/details/${identifier}` : `https://openlibrary.org${doc.key}`,
    };
  }
  if (status === 'borrow_available') {
    return {
      status: 'borrow_available',
      label: 'Borrow on Open Library',
      canRead: false,
      canBorrow: true,
      actionUrl: identifier ? `https://archive.org/details/${identifier}` : `https://openlibrary.org${doc.key}`,
    };
  }
  if (status === 'borrow_unavailable' || status === 'checked_out') {
    return { status: 'borrow_unavailable', label: 'Currently Checked Out', canRead: false, canBorrow: false, actionUrl: null };
  }
  if (status === 'private' || status === 'restricted' || status === 'error') {
    return { status: 'restricted', label: 'Restricted Access', canRead: false, canBorrow: false, actionUrl: null };
  }

  // Fallback path: no `availability` block came back for this doc — fall
  // back to the coarser `ebook_access` flag the Search API always returns.
  switch (doc.ebook_access) {
    case 'public':
      return {
        status: 'open',
        label: 'Read Free',
        canRead: true,
        canBorrow: false,
        actionUrl: identifier ? `https://archive.org/details/${identifier}` : `https://openlibrary.org${doc.key}`,
      };
    case 'borrowable':
      return {
        status: 'borrow_available',
        label: 'Borrow on Open Library',
        canRead: false,
        canBorrow: true,
        actionUrl: identifier ? `https://archive.org/details/${identifier}` : `https://openlibrary.org${doc.key}`,
      };
    case 'printdisabled':
      return { status: 'restricted', label: 'Print-Disabled Access Only', canRead: false, canBorrow: false, actionUrl: null };
    default:
      return { status: 'unavailable', label: 'Not Available Online', canRead: false, canBorrow: false, actionUrl: null };
  }
}

/**
 * Map one raw Open Library Search API doc into the shape our catalog cards
 * and details modal expect. Field names are kept close to the local
 * Supabase `books` row shape (title/author/isbn/category/etc.) so the same
 * card and modal markup can render either source with light branching.
 */
function normalizeDoc(doc) {
  const availability = resolveAvailability(doc);
  return {
    // Prefixed so it can never collide with a Supabase UUID/int id.
    id: `ol-${doc.key}`,
    source: 'openlibrary',
    title: doc.title || 'Untitled',
    author: (doc.author_name && doc.author_name.join(', ')) || 'Unknown author',
    year: doc.first_publish_year || null,
    isbn: (doc.isbn && doc.isbn[0]) || null,
    category: (doc.subject && doc.subject[0]) || null,
    cover_image_url: doc.cover_i ? `${COVERS_BASE_URL}/${doc.cover_i}-M.jpg` : null,
    cover_image_url_lg: doc.cover_i ? `${COVERS_BASE_URL}/${doc.cover_i}-L.jpg` : null,
    workKey: doc.key,
    olUrl: `https://openlibrary.org${doc.key}`,
    availability,
  };
}

/**
 * Search Open Library. Always resolves — on any network error, timeout, or
 * non-OK response it resolves to `{ results: [], error: <message> }` instead
 * of throwing, so a flaky external API never breaks the local catalog.
 */
export async function searchOpenLibrary(query, { limit = DEFAULT_LIMIT, page = 1 } = {}) {
  const q = (query || '').trim();
  if (!q) return { results: [], error: null };

  const params = new URLSearchParams({
    q,
    fields: SEARCH_FIELDS,
    limit: String(limit),
    page: String(page),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${OPEN_LIBRARY_SEARCH_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (res.status === 429) {
      return { results: [], error: 'Open Library is rate-limiting requests right now — try again in a moment.' };
    }
    if (!res.ok) {
      return { results: [], error: `Open Library search failed (${res.status}).` };
    }

    const data = await res.json();
    const docs = Array.isArray(data.docs) ? data.docs : [];
    return { results: docs.map(normalizeDoc), error: null };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { results: [], error: 'Open Library took too long to respond.' };
    }
    console.error('[openLibraryApi]', err);
    return { results: [], error: 'Could not reach Open Library.' };
  } finally {
    clearTimeout(timer);
  }
}