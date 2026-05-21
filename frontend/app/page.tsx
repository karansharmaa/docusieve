"use client";

import React, { useState, useRef, useEffect } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

type AnalysisResult = {
  score: number;
  jd_vocab_size: number;
  resume_vocab_size: number;
  overlap_count: number;
  overlap_examples: string[];
  phrase_score?: number;
  phrase_hits?: string[];
  phrase_misses?: string[];
  semantic_hits?: string[];
  combined_score?: number;
  phrase_total?: number;
};

type LlmResponse = {
  score?: number;
  analysis: AnalysisResult;
  llm_feedback: string;
};

const STOPWORDS = new Set([
  "a","an","the","and","or","to","of","in","on","for","with","by","as","at",
  "from","is","are","be","this","that","it","you","we","they","their","our","your"
]);

export default function DocuSievePage() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LlmResponse | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [cooldown, setCooldown] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setResumeFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!resumeFile) { setError("Please upload a PDF resume."); return; }
    if (!jobDescription.trim()) { setError("Please paste a job description."); return; }
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("resume", resumeFile);
      formData.append("job_description", jobDescription);
      const res = await fetch(`${API_BASE_URL}/analyze_llm`, { method: "POST", body: formData });
      if (!res.ok) { const text = await res.text(); throw new Error(`HTTP ${res.status}: ${text}`); }
      const data = (await res.json()) as LlmResponse;
      setResult(data);
      if (data.llm_feedback === "[LLM ERROR] RATE_LIMIT") {
        setCooldown(60);
        const interval = setInterval(() => {
          setCooldown(prev => {
            if (prev <= 1) { clearInterval(interval); return 0; }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const finalScore = result?.score ?? result?.analysis?.combined_score ?? result?.analysis?.score ?? 0;
  const keywordScore = result?.analysis?.score ?? 0;
  const phraseScore = result?.analysis?.phrase_score ?? 0;
  const phraseHits = result?.analysis?.phrase_hits ?? [];
  const phraseMisses = result?.analysis?.phrase_misses ?? [];
  const semanticHits = result?.analysis?.semantic_hits ?? []; 
  const overlapExamples = (result?.analysis?.overlap_examples ?? [])
    .filter(w => w.length > 2 && !STOPWORDS.has(w));

  const scoreColor = finalScore >= 60 ? "var(--blue)" : finalScore >= 35 ? "#e6a817" : "#e24b4a";

  return (
    <>
      <style>{`
        .ds { font-family: var(--sans); min-height: 100vh; background: var(--bg); color: var(--text); }

        /* NAV */
        .ds-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 40px; border-bottom: 0.5px solid var(--border);
          position: sticky; top: 0; background: var(--bg); z-index: 10;
        }
        .ds-logo { font-size: 18px; font-weight: 500; letter-spacing: -0.03em; color: var(--text); }
        .ds-nav-right { display: flex; align-items: center; gap: 10px; }
        .ds-badge {
          font-size: 11px; font-weight: 500; padding: 4px 10px;
          border-radius: 20px; background: var(--blue-light); color: var(--blue-dark);
        }
        .ds-theme-btn {
          font-size: 12px; padding: 6px 12px; border-radius: var(--radius-sm);
          border: 0.5px solid var(--border2); background: transparent;
          color: var(--text2); cursor: pointer; font-family: var(--mono);
          transition: background 0.15s, color 0.15s;
        }
        .ds-theme-btn:hover { background: var(--bg2); color: var(--text); }

        /* HERO */
        .ds-hero { padding: 64px 40px 48px; max-width: 680px; }
        .ds-hero-badge {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 12px; color: var(--blue-dark); background: var(--blue-light);
          padding: 5px 12px; border-radius: 20px; font-weight: 500; margin-bottom: 20px;
        }
        .ds-hero-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--blue); animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .ds-h1 {
          font-size: 48px; font-weight: 300; letter-spacing: -0.04em;
          line-height: 1.1; margin: 0 0 16px; color: var(--text);
        }
        .ds-h1 strong { font-weight: 500; }
        .ds-h1 span { color: var(--blue); font-weight: 500; }
        .ds-sub { font-size: 16px; color: var(--text2); line-height: 1.65; margin: 0 0 28px; max-width: 500px; }
        .ds-cta-row { display: flex; align-items: center; gap: 14px; }
        .ds-cta-main {
          font-size: 14px; font-weight: 500; padding: 11px 22px;
          border-radius: var(--radius-md); border: none;
          background: var(--blue); color: white; cursor: pointer;
          transition: opacity 0.15s;
        }
        .ds-cta-main:hover { opacity: 0.88; }
        .ds-cta-note { font-size: 13px; color: var(--text3); font-family: var(--mono); }

        /* MAIN BODY */
        .ds-body {
          display: grid; grid-template-columns: 1fr 340px;
          border-top: 0.5px solid var(--border);
          min-height: 520px;
        }
        @media (max-width: 720px) {
          .ds-body { grid-template-columns: 1fr; }
          .ds-right { border-left: none !important; border-top: 0.5px solid var(--border); }
          .ds-hero { padding: 40px 20px 32px; }
          .ds-nav { padding: 14px 20px; }
          .ds-h1 { font-size: 34px; }
        }

        .ds-left { padding: 28px 32px; }
        .ds-right { padding: 28px 28px; border-left: 0.5px solid var(--border); background: var(--bg2); }

        .ds-section-label {
          font-size: 11px; font-weight: 500; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--text3);
          font-family: var(--mono); margin: 0 0 12px;
        }

        /* UPLOAD */
        .ds-dropzone {
          border: 0.5px dashed var(--border2); border-radius: var(--radius-lg);
          padding: 28px 20px; text-align: center; cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          margin-bottom: 20px;
        }
        .ds-dropzone:hover { border-color: var(--blue); background: var(--blue-light); }
        .ds-drop-icon { font-size: 28px; color: var(--blue); margin-bottom: 10px; }
        .ds-drop-title { font-size: 14px; font-weight: 500; color: var(--text); margin: 0 0 4px; }
        .ds-drop-sub { font-size: 12px; color: var(--text3); font-family: var(--mono); margin: 0; }
        .ds-file-ready {
          display: flex; align-items: center; gap: 12px;
          border: 0.5px solid var(--green-border); border-radius: var(--radius-md);
          padding: 12px 16px; background: var(--green-bg); margin-bottom: 20px; cursor: pointer;
        }
        .ds-file-icon { font-size: 20px; color: var(--green-text); }
        .ds-file-name { font-size: 13px; font-weight: 500; color: var(--green-text); margin: 0 0 2px; }
        .ds-file-size { font-size: 11px; color: var(--green-text); opacity: 0.7; font-family: var(--mono); margin: 0; }
        .ds-replace { font-size: 11px; font-family: var(--mono); color: var(--green-text); margin-left: auto; opacity: 0.7; }

        /* TEXTAREA */
        .ds-textarea {
          width: 100%; height: 140px; border: 0.5px solid var(--border2);
          border-radius: var(--radius-md); padding: 12px 14px;
          font-size: 13px; line-height: 1.65; resize: none;
          background: var(--bg); color: var(--text);
          font-family: var(--sans); outline: none;
          transition: border-color 0.15s;
        }
        .ds-textarea:focus { border-color: var(--blue); }
        .ds-textarea::placeholder { color: var(--text3); }

        /* SUBMIT */
        .ds-submit {
          width: 100%; background: var(--blue); color: white; border: none;
          border-radius: var(--radius-md); padding: 13px;
          font-size: 14px; font-weight: 500; cursor: pointer;
          margin-top: 14px; font-family: var(--sans);
          transition: opacity 0.15s;
        }
        .ds-submit:hover:not(:disabled) { opacity: 0.88; }
        .ds-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .ds-error { font-size: 12px; color: var(--red-text); font-family: var(--mono); margin-top: 10px; }

        /* LOADING */
        .ds-loading { display: flex; align-items: center; gap: 10px; padding: 20px 0; }
        .ds-dots { display: flex; gap: 5px; }
        .ds-dots span {
          width: 5px; height: 5px; border-radius: 50%; background: var(--blue);
          animation: blink 1.2s ease-in-out infinite;
        }
        .ds-dots span:nth-child(2) { animation-delay: 0.2s; }
        .ds-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink { 0%,100%{opacity:0.2} 50%{opacity:1} }
        .ds-loading-text { font-size: 12px; color: var(--text3); font-family: var(--mono); }

        /* RESULTS RIGHT PANEL */
        .ds-score-block {
          background: var(--bg); border: 0.5px solid var(--border);
          border-radius: var(--radius-lg); padding: 20px; text-align: center;
          margin-bottom: 16px;
        }
        .ds-score-num { font-size: 52px; font-weight: 500; letter-spacing: -0.04em; line-height: 1; margin: 0 0 4px; }
        .ds-score-label { font-size: 11px; color: var(--text3); font-family: var(--mono); margin: 0; }

        .ds-bar-row { margin-bottom: 12px; }
        .ds-bar-top { display: flex; justify-content: space-between; margin-bottom: 5px; }
        .ds-bar-name { font-size: 12px; color: var(--text2); font-family: var(--mono); }
        .ds-bar-pct { font-size: 12px; font-weight: 500; color: var(--text); font-family: var(--mono); }
        .ds-track { height: 4px; background: var(--border2); border-radius: 2px; overflow: hidden; }
        .ds-fill { height: 100%; border-radius: 2px; background: var(--blue); }
        .ds-fill-dim { height: 100%; border-radius: 2px; background: var(--blue-mid); }

        /* CHIPS */
        .ds-chips-section { margin-top: 20px; }
        .ds-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px; }
        .ds-chip-hit {
          font-size: 11px; padding: 4px 9px; border-radius: var(--radius-sm);
          background: var(--green-bg); color: var(--green-text);
          border: 0.5px solid var(--green-border); font-family: var(--mono);
        }
        .ds-chip-miss {
          font-size: 11px; padding: 4px 9px; border-radius: var(--radius-sm);
          background: var(--red-bg); color: var(--red-text);
          border: 0.5px solid var(--red-border); font-family: var(--mono);
        }
        .ds-chip-semantic {
          font-size: 11px; padding: 4px 9px; border-radius: var(--radius-sm); 
          background: #fef3c7; color: #92400e; 
          border: 0.5px solid rgba(146, 64, 14, 0.25); font-family: var(--mono); 
        }
        /* LLM FEEDBACK */
        .ds-feedback { margin-top: 24px; padding-top: 20px; border-top: 0.5px solid var(--border); }
        .ds-feedback-inner {
          font-size: 13px; line-height: 1.8; color: var(--text2);
          white-space: pre-wrap; max-height: 360px; overflow-y: auto;
          font-family: var(--sans);
        }
        .ds-cooldown {
          display: flex; flex-direction: column; gap: 10px; padding: 16px;
          background: var(--bg2); border-radius: var(--radius-md);
          border: 0.5px solid var(--border);
        }
        .ds-cooldown-text { font-size: 13px; color: var(--text2); font-family: var(--mono); }
        .ds-cooldown-timer { font-size: 22px; font-weight: 500; color: var(--blue); font-family: var(--mono); }
        .ds-error-feedback { font-size: 12px; color: var(--red-text); font-family: var(--mono); }

        /* FOOTER */
        .ds-footer {
          border-top: 0.5px solid var(--border); padding: 14px 40px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .ds-foot-note { font-size: 11px; color: var(--text3); font-family: var(--mono); }
        .ds-rerun {
          font-size: 12px; font-weight: 500; padding: 7px 16px;
          border-radius: var(--radius-sm); border: 0.5px solid var(--border2);
          background: transparent; color: var(--text2); cursor: pointer;
          font-family: var(--mono); transition: color 0.15s, border-color 0.15s;
        }
        .ds-rerun:hover { color: var(--text); border-color: var(--border2); }

        .fade-in { animation: fadeIn 0.35s ease forwards; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div className="ds">
        {/* NAV */}
        <nav className="ds-nav">
          <span className="ds-logo">DocuSieve</span>
          <div className="ds-nav-right">
            <span className="ds-badge">Free</span>
            <button
              className="ds-theme-btn"
              onClick={() => setTheme(t => t === "light" ? "dark" : "light")}
            >
              {theme === "light" ? "Dark" : "Light"}
            </button>
          </div>
        </nav>

        {/* HERO */}
        <div className="ds-hero">
          <div className="ds-hero-badge">
            <span className="ds-hero-dot" />
            Free & open source
          </div>
          <h1 className="ds-h1">
            Stop guessing.<br />
            Start <span>scoring</span>.
          </h1>
          <p className="ds-sub">
            I built DocuSieve so that there can be more transparency on how an ATS filter reads your resume.
          </p>
          <div className="ds-cta-row">
            <button className="ds-cta-main"
              onClick={() => {
              if (result) {
                setResult(null);
                setError(null);
                setResumeFile(null);
                setJobDescription("");
                setCooldown(0);
              } else {
                fileInputRef.current?.click();
              }
            }}
                >
            {result ? "New analysis" : "Upload resume"}
            </button>
            <span className="ds-cta-note">No sign-up needed</span>
          </div>
        </div>

        {/* BODY */}
        <div className="ds-body">
          {/* LEFT — INPUT */}
          <div className="ds-left">
            {!result && (
              <form onSubmit={handleSubmit}>
                <p className="ds-section-label">01 — Your resume</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  style={{ display: "none" }}
                  onChange={handleResumeUpload}
                />
                {!resumeFile ? (
                  <div className="ds-dropzone" onClick={() => fileInputRef.current?.click()}>
                    <div className="ds-drop-icon">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="12" y1="18" x2="12" y2="12"/>
                        <line x1="9" y1="15" x2="15" y2="15"/>
                      </svg>
                    </div>
                    <p className="ds-drop-title">Drop your PDF here</p>
                    <p className="ds-drop-sub">or click to browse</p>
                  </div>
                ) : (
                  <div className="ds-file-ready" onClick={() => fileInputRef.current?.click()}>
                    <div className="ds-file-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <div>
                      <p className="ds-file-name">{resumeFile.name}</p>
                      <p className="ds-file-size">{(resumeFile.size / 1024).toFixed(1)} KB · ready</p>
                    </div>
                    <span className="ds-replace">Replace</span>
                  </div>
                )}

                <p className="ds-section-label">02 — Job description</p>
                <textarea
                  className="ds-textarea"
                  placeholder="Paste the full job description here..."
                  value={jobDescription}
                  onChange={e => setJobDescription(e.target.value)}
                />

                {error && <p className="ds-error">{error}</p>}

                <button type="submit" disabled={loading} className="ds-submit">
                  {loading ? "Analyzing..." : "Analyze"}
                </button>

                {loading && (
                  <div className="ds-loading">
                    <div className="ds-dots"><span/><span/><span/></div>
                    <span className="ds-loading-text">Running analysis — this may take a moment</span>
                  </div>
                )}
              </form>
            )}

            {result && !loading && (
              <div className="fade-in">
                <p className="ds-section-label">Analysis complete</p>
                <p style={{ fontSize: "13px", color: "var(--text2)", marginBottom: "16px", lineHeight: "1.6" }}>
                  Scored against {result.analysis.jd_vocab_size} JD tokens from{" "}
                  <strong style={{ color: "var(--text)" }}>{resumeFile?.name}</strong>.
                </p>

                {/* CHIPS */}
                <div className="ds-chips-section">
                  {phraseHits.length > 0 && (
                    <>
                      <p className="ds-section-label" style={{ marginBottom: "8px" }}>
                        Matched ({phraseHits.length})
                      </p>
                      <div className="ds-chips">
                        {phraseHits.slice(0, 12).map(p => (
                          <span key={p} className="ds-chip-hit">{p}</span>
                        ))}
                      </div>
                    </>
                  )}
                  {semanticHits.length > 0 && (
                    <>
                    <p className = "ds-section-label" style={{marginBottom: "8px"}}>
                      Implied ({semanticHits.length})
                    </p>
                    <div className = "ds-chips">
                      {semanticHits.slice(0,10).map(p => (
                        <span key={p} className="ds-chip-semantic">{p}</span>
                      ))}
                    </div>
                    </>
                  )
                  }
                  {phraseMisses.filter(p => !semanticHits.includes(p)).length > 0 && (
                    <>
                        <p className="ds-section-label" style={{ marginBottom: "8px" }}>
                          Missing ({phraseMisses.filter(p => !semanticHits.includes(p)).length})
                        </p>
                        <div className="ds-chips">
                          {phraseMisses.filter(p => !semanticHits.includes(p)).slice(0, 10).map(p => (
                            <span key={p} className="ds-chip-miss">{p}</span>
                        ))}
                      </div>
                    </>
                  )}
                  {overlapExamples.length > 0 && (
                    <>
                      <p className="ds-section-label" style={{ marginBottom: "8px" }}>
                        Keyword overlap
                      </p>
                      <div className="ds-chips">
                        {overlapExamples.slice(0, 16).map(w => (
                          <span key={w} className="ds-chip-hit">{w}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* LLM FEEDBACK */}
                <div className="ds-feedback">
                  <p className="ds-section-label" style={{ marginBottom: "12px" }}>AI feedback</p>
                  {result.llm_feedback === "[LLM ERROR] RATE_LIMIT" ? (
                    <div className="ds-cooldown">
                      <div className="ds-dots"><span/><span/><span/></div>
                      <p className="ds-cooldown-text">AI is cooling down — try again shortly</p>
                      {cooldown > 0 && (
                        <p className="ds-cooldown-timer">{cooldown}s</p>
                      )}
                    </div>
                  ) : result.llm_feedback.startsWith("[LLM ERROR]") ? (
                    <p className="ds-error-feedback">
                      AI feedback unavailable. Your score above is still accurate.
                    </p>
                  ) : (
                    <pre className="ds-feedback-inner">{result.llm_feedback}</pre>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — SCORE PANEL */}
          <div className="ds-right">
            <p className="ds-section-label">Score</p>
            {!result ? (
              <div style={{ paddingTop: "40px", textAlign: "center" }}>
                <p style={{ fontSize: "13px", color: "var(--text3)", fontFamily: "var(--mono)", lineHeight: "1.7" }}>
                  Upload a resume and paste a job description to see your score here.
                </p>
              </div>
            ) : (
              <div className="fade-in">
                <div className="ds-score-block">
                  <p className="ds-score-num" style={{ color: scoreColor }}>
                    {finalScore.toFixed(1)}
                  </p>
                  <p className="ds-score-label">overall match score</p>
                </div>

                <div className="ds-bar-row">
                  <div className="ds-bar-top">
                    <span className="ds-bar-name">keyword overlap</span>
                    <span className="ds-bar-pct">{keywordScore.toFixed(1)}%</span>
                  </div>
                  <div className="ds-track">
                    <div className="ds-fill" style={{ width: `${Math.min(keywordScore, 100)}%` }} />
                  </div>
                </div>

                {phraseScore > 0 && (
                  <div className="ds-bar-row">
                    <div className="ds-bar-top">
                      <span className="ds-bar-name">phrase match</span>
                      <span className="ds-bar-pct">{phraseScore.toFixed(1)}%</span>
                    </div>
                    <div className="ds-track">
                      <div className="ds-fill-dim" style={{ width: `${Math.min(phraseScore, 100)}%` }} />
                    </div>
                  </div>
                )}

                <div className="ds-bar-row" style={{ marginTop: "14px", paddingTop: "14px", borderTop: "0.5px solid var(--border)" }}>
                  <div className="ds-bar-top">
                    <span className="ds-bar-name" style={{ color: "var(--text)", fontWeight: 500 }}>combined</span>
                    <span className="ds-bar-pct" style={{ color: scoreColor }}>{finalScore.toFixed(1)}%</span>
                  </div>
                  <div className="ds-track" style={{ height: "5px" }}>
                    <div className="ds-fill" style={{ width: `${Math.min(finalScore, 100)}%`, background: scoreColor }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        {result && (
          <div className="ds-footer fade-in">
            <span className="ds-foot-note">scores are % coverage · not grades · low does not mean bad</span>
            <button
              className="ds-rerun"
              onClick={() => { setResult(null); setError(null); setResumeFile(null); setJobDescription(""); setCooldown(0); }}
            >
              New analysis
            </button>
          </div>
        )}
      </div>
    </>
  );
}

