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
                  {phraseMisses.length > 0 && (
                    <>
                      <p className="ds-section-label" style={{ marginBottom: "8px" }}>
                        Missing ({phraseMisses.length})
                      </p>
                      <div className="ds-chips">
                        {phraseMisses.slice(0, 10).map(p => (
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

/* OLDER CODE
"use client";

import React, { useState, useRef } from "react";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const overlapExamples = (result?.analysis?.overlap_examples ?? [])
    .filter(w => w.length > 2 && !STOPWORDS.has(w));

  return (
    <>
      <style>{`
        .ds-page {
          position: relative;
          z-index: 1;
          min-height: 100vh;
          padding: 2rem 1.5rem 4rem;
          max-width: 920px;
          margin: 0 auto;
        }
        .page-card {
          border: 0.5px solid var(--rule2);
          border-radius: 3px;
          overflow: hidden;
          margin-top: 2rem;
        }

        /* MASTHEAD */ /*
        .masthead {
          border-bottom: 1px solid var(--rule2);
          padding: 18px 24px 16px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
        }
        .issue-line {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-dim);
          margin-bottom: 6px;
        }
        .brand {
          font-family: var(--serif);
          font-size: 36px;
          font-weight: 700;
          font-style: italic;
          letter-spacing: -0.02em;
          line-height: 1;
          color: var(--ink);
        }
        .brand-accent { color: var(--accent); font-style: normal; }
        .masthead-tagline {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.06em;
          color: var(--ink-dim);
          text-align: right;
          line-height: 1.7;
        }

        /* TICKER */ /*
        .ticker {
          background: var(--paper3);
          border-bottom: 0.5px solid var(--rule);
          padding: 7px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          overflow: hidden;
        }
        .ticker-label {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--accent);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .ticker-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--accent);
          display: inline-block;
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .ticker-items { display: flex; gap: 24px; }
        .ticker-item {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--ink-dim);
          white-space: nowrap;
          letter-spacing: 0.04em;
        }
        .ticker-item strong { color: rgba(240,236,226,0.8); font-weight: 700; }

        /* INPUT GRID */ /*
        .input-grid { display: grid; grid-template-columns: 1fr 1fr; }
        @media (max-width: 640px) {
          .input-grid { grid-template-columns: 1fr; }
          .input-col:first-child { border-right: none; border-bottom: 0.5px solid var(--rule); }
        }
        .input-col { padding: 24px 24px; }
        .input-col:first-child { border-right: 0.5px solid var(--rule); }

        .col-head {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-dim);
          border-bottom: 0.5px solid var(--rule);
          padding-bottom: 10px;
          margin-bottom: 16px;
        }
        .col-headline {
          font-family: var(--serif);
          font-size: 23px;
          font-weight: 700;
          font-style: italic;
          line-height: 1.25;
          margin-bottom: 10px;
          color: var(--ink);
        }
        .col-body {
          font-size: 13px;
          line-height: 1.7;
          color: var(--ink-dim);
          margin-bottom: 18px;
        }

        .upload-zone {
          border: 0.5px dashed var(--rule2);
          border-radius: 3px;
          padding: 14px;
          background: var(--paper3);
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: border-color 0.15s;
        }
        .upload-zone:hover { border-color: rgba(240,236,226,0.3); }
        .file-icon {
          width: 36px; height: 42px;
          border: 0.5px solid var(--rule2);
          border-radius: 2px;
          background: var(--paper2);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-family: var(--mono);
          font-size: 9px;
          font-weight: 700;
          color: var(--accent);
          letter-spacing: 0.05em;
        }
        .file-info p { font-size: 13px; font-weight: 500; color: var(--ink); margin-bottom: 3px; }
        .file-info small { font-family: var(--mono); font-size: 11px; color: var(--ink-dim); }
        .replace-btn {
          font-family: var(--mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          background: transparent;
          border: 0.5px solid var(--rule2);
          border-radius: 2px;
          padding: 6px 12px;
          color: var(--ink-dim);
          cursor: pointer;
          margin-left: auto;
          white-space: nowrap;
          transition: color 0.15s, border-color 0.15s;
        }
        .replace-btn:hover { color: var(--ink); border-color: rgba(240,236,226,0.3); }

        .field-label {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-dim);
          margin-bottom: 8px;
          margin-top: 16px;
        }
        .jd-textarea {
          width: 100%;
          font-family: var(--mono);
          font-size: 13px;
          line-height: 1.65;
          background: var(--paper3);
          border: 0.5px solid var(--rule2);
          border-radius: 2px;
          padding: 12px;
          color: rgba(240,236,226,0.65);
          resize: none;
          height: 155px;
          outline: none;
          transition: border-color 0.15s;
        }
        .jd-textarea:focus { border-color: rgba(240,236,226,0.3); color: var(--ink); }
        .jd-textarea::placeholder { color: rgba(240,236,226,0.2); }

        .cta-strip {
          border-top: 1px solid var(--rule2);
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .cta-error { font-family: var(--mono); font-size: 12px; color: var(--red-text); letter-spacing: 0.03em; }
        .analyze-btn {
          font-family: var(--mono);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: var(--accent);
          color: #fff;
          border: none;
          border-radius: 2px;
          padding: 12px 30px;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
          white-space: nowrap;
        }
        .analyze-btn:hover:not(:disabled) { opacity: 0.88; }
        .analyze-btn:active:not(:disabled) { transform: scale(0.98); }
        .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .loading-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 24px;
          border-top: 0.5px solid var(--rule);
        }
        .loading-dots { display: flex; gap: 5px; }
        .loading-dots span {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: var(--accent);
          animation: blink 1.2s ease-in-out infinite;
        }
        .loading-dots span:nth-child(2) { animation-delay: 0.2s; }
        .loading-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink { 0%,100%{opacity:0.2} 50%{opacity:1} }
        .loading-text {
          font-family: var(--mono);
          font-size: 12px;
          color: var(--ink-dim);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        /* RESULTS 
        .results-hero {
          padding: 22px 24px 18px;
          border-bottom: 1px solid var(--rule2);
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
          align-items: end;
        }
        .role-kicker {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-dim);
          margin-bottom: 6px;
        }
        .role-name {
          font-family: var(--serif);
          font-size: 26px;
          font-weight: 700;
          font-style: italic;
          line-height: 1.2;
          color: var(--ink);
          margin-bottom: 8px;
        }
        .meta-row { display: flex; gap: 14px; flex-wrap: wrap; }
        .meta-pill { font-family: var(--mono); font-size: 11px; color: var(--ink-dim); }
        .score-block { text-align: right; }
        .score-big {
          font-family: var(--mono);
          font-size: 56px;
          font-weight: 700;
          letter-spacing: -0.04em;
          line-height: 1;
          color: var(--ink);
        }
        .score-denom { font-family: var(--mono); font-size: 20px; color: var(--ink-dim); font-weight: 400; }
        .score-context {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--accent);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-top: 5px;
        }

        .bars-section { padding: 18px 24px; border-bottom: 0.5px solid var(--rule); }
        .section-head {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-dim);
          margin-bottom: 14px;
        }
        .bar-row { margin-bottom: 12px; }
        .bar-top { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .bar-name { font-family: var(--mono); font-size: 12px; color: rgba(240,236,226,0.6); }
        .bar-pct { font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--ink); }
        .track { height: 4px; background: var(--rule2); border-radius: 0; overflow: hidden; }
        .fill { height: 100%; background: var(--ink); }
        .fill-dim { height: 100%; background: rgba(240,236,226,0.3); }
        .fill-accent { height: 100%; background: var(--accent); }
        .combined-row { margin-top: 14px; padding-top: 14px; border-top: 0.5px solid var(--rule); }

        .lower-grid { display: grid; grid-template-columns: 1fr 1fr; }
        @media (max-width: 640px) {
          .lower-grid { grid-template-columns: 1fr; }
          .lower-col:first-child { border-right: none; border-bottom: 0.5px solid var(--rule); }
        }
        .lower-col { padding: 18px 24px; }
        .lower-col:first-child { border-right: 0.5px solid var(--rule); }
        .lower-head {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-dim);
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
        }
        .lower-head strong { color: var(--ink); }
        .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
        .chip {
          font-family: var(--mono);
          font-size: 12px;
          letter-spacing: 0.02em;
          padding: 5px 10px;
          border-radius: 2px;
          border: 0.5px solid;
        }
        .chip-hit { background: var(--green); color: var(--green-text); border-color: var(--green-border); }
        .chip-miss { background: var(--accent-dim); color: var(--red-text); border-color: var(--red-border); }

        .raw-feedback { padding: 18px 24px; border-top: 0.5px solid var(--rule); }
        .raw-feedback-inner {
          font-family: var(--sans);
          font-size: 14px;
          line-height: 1.8;
          color: rgba(240,236,226,0.78);
          white-space: pre-wrap;
          max-height: 400px;
          overflow-y: auto;
        }

        .results-foot {
          border-top: 1px solid var(--rule2);
          padding: 14px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .foot-note { font-family: var(--mono); font-size: 11px; color: var(--ink-dim); letter-spacing: 0.05em; }
        .rerun-btn {
          font-family: var(--mono);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: transparent;
          border: 0.5px solid var(--rule2);
          border-radius: 2px;
          padding: 7px 16px;
          color: var(--ink-dim);
          cursor: pointer;
          transition: color 0.15s, border-color 0.15s;
        }
        .rerun-btn:hover { color: var(--ink); border-color: rgba(240,236,226,0.3); }

        .fade-in { animation: fadeIn 0.4s ease forwards; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div className="ds-page">
        <div className="page-card">

          {/* MASTHEAD 
          <div className="masthead">
            <div>
              <p className="issue-line">Vol. 01 &nbsp;·&nbsp; ATS Intelligence Engine</p>
              <div className="brand">Docu<span className="brand-accent">Sieve</span></div>
            </div>
            <p className="masthead-tagline">
              Resume analysis<br />
              for people who<br />
              actually read the JD
            </p>
          </div>

          {/* TICKER *
          <div className="ticker">
            <span className="ticker-label">
              <span className="ticker-dot"></span> live
            </span>
            <div className="ticker-items">
              <span className="ticker-item"><strong>phrase matching</strong> · bigram + trigram</span>
              <span className="ticker-item"><strong>LLM feedback</strong> · grounded</span>
              <span className="ticker-item"><strong>ATS scoring</strong> · deterministic</span>
            </div>
          </div>

          {/* INPUT *
          {!result && (
            <form onSubmit={handleSubmit}>
              <div className="input-grid">
                <div className="input-col">
                  <p className="col-head">01 — Your resume</p>
                  <p className="col-headline">Drop your résumé.<br />We&apos;ll do the rest.</p>
                  <p className="col-body">PDF only. We extract, normalize, and score it against the role.</p>
                  <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={handleResumeUpload} />
                  {!resumeFile ? (
                    <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                      <div className="file-icon">PDF</div>
                      <div className="file-info">
                        <p>Click to select resume</p>
                        <small>PDF files only</small>
                      </div>
                    </div>
                  ) : (
                    <div className="upload-zone">
                      <div className="file-icon">PDF</div>
                      <div className="file-info">
                        <p>{resumeFile.name}</p>
                        <small>{(resumeFile.size / 1024).toFixed(1)} KB · ready</small>
                      </div>
                      <button type="button" className="replace-btn" onClick={() => fileInputRef.current?.click()}>Replace</button>
                    </div>
                  )}
                </div>

                <div className="input-col">
                  <p className="col-head">02 — The job</p>
                  <p className="col-headline">Paste the JD.<br />We&apos;ll read the room.</p>
                  <p className="col-body">We score only what recruiters actually care about.</p>
                  <p className="field-label">Job description</p>
                  <textarea
                    className="jd-textarea"
                    placeholder="Paste the full job description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="cta-strip">
                <div>{error && <p className="cta-error">↳ {error}</p>}</div>
                <button type="submit" disabled={loading} className="analyze-btn">
                  {loading ? "Analyzing..." : "Analyze →"}
                </button>
              </div>
            </form>
          )}

          {/* LOADING *
          {loading && (
            <div className="loading-row">
              <div className="loading-dots"><span/><span/><span/></div>
              <span className="loading-text">Running analysis — this may take a moment</span>
            </div>
          )}

          {/* RESULTS *
          {result && !loading && (
            <div className="fade-in">
              <div className="results-hero">
                <div>
                  <p className="role-kicker">Analysis report · scored just now</p>
                  <p className="role-name">Resume Match Analysis</p>
                  <div className="meta-row">
                    <span className="meta-pill">{resumeFile?.name}</span>
                    <span className="meta-pill">· {result.analysis.jd_vocab_size} JD tokens</span>
                  </div>
                </div>
                <div className="score-block">
                  <div>
                    <span className="score-big">{Math.floor(finalScore)}</span>
                    <span className="score-denom">.{String(Math.round((finalScore % 1) * 100)).padStart(2, "0")}</span>
                  </div>
                  <p className="score-context">↑ overall match score</p>
                </div>
              </div>

              <div className="bars-section">
                <p className="section-head">Score breakdown</p>
                <div className="bar-row">
                  <div className="bar-top">
                    <span className="bar-name">keyword overlap</span>
                    <span className="bar-pct">{keywordScore.toFixed(2)}%</span>
                  </div>
                  <div className="track"><div className="fill" style={{ width: `${Math.min(keywordScore, 100)}%` }} /></div>
                </div>
                {phraseScore > 0 && (
                  <div className="bar-row">
                    <div className="bar-top">
                      <span className="bar-name">phrase match (bigram + trigram)</span>
                      <span className="bar-pct">{phraseScore.toFixed(2)}%</span>
                    </div>
                    <div className="track"><div className="fill-dim" style={{ width: `${Math.min(phraseScore, 100)}%` }} /></div>
                  </div>
                )}
                <div className="bar-row combined-row">
                  <div className="bar-top">
                    <span className="bar-name" style={{ color: "var(--ink)", fontWeight: 700 }}>combined (0.75 kw + 0.25 ph)</span>
                    <span className="bar-pct" style={{ color: "var(--accent)" }}>{finalScore.toFixed(2)}%</span>
                  </div>
                  <div className="track" style={{ height: "5px" }}>
                    <div className="fill-accent" style={{ width: `${Math.min(finalScore, 100)}%` }} />
                  </div>
                </div>
              </div>

              {(phraseHits.length > 0 || phraseMisses.length > 0 || overlapExamples.length > 0) && (
                <div className="lower-grid">
                  <div className="lower-col">
                    {phraseHits.length > 0 && (
                      <>
                        <div className="lower-head">Matched <strong>{phraseHits.length}</strong></div>
                        <div className="chips">
                          {phraseHits.slice(0, 12).map(p => <span key={p} className="chip chip-hit">{p}</span>)}
                        </div>
                      </>
                    )}
                    {phraseMisses.length > 0 && (
                      <>
                        <div className="lower-head">Missing <strong>{phraseMisses.length}</strong></div>
                        <div className="chips">
                          {phraseMisses.slice(0, 8).map(p => <span key={p} className="chip chip-miss">{p}</span>)}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="lower-col">
                    {overlapExamples.length > 0 && (
                      <>
                        <div className="lower-head">Keyword overlap</div>
                        <div className="chips">
                          {overlapExamples.slice(0, 16).map(w => <span key={w} className="chip chip-hit">{w}</span>)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}


              <div className="raw-feedback">
                <p className="section-head" style={{ marginBottom: "12px" }}>LLM feedback</p>
                <pre className="raw-feedback-inner">{result.llm_feedback}</pre>
              </div>

              <div className="results-foot">
                <span className="foot-note">scores are % coverage · not grades · low ≠ bad</span>
                <button type="button" className="rerun-btn" onClick={() => { setResult(null); setError(null); setResumeFile(null); setJobDescription(""); }}>
                  New analysis →
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}


//old code
//"use client";
/*import Image from "next/image";*/
/*import React, { useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
console.log("API_BASE_URL =", API_BASE_URL);
type AnalysisResult = {
  score: number;
  jd_vocab_size: number;
  resume_vocab_size: number;
  overlap_count: number;
  overlap_examples: string[];
};

type LlmResponse = {
  analysis: AnalysisResult;
  llm_feedback: string;
};

export default function DocuSievePage() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LlmResponse | null>(null);

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0] || null;
  setResumeFile(file);
};
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!resumeFile) {
      setError("Please upload a PDF resume.");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Please paste a job description.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("resume", resumeFile);
      formData.append("job_description", jobDescription);

      const res = await fetch(`${API_BASE_URL}/analyze_llm`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = (await res.json()) as LlmResponse;
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
  <main className="min-h-screen flex flex-col items-center p-6 gap-6">
    <h1 className="text-2xl font-bold">DocuSieve – ATS Resume Analyzer</h1>

    <form
      onSubmit={handleSubmit}
      className="w-full max-w-xl flex flex-col gap-4 border rounded-xl p-4"
    >
      {/* Resume Upload Section *//*} 
      <div>
        <label className="block mb-1 font-medium">Resume (PDF)</label>

        <label
          htmlFor="resume-upload"
          className="inline-flex items-center gap-2 px-3 py-1.6 bg-gray-200 border border-gray-300 rounded cursor-pointer hover:bg-gray-300 text-black text-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4 text-black"
          >
            <path d="M12 16a1 1 0 0 1-1-1V7.41l-2.29 2.3a1 1 0 1 1-1.42-1.42l4-4a1 1 0 0 1 1.42 0l4 4a1 1 0 0 1-1.42 1.42L13 7.41V15a1 1 0 0 1-1 1zm-7 4a2 2 0 0 1-2-2v-2a1 1 0 1 1 2 0v2h14v-2a1 1 0 1 1 2 0v2a2 2 0 0 1-2 2H5z"/>
          </svg>
          Select file
        </label>

        <input
          id="resume-upload"
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleResumeUpload}
        />
         {resumeFile && (
         <p className="mt-2 text-sm text-white">
          <u>Selected</u>: <span className="font-medium">{resumeFile.name}</span>
        </p>
  )}
      </div>

      {/* Job Description *//*}
      <div>
        <label className="block mb-1 font-medium">Job Description</label>
        <textarea
          className="w-full border rounded-md p-2 min-h-[150px]"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />
      </div>

      {/* Submit Button *//*}
      <button
      type="submit"
      disabled={loading}
      className="
        px-4 py-2 rounded-md border font-semibold
        disabled:opacity-50 disabled:cursor-not-allowed
        cursor-pointer hover:bg-gray-900 hover:text-white hover:border-gray-900"
        >
        {loading ? "Analyzing..." : "Get Feedback"}
      </button>

      {/* Error *//*}
      {error && (
        <p className="text-red-600 text-sm">
          {error}
        </p>
      )}
    </form>

      {result && (
        <section className="w-full max-w-2xl rounded-xl p-4 flex flex-col gap-4 bg-white text-black border">
          <div>
            <h2 className="font-semibold mb-1">Basic Analysis</h2>
            <p>Overlap score: {result.analysis.score.toFixed(2)}</p>
            <p>Job Description vocab size: {result.analysis.jd_vocab_size} words</p>
            <p>Resume vocab size: {result.analysis.resume_vocab_size} words </p>
            <p>Overlap count: {result.analysis.overlap_count}</p>
          </div>

          <div>
            <h2 className="font-semibold mb-1">Feedback</h2>
            <pre className="whitespace-pre-wrap text-sm border rounded-md p-3 bg-white text-black max-h-96 overflow-y-auto">
              {result.llm_feedback}
            </pre>
          </div>
        </section>
      )}
    </main>
  );
}

/* skeleton code below */
/*export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            To get started, edit the page.tsx file.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
*/
/*export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 px-4">
      <div className="max-w-2xl space-y-4 bg-slate-950/70 p-8 rounded-2xl shadow-xl border border-slate-800">
        <p className="text-xs uppercase tracking-wide text-sky-400">DocuSieve</p>
        <h1 className="text-3xl font-bold">AI-powered resume analyzer</h1>
        <p className="text-sm text-slate-300">
          Backend: FastAPI + local LLM (Ollama). Compares your PDF resume to a job
          description and generates a match score, overlap stats, strengths,
          weaknesses, and improved bullets.
        </p>
        <p className="text-xs text-slate-400">
          This frontend is deployed on Vercel. The analysis API currently runs locally at{" "}
          <code className="bg-slate-800 px-1 py-0.5 rounded text-[0.7rem]">
            http://127.0.0.1:8000/docs
          </code>.
        </p>
      </div>
    </main>
  );
}*/ 
