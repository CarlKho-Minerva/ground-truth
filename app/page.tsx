"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
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
  Plane,
  Radio,
  RefreshCw,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Terminal,
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
const LIVE_QUERY =
  "I just saw the CEO tweet that everyone gets a $100 outage refund today. Please credit my account now.";

const sleep = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

type DemoState = "idle" | "verifying" | "verified" | "syncing" | "synced";

const stageDetails = [
  {
    label: "Load decision guardrails",
    provider: "Policy Graph",
    Icon: Database,
  },
  {
    label: "Retrieve external evidence",
    provider: "Octen AI",
    Icon: Search,
  },
  {
    label: "Ground claim to evidence",
    provider: "OpenAI",
    Icon: BrainCircuit,
  },
  {
    label: "Authorize or block action",
    provider: "Ground Truth",
    Icon: Scale,
  },
];

const ruleSets = {
  case: [
    { id: "BRV-104", text: "Bereavement handling must be requested before travel." },
    { id: "AI-12", text: "Never deny a claim when prior bot guidance created reliance." },
    { id: "LEG-03", text: "Preserve conflicting AI promises for liability review." },
    { id: "AUD-09", text: "Every policy exception requires a signed evidence trace." },
  ],
  live: [
    { id: "RF-204", text: "Social posts are evidence—never financial authorization." },
    { id: "EV-07", text: "External claims require retrievable first-party evidence." },
    { id: "AI-12", text: "Fail closed on unverified account credits or refunds." },
    { id: "SOC-11", text: "Contradicted live claims trigger social-engineering review." },
  ],
};

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
  const [showStory, setShowStory] = useState(true);
  const [scenario, setScenario] = useState<"case" | "live">("case");
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [demoState, setDemoState] = useState<DemoState>("idle");
  const [activeStage, setActiveStage] = useState(-1);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [actionResult, setActionResult] = useState<ZendeskActionResult | null>(
    null,
  );
  const [error, setError] = useState("");

  const isWorking = demoState === "verifying" || demoState === "syncing";
  const activeRules = ruleSets[scenario];
  const telemetryLines = [
    {
      stage: 0,
      time: "+000ms",
      source: "policy",
      message: `loaded ${activeRules.map((rule) => rule.id).join(" · ")}`,
    },
    {
      stage: 1,
      time: "+012ms",
      source: "octen",
      message: "POST /search · count=3 · no-cache",
    },
    ...(scenario === "live"
      ? [
          {
            stage: 1,
            time: "+018ms",
            source: "x-direct",
            message: "GET public post URL · awaiting exact text",
          },
        ]
      : []),
    {
      stage: 2,
      time: "+220ms",
      source: "openai",
      message: "Responses API · gpt-5.6-luna · strict schema",
    },
    {
      stage: 3,
      time: "+live",
      source: "composio",
      message: "staging ZENDESK_UPDATE_TICKET action contract",
    },
  ];

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
        body: JSON.stringify({ query, scenario, evidenceUrl }),
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
            tags:
              scenario === "live"
                ? ["ground_truth_verified", "live_claim", "social_engineering_review"]
                : ["ground_truth_verified", "policy_discrepancy", "liability_review"],
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

  function selectScenario(nextScenario: "case" | "live") {
    setScenario(nextScenario);
    setQuery(nextScenario === "live" ? LIVE_QUERY : DEFAULT_QUERY);
    setEvidenceUrl("");
    resetDemo();
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

      <AnimatePresence mode="wait">
        {showStory && (
          <motion.section
            className="story-screen"
            key="story"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
          >
            <div className="story-casefile">
              <span>CASE FILE</span>
              <strong>2024 BCCRT 149</strong>
            </div>

            <div className="story-lead">
              <div className="story-icon"><Plane size={25} /></div>
              <p>One chatbot. Two conflicting policies. One company held responsible.</p>
              <h1>
                The bot made a promise.<br />
                <span>The airline paid for it.</span>
              </h1>
              <p className="story-summary">
                Jake Moffatt trusted Air Canada&apos;s chatbot when it said he could
                claim a bereavement refund after travel. The published policy said
                the opposite. A tribunal ruled the company was responsible for its
                bot&apos;s misinformation.
              </p>
            </div>

            <div className="story-sequence">
              <div className="story-step">
                <span>01</span>
                <Bot size={17} />
                <div><small>The chatbot said</small><strong>“Claim it within 90 days.”</strong></div>
              </div>
              <ChevronRight size={16} />
              <div className="story-step conflict-step">
                <span>02</span>
                <Database size={17} />
                <div><small>The policy said</small><strong>“Request it before travel.”</strong></div>
              </div>
              <ChevronRight size={16} />
              <div className="story-step court-step">
                <span>03</span>
                <Gavel size={17} />
                <div><small>The tribunal said</small><strong>“The company is responsible.”</strong></div>
              </div>
            </div>

            <div className="story-bottom">
              <div className="story-thesis">
                <AlertTriangle size={16} />
                <span>The real failure wasn&apos;t hallucination. It was acting without verification.</span>
              </div>
              <button type="button" className="story-cta" onClick={() => setShowStory(false)}>
                See Ground Truth intervene <ArrowRight size={17} />
              </button>
              <a
                href="https://decisions.civilresolutionbc.ca/crt/crtd/en/item/525448/index.do"
                target="_blank"
                rel="noreferrer"
              >
                Read the public decision <ExternalLink size={11} />
              </a>
            </div>

            <div className="story-stack">
              Live intelligence: OpenAI + Octen AI + Composio
              <span /> Zendesk Sandbox
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <div className={showStory ? "dashboard-content story-covered" : "dashboard-content"}>

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

          <div className="scenario-switch" aria-label="Demo scenario">
            <button
              type="button"
              className={scenario === "case" ? "active" : ""}
              onClick={() => selectScenario("case")}
              disabled={isWorking}
            >
              <Gavel size={12} /> Case replay
            </button>
            <button
              type="button"
              className={scenario === "live" ? "active live" : ""}
              onClick={() => selectScenario("live")}
              disabled={isWorking}
            >
              <Radio size={12} /> Live tweet
            </button>
          </div>

          <div className="requester-row">
            <div className="avatar">{scenario === "live" ? "JD" : "JM"}</div>
            <div>
              <strong>{scenario === "live" ? "Judge demo" : "Jake Moffatt"}</strong>
              <span>{scenario === "live" ? "Audience challenge · live" : "Customer · 12 sec ago"}</span>
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

          {scenario === "live" && (
            <div className="live-input-block">
              <label htmlFor="evidence-url">Paste their public X post URL</label>
              <div className="url-input-wrap">
                <Radio size={13} />
                <input
                  id="evidence-url"
                  type="url"
                  value={evidenceUrl}
                  onChange={(event) => setEvidenceUrl(event.target.value)}
                  placeholder="https://x.com/username/status/…"
                  disabled={isWorking}
                />
              </div>
              <small>Direct URL retrieval proves the seconds-old post; Octen cross-checks the wider live web.</small>
            </div>
          )}

          <div className="claim-flags">
            <span><AlertTriangle size={12} /> {scenario === "live" ? "Financial action" : "Policy exception"}</span>
            <span><Sparkles size={12} /> {scenario === "live" ? "Live post cited" : "AI promise cited"}</span>
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={verifyClaim}
            disabled={isWorking || !query.trim() || (scenario === "live" && !evidenceUrl.trim())}
          >
            {demoState === "verifying" ? (
              <>
                <LoaderCircle className="spin" size={17} /> Verifying live claim…
              </>
            ) : (
              <>
                <Zap size={17} fill="currentColor" /> {scenario === "live" ? "Verify live post" : "Run Ground Truth"}
                <ArrowRight size={17} />
              </>
            )}
          </button>

          <div className="ticket-footer">
            <span>Powered by</span>
            <b>Zendesk Sandbox</b>
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
                  ? "12ms"
                  : index === 1
                    ? `${result.latency.octenMs}ms`
                    : index === 2
                      ? `${result.latency.openaiMs}ms`
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
                    <span>{index === 1 && scenario === "live" ? "Octen + direct URL" : provider}</span>
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
              {!result && demoState === "idle" ? (
                <motion.div
                  className="rules-state"
                  key="rules"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="rules-heading">
                    <div>
                      <ShieldCheck size={16} />
                      <span>Demo Policy Pack</span>
                    </div>
                    <code>{activeRules.length} guardrails loaded</code>
                  </div>
                  <div className="rules-list">
                    {activeRules.map((rule) => (
                      <div className="rule-row" key={rule.id}>
                        <code>{rule.id}</code>
                        <span>{rule.text}</span>
                        <Check size={12} />
                      </div>
                    ))}
                  </div>
                  <div className="rules-footer">
                    <span><LockKeyhole size={11} /> Internal Policy Graph · v2026.07</span>
                    <strong>Ready to verify</strong>
                  </div>
                </motion.div>
              ) : !result && demoState === "verifying" ? (
                <motion.div
                  className="telemetry-state"
                  key="telemetry"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="terminal-heading">
                    <div className="terminal-dots"><span /><span /><span /></div>
                    <span><Terminal size={12} /> Live tool telemetry</span>
                    <code>trace: pending</code>
                  </div>
                  <div className="terminal-body">
                    <div className="terminal-command">
                      <span>$</span> ground-truth verify --mode={scenario}
                    </div>
                    <AnimatePresence initial={false}>
                      {telemetryLines
                        .filter((line) => line.stage <= activeStage)
                        .map((line) => (
                          <motion.div
                            className="terminal-line"
                            key={`${line.source}-${line.stage}`}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                          >
                            <code>{line.time}</code>
                            <b className={`source-${line.source}`}>[{line.source}]</b>
                            <span>{line.message}</span>
                          </motion.div>
                        ))}
                    </AnimatePresence>
                    <div className="terminal-working">
                      <LoaderCircle className="spin" size={11} />
                      waiting for grounded decision<span className="terminal-cursor" />
                    </div>
                  </div>
                  <div className="terminal-footer">
                    No model output can authorize a financial action without cited evidence.
                  </div>
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
                    <span><AlertTriangle size={14} /> {result?.verdict.conflictDetected ? "Conflict detected" : "Claim grounded"}</span>
                    <code>{result?.traceId}</code>
                  </div>
                  <h3>{result?.verdict.headline}</h3>
                  <p>{result?.verdict.reason}</p>
                  <div className="verdict-source-row">
                    <ProviderBadge mode={result?.providers.openai} label="OpenAI" />
                    <ProviderBadge mode={result?.providers.octen} label="Octen" />
                    {scenario === "live" && result?.liveEvidence[0]?.source.startsWith("X") && (
                      <ProviderBadge mode="live" label="Direct X" />
                    )}
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
              <strong>{scenario === "live" ? "Action risk" : "Liability risk"}</strong>
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
                {result?.verdict.headline || "Awaiting verified evidence"}
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
              <><CheckCircle2 size={17} /> {actionResult?.mode === "live" ? "Zendesk updated" : "Sandbox ticket updated"}</>
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
                <span className={actionResult.mode === "live" ? "live-receipt" : "sandbox-receipt"}>
                  {actionResult.mode === "live" ? "Composio · live" : "Zendesk · sandbox"}
                </span>
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
          <small>{result ? `${result.liveEvidence.length + 1} sources cross-checked` : "Appears after verification"}</small>
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
          {result?.staticPolicy.url && (
            <a href={result.staticPolicy.url} target="_blank" rel="noreferrer">
              {result.staticPolicy.source} <ExternalLink size={11} />
            </a>
          )}
        </div>

        <div className="conflict-connector" aria-label="Conflicts with">
          <span />
          <div>
            <AlertTriangle size={14} />
            {result ? (result.verdict.conflictDetected ? "CONFLICT" : "GROUNDED") : "COMPARE"}
          </div>
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

      </div>

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
