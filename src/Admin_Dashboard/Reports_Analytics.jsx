// src/Admin_Dashboard/Reports_Analytics.jsx
export default function ReportsAnalytics() {
  return (
    <div className="lm-coming-soon">
      <div className="lm-coming-soon-icon">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      </div>
      <span className="lm-coming-soon-badge">Coming Soon</span>
      <h2 className="lm-coming-soon-title">Reports & Analytics</h2>
      <p className="lm-coming-soon-sub">
        View detailed reports on book loans, member activity, attendance trends, and library usage statistics.
      </p>
    </div>
  );
}