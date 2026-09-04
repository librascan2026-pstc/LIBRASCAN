// ============================================================================
// LIBRASCAN — Registration decision notifications (Super Admin → Librarian)
// Called once, at the moment Super Admin approves or rejects a book
// registration request (see SuperAdminBooks.jsx handleConfirm / handleReject).
// Inserts one row per Library Manager on the book's campus into the
// `notifications` table so it survives across devices/sessions and — for
// rejections — survives the `books` row itself being deleted.
// ============================================================================

import { supabaseAdmin } from '../supabaseClient';

/**
 * Notifies every Library Manager on `campusId` that a book registration was
 * approved or rejected. Safe to call exactly once per decision — this does
 * not itself protect against being called twice (that guard lives in the
 * caller, which only calls this after its own DB write succeeds and never
 * retries on re-render), matching how every other write in this file works.
 *
 * @param {Object} params
 * @param {string} params.campusId   - The book's campus_id. Recipients are every library_manager on this campus.
 * @param {string} params.bookId     - The book's id (kept even for rejections, where the books row is deleted, purely for reference).
 * @param {string} params.bookTitle  - The book's title, captured at call time so it's preserved even if the row is later gone.
 * @param {'approved'|'rejected'} params.decision
 */
export async function notifyLibrariansOfRegistration({ campusId, bookId, bookTitle, decision }) {
  if (!campusId || !bookTitle || (decision !== 'approved' && decision !== 'rejected')) return;

  const { data: librarians, error: librarianErr } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('role', 'library_manager')
    .eq('campus_id', campusId);

  if (librarianErr) {
    console.error('[notifyLibrariansOfRegistration] failed to look up librarians:', librarianErr.message);
    return;
  }
  if (!librarians || !librarians.length) return;

  const isApproved = decision === 'approved';
  const title   = isApproved ? 'Registration Approved' : 'Registration Rejected';
  const message = isApproved
    ? `Your book registration request for "${bookTitle}" has been approved by the Super Admin.`
    : `Your book registration request for "${bookTitle}" has been rejected by the Super Admin.`;
  const type = isApproved ? 'REGISTRATION_APPROVED' : 'REGISTRATION_REJECTED';

  const rows = librarians.map(l => ({
    recipient_id: l.id,
    type,
    title,
    message,
    book_id:    isApproved ? bookId : null, // the books row no longer exists after a rejection
    book_title: bookTitle,
    campus_id:  campusId,
    read:       false,
  }));

  const { error: insertErr } = await supabaseAdmin.from('notifications').insert(rows);
  if (insertErr) {
    console.error('[notifyLibrariansOfRegistration] failed to insert notifications:', insertErr.message);
  }
}