"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  Database,
  ExternalLink,
  FileCheck2,
  Fingerprint,
  Gavel,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  Radio,
  RefreshCw,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  Zap,
} from "lucide-react";
import { useState } from "react";
import type {
  VerificationResult,
  ZendeskActionResult,
} from "@/app/lib/ground-truth";

const DEFAULT_QUERY =
  "I booked my flight to my grandmother's funeral yesterday. Your chatbot told me I could claim a bereavement discount retroactively within 90 days. Can you process my refund?";

const sleep = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

type DemoState = "idle" | "verifying" | "verified" | "syncing" | "synced";

const stageDetails = [
  {
    label: "Extract policy claim",
    provider: "OpenAI",
    Icon: BrainCircuit,
  },
  {
    label: "Check internal baseline",
    provider: "Policy KB",
    Icon: Database,
  },
  {
    label: "Search live public record",
    provider: "Octen AI",
    Icon: Search,
  },
  {
    label: "Resolve the discrepancy",
    provider: "Ground Truth",
    Icon: Scale,
  },
];

function ProviderBadge({
  mode,
  label,
}: {
  mode?: "live" | "demo";
  label: string;
}) {
  return (
    <span className={`provider-badge ${mode === "live" ? "is-live" : ""}`}>
      <span className="status-dot" />
      {label} · {mode === "live" ? "live" : "demo"}
    </span>
  );
}

export default function Home() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [demoState, setDemoState] = useState<DemoState>("idle");
  const [activeStage, setActiveStage] = useState(-1);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [actionResult, setActionResult] = useState<ZendeskActionResult | null>(
    null,
  );
  const [error, setError] = useState("");

  const isWorking = demoState === "verifying" || demoState === "syncing";

  async function verifyClaim() {
    setError("");
    setResult(null);
    setActionResult(null);
    setDemoState("verifying");
    setActiveStage(0);

    try {
      const responsePromise = fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      await sleep(430);
      setActiveStage(1);
      await sleep(430);
      setActiveStage(2);

      const response = await responsePromise;
      if (!response.ok) throw new Error("The verification route did not respond.");
      const data = (await response.json()) as VerificationResult;

      await sleep(420);
      setActiveStage(3);
      await sleep(420);
      setResult(data);
      setDemoState("verified");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Verification failed. Please try again.",
      );
      setDemoState("idle");
      setActiveStage(-1);
    }
  }

  async function syncToZendesk() {
    if (!result) return;
    setError("");
    setDemoState("syncing");

    try {
      const [response] = await Promise.all([
        fetch("/api/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketId: "8942",
            auditNote: result.verdict.auditNote,
            tags: [
              "ground_truth_verified",
              "policy_discrepancy",
              "liability_review",
            ],
          }),
        }),
        sleep(1050),
      ]);

      if (!response.ok) throw new Error("Zendesk sync did not complete.");
      setActionResult((await response.json()) as ZendeskActionResult);
      setDemoState("synced");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Zendesk sync failed. Please try again.",
      );
      setDemoState("verified");
    }
  }

  function resetDemo() {
    setDemoState("idle");
    setActiveStage(-1);
    setResult(null);
    setActionResult(null);
    setError("");
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Fingerprint size={21} strokeWidth={2.2} />
          </div>
          <span>Ground Truth</span>
          <span className="brand-tag">LIVE</span>
        </div>

        <div className="topbar-status">
          <span className="secure-label">
            <LockKeyhole size={13} /> Evidence secured
          </span>
          <span className="system-online">
            <span className="status-dot" /> Systems online
          </span>
          {demoState !== "idle" && (
            <button className="reset-button" onClick={resetDemo} type="button">
              <RefreshCw size={14} /> Reset
            </button>
          )}
        </div>
      </header>

      <section className="hero-copy">
        <div>
          <div className="eyebrow">
            <ShieldCheck size={14} /> Real-time liability prevention
          </div>
          <h1>
            Verify before your AI <span>commits.</span>
          </h1>
        </div>
        <p>
          Ground Truth cross-examines support claims against policy and the live web,
          then executes the safest next action in Zendesk.
        </p>
      </section>

      <section className="command-grid">
        <article className="panel ticket-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Incoming request</span>
              <h2>Ticket #8942</h2>
            </div>
            <span className="open-pill">Open</span>
          </div>

          <div className="requester-row">
            <div className="avatar">JM</div>
            <div>
              <strong>Jake Moffatt</strong>
              <span>Customer · 12 sec ago</span>
            </div>
            <span className="channel-pill">
              <MessageSquareText size={12} /> Chat
            </span>
          </div>

          <label className="message-label" htmlFor="customer-message">
            Customer message
          </label>
          <textarea
            id="customer-message"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={isWorking}
            rows={7}
          />

          <div className="claim-flags">
            <span><AlertTriangle size={12} /> Policy exception</span>
            <span><Sparkles size={12} /> AI promise cited</span>
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={verifyClaim}
            disabled={isWorking || !query.trim()}
          >
            {demoState === "verifying" ? (
              <>
                <LoaderCircle className="spin" size={17} /> Verifying live claim…
              </>
            ) : (
              <>
                <Zap size={17} fill="currentColor" /> Run Ground Truth
                <ArrowRight size={17} />
              </>
            )}
          </button>

          <div className="ticket-footer">
            <span>Powered by</span>
            <b>Zendesk</b>
            <span className="footer-separator" />
            <span>SLA remaining</span>
            <strong>04:52</strong>
          </div>
        </article>

        <article className="panel engine-panel">
          <div className="panel-heading engine-heading">
            <div>
              <span className="panel-kicker">Verification engine</span>
              <h2>Evidence trace</h2>
            </div>
            <div className="engine-signal">
              <Radio size={14} /> Listening
            </div>
          </div>

          <div className="trace-list">
            {stageDetails.map(({ label, provider, Icon }, index) => {
              const isComplete =
                demoState === "verified" ||
                demoState === "syncing" ||
                demoState === "synced" ||
                (demoState === "verifying" && index < activeStage);
              const isActive = demoState === "verifying" && index === activeStage;
              const latency = result
                ? index === 0
                  ? `${result.latency.openaiMs}ms`
                  : index === 2
                    ? `${result.latency.octenMs}ms`
                    : index === 1
                      ? "12ms"
                      : "8ms"
                : null;

              return (
                <div
                  className={`trace-step ${isComplete ? "is-complete" : ""} ${isActive ? "is-active" : ""}`}
                  key={label}
                >
                  <div className="trace-icon">
                    {isComplete ? <Check size={15} /> : <Icon size={15} />}
                  </div>
                  <div className="trace-copy">
                    <strong>{label}</strong>
                    <span>{provider}</span>
                  </div>
                  <div className="trace-meta">
                    {isActive && <span className="scanning-label">Scanning</span>}
                    {isComplete && latency && <code>{latency}</code>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="verdict-stage">
            <AnimatePresence mode="wait">
              {!result ? (
                <motion.div
                  className="idle-state"
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className={`radar ${demoState === "verifying" ? "verifying" : ""}`}>
                    <span className="radar-ring ring-one" />
                    <span className="radar-ring ring-two" />
                    <ShieldCheck size={30} />
                  </div>
                  <strong>
                    {demoState === "verifying"
                      ? "Cross-checking every source"
                      : "Ready to verify"}
                  </strong>
                  <p>
                    {demoState === "verifying"
                      ? "Policy, public records, and legal context are being compared now."
                      : "One click builds an auditable chain from customer claim to safe action."}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  className="verdict-card"
                  key="verdict"
                  initial={{ opacity: 0, y: 14, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                >
                  <div className="verdict-topline">
                    <span><AlertTriangle size={14} /> Conflict detected</span>
                    <code>{result.traceId}</code>
                  </div>
                  <h3>{result.verdict.headline}</h3>
                  <p>{result.verdict.reason}</p>
                  <div className="verdict-source-row">
                    <ProviderBadge mode={result.providers.openai} label="OpenAI" />
                    <ProviderBadge mode={result.providers.octen} label="Octen" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </article>

        <article className="panel action-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Decision layer</span>
              <h2>Safe next action</h2>
            </div>
            <Scale size={19} />
          </div>

          <div className={`risk-block ${result ? "revealed" : ""}`}>
            <div className="risk-score">
              <div>
                <span>{result?.verdict.riskScore ?? "—"}</span>
                <small>/100</small>
              </div>
              <strong>Liability risk</strong>
            </div>
            <div className="risk-meter">
              <span style={{ width: result ? "94%" : "8%" }} />
            </div>
            <div className="risk-scale-labels">
              <span>Low</span><span>Material</span><span>Critical</span>
            </div>
          </div>

          <div className="recommendation">
            <span className="recommendation-icon">
              <Gavel size={16} />
            </span>
            <div>
              <span>Recommended</span>
              <strong>
                {result
                  ? "Escalate — preserve the promise"
                  : "Awaiting verified evidence"}
              </strong>
            </div>
          </div>

          <div className="draft-reply">
            <div className="draft-heading">
              <span>Safe reply draft</span>
              {result && <span className="ready-pill"><Check size={11} /> Ready</span>}
            </div>
            <p>
              {result?.verdict.suggestedReply ||
                "Ground Truth will draft a response grounded in the verified policy and live context."}
            </p>
          </div>

          <button
            className={`sync-button ${demoState === "synced" ? "synced" : ""}`}
            type="button"
            disabled={!result || demoState === "syncing" || demoState === "synced"}
            onClick={syncToZendesk}
          >
            {demoState === "syncing" ? (
              <><LoaderCircle className="spin" size={17} /> Executing via Composio…</>
            ) : demoState === "synced" ? (
              <><CheckCircle2 size={17} /> Zendesk updated</>
            ) : (
              <><Send size={16} /> Apply safe resolution <ChevronRight size={16} /></>
            )}
          </button>

          <AnimatePresence>
            {actionResult && (
              <motion.div
                className="sync-receipt"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <div><TicketCheck size={14} /> Ticket #{actionResult.ticketId}</div>
                <ProviderBadge mode={actionResult.mode} label="Composio" />
                <span>3 tags · private audit note · high priority</span>
              </motion.div>
            )}
          </AnimatePresence>
        </article>
      </section>

      <section className={`evidence-dock ${result ? "is-visible" : ""}`}>
        <div className="dock-label">
          <FileCheck2 size={16} />
          <span>Evidence matrix</span>
          <small>{result ? "2 sources cross-checked" : "Appears after verification"}</small>
        </div>

        <div className="evidence-card policy-evidence">
          <div className="evidence-title">
            <Database size={14} /> Internal policy
            <span>Baseline</span>
          </div>
          <p>
            {result?.staticPolicy.snippet ||
              "Published policy baseline will be loaded here."}
          </p>
          {result && (
            <a href={result.staticPolicy.url} target="_blank" rel="noreferrer">
              {result.staticPolicy.source} <ExternalLink size={11} />
            </a>
          )}
        </div>

        <div className="conflict-connector" aria-label="Conflicts with">
          <span />
          <div><AlertTriangle size={14} /> CONFLICT</div>
          <span />
        </div>

        <div className="evidence-card live-evidence">
          <div className="evidence-title">
            <Radio size={14} /> Live public record
            <span>Verified</span>
          </div>
          <p>
            {result?.liveEvidence[0]?.snippet ||
              "Octen AI live evidence will be loaded here."}
          </p>
          {result?.liveEvidence[0] && (
            <a href={result.liveEvidence[0].url} target="_blank" rel="noreferrer">
              {result.liveEvidence[0].source} <ExternalLink size={11} />
            </a>
          )}
        </div>
      </section>

      <AnimatePresence>
        {error && (
          <motion.div
            className="error-toast"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <AlertTriangle size={15} /> {error}
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="app-footer">
        <span>OpenAI</span><i />
        <span>Octen AI</span><i />
        <span>Composio</span><i />
        <span>Zendesk</span>
        <small>Ground Truth · Built in San Francisco</small>
      </footer>
    </main>
  );
}
