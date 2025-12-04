
"use client";
/*import Image from "next/image";*/
import React, { useState } from "react";

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
      {/* Resume Upload Section */}
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

      {/* Job Description */}
      <div>
        <label className="block mb-1 font-medium">Job Description</label>
        <textarea
          className="w-full border rounded-md p-2 min-h-[150px]"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />
      </div>

      {/* Submit Button */}
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

      {/* Error */}
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
