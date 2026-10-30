import { useCallback, useEffect, useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Check, HelpCircle } from 'lucide-react';

const TOUR_KEY = 'mutegurire-onboarding-completed-v1';

const steps = [
  {
    id: 'welcome', tab: 'explore', target: null,
    enTitle: 'Welcome to Mutegurire',
    en: 'A short tour will show you how to explore district-level maternal and child health information, compare indicators, and review the limits of the available data.',
    rwTitle: 'Murakaza neza muri Mutegurire',
    rw: 'Uru rugendo rugufi rurakwereka uko wareba amakuru y’ubuzima bw’ababyeyi n’abana ku rwego rw’uturere, ukagereranya ibipimo kandi ukamenya aho amakuru agarukira.'
  },
  {
    id: 'map', tab: 'explore', target: '[data-tour="district-map"]',
    enTitle: 'Explore the Rwanda map',
    en: 'Choose an indicator, then hover over or select a district to inspect the information available for it. Missing values are not treated as zero.',
    rwTitle: 'Reba ikarita y’u Rwanda',
    rw: 'Hitamo igipimo, hanyuma ujye hejuru y’akarere cyangwa ugakandeho kugira ngo urebe amakuru ahari. Amakuru abura ntabarwa nka zeru.'
  },
  {
    id: 'navigation', tab: 'explore', target: '[data-tour="panel-navigation"]',
    enTitle: 'Move between sections',
    en: 'These tabs open the ranking, district profile, insights, comparison, planning scenario, sources, and Ask Mutegurire sections.',
    rwTitle: 'Hinduranya ibice by’urubuga',
    rw: 'Utubuto two hano tugufasha kugera ku rutonde rw’uturere, umwirondoro w’akarere, isesengura, igereranya, igenamigambi, inkomoko n’igice cya Baza Mutegurire.'
  },
  {
    id: 'ranking', tab: 'rank', target: '[data-tour="ranking-panel"]',
    enTitle: 'Understand district rankings',
    en: 'Filter districts and review their values. Rankings include only districts with available values for the selected indicator.',
    rwTitle: 'Sobanukirwa n’urutonde rw’uturere',
    rw: 'Shungura uturere urebe agaciro k’ibipimo. Urutonde rurimo gusa uturere dufite amakuru ku gipimo wahisemo.'
  },
  {
    id: 'profile', tab: 'inspect', target: '[data-tour="profile-panel"]',
    enTitle: 'Inspect a district',
    en: 'The district profile brings together available indicators, data-quality labels, population estimates, and notes about missing information.',
    rwTitle: 'Reba umwirondoro w’akarere',
    rw: 'Umwirondoro w’akarere uhuza ibipimo bihari, uko amakuru yagenzuwe, ibigereranyo by’abaturage n’impamvu amwe mu makuru abura.'
  },
  {
    id: 'compare', tab: 'compare', target: '[data-tour="compare-panel"]',
    enTitle: 'Compare districts',
    en: 'Compare two districts side by side. Check that the indicator definitions, years, and data coverage are comparable before interpreting differences.',
    rwTitle: 'Gereranya uturere',
    rw: 'Gereranya uturere tubiri. Mbere yo gusobanura itandukaniro, banza urebe niba ibipimo, imyaka n’amakuru ahari bihuye.'
  },
  {
    id: 'planner', tab: 'plan', target: '[data-tour="planner-panel"]',
    enTitle: 'Explore a planning scenario',
    en: 'Adjust the number of outreach teams and compare illustrative distribution approaches. This is a scenario for discussion, not an official allocation recommendation.',
    rwTitle: 'Gerageza uburyo bw’igenamigambi',
    rw: 'Hindura umubare w’amatsinda agera ku baturage ugereranye uburyo bwo kuyagabanya. Ibi ni iby’igerageza n’ibiganiro, si icyemezo cyemewe cyo kugabanya abakozi cyangwa ingengo y’imari.'
  },
  {
    id: 'sources', tab: 'sources', target: '[data-tour="sources-panel"]',
    enTitle: 'Check sources and limitations',
    en: 'Review the data sources, definitions, missing values, estimates, and methodological cautions before drawing conclusions.',
    rwTitle: 'Reba inkomoko n’imbogamizi z’amakuru',
    rw: 'Soma inkomoko y’amakuru, ibisobanuro by’ibipimo, amakuru abura, ibigereranyo n’imbogamizi z’uburyo bwakoreshejwe mbere yo gufata imyanzuro.'
  },
  {
    id: 'assistant', tab: 'ask', target: '[data-tour="assistant-panel"]',
    enTitle: 'Ask Mutegurire',
    en: 'Ask questions about the available information or upload a PDF to preview extracted values. Always review extracted values against the original document.',
    rwTitle: 'Baza Mutegurire',
    rw: 'Baza ibibazo ku makuru ahari cyangwa wohereze inyandiko ya PDF urebe amakuru yayikuwemo. Buri gihe genzura ayo makuru uyagereranye n’inyandiko y’umwimerere.'
  },
  {
    id: 'finish', tab: 'explore', target: null,
    enTitle: 'You are ready to explore',
    en: 'You can restart this tour at any time using the Help / Take a tour button. Your completion is remembered in this browser.',
    rwTitle: 'Ubu ushobora gukoresha Mutegurire',
    rw: 'Igihe cyose ushaka kongera kureba uru rugendo, kanda kuri Fasha / Ongera urebe urugendo. Ibyo warangije bizibukwa muri iyi browser.'
  }
];

export default function OnboardingTour({ lang = 'en', onNavigate, autoStart = true }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const step = steps[index];
  const isRw = lang === 'rw';

  const measure = useCallback(() => {
    if (!open || !step?.target) { setRect(null); return; }
    const element = document.querySelector(step.target);
    if (!element) { setRect(null); return; }
    const bounds = element.getBoundingClientRect();
    setRect({ top: bounds.top - 5, left: bounds.left - 5, width: bounds.width + 10, height: bounds.height + 10 });
  }, [open, step]);

  useEffect(() => {
    if (autoStart && !localStorage.getItem(TOUR_KEY)) setOpen(true);
  }, [autoStart]);

  useEffect(() => {
    if (!open) return undefined;
    onNavigate?.(step.tab);
    const target = step.target ? document.querySelector(step.target) : null;
    target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    const timer = window.setTimeout(measure, 220);
    const update = () => measure();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, index, measure, onNavigate, step.tab]);

  const finish = () => {
    localStorage.setItem(TOUR_KEY, '1');
    setOpen(false);
    setRect(null);
  };
  const start = () => { setIndex(0); setOpen(true); };
  const next = () => {
    if (index >= steps.length - 1) finish();
    else setIndex((value) => value + 1);
  };
  const previous = () => setIndex((value) => Math.max(0, value - 1));

  return (
    <>
      <button type="button" className="tour-help-button" onClick={start} aria-label={isRw ? 'Fungura urugendo rwo kuyobora' : 'Start the guided tour'}>
        <HelpCircle size={16} /><span>{isRw ? 'Fasha' : 'Help'}</span>
      </button>
      {open && (
        <div className="tour-layer" role="dialog" aria-modal="true" aria-labelledby="tour-title">
          <button className="tour-backdrop" type="button" aria-label={isRw ? 'Funga urugendo' : 'Close tour'} onClick={finish} />
          {rect && <div className="tour-spotlight" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />}
          <section className={`tour-card${rect ? ' has-target' : ' centered'}`} style={rect ? {
            top: Math.min(Math.max(16, rect.top + rect.height + 14), window.innerHeight - 260),
            left: Math.min(Math.max(16, rect.left), window.innerWidth - 356)
          } : undefined}>
            <div className="tour-card-top">
              <span className="tour-step-count">{isRw ? `Intambwe ${index + 1} kuri ${steps.length}` : `Step ${index + 1} of ${steps.length}`}</span>
              <button type="button" className="tour-close" onClick={finish} aria-label={isRw ? 'Funga' : 'Close'}><X size={17} /></button>
            </div>
            <h2 id="tour-title">{isRw ? step.rwTitle : step.enTitle}</h2>
            <p>{isRw ? step.rw : step.en}</p>
            <div className="tour-progress" aria-hidden="true"><span style={{ width: `${((index + 1) / steps.length) * 100}%` }} /></div>
            <div className="tour-actions">
              <button type="button" className="tour-skip" onClick={finish}>{isRw ? 'Simbuka' : 'Skip tour'}</button>
              <div>
                <button type="button" className="tour-secondary" onClick={previous} disabled={index === 0}><ChevronLeft size={15} />{isRw ? 'Subira' : 'Back'}</button>
                <button type="button" className="tour-next" onClick={next}>{index === steps.length - 1 ? (isRw ? 'Rangiza' : 'Finish') : (isRw ? 'Komeza' : 'Next')} {index === steps.length - 1 ? <Check size={15} /> : <ChevronRight size={15} />}</button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
