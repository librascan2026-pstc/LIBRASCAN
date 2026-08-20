import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, supabaseAdmin } from '../supabaseClient';
import { useAuth } from '../Login_SignUp/AuthContext';

const Icon = {
  users:  (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  books:  (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  borrow: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  attend: (s=20) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
};

const CATEGORY_COLORS = [
  '#8B0000','#C9A84C','#1A4DA0','#0D7377','#5B2C8D',
  '#B87333','#277A3C','#C0392B','#2E4057','#A04000',
];
const fmtNum = n => n == null ? '—' : Number(n).toLocaleString();

// Local (not UTC) calendar-day string, e.g. "2026-08-17". toISOString()
// reports the UTC date, which trails the local PH date by a day between
// local midnight and 8 AM — using it for "today" filters can silently
// match the wrong day's rows (or none at all).
const todayLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ── Catmull-Rom → cubic Bezier smoothing (ported from Reports_Analytics) ──
function monotoneCurvePath(pts) {
  if (pts.length < 2) return pts.length ? `M${pts[0].x},${pts[0].y}` : '';
  const n = pts.length;
  const dx = [], dy = [], slope = [], m = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i]    = pts[i+1].x - pts[i].x;
    dy[i]    = pts[i+1].y - pts[i].y;
    slope[i] = dy[i] / dx[i];
  }
  m[0] = slope[0];
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope[i-1] * slope[i] <= 0 ? 0 : (slope[i-1] + slope[i]) / 2;
  }
  m[n-1] = slope[n-2];
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) { m[i] = m[i+1] = 0; continue; }
    const a = m[i] / slope[i], b = m[i+1] / slope[i], s = a*a + b*b;
    if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t*a*slope[i]; m[i+1] = t*b*slope[i]; }
  }
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i];
    d += ` C${pts[i].x+h/3},${pts[i].y+m[i]*h/3} ${pts[i+1].x-h/3},${pts[i+1].y-m[i+1]*h/3} ${pts[i+1].x},${pts[i+1].y}`;
  }
  return d;
}

// ── Full Pie Chart with external labels + legend (ported from Reports_Analytics) ──
function PieChart({ data=[], size=300, showLegend=true }) {
  const [hov, setHov] = useState(null);
  const total = data.reduce((s,d)=>s+d.value,0)||1;

  const PAD = 50;
  const VW  = size + PAD*2;
  const VH  = size + PAD*2;
  const cx  = VW/2;
  const cy  = VH/2;
  const R   = size*0.40;
  const RL  = R + 12;
  const RLO = R + 36;
  const RT  = R + 52;

  let angle = -Math.PI/2;
  const isSingle = data.length === 1;
  const slices = data.map((d,i)=>{
    const sweep = isSingle ? Math.PI*2 - 0.0001 : (d.value/total)*Math.PI*2;
    const mid   = angle + sweep/2;
    const x1=cx+R*Math.cos(angle),       y1=cy+R*Math.sin(angle);
    const x2=cx+R*Math.cos(angle+sweep), y2=cy+R*Math.sin(angle+sweep);
    const lf = sweep>Math.PI?1:0;
    const lx1=cx+RL*Math.cos(mid),  ly1=cy+RL*Math.sin(mid);
    const lx2=cx+RLO*Math.cos(mid), ly2=cy+RLO*Math.sin(mid);
    const tx =cx+RT*Math.cos(mid),  ty =cy+RT*Math.sin(mid);
    const rawC = Math.cos(mid);
    const anchor = rawC>0.15?'start':rawC<-0.15?'end':'middle';
    const pctVal = Math.round((d.value/total)*100);
    const slice = {...d,i,angle,sweep,mid,x1,y1,x2,y2,lf,lx1,ly1,lx2,ly2,tx,ty,anchor,pctVal};
    angle += sweep;
    return slice;
  });

  return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,width:'100%',height:'100%',minHeight:0 }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet"
        style={{width:'100%',height:'100%',maxWidth:VW,maxHeight:VH,display:'block'}}>
        <defs>
          <filter id="lm-pshadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="rgba(0,0,0,0.13)"/>
          </filter>
        </defs>

        {slices.map((s,i)=>{
          const isH = hov===i;
          const dx = isH?Math.cos(s.mid)*8:0, dy=isH?Math.sin(s.mid)*8:0;
          const op = hov!==null&&!isH?0.6:1;
          if(isSingle){
            return (
              <g key={i} style={{cursor:'pointer'}} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
                <circle cx={cx+dx} cy={cy+dy} r={R} fill={s.color} stroke="#fff" strokeWidth="3"
                  filter="url(#lm-pshadow)" opacity={op} style={{transition:'opacity .18s,cx .18s,cy .18s'}}/>
              </g>
            );
          }
          return (
            <g key={i} style={{cursor:'pointer'}} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
              <path
                d={`M${cx},${cy} L${s.x1},${s.y1} A${R},${R} 0 ${s.lf},1 ${s.x2},${s.y2} Z`}
                fill={s.color} stroke="#fff" strokeWidth="3"
                filter="url(#lm-pshadow)" opacity={op}
                style={{ transform:`translate(${dx}px,${dy}px)`, transition:'opacity .18s,transform .18s' }}/>
            </g>
          );
        })}

        {slices.map((s,i)=>{
          const op = hov!==null&&hov!==i?0.3:1;
          const lx1_=isSingle?cx:s.lx1,   ly1_=isSingle?cy-R:s.ly1;
          const lx2_=isSingle?cx:s.lx2,   ly2_=isSingle?cy-R-24:s.ly2;
          const tx_ =isSingle?cx:s.tx,     ty_ =isSingle?cy-R-40:s.ty;
          const anc_=isSingle?'middle':s.anchor;
          return (
            <g key={`L${i}`} opacity={op} style={{transition:'opacity .18s'}}>
              <circle cx={lx1_} cy={ly1_} r="4" fill={s.color}/>
              <line x1={lx1_} y1={ly1_} x2={lx2_} y2={ly2_} stroke={s.color} strokeWidth="1.6"/>
              <text x={tx_} y={ty_-9} textAnchor={anc_}
                style={{fontSize:13,fontWeight:800,fill:s.color,fontFamily:'var(--font-display,serif)'}}>
                {s.pctVal}%
              </text>
              <text x={tx_} y={ty_+8} textAnchor={anc_}
                style={{fontSize:10,fill:'#7a6b5a',fontFamily:'var(--font-sans,sans-serif)'}}>
                {(s.label||'').length>15?(s.label).slice(0,14)+'\u2026':(s.label||'')}
              </text>
            </g>
          );
        })}
      </svg>

      {showLegend && (
        <div style={{display:'flex',flexWrap:'wrap',gap:'7px 20px',justifyContent:'center',padding:'0 12px'}}>
          {slices.map((s,i)=>(
            <div key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}
              style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',opacity:hov!==null&&hov!==i?0.4:1,transition:'opacity .15s'}}>
              <div style={{width:12,height:12,borderRadius:3,background:s.color,flexShrink:0}}/>
              <span style={{fontSize:12,color:'var(--text-secondary,#6b5a4e)',fontFamily:'var(--font-sans,sans-serif)',whiteSpace:'nowrap'}}>
                {(s.label||'N/A').length>22?s.label.slice(0,21)+'\u2026':(s.label||'N/A')}
              </span>
              {hov===i && (
                <span style={{fontSize:12,fontWeight:700,color:'var(--maroon-mid,#8B0000)',fontFamily:'var(--font-sans,sans-serif)'}}>
                  {fmtNum(s.value)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Multi-Line Borrowing Activity Trend Chart (ported from Reports_Analytics) ──
function BorrowingActivityTrendChart({ reqData=[], borrData=[], retData=[], loading, selectedSeries, onSeriesSelect }) {
  const wrapRef = useRef(null);
  const [hovIdx, setHovIdx] = useState(null);

  const allLabels = (() => {
    const seen = new Set(), out = [];
    [...reqData, ...borrData, ...retData].forEach(d => { if (!seen.has(d.label)) { seen.add(d.label); out.push(d.label); } });
    return out;
  })();

  const SERIES = [
    { key:'borr', label:'Borrowed', color:'#C0152A', data: borrData },
    { key:'ret',  label:'Returned', color:'#F5A623', data: retData  },
    { key:'req',  label:'Request',  color:'#22C5C5', data: reqData  },
  ];

  const lookup = {};
  SERIES.forEach(s => { lookup[s.key] = {}; s.data.forEach(d => { lookup[s.key][d.label] = d.value; }); });

  const PAD_L=62, PAD_R=24, PAD_T=30, PAD_B=52;
  const VW=880, CH=220, VH=CH+PAD_T+PAD_B;
  const CW=VW-PAD_L-PAD_R;

  const allVals = SERIES.flatMap(s => s.data.map(d => d.value));
  const rawMax  = allVals.length ? Math.max(...allVals) : 4;
  const yStep   = rawMax <= 10 ? 1 : rawMax <= 30 ? 5 : rawMax <= 60 ? 10 : Math.ceil(rawMax/6/5)*5;
  const yMax    = Math.max(Math.ceil(rawMax/yStep)*yStep + yStep, 4);

  const xOf = i => PAD_L + (allLabels.length <= 1 ? CW/2 : (i/(allLabels.length-1))*CW);
  const yOf = v => PAD_T + CH - (v/yMax)*CH;

  const yTickCount = Math.min(7, Math.floor(yMax/yStep)+1);
  const yTicks = Array.from({length: yTickCount}, (_,i) => {
    const v = Math.round((yMax / (yTickCount-1)) * i);
    return { v, y: yOf(v) };
  });

  const seriesPts = SERIES.map(s => ({
    ...s,
    pts: allLabels.map((lbl,i) => ({ x: xOf(i), y: yOf(lookup[s.key][lbl]??0), value: lookup[s.key][lbl]??0, lbl, i })),
  }));

  const bandW = allLabels.length > 1 ? CW/(allLabels.length-1) : CW;

  if (loading) return <div className="lm-ra-sk" style={{height:280,borderRadius:8}}/>;
  if (!allLabels.length) return (
    <div className="lm-ra-empty" style={{padding:32,textAlign:'center'}}>
      <div className="lm-ra-empty-s">No data for this period</div>
    </div>
  );

  const hasSelection = selectedSeries !== null;

  return (
    <div ref={wrapRef} style={{userSelect:'none', position:'relative', background:'var(--cream-light)'}}>
      {/* Floating legend toggles — centered at top of chart */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:6,flexWrap:'wrap',marginBottom:8}}>
        {SERIES.map(l => {
          const isActive = selectedSeries === l.key;
          const isNone   = selectedSeries === null;
          const dimmed   = !isNone && !isActive;
          return (
            <button
              key={l.key}
              onClick={() => onSeriesSelect(isActive ? null : l.key)}
              style={{
                display:'flex', alignItems:'center', gap:7,
                padding:'5px 14px', borderRadius:99,
                border: `1.5px solid ${isActive ? l.color : 'rgba(139,0,0,0.18)'}`,
                background: isActive ? `${l.color}14` : 'rgba(255,255,255,0.80)',
                cursor:'pointer', transition:'all 0.18s',
                opacity: dimmed ? 0.38 : 1,
                outline:'none',
                boxShadow: isActive ? `0 2px 8px ${l.color}28` : '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              <svg width="20" height="10" style={{flexShrink:0}}>
                <line x1="0" y1="5" x2="20" y2="5" stroke={l.color} strokeWidth={isActive?2.5:2}/>
                <circle cx="10" cy="5" r={isActive?4:3.5} fill={l.color}/>
              </svg>
              <span style={{
                fontFamily:'var(--font-sans)', fontSize:11.5, fontWeight: isActive ? 700 : 500,
                color: isActive ? l.color : '#555',
                whiteSpace:'nowrap',
              }}>{l.label}</span>
            </button>
          );
        })}
      </div>
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
        style={{width:'100%', height:'auto', display:'block', overflow:'visible'}}
        onMouseLeave={() => setHovIdx(null)}
      >
        <defs>
          {SERIES.map(s => (
            <linearGradient key={`grad-${s.key}`} id={`ov-grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.18"/>
              <stop offset="100%" stopColor={s.color} stopOpacity="0.01"/>
            </linearGradient>
          ))}
        </defs>

        {yTicks.map(({v,y}) => (
          <g key={v}>
            <line x1={PAD_L} y1={y} x2={PAD_L+CW} y2={y}
              stroke={v===0 ? 'rgba(139,0,0,0.18)' : 'rgba(0,0,0,0.065)'}
              strokeWidth={v===0 ? 1.2 : 1}
              strokeDasharray={v===0 ? 'none' : '5,5'}
            />
            <text x={PAD_L-10} y={y} textAnchor="end" dominantBaseline="middle"
              style={{fontFamily:'var(--font-sans)',fontSize:9.5,fill:'rgba(80,0,0,0.45)',fontWeight:500}}>
              {v}
            </text>
          </g>
        ))}

        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T+CH} stroke="rgba(139,0,0,0.15)" strokeWidth="1.2"/>

        <text x={13} y={PAD_T+CH/2} textAnchor="middle" dominantBaseline="middle"
          transform={`rotate(-90,13,${PAD_T+CH/2})`}
          style={{fontFamily:'var(--font-sans)',fontSize:9.5,fill:'rgba(80,0,0,0.50)',fontWeight:600,letterSpacing:'0.04em'}}>
          Number of Books
        </text>

        {hovIdx !== null && (
          <line x1={xOf(hovIdx)} y1={PAD_T} x2={xOf(hovIdx)} y2={PAD_T+CH}
            stroke="rgba(0,0,0,0.14)" strokeWidth="1.2" strokeDasharray="3,3"/>
        )}

        {hasSelection && seriesPts.filter(s => s.key === selectedSeries).map(s => {
          const areaPath = monotoneCurvePath(s.pts)
            + ` L${s.pts[s.pts.length-1].x},${PAD_T+CH} L${s.pts[0].x},${PAD_T+CH} Z`;
          return (
            <path key={`area-${s.key}`} d={areaPath} fill={`url(#ov-grad-${s.key})`} stroke="none"/>
          );
        })}

        {seriesPts.map(s => {
          const isSelected = selectedSeries === s.key;
          const isBlurred  = hasSelection && !isSelected;
          return (
            <path key={s.key}
              d={monotoneCurvePath(s.pts)}
              fill="none"
              stroke={s.color}
              strokeWidth={isSelected ? 3 : isBlurred ? 1.8 : 2.4}
              strokeOpacity={isBlurred ? 0.22 : 1}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{transition:'stroke-opacity 0.25s, stroke-width 0.25s'}}
            />
          );
        })}

        {seriesPts.map((s) => {
          const isSelected = selectedSeries === s.key;
          const isBlurred  = hasSelection && !isSelected;
          return s.pts.map((p,i) => {
            const isHov = hovIdx === i;
            const rBase = isSelected ? 5 : isBlurred ? 3.5 : 4.5;
            const r     = isHov ? rBase + 1.5 : rBase;
            return (
              <g key={`${s.key}-${i}`} style={{transition:'opacity 0.25s'}} opacity={isBlurred ? 0.25 : 1}>
                {isHov && !isBlurred && (
                  <circle cx={p.x} cy={p.y} r={r+5} fill={s.color} opacity={0.12}/>
                )}
                <circle cx={p.x} cy={p.y} r={r}
                  fill={s.color} stroke="#fff" strokeWidth={isSelected ? 2.5 : 1.8}
                  style={{transition:'r 0.15s'}}
                />
                {(isHov || isSelected) && !isBlurred && (
                  <text x={p.x} y={p.y - r - 6} textAnchor="middle"
                    style={{fontFamily:'var(--font-sans)',fontSize:isSelected?10.5:10,fontWeight:700,fill:s.color}}>
                    {p.value}
                  </text>
                )}
              </g>
            );
          });
        })}

        {allLabels.map((lbl,i) => {
          const x = xOf(i);
          const skip = allLabels.length > 12 ? Math.ceil(allLabels.length/8) : 1;
          if (i % skip !== 0 && i !== allLabels.length-1) return null;
          return (
            <g key={lbl}>
              <line x1={x} y1={PAD_T+CH} x2={x} y2={PAD_T+CH+5} stroke="rgba(139,0,0,0.20)" strokeWidth="1"/>
              <text x={x} y={PAD_T+CH+17} textAnchor="middle"
                style={{fontFamily:'var(--font-sans)',fontSize:9,
                  fill: hovIdx===i ? 'rgba(80,0,0,0.85)' : 'rgba(80,0,0,0.45)',
                  fontWeight: hovIdx===i ? 700 : 400}}>
                {lbl}
              </text>
            </g>
          );
        })}

        <text x={PAD_L+CW/2} y={VH-3} textAnchor="middle"
          style={{fontFamily:'var(--font-sans)',fontSize:10,fill:'rgba(80,0,0,0.52)',fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase'}}>
          DATE
        </text>

        {allLabels.map((_,i) => (
          <rect key={`hb-${i}`}
            x={xOf(i) - bandW/2} y={PAD_T}
            width={bandW} height={CH}
            fill="transparent"
            style={{cursor:'crosshair'}}
            onMouseEnter={() => setHovIdx(i)}
          />
        ))}
      </svg>

      {hovIdx !== null && (() => {
        const pctX = (xOf(hovIdx)/VW)*100;
        const tipSeries = hasSelection ? SERIES.filter(s => s.key === selectedSeries) : SERIES;
        return (
          <div className="lm-ra-spark-tip" style={{
            position:'absolute', top:6, pointerEvents:'none', zIndex:20,
            left:`${pctX}%`,
            transform: pctX>72 ? 'translateX(-110%)' : pctX<18 ? 'translateX(6%)' : 'translateX(-50%)',
            minWidth:160,
          }}>
            <div style={{fontFamily:'var(--font-sans)',fontSize:11,color:'rgba(245,228,168,0.90)',marginBottom:7,fontWeight:700,borderBottom:'1px solid rgba(255,255,255,0.12)',paddingBottom:5}}>
              📅 {allLabels[hovIdx]}
            </div>
            {tipSeries.map(s => (
              <div key={s.key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,marginBottom:4}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{width:9,height:9,borderRadius:'50%',background:s.color,flexShrink:0,boxShadow:`0 0 4px ${s.color}`}}/>
                  <span style={{fontFamily:'var(--font-sans)',fontSize:10.5,color:'rgba(245,228,168,0.75)'}}>{s.label}</span>
                </div>
                <span style={{fontFamily:'var(--font-sans)',fontSize:12,fontWeight:800,color:s.color,textShadow:`0 0 8px ${s.color}55`}}>
                  {lookup[s.key][allLabels[hovIdx]]??0}
                </span>
              </div>
            ))}
          </div>
        );
      })()}
      </div>
    </div>
  );
}

const SCROLL_STYLE = `
  @keyframes lm-ra-shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
  .lm-ra-sk { border-radius:5px; background:linear-gradient(90deg,rgba(139,0,0,0.06) 25%,rgba(139,0,0,0.10) 50%,rgba(139,0,0,0.06) 75%); background-size:1200px 100%; animation:lm-ra-shimmer 1.4s infinite linear; }
  .lm-ra-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:32px 20px; gap:8px; text-align:center; font-family:var(--font-sans); }
  .lm-ra-empty-s { font-size:11.5px; color:var(--text-dim); max-width:230px; }
  .lm-ra-spark-tip { position:absolute; pointer-events:none; z-index:20; background:rgba(20,0,0,.90); border:1px solid rgba(201,168,76,.48); border-radius:7px; padding:6px 10px; font-family:var(--font-sans); font-size:11px; color:rgba(245,228,168,.92); white-space:nowrap; box-shadow:0 4px 14px rgba(0,0,0,.36); transition:opacity .10s; }

  .lm-chart-card {
    display: flex;
    flex-direction: column;
    border-radius: var(--radius-lg);
    border: 1px solid rgba(139,0,0,0.13);
    box-shadow: 0 2px 12px rgba(30,0,0,0.07);
    overflow: hidden;
    min-height: 0;
    text-align: left;
  }

  .lm-activity-scroll::-webkit-scrollbar { width: 5px; }
  .lm-activity-scroll::-webkit-scrollbar-track { background: rgba(139,0,0,0.04); border-radius: 99px; }
  .lm-activity-scroll::-webkit-scrollbar-thumb { background: rgba(139,0,0,0.22); border-radius: 99px; }
  .lm-activity-scroll::-webkit-scrollbar-thumb:hover { background: rgba(139,0,0,0.40); }

  
  .lm-overview-bottom {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 12px;
    margin-top: 12px;
    align-items: stretch;
  }

  /* Tighter spacing scoped to the Overview page only — does not affect
     the shared .lm-stats-grid / .lm-stat-card / .lm-panel classes used
     on other tabs (Attendance, Book Management, etc). */
  .lm-overview-page.lm-module { padding: 0; }
  .lm-overview-page .lm-module-header { margin-bottom: 14px; }
  .lm-overview-page .lm-stats-grid { gap: 12px; margin-bottom: 14px; }
  .lm-overview-page .lm-stat-card { padding: 15px 16px 13px; gap: 4px; }
  .lm-overview-page .lm-stat-icon { width: 34px; height: 34px; margin-bottom: 2px; }
  .lm-overview-page .lm-stat-value { font-size: 26px; }
  .lm-overview-page .lm-stat-sub { margin-top: 0; }
  .lm-overview-page .lm-panel { padding: 14px 16px; margin-bottom: 0; }
  .lm-overview-page .lm-panel-title { margin-bottom: 8px; padding-bottom: 6px; }

  
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
    padding: 10px 14px;
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
    gap: 12px;
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
  const [loading,       setLoading]       = useState(true);

  const [chartsLoading,  setChartsLoading]  = useState(true);
  const [trendData,      setTrendData]      = useState({ req: [], borr: [], ret: [] });
  const [programDist,    setProgramDist]    = useState([]);
  const [programExpanded, setProgramExpanded] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const todayStr = todayLocal();

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

  // Loads the data behind the "Borrowing Activity Trend" line chart (last 7
  // days, one point per day) and the "Visits by Program" pie chart (today's
  // attendance only) — scoped windows so the Overview widgets need no
  // period selector of their own.
  const loadCharts = useCallback(async () => {
    setChartsLoading(true);
    try {
      const todayStr = todayLocal();
      const since = new Date(Date.now() - 6 * 86400000).toISOString();

      let qReqPeriod = supabase.from('borrow_requests')
        .select(campusId ? 'id,created_at,books!inner(campus_id)' : 'id,created_at')
        .gte('created_at', since);
      let qBorrowingsPeriod = supabase.from('borrowings')
        .select('id,borrowed_at,returned_at')
        .gte('borrowed_at', since);
      let qAttendRaw = supabase.from('attendance_logs')
        .select('id,program,time_in')
        .eq('date', todayStr)
        .order('time_in', { ascending: false })
        .limit(1000);
      let qPrograms = supabaseAdmin.from('programs').select('program_name,program_code');

      if (campusId) {
        qReqPeriod        = qReqPeriod.eq('books.campus_id', campusId);
        qBorrowingsPeriod = qBorrowingsPeriod.eq('campus_id', campusId);
        qAttendRaw        = qAttendRaw.eq('campus_id', campusId);
      }

      const [
        { data: reqPeriod        },
        { data: borrowingsPeriod },
        { data: attendRaw        },
        { data: programsRaw      },
      ] = await Promise.all([qReqPeriod, qBorrowingsPeriod, qAttendRaw, qPrograms]);

      // Resolve raw program text (scanned off a student ID) to the
      // university's official program code, same logic as Reports & Analytics.
      const stripText = s => (s || '').toLowerCase().replace(/[.,;:]/g, '').replace(/\s+/g, ' ').trim();
      const byStrippedName = {}, byStrippedCode = {}, nameByCode = {};
      (programsRaw || []).forEach(p => {
        const code = p.program_code || p.program_name;
        if (!code) return;
        if (p.program_name) byStrippedName[stripText(p.program_name)] = code;
        if (p.program_code) byStrippedCode[stripText(p.program_code)] = code;
        if (p.program_name) nameByCode[code] = p.program_name;
      });
      const resolveProgramCode = raw => {
        const key = stripText(raw);
        if (!key) return 'Unknown';
        if (byStrippedName[key]) return byStrippedName[key];
        if (byStrippedCode[key]) return byStrippedCode[key];
        let best = null, bestLen = 0;
        for (const name in byStrippedName) {
          if ((key.includes(name) || name.includes(key)) && name.length > bestLen) {
            best = byStrippedName[name]; bestLen = name.length;
          }
        }
        return best || raw;
      };

      const buildTimeline = (rows, dateField, pts, stepDays) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const buckets = Array.from({ length: pts }, (_, i) => {
          const d = new Date(now);
          d.setDate(d.getDate() - (pts - 1 - i) * stepDays);
          const label = d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
          return { label, value: 0, date: d };
        });
        (rows || []).forEach(r => {
          const rdRaw = new Date(r[dateField]);
          if (isNaN(rdRaw)) return;
          const rd = new Date(rdRaw);
          rd.setHours(0, 0, 0, 0);
          const daysAgo = Math.round((now - rd) / 86400000);
          const idx = (pts - 1) - Math.floor(daysAgo / stepDays);
          if (idx >= 0 && idx < pts) buckets[idx].value++;
        });
        return buckets;
      };

      const returnPeriod = (borrowingsPeriod || []).filter(b => b.returned_at);

      setTrendData({
        req:  buildTimeline(reqPeriod || [],        'created_at',  7, 1),
        borr: buildTimeline(borrowingsPeriod || [],  'borrowed_at', 7, 1),
        ret:  buildTimeline(returnPeriod,            'returned_at', 7, 1),
      });

      const progCount = {};
      (attendRaw || []).forEach(l => { const p = resolveProgramCode(l.program); progCount[p] = (progCount[p] || 0) + 1; });
      const byProgram = Object.entries(progCount).sort((a, b) => b[1] - a[1])
        .map(([program, count]) => ({ program, name: nameByCode[program] || program, count }));
      setProgramDist(byProgram);
    } catch {
      setTrendData({ req: [], borr: [], ret: [] });
      setProgramDist([]);
    } finally { setChartsLoading(false); }
  }, [campusId]);

  useEffect(() => { loadStats(); loadCharts(); }, [loadStats, loadCharts]);

  // "Today"-scoped widgets (Today's Visitors stat, New users today, and the
  // Visits by Program pie chart) are computed from `todayStr` at the moment
  // loadStats/loadCharts run. If the dashboard is left open across midnight
  // with no attendance/borrowing event to trigger a realtime reload, that
  // date would never get recomputed and the widgets would keep showing
  // yesterday's numbers. This schedules an automatic refresh right after
  // local midnight, then repeats every 24 hours so "today" always rolls
  // over on its own.
  useEffect(() => {
    let dailyInterval;
    const msUntilMidnight = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
      return next - now;
    };
    const refreshNow = () => { loadStats(); loadCharts(); };
    const midnightTimeout = setTimeout(() => {
      refreshNow();
      dailyInterval = setInterval(refreshNow, 86400000);
    }, msUntilMidnight());
    return () => {
      clearTimeout(midnightTimeout);
      if (dailyInterval) clearInterval(dailyInterval);
    };
  }, [loadStats, loadCharts]);

  useEffect(() => {
    const ch = supabase.channel('overview-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_logs' }, () => { loadStats(); loadCharts(); })
      .on('postgres_changes', { event: '*',      schema: 'public', table: 'borrowings'      }, () => { loadStats(); loadCharts(); })
      .on('postgres_changes', { event: '*',      schema: 'public', table: 'borrow_requests'  }, () => { loadStats(); loadCharts(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles'        }, () => { loadStats(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'books'           }, () => { loadStats(); })
      .on('postgres_changes', { event: '*',      schema: 'public', table: 'book_copies'     }, () => { loadStats(); })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [loadStats, loadCharts]);

  const STAT_CARDS = [
    { label: 'Total Users',      value: stats.users,      icon: Icon.users,  sub: 'Registered accounts' },
    { label: 'Books in Catalog', value: stats.books,      icon: Icon.books,  sub: 'Total collection'    },
    { label: 'Books Borrowed',   value: stats.borrowed,   icon: Icon.borrow, sub: 'Currently borrowed today'   },
    { label: "Today's Visitors", value: stats.attendance, icon: Icon.attend, sub: 'Attendance today'    },
  ];

  const programTotal = programDist.reduce((s, p) => s + p.count, 0) || 1;
  const todayLabel = new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  const pieData = programDist.slice(0, 6).map((p, i) => ({
    label: p.program || 'Unknown', name: p.name || p.program || 'Unknown',
    value: p.count, pct: Math.round((p.count / programTotal) * 100),
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  return (
    <div className="lm-module lm-overview-page">
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

        <div className="lm-chart-card" style={{ height: 420 }}>

          <div className="lm-activity-header" style={{ flexWrap: 'wrap', rowGap: 4 }}>
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.10em', textTransform: 'uppercase', color: '#F5E4A8',
            }}>
              Borrowing Activity Trend
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'rgba(245,228,168,0.55)' }}>
              Compare requests, borrowed, and returned over the last 7 days.
            </span>
          </div>

          <div style={{ padding: '10px 8px', background: 'var(--cream-light)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <BorrowingActivityTrendChart
              reqData={trendData.req}
              borrData={trendData.borr}
              retData={trendData.ret}
              loading={chartsLoading}
              selectedSeries={selectedSeries}
              onSeriesSelect={setSelectedSeries}
            />
          </div>
        </div>

        <div className="lm-right-col">

          <div
            className="lm-chart-card"
            style={{ marginBottom: 0, flex: '0 0 auto' }}
            onMouseLeave={() => setProgramExpanded(false)}
          >
            <div
              className="lm-activity-header"
              style={{ cursor: pieData.length ? 'default' : 'default' }}
            >
              <span style={{
                fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.10em', textTransform: 'uppercase', color: '#F5E4A8',
              }}>
                Visits by Program
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'rgba(245,228,168,0.55)' }}>
                  {todayLabel}
                </span>
                {pieData.length > 0 && (
                  <span
                    onMouseEnter={() => setProgramExpanded(true)}
                    style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 4, margin: -4 }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(245,228,168,0.85)" strokeWidth="2.4"
                      style={{ transform: programExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                )}
              </div>
            </div>
            {programExpanded ? (
              <div style={{ padding: '8px 14px 10px', background: 'var(--cream-light)', height: 284, overflowY: 'auto' }}>
                {pieData.map((p, i) => (
                  <div key={p.label} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 0',
                    borderBottom: i < pieData.length - 1 ? '1px solid rgba(139,0,0,0.08)' : 'none',
                  }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--text-primary,#3a1010)', lineHeight: 1.4 }}>
                      <b style={{ color: 'var(--maroon-mid)', fontWeight: 700 }}>{p.pct}%</b>{' '}{p.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '10px 6px', display: 'flex', alignItems: 'stretch', justifyContent: 'center', height: 284, background: 'var(--cream-light)' }}>
                {chartsLoading ? (
                  <div className="lm-ra-sk" style={{ height: 230, width: 230, borderRadius: '50%' }} />
                ) : pieData.length ? (
                  <PieChart data={pieData} size={300} showLegend={false} />
                ) : (
                  <div className="lm-ra-empty">
                    <div className="lm-ra-empty-s">No attendance data</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lm-panel" style={{ marginBottom: 0, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="lm-panel-title">Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, justifyContent: 'center' }}>
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
    </div>
  );
}