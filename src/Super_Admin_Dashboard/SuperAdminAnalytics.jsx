import { BarChart3, TrendingUp, PieChart, Activity, Sparkles } from 'lucide-react';

/* ============================================================================
   LIBRASCAN — Super Admin · Analytics (Coming Soon)
   Same visual language as the rest of the Super Admin suite.
============================================================================ */

const MAROON      = '#7A0000';
const MAROON_DEEP = '#5C0000';
const MAROON_SOFT = 'rgba(122,0,0,0.08)';
const GOLD        = '#D4AF37';
const GOLD_DEEP   = '#B8912B';
const GOLD_PALE   = 'rgba(212,175,55,0.14)';
const CARD        = '#FFFFFF';
const CREAM       = '#FFF8EF';
const TEXT        = '#3B2A25';
const TEXT_MUTED  = '#8A7368';
const BORDER      = '#E8DDD4';

const PREVIEW_CARDS = [
  { label: 'Circulation Trends',   Icon: TrendingUp, desc: 'Borrow & return volume over time, campus by campus.' },
  { label: 'Genre Breakdown',      Icon: PieChart,   desc: 'Which subjects and genres move the most across the system.' },
  { label: 'Live Engagement',      Icon: Activity,   desc: 'Attendance and catalog activity as it happens.' },
];

const CSS = `
  .saa, .saa * { box-sizing: border-box; }
  .saa { font-family: var(--font-sans,'DM Sans','Josefin Sans',sans-serif); color: ${TEXT}; -webkit-font-smoothing: antialiased; }

  .saa-hero {
    position: relative;
    background: linear-gradient(135deg, ${CREAM} 0%, ${CARD} 100%);
    border: 1.5px solid ${BORDER};
    border-radius: 24px;
    padding: 32px 32px 28px;
    margin-bottom: 24px;
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(59,42,37,0.08);
  }
  .saa-hero::before {
    content: ''; position: absolute; top: -60%; right: -8%;
    width: 420px; height: 420px; border-radius: 50%;
    background: radial-gradient(circle, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0) 70%);
    pointer-events: none;
  }
  .saa-hero::after {
    content: ''; position: absolute; inset: 0;
    background-image: radial-gradient(rgba(122,0,0,0.05) 1px, transparent 1px);
    background-size: 22px 22px; opacity: 0.6; pointer-events: none;
  }
  .saa-hero-title {
    position: relative; z-index: 1;
    font-size: 25px; font-weight: 800; letter-spacing: -0.01em;
    color: ${TEXT}; line-height: 1.2; margin-bottom: 10px;
    display: flex; align-items: center; gap: 12px;
  }
  .saa-hero-icon {
    width: 42px; height: 42px; border-radius: 14px;
    background: ${MAROON_SOFT}; border: 1px solid rgba(122,0,0,0.18);
    display: flex; align-items: center; justify-content: center;
    color: ${MAROON}; flex-shrink: 0;
  }
  .saa-hero-sub { position: relative; z-index: 1; font-size: 15px; line-height: 1.65; color: ${TEXT_MUTED}; max-width: 510px; font-weight: 500; text-align: left; }

  /* ---------- Coming soon centerpiece ---------- */
  .saa-stage {
    background: ${CARD}; border: 1.5px dashed rgba(122,0,0,0.25); border-radius: 24px;
    padding: 60px 32px; text-align: center; margin-bottom: 28px;
    display: flex; flex-direction: column; align-items: center; gap: 14px;
  }
  .saa-stage-badge {
    display: inline-flex; align-items: center; gap: 7px;
    background: ${GOLD_PALE}; color: ${GOLD_DEEP};
    font-size: 11px; font-weight: 800; letter-spacing: 0.10em; text-transform: uppercase;
    padding: 6px 16px; border-radius: 999px; margin-bottom: 4px;
  }
  .saa-stage-icon {
    width: 76px; height: 76px; border-radius: 22px;
    background: linear-gradient(135deg, ${MAROON} 0%, ${MAROON_DEEP} 100%);
    display: flex; align-items: center; justify-content: center; color: #fff;
    box-shadow: 0 12px 28px rgba(122,0,0,0.28);
  }
  .saa-stage-title { font-size: 21px; font-weight: 800; color: ${TEXT}; }
  .saa-stage-sub { font-size: 13.5px; color: ${TEXT_MUTED}; max-width: 440px; line-height: 1.65; }

  /* ---------- Preview grid ---------- */
  .saa-preview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
  .saa-preview-card {
    background: ${CARD}; border: 1px solid ${BORDER}; border-radius: 16px; padding: 20px;
    position: relative; overflow: hidden; filter: grayscale(0.15);
  }
  .saa-preview-card::after {
    content: 'SOON'; position: absolute; top: 12px; right: 12px;
    font-size: 9px; font-weight: 800; letter-spacing: 0.08em; color: ${GOLD_DEEP};
    background: ${GOLD_PALE}; padding: 3px 8px; border-radius: 999px;
  }
  .saa-preview-icon {
    width: 38px; height: 38px; border-radius: 11px; background: ${MAROON_SOFT};
    display: flex; align-items: center; justify-content: center; color: ${MAROON}; margin-bottom: 12px;
  }
  .saa-preview-label { font-size: 13.5px; font-weight: 800; color: ${TEXT}; margin-bottom: 6px; }
  .saa-preview-desc { font-size: 12px; color: ${TEXT_MUTED}; line-height: 1.55; }

  @media (max-width: 768px) {
    .saa-hero { padding: 26px 22px 22px; }
    .saa-hero-title { font-size: 22px; }
    .saa-stage { padding: 44px 22px; }
  }
`;

export default function SuperAdminAnalytics() {
  return (
    <div className="saa">
      <style>{CSS}</style>

      <div className="saa-hero">
        <div className="saa-hero-title">
          <span className="saa-hero-icon"><BarChart3 size={22} /></span>
          System-Wide Analytics
        </div>
        <div className="saa-hero-sub">
          Deep, cross-campus insight into circulation, attendance, and catalog health 
          built on the same live data already flowing through Librascan.
        </div>
      </div>

      <div className="saa-stage">
        <div className="saa-stage-badge"><Sparkles size={12} />Coming Soon</div>
        <div className="saa-stage-icon"><BarChart3 size={32} strokeWidth={1.8} /></div>
        <div className="saa-stage-title">Analytics is on its way</div>
        <div className="saa-stage-sub">
          We're building a full reporting suite for Super Admins — trends, comparisons,
          and exportable reports across every campus. Check back soon.
        </div>
      </div>

      <div className="saa-preview-grid">
        {PREVIEW_CARDS.map(({ label, Icon, desc }) => (
          <div key={label} className="saa-preview-card">
            <div className="saa-preview-icon"><Icon size={19} /></div>
            <div className="saa-preview-label">{label}</div>
            <div className="saa-preview-desc">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}