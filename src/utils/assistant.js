// Data-grounded assistant: every number comes from the district table. No language model, no invention.
const M = {
  st: { label: 'stunting', unit: '%', worseHigh: true, get: (d) => d.st },
  burden: { label: 'estimated stunted children', unit: '', worseHigh: true, get: (d) => (d.st == null || d.u5 == null ? null : Math.round((d.u5 * d.st) / 100)) },
  pov: { label: 'poverty rate', unit: '%', worseHigh: true, get: (d) => d.pov },
  anc: { label: 'antenatal care (4+ visits)', unit: '%', worseHigh: false, get: (d) => d.anc },
  pnc: { label: 'newborn postnatal check', unit: '%', worseHigh: false, get: (d) => d.pnc },
  teen: { label: 'teenage childbearing', unit: '%', worseHigh: true, get: (d) => d.teen },
  un: { label: 'unmet family-planning need', unit: '%', worseHigh: true, get: (d) => d.un },
};
const SYN = [
  ['burden', /how many (children|kids)|number of (stunted )?(children|kids)|stunted children|burden|caseload|abana bagwingiye/],
  ['st', /stunt|igwingira|malnutrition/],
  ['pov', /poverty|poor\b|ubukene/],
  ['anc', /antenatal|\banc\b|prenatal/],
  ['pnc', /postnatal|\bpnc\b|newborn check|after birth/],
  ['teen', /teen|adolescent|ingimbi|young mothers?|early pregnan/],
  ['un', /family.?planning|unmet|contracept|kuboneza/],
];
const PROV = { eastern: 'Eastern', western: 'Western', northern: 'Northern', southern: 'Southern', kigali: 'Kigali City', iburasirazuba: 'Eastern', iburengerazuba: 'Western', amajyaruguru: 'Northern', amajyepfo: 'Southern' };
const CARE = ['anc', 'pnc', 'teen', 'un'];

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, '');
const fmt = (v, m) => (v == null ? 'n/a' : (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en') : String(Math.round(v * 10) / 10)) + (m ? M[m].unit : ''));
const val = (d, m) => M[m].get(d);
const median = (a) => { const s = [...a].sort((x, y) => x - y); const k = Math.floor(s.length / 2); return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
function lev(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}
function findDistricts(q, D) {
  const nq = norm(q), hit = [];
  D.forEach((d) => { const m = new RegExp('\\b' + norm(d.n) + '\\b').exec(nq); if (m) hit.push([m.index, d]); });
  if (!hit.length) {
    (nq.match(/[a-z]{5,}/g) || []).forEach((t) => D.forEach((d) => { const n = norm(d.n); if (Math.abs(t.length - n.length) <= 1 && lev(t, n) <= 1 && !hit.some((h) => h[1] === d)) hit.push([nq.indexOf(t), d]); }));
  }
  return hit.sort((a, b) => a[0] - b[0]).map((h) => h[1]);
}
const findMetric = (q, def = 'st') => { const nq = norm(q); for (const [k, re] of SYN) if (re.test(nq)) return k; return def; };
const findProvince = (q) => { const nq = norm(q); for (const k of Object.keys(PROV)) if (nq.includes(k)) return PROV[k]; return null; };
const bullets = (a) => a.map((x) => '• ' + x).join('\n');
const base = (D, extra = '') => `Based on: RDHS 2025 district profiles, EICV7 2023/24, Census 2022. ${extra}Descriptive only; survey estimates carry sampling error.`;

function profile(d, D) {
  const L = [`${d.n} (${d.p === 'Kigali City' ? 'City of Kigali' : d.p + ' Province'})`];
  L.push(bullets([
    `Stunting: ${fmt(d.st, 'st')}${d.st20 != null ? ` (was ${d.st20}% in 2019-20)` : ''}`,
    `Poverty: ${fmt(d.pov, 'pov')}`,
    `Estimated stunted children: ${fmt(val(d, 'burden'))} (uses a population proxy)`,
    ...CARE.map((m) => `${M[m].label}: ${fmt(val(d, m), m)}`),
  ]));
  if (CARE.every((m) => val(d, m) == null)) L.push(`The 2025 profile for ${d.p === 'Kigali City' ? 'Kigali' : d.p} has not been published, so care and family-planning indicators are missing.`);
  return L.join('\n');
}
function rankAnswer(q, D) {
  const m = findMetric(q), nq = norm(q), prov = findProvince(q);
  const n = Math.min(10, +(nq.match(/(?:top|bottom)\s*(\d+)|(\d+)\s*(?:districts|highest|lowest)/) || []).slice(1).find(Boolean) || 5);
  let dir = /lowest|least|bottom/.test(nq) ? 'asc' : /highest|most|top/.test(nq) ? 'desc' : /best/.test(nq) ? 'best' : 'worst';
  const pool = D.filter((d) => val(d, m) != null && (!prov || d.p === prov));
  const worseHigh = M[m].worseHigh;
  const desc = dir === 'desc' || (dir === 'worst' && worseHigh) || (dir === 'best' && !worseHigh);
  const s = [...pool].sort((a, b) => (desc ? val(b, m) - val(a, m) : val(a, m) - val(b, m))).slice(0, n);
  const cov = CARE.includes(m) ? `Only ${pool.length} districts have this indicator (Eastern and Southern provinces).` : `${pool.length} districts have a value.`;
  return { text: `${desc ? 'Highest' : 'Lowest'} ${M[m].label}${prov ? ' in ' + prov : ''}:\n` + bullets(s.map((d) => `${d.n}: ${fmt(val(d, m), m)}`)) + `\n${cov}\n` + base(D), focus: s[0]?.n };
}
const changes = (D) => D.filter((d) => d.st != null && d.st20 != null).map((d) => ({ d, c: Math.round((d.st - d.st20) * 10) / 10 })).sort((a, b) => a.c - b.c);
function changeAnswer(D) {
  const c = changes(D), down = c.filter((x) => x.c < 0), up = c.filter((x) => x.c > 0);
  return { text: `Stunting change, 2019-20 to 2025 (percentage points):\nLargest reductions:\n` + bullets(down.slice(0, 5).map((x) => `${x.d.n}: ${x.c} (${x.d.st20}% to ${x.d.st}%)`)) + `\nIncreases:\n` + bullets(up.map((x) => `${x.d.n}: +${x.c}`)) +
    `\nCaution: only ${c.length} districts have a published 2020 value, mostly those quoted in press coverage, which tends to feature notable changes. Small rises (under about 2 points) may be sampling noise.\n` + base(D), focus: down[0]?.d.n };
}
function blindAnswer(D) {
  const p = D.filter((d) => d.st != null && d.pov != null), mp = median(p.map((d) => d.pov)), ms = median(p.map((d) => d.st));
  const a = p.filter((d) => d.pov < mp && d.st >= ms), b = p.filter((d) => d.pov >= mp && d.st < ms);
  return { text: `Poverty does not track stunting closely across the ${p.length} districts with both values.\nStunting at or above the median (${Math.round(ms * 10) / 10}%) with poverty below the median (${Math.round(mp * 10) / 10}%):\n` + bullets(a.map((d) => `${d.n}: stunting ${d.st}%, poverty ${d.pov}%`)) + `\nPoverty at or above the median but stunting below it:\n` + bullets(b.map((d) => `${d.n}: stunting ${d.st}%, poverty ${d.pov}%`)) + `\nA poverty-only targeting rule would miss the first group.\n` + base(D), focus: a[0]?.n };
}
function compareAnswer(ds, D) {
  const [x, y] = ds;
  const rows = ['st', 'burden', 'pov', ...CARE].map((m) => `${M[m].label}: ${x.n} ${fmt(val(x, m), m)} | ${y.n} ${fmt(val(y, m), m)}`);
  return { text: `${x.n} vs ${y.n}:\n` + bullets(rows) + `\nCompare only where both have values; differences are descriptive and do not show causes.\n` + base(D), focus: x.n };
}
function gapsAnswer(ds, D) {
  if (ds.length) {
    const d = ds[0], miss = ['st', ...CARE].filter((m) => val(d, m) == null);
    if (!miss.length) return { text: `${d.n} has a value for every indicator in the dashboard.`, focus: d.n };
    return { text: `${d.n} is missing: ${miss.map((m) => M[m].label).join(', ')}.\n` + (miss.includes('st') ? 'Stunting is below 30% (it is not among the 11 districts above 30%), but no exact value is published.\n' : '') + (miss.some((m) => CARE.includes(m)) ? `Reason: NISR has not yet published the 2025 RDHS profile for ${d.p === 'Kigali City' ? 'Kigali City' : d.p + ' Province'} (checked 29 Oct 2026).\n` : '') + 'We do not estimate missing values.', focus: d.n };
  }
  const n = (m) => D.filter((d) => val(d, m) != null).length;
  return { text: `Coverage across 30 districts:\n` + bullets([`Poverty: ${n('pov')}`, `Stunting: ${n('st')} (Nyamasheke and Rulindo are below 30%, no exact value)`, `Antenatal, postnatal, teenage childbearing, unmet need: ${n('anc')} (Eastern and Southern only)`]) + '\nWestern, Northern and Kigali 2025 profiles are not yet published. See DATA_GAPS.md.' };
}
function methodsAnswer() {
  return { text: 'How the numbers are made:\n' + bullets(['District health indicators come from NISR RDHS 2025 province profiles; poverty from EICV7 2023/24; population from Census 2022.', 'Under-five counts are a province-share proxy, so stunted-children numbers are estimates.', '"Validated" means two sources agree; most values are single-source.', 'Differences of a few points can be sampling noise; the top group is a priority group, not a strict order.', 'The tool does not show causes and is not a clinical or forecasting tool.']) };
}
function plannerAnswer(q, D) {
  const N = +(norm(q).match(/(\d+)\s*(teams?|workers|units|people|staff)?/) || [])[1] || 20;
  const pool = D.filter((d) => d.st != null && d.st >= 30 && val(d, 'burden') != null), tot = pool.reduce((s, d) => s + val(d, 'burden'), 0);
  let a = pool.map((d) => ({ d, x: (N * val(d, 'burden')) / tot })); a.forEach((o) => (o.n = Math.floor(o.x)));
  let r = N - a.reduce((s, o) => s + o.n, 0); [...a].sort((p, q2) => (q2.x - q2.n) - (p.x - p.n)).slice(0, r).forEach((o) => o.n++);
  a = a.sort((p, q2) => q2.n - p.n).filter((o) => o.n > 0);
  return { text: `Illustrative split of ${N} teams across the ${pool.length} districts with stunting of 30% or more, in proportion to estimated stunted children:\n` + bullets(a.map((o) => `${o.d.n}: ${o.n}`)) + `\nThis is a discussion aid, not a validated staffing or budget model.\n` + base(D, 'Uses a population proxy. '), focus: a[0]?.d.n };
}
function recommendDistrict(d, D) {
  const p = D.filter((x) => x.st != null && x.pov != null), ms = median(p.map((x) => x.st)), mp = median(p.map((x) => x.pov));
  const L = [`Suggestions for ${d.n}, based on the data (ideas to discuss, not proven fixes):`], steps = [];
  if (d.st != null) {
    L.push(`Where it stands: stunting ${d.st}% (rank ${[...p].sort((a, b) => b.st - a.st).findIndex((x) => x === d) + 1} of ${p.length}), about ${fmt(val(d, 'burden'))} children, poverty ${d.pov}%.`);
    if (d.st >= ms && d.pov < mp) steps.push('Stunting is high while poverty is low, so poverty-based programmes would not flag it. Check whether nutrition and feeding-practice services reach families here.');
    if (d.st >= ms && d.pov >= mp) steps.push('Both stunting and poverty are above the median: a combined approach is worth discussing.');
  } else steps.push('No exact stunting value is published (it is below 30%). Use local data before setting priorities.');
  if (d.st20 != null) L.push(`Trend: ${d.st20}% in 2019-20 to ${d.st}% in 2025 (${d.st - d.st20 > 0 ? '+' : ''}${Math.round((d.st - d.st20) * 10) / 10} points).`);
  else L.push('Trend: no 2019-20 value in our sources, so we cannot say whether it is improving.');
  const gaps = []; if (d.anc != null && d.anc < 75) gaps.push(`antenatal 4+ visits ${d.anc}%`); if (d.pnc != null && d.pnc < 60) gaps.push(`newborn postnatal check ${d.pnc}%`); if (d.teen != null && d.teen >= 14) gaps.push(`teenage childbearing ${d.teen}%`); if (d.un != null && d.un >= 8) gaps.push(`unmet family-planning need ${d.un}%`);
  if (gaps.length) steps.push(`Care gaps to review with local service data: ${gaps.join(', ')}.`);
  if (CARE.every((m) => val(d, m) == null)) steps.push(`Care indicators are not yet published for ${d.p}, so request facility data locally.`);
  const peers = D.filter((x) => x !== d && x.st != null && x.st20 != null && x.st - x.st20 <= -10).sort((a, b) => (a.p === d.p ? 0 : 1) - (b.p === d.p ? 0 : 1) || Math.abs(a.pov - d.pov) - Math.abs(b.pov - d.pov)).slice(0, 2);
  if (peers.length) steps.push(`Learn from districts that cut stunting by 10+ points since 2019-20: ${peers.map((x) => `${x.n} (${x.st20}% to ${x.st}%)`).join(', ')}. Ask what changed. ${peers.some((x) => x.n === 'Gakenke') ? 'A press report cites monthly screening and parent groups in Gakenke; this was reported, not evaluated. ' : ''}These districts are among the few with a published 2020 value, so other districts may also have improved.`);
  steps.push('Treat the result as a priority group to verify locally, not a strict ranking.');
  return { text: L.join('\n') + '\n' + steps.map((s, i) => `${i + 1}. ${s}`).join('\n') + '\n' + base(D), focus: d.n };
}
function recommendGeneral(D) {
  const hi = D.filter((d) => d.st != null && d.st >= 30).sort((a, b) => val(b, 'burden') - val(a, 'burden'));
  const top = changes(D).filter((x) => x.c < 0).slice(0, 3);
  const bl = blindAnswer(D);
  return { text: `Three ideas the data supports (to discuss, not proven fixes):\n1. Start with the ${hi.length} districts above 30% stunting, ordered by estimated children affected: ${hi.slice(0, 6).map((d) => `${d.n} (${fmt(val(d, 'burden'))})`).join(', ')}.\n2. Do not rely on poverty alone: several high-stunting districts have lower poverty (see "where is stunting high but poverty low").\n3. Pair high-stunting districts with ones that cut stunting fastest (${top.map((x) => `${x.d.n} ${x.c}`).join(', ')}) to learn what changed. Only ${changes(D).length} districts have a 2020 baseline, so this list is incomplete.\nAlso: close the data gap, because care indicators exist for only 15 districts.\n` + base(D), focus: hi[0]?.n };
}

export const SUGGESTIONS = ['Which districts have the highest stunting?', 'Which districts reduced stunting the most?', 'What do you recommend for Gicumbi?', 'Where is stunting high but poverty low?', 'Compare Gicumbi and Ngoma', 'Why is data missing for Rubavu?', 'If I have 20 teams, where should they go?'];
export function answer(question, D) {
  const q = norm(question), ds = findDistricts(question, D);
  if (/^\s*(hi|hello|hey|muraho|mwaramutse|help)\b/.test(q) || !q.trim()) return { text: 'I answer questions using only the numbers in this dashboard. Try one of the suggestions, or ask about a district, a comparison, reductions since 2020, data gaps, or where to focus.', chips: SUGGESTIONS.slice(0, 4) };
  let r;
  if (ds.length >= 2 && /compare|versus|\bvs\b|difference|between|and/.test(q)) r = compareAnswer(ds, D);
  else if (/team|capacity|allocate|distribute|split/.test(q)) r = plannerAnswer(question, D);
  else if (/recommend|suggest|should|idea|prioriti|action|what (can|could)|best way|improve|help/.test(q)) r = ds.length ? recommendDistrict(ds[0], D) : recommendGeneral(D);
  else if (/blind|despite|poverty.*(low|predict|track|doesn)|low.*poverty|mismatch/.test(q)) r = blindAnswer(D);
  else if (/reduc|declin|drop|progress|fell|fall|decreas|since 20|trend|worsen|increas|\brose\b|rise|change/.test(q)) r = changeAnswer(D);
  else if (/missing|no data|not available|coverage|gap|why/.test(q)) r = gapsAnswer(ds, D);
  else if (/source|method|reliab|accura|trust|limit|proxy|validated|how (was|is|are)/.test(q)) r = methodsAnswer();
  else if (/highest|lowest|top|worst|best|most|least|rank|which districts|bottom/.test(q)) r = rankAnswer(question, D);
  else if (ds.length) r = { text: profile(ds[0], D) + '\n' + base(D), focus: ds[0].n };
  else r = { text: 'I could not match that to the dashboard data. I can rank districts, compare two, show changes since 2020, explain missing data, and suggest where to focus. Try one of the suggestions.', chips: SUGGESTIONS.slice(0, 4) };
  return { chips: SUGGESTIONS.filter((s) => !norm(s).includes(norm(question).slice(0, 12))).slice(0, 3), ...r };
}
