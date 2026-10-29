import React from 'react';

const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const T = {
  en: { eyebrow: '04 · INSIGHT', title: 'Poverty does not predict stunting', hint: 'Each dot is a district. Dashed lines are the medians. Click a dot to select it.',
        tl: 'Stunting beyond poverty', tr: 'Both high', br: 'Poverty beyond stunting', bl: 'Both lower', x: 'Poverty rate (%)', y: 'Stunting (%)',
        note: 'Descriptive only: survey estimates carry sampling error, and districts near the median lines can switch quadrant.' },
  rw: { eyebrow: '04 · ISHUSHO', title: 'Ubukene si bwo bugena igwingira', hint: 'Buri kadomo ni akarere. Kanda ku kadomo ukore ihitamo.',
        tl: 'Igwingira rirenze ubukene', tr: 'Byombi biri hejuru', br: 'Ubukene burenze igwingira', bl: 'Byombi biri hasi', x: 'Ubukene (%)', y: 'Igwingira (%)',
        note: 'Ni ibisobanuro gusa: imibare ikomoka ku ngero, bityo uturere duri hafi y’umurongo wo hagati dushobora guhinduka.' }
};

export default function QuadrantChart({ districts, selected, onSelect, lang = 'en' }) {
  const t = T[lang] || T.en;
  const pts = districts.filter((d) => d.st != null && d.pov != null);
  const mp = median(pts.map((d) => d.pov)), ms = median(pts.map((d) => d.st));
  const W = 320, H = 270, L = 38, R = 8, Tp = 10, B = 36, XM = 55, YM = 42;
  const sx = (v) => L + (v / XM) * (W - L - R), sy = (v) => H - B - (v / YM) * (H - B - Tp);
  const blind = pts.filter((d) => d.pov < mp && d.st >= ms).map((d) => d.n);
  return (
    <section className="panel" aria-labelledby="quad-title">
      <div className="panel-title"><div><span className="eyebrow">{t.eyebrow}</span><h3 id="quad-title">{t.title}</h3></div></div>
      <p className="field-help">{t.hint}</p>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={t.title} style={{ maxWidth: 420 }}>
        <rect x={L} y={Tp} width={W - L - R} height={H - B - Tp} fill="none" stroke="currentColor" opacity="0.25" />
        <line x1={sx(mp)} x2={sx(mp)} y1={Tp} y2={H - B} stroke="currentColor" strokeDasharray="4 3" opacity="0.45" />
        <line x1={L} x2={W - R} y1={sy(ms)} y2={sy(ms)} stroke="currentColor" strokeDasharray="4 3" opacity="0.45" />
        <text x={L + 4} y={Tp + 12} fontSize="10" fill="currentColor" fontWeight="700">{t.tl}</text>
        <text x={W - R - 4} y={Tp + 12} fontSize="10" fill="currentColor" textAnchor="end" opacity="0.7">{t.tr}</text>
        <text x={W - R - 4} y={H - B - 6} fontSize="10" fill="currentColor" textAnchor="end" opacity="0.7">{t.br}</text>
        <text x={L + 4} y={H - B - 6} fontSize="10" fill="currentColor" opacity="0.7">{t.bl}</text>
        {[0, 10, 20, 30, 40, 50].map((v) => <text key={'x' + v} x={sx(v)} y={H - B + 12} fontSize="9" textAnchor="middle" fill="currentColor" opacity="0.6">{v}</text>)}
        {[0, 10, 20, 30, 40].map((v) => <text key={'y' + v} x={L - 5} y={sy(v) + 3} fontSize="9" textAnchor="end" fill="currentColor" opacity="0.6">{v}</text>)}
        <text x={(L + W - R) / 2} y={H - 6} fontSize="10" textAnchor="middle" fill="currentColor">{t.x}</text>
        <text transform={`translate(10 ${(Tp + H - B) / 2}) rotate(-90)`} fontSize="10" textAnchor="middle" fill="currentColor">{t.y}</text>
        {pts.map((d) => {
          const on = selected === d.n, isBlind = blind.includes(d.n);
          return (
            <g key={d.n} onClick={() => onSelect(d.n)} style={{ cursor: 'pointer' }} tabIndex={0} role="button" aria-label={`${d.n}: poverty ${d.pov}%, stunting ${d.st}%`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(d.n); }}>
              <circle cx={sx(d.pov)} cy={sy(d.st)} r={on ? 6.5 : 4.5} fill={isBlind ? '#a24f98' : '#6b7b7b'} stroke={on ? 'currentColor' : 'none'} strokeWidth="2" opacity={on || isBlind ? 1 : 0.75} />
              {(on || isBlind) && <text x={sx(d.pov) + 7} y={sy(d.st) + 3} fontSize="9" fill="currentColor">{d.n}</text>}
            </g>
          );
        })}
      </svg>
      <p className="panel-footnote">{t.note}</p>
    </section>
  );
}
