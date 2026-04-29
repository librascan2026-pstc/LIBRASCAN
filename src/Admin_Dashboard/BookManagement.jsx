// src/Admin_Dashboard/BookManagement.jsx
// Sub-pages: Borrowed & Return (placeholder stubs — functionality coming soon)

function BorrowedBooks() {
    return (
      <div className="lm-coming-soon">
        <div className="lm-coming-soon-icon">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            <polyline points="9 11 12 14 22 4"/>
          </svg>
        </div>
        <span className="lm-coming-soon-badge">Coming Soon</span>
        <h2 className="lm-coming-soon-title">Borrowed Books</h2>
        <p className="lm-coming-soon-sub">
          View all books currently on loan, who borrowed them, and their due dates.
          Overdue tracking and notifications coming in a future release.
        </p>
      </div>
    );
  }
  
  function ReturnBooks() {
    return (
      <div className="lm-coming-soon">
        <div className="lm-coming-soon-icon">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 .49-3.26"/>
          </svg>
        </div>
        <span className="lm-coming-soon-badge">Coming Soon</span>
        <h2 className="lm-coming-soon-title">Book Returns</h2>
        <p className="lm-coming-soon-sub">
          Process book returns, compute fines for late returns, and update
          inventory availability automatically — coming in a future release.
        </p>
      </div>
    );
  }
  
  export default function BookManagement({ subPage }) {
    if (subPage === 'return')   return <ReturnBooks />;
    return <BorrowedBooks />;
  }