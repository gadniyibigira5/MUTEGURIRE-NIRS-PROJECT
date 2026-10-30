import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, FileUp, LoaderCircle, RotateCcw, Send, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { answer, SUGGESTIONS } from '../utils/assistant.js';

const T = {
  en: {
    eyebrow: '08 · DATA ASSISTANT', title: 'Ask Mutegurire', ph: 'Ask about a district, a trend, or a planning idea…', send: 'Send', show: 'Highlight on map', clear: 'New chat',
    note: 'Answers are grounded in this dashboard. When the optional AI service is configured, it can explain patterns in natural language. Recommendations are discussion aids, not proven interventions.',
    hello: 'Hello! I can compare districts, explain missing data, describe changes, and suggest planning questions. What would you like to explore?',
    uploadTitle: 'Import a report PDF', uploadText: 'Extract possible district statistics and keep the source page with each candidate. Nothing changes in the dashboard until a reviewer checks and approves it.', upload: 'Choose PDF', analyzing: 'Reading PDF…', noCandidates: 'No confident district-indicator candidates were found. The PDF may be scanned or use a table layout that needs manual review.',
    preview: 'Extracted candidates', review: 'Review required', page: 'Page', district: 'District', indicator: 'Indicator', value: 'Candidate value', status: 'Not published', uploadError: 'Could not analyze this PDF. Check that the API service is running and that the file is a readable PDF.', fileLimit: 'PDF only, up to 15 MB.', modelOn: 'AI service connected', modelFallback: 'Local data assistant', sourceWarning: 'Extracted values are candidates only. Verify the exact definition, year, denominator, and table column before approval.',
  },
  rw: {
    eyebrow: '08 · UMUFASHA W’AMAKURU', title: 'Baza Mutegurire', ph: 'Baza ku karere, impinduka cyangwa igitekerezo…', send: 'Ohereza', show: 'Garagaza ku ikarita', clear: 'Tangira ikiganiro gishya',
    note: 'Ibisubizo bishingira ku makuru ari muri iyi sisitemu. Iyo serivisi y’ubwenge bw’ubukorano yashyizweho, ishobora gusobanura amakuru mu mvugo isanzwe. Ibyifuzo ni ibyo kuganiraho, si ibisubizo byemejwe.',
    hello: 'Muraho! Nshobora kugereranya uturere, gusobanura amakuru abura, impinduka, no gutanga ibitekerezo byo gutegura ibikorwa. Ni iki ushaka kumenya?',
    uploadTitle: 'Shyiramo raporo ya PDF', uploadText: 'Sisitemu ishakisha imibare ishobora kuba ijyanye n’uturere kandi ikabika paji yakuwemo. Nta makuru ahinduka mu rubuga kugeza igihe asuzumwe kandi yemejwe.',
    upload: 'Hitamo PDF', analyzing: 'Isoma PDF…', noCandidates: 'Nta mibare yizewe ihuye n’akarere n’ikimenyetso yabonetse. PDF ishobora kuba yarafotowe cyangwa igasaba gusuzumwa n’umuntu.', preview: 'Imibare yabonetse', review: 'Igomba gusuzumwa', page: 'Paji', district: 'Akarere', indicator: 'Ikimenyetso', value: 'Umubare ushoboka', status: 'Ntiyashyizweho', uploadError: 'PDF ntiyashoboye gusomwa. Reba niba serivisi ya API ikora kandi dosiye ari PDF isomeka.', fileLimit: 'PDF gusa, ntirenze 15 MB.', modelOn: 'Serivisi ya AI irakora', modelFallback: 'Umufasha ushingiye ku makuru ariho', sourceWarning: 'Iyi mibare ni iy’agateganyo gusa. Banza ugenzure ibisobanuro, umwaka, denominator n’inkingi y’imbonerahamwe mbere yo kuyemeza.',
  },
};

const API = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const initialMessage = (t) => ({ role: 'bot', text: t.hello, chips: SUGGESTIONS.slice(0, 4) });

export default function Assistant({ districts, lang = 'en', onFocus }) {
  const t = T[lang] || T.en;
  const [msgs, setMsgs] = useState(() => [initialMessage(T.en)]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [modelMode, setModelMode] = useState('local');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [pdfResult, setPdfResult] = useState(null);
  const fileRef = useRef(null);
  const logRef = useRef(null);
  const last = msgs[msgs.length - 1];
  const suggestions = useMemo(() => last?.chips || SUGGESTIONS.slice(0, 3), [last]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [msgs, busy]);
  useEffect(() => {
    setMsgs((old) => old.length === 1 && old[0].role === 'bot' ? [initialMessage(t)] : old);
  }, [lang]);

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const local = answer(q, districts);
    const history = msgs.slice(-8).map((m) => ({ role: m.role === 'bot' ? 'assistant' : m.role, content: m.text }));
    setMsgs((old) => [...old, { role: 'user', text: q }]);
    setInput('');
    setBusy(true);
    let responseText = local.text;
    let mode = 'local';
    try {
      const response = await fetch(`${API}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, language: lang, districts, history }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.answer && data.model_used) { responseText = data.answer; mode = 'ai'; }
      }
    } catch { /* Local, data-grounded answers remain available without the optional API. */ }
    setModelMode(mode);
    setMsgs((old) => [...old, { role: 'bot', text: responseText, focus: local.focus, chips: local.chips || SUGGESTIONS.slice(0, 3), sourceMode: mode }]);
    setBusy(false);
    if (local.focus && onFocus) onFocus(local.focus);
  }

  function resetChat() {
    setMsgs([initialMessage(t)]);
    setInput('');
  }

  async function analyzePdf(file) {
    setPdfError('');
    setPdfResult(null);
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setPdfError(t.fileLimit); if (fileRef.current) fileRef.current.value = ''; return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setPdfError(t.fileLimit); if (fileRef.current) fileRef.current.value = ''; return;
    }
    setPdfBusy(true);
    try {
      const body = new FormData(); body.append('file', file);
      const response = await fetch(`${API}/api/documents/preview`, { method: 'POST', body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || t.uploadError);
      setPdfResult(data);
    } catch (err) { setPdfError(err.message || t.uploadError); }
    finally { setPdfBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  const indicators = { st: 'Stunting (%)', pov: 'Poverty (%)', anc: 'Antenatal care (%)', pnc: 'Postnatal check (%)', teen: 'Teenage childbearing (%)', un: 'Unmet family-planning need (%)' };

  return (
    <section className="panel assistant-panel" data-tour="assistant-panel" aria-labelledby="ask-title">
      <div className="panel-title">
        <div><span className="eyebrow">{t.eyebrow}</span><h3 id="ask-title">{t.title}</h3></div>
        <button type="button" className="assistant-reset" onClick={resetChat} title={t.clear} aria-label={t.clear}><RotateCcw size={15} /></button>
      </div>
      <p className="field-help">{t.note}</p>
      <div className="assistant-mode"><span className={modelMode === 'ai' ? 'mode-dot connected' : 'mode-dot'} />{modelMode === 'ai' ? t.modelOn : t.modelFallback}</div>
      <div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-relevant="additions text">
        {msgs.map((m, i) => (
          <div key={`${i}-${m.role}`} className={m.role === 'user' ? 'msg user' : 'msg bot'}>
            {m.role === 'bot' && <Bot size={14} className="msg-icon" aria-hidden="true" />}
            <span>{m.text}</span>
            {m.role === 'bot' && m.focus && <button type="button" className="chip-btn show-btn" onClick={() => onFocus && onFocus(m.focus)}>{t.show}: {m.focus}</button>}
          </div>
        ))}
        {busy && <div className="msg bot typing"><LoaderCircle size={14} className="spin" />{lang === 'rw' ? 'Ndabitekerezaho…' : 'Thinking through the data…'}</div>}
      </div>
      <div className="chip-row">{suggestions.map((c) => <button type="button" key={c} className="chip-btn" disabled={busy} onClick={() => send(c)}>{c}</button>)}</div>
      <form className="chat-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.ph} aria-label={t.ph} disabled={busy} />
        <button type="submit" className="primary-button" disabled={busy || !input.trim()}><Send size={14} />{t.send}</button>
      </form>

      <div className="pdf-import">
        <div className="pdf-import-heading"><div className="pdf-icon"><FileUp size={17} /></div><div><strong>{t.uploadTitle}</strong><p>{t.uploadText}</p></div></div>
        <input ref={fileRef} type="file" accept="application/pdf,.pdf" onChange={(e) => analyzePdf(e.target.files?.[0])} aria-label={t.uploadTitle} />
        <div className="pdf-import-actions"><button type="button" className="secondary-button" onClick={() => fileRef.current?.click()} disabled={pdfBusy}><FileUp size={14} />{pdfBusy ? t.analyzing : t.upload}</button><span>{t.fileLimit}</span></div>
        {pdfError && <p className="pdf-error" role="alert">{pdfError}</p>}
        {pdfResult && <div className="pdf-results">
          <div className="pdf-results-title"><strong>{t.preview} · {pdfResult.candidates?.length || 0}</strong><span className="review-badge"><ShieldCheck size={12} />{t.review}</span></div>
          {pdfResult.candidates?.length ? <div className="candidate-list">{pdfResult.candidates.map((c, i) => <div className="candidate-row" key={`${c.district}-${c.indicator}-${c.page}-${i}`}>
            <strong>{c.district}</strong><span>{indicators[c.indicator] || c.indicator}</span><b>{c.value}%</b><small>{t.page} {c.page} · {c.source_text}</small><em>{t.status}</em>
          </div>)}</div> : <p className="field-help">{t.noCandidates}</p>}
          <p className="pdf-caution">{t.sourceWarning}</p>
          {pdfResult.warnings?.length > 0 && <ul className="pdf-warnings">{pdfResult.warnings.slice(0, 4).map((w, i) => <li key={i}>{w}</li>)}</ul>}
        </div>}
      </div>
    </section>
  );
}
