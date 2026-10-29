export const metrics = [
 {id:'st',en:'Stunting prevalence',rw:'Igwingira ry’abana',unit:'%',better:'lower',priority:'high',note:'Share of children under five reported as stunted.'},
 {id:'burden',en:'Estimated children affected',rw:'Abana bagereranywa n’abafite igwingira',unit:'children',better:'lower',priority:'high',note:'Calculated from the prototype under-five population estimate and stunting prevalence.'},
 {id:'pov',en:'Poverty rate',rw:'Ubukene',unit:'%',better:'lower',priority:'high',note:'Poverty indicator in the source dataset.'},
 {id:'anc',en:'ANC 4+ visits',rw:'Gusura kwa muganga nibura 4',unit:'%',better:'higher',priority:'low',note:'Antenatal care coverage. Missing for many districts.'},
 {id:'pnc',en:'Postnatal check',rw:'Isuzuma nyuma yo kubyara',unit:'%',better:'higher',priority:'low',note:'Postnatal check indicator. Missing for many districts.'},
 {id:'teen',en:'Teenage childbearing',rw:'Kubyara kw’ingimbi',unit:'%',better:'lower',priority:'high',note:'Teenage childbearing indicator in the source dataset.'},
 {id:'un',en:'Unmet family-planning need',rw:'Icyuho mu kubona serivisi zo kuboneza urubyaro',unit:'%',better:'lower',priority:'high',note:'Unmet need indicator; interpret as a service-planning measure, not as a judgement about personal choices.'}
];
export const valueOf = (d,id) => id==='burden' ? (d.st == null || d.u5 == null ? null : Math.round(d.u5*d.st/100)) : d[id] ?? null;
export const formatValue = (v,id) => v==null ? 'Not available' : id==='burden' ? Math.round(v).toLocaleString() : `${Number(v).toLocaleString(undefined,{maximumFractionDigits:1})}%`;
export const completeness = d => ['st','pov','anc','pnc','teen','un'].filter(k=>d[k]!=null).length;
