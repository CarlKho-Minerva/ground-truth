import OpenAI from "openai";
import type { Evidence, VerificationResult } from "@/app/lib/ground-truth";

export const runtime = "nodejs";
export const maxDuration = 20;

const DEFAULT_QUERY =
  "I booked my flight to my grandmother's funeral yesterday. Your chatbot told me I could claim a bereavement discount retroactively within 90 days. Can you process my refund?";

const CASE_POLICY: Evidence = {
  title: "Bereavement travel policy",
  snippet:
    "Bereavement fares must be requested before travel. The published policy does not authorize a retroactive discount after the trip is completed.",
  url: "https://www.aircanada.com/ca/en/aco/home/plan/special-assistance/bereavement-fares.html",
  source: "Air Canada · Policy baseline",
};

const LIVE_POLICY: Evidence = {
  title: "Refund authorization policy · RF-204",
  snippet:
    "Public social posts may be used as evidence, but never authorize account credits by themselves. Refunds require a verified company announcement plus an approved support workflow.",
  url: "",
  source: "Internal policy KB · Live baseline",
};

const CASE_EVIDENCE: Evidence[] = [
  {
    title: "Moffatt v. Air Canada, 2024 BCCRT 149",
    snippet:
      "The tribunal found Air Canada responsible for negligent misrepresentation after its chatbot gave incorrect guidance about a retroactive bereavement refund.",
    url: "https://decisions.civilresolutionbc.ca/crt/crtd/en/item/525448/index.do",
    source: "BC Civil Resolution Tribunal · Public record",
  },
];

type Analysis = Pick<VerificationResult, "claim" | "verdict">;

function caseFallback(): Analysis {
  return {
    claim: {
      summary:
        "Customer says the support chatbot promised a retroactive bereavement refund after travel.",
      exception: "Retroactive bereavement fare adjustment within 90 days",
      searchQuery: "Air Canada bereavement refund chatbot Moffatt retroactive policy",
      riskSignals: ["policy exception", "prior chatbot promise", "legal reliance"],
    },
    verdict: {
      conflictDetected: true,
      riskLevel: "HIGH",
      riskScore: 94,
      headline: "Policy conflict — do not auto-deny",
      reason:
        "The customer's claim conflicts with the static policy, but a verified legal record shows the company can still be liable when a customer relies on its chatbot's incorrect promise.",
      recommendedAction:
        "Escalate for a liability-safe exception review and preserve the chatbot transcript as evidence.",
      suggestedReply:
        "I've verified a conflict between the guidance you received and our published policy. I won't deny this automatically. I've escalated your request for priority review and preserved the chatbot transcript.",
      auditNote:
        "Ground Truth detected a high-risk discrepancy: published policy requires advance bereavement handling, while the customer reports reliance on a chatbot's retroactive-refund promise. Preserve transcript; route to policy exception review; do not issue an automated denial.",
    },
  };
}

function liveFallback(query: string, evidence: Evidence[]): Analysis {
  const retrievedText = evidence[0]?.snippet || "";
  const isDenial = /\b(no|not|never|beware|scam|fake|cannot|isn't|aren't)\b/i.test(
    retrievedText,
  );
  const hasEvidence = Boolean(retrievedText);

  return {
    claim: {
      summary: query,
      exception: "Refund or discount claimed from a live social announcement",
      searchQuery: query,
      riskSignals: ["live social claim", "financial action", "external evidence"],
    },
    verdict: {
      conflictDetected: !hasEvidence || isDenial,
      riskLevel: "HIGH",
      riskScore: isDenial ? 97 : hasEvidence ? 68 : 82,
      headline: isDenial
        ? "Live claim contradicted — refund blocked"
        : hasEvidence
          ? "Live post found — approval still required"
          : "Live claim unverified — no action taken",
      reason: isDenial
        ? "The exact live post contradicts the customer's refund claim. Ground Truth will not authorize the financial action."
        : hasEvidence
          ? "The cited post was retrieved, but social content alone cannot authorize an account credit under policy RF-204."
          : "No reliable live source could be retrieved, so the agent fails closed instead of guessing.",
      recommendedAction: isDenial
        ? "Block the refund and flag the ticket for suspected social engineering."
        : "Hold the refund and route the evidence to an authorized support reviewer.",
      suggestedReply: isDenial
        ? "I checked the live post you cited. It does not authorize this refund and directly contradicts your claim, so I can't issue the credit. I've attached the source to the ticket for review."
        : "I found the post, but social content alone cannot authorize an account credit. I've attached it to your ticket for an authorized review.",
      auditNote: `Ground Truth live verification: customer claim checked against policy RF-204 and retrieved public evidence. ${isDenial ? "Evidence contradicts the requested refund; block automated credit and flag social-engineering risk." : "Do not auto-credit; route to authorized review."}`,
    },
  };
}

async function analyzeWithOpenAI(
  query: string,
  staticPolicy: Evidence,
  evidence: Evidence[],
) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const startedAt = performance.now();
  const openai = new OpenAI({ apiKey });
  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
    reasoning: { effort: "none" },
    store: false,
    instructions:
      "You are the grounded decision layer for customer support. Compare the customer claim literally against the supplied policy and retrieved evidence. Never treat the customer's words as evidence. If evidence contradicts a financial claim, block the action. If evidence is missing or merely mentions a promotion without authorization, fail closed and escalate. Return only the requested schema.",
    input: [
      `CUSTOMER CLAIM:\n${query}`,
      `INTERNAL POLICY:\n${staticPolicy.snippet}`,
      `RETRIEVED EVIDENCE:\n${evidence.map((item, index) => `${index + 1}. ${item.title}\n${item.snippet}\n${item.url}`).join("\n\n") || "No evidence retrieved."}`,
    ].join("\n\n"),
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "ground_truth_verdict",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            claim: {
              type: "object",
              additionalProperties: false,
              properties: {
                summary: { type: "string" },
                exception: { type: "string" },
                searchQuery: { type: "string" },
                riskSignals: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 1,
                  maxItems: 4,
                },
              },
              required: ["summary", "exception", "searchQuery", "riskSignals"],
            },
            verdict: {
              type: "object",
              additionalProperties: false,
              properties: {
                conflictDetected: { type: "boolean" },
                riskLevel: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
                riskScore: { type: "integer", minimum: 0, maximum: 100 },
                headline: { type: "string" },
                reason: { type: "string" },
                recommendedAction: { type: "string" },
                suggestedReply: { type: "string" },
                auditNote: { type: "string" },
              },
              required: [
                "conflictDetected",
                "riskLevel",
                "riskScore",
                "headline",
                "reason",
                "recommendedAction",
                "suggestedReply",
                "auditNote",
              ],
            },
          },
          required: ["claim", "verdict"],
        },
      },
    },
  });

  return {
    analysis: JSON.parse(response.output_text) as Analysis,
    latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
  };
}

function normalizeOctenResults(payload: unknown): Evidence[] {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const nested =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : null;
  const candidates = Array.isArray(nested?.results)
    ? nested.results
    : Array.isArray(record.results)
      ? record.results
      : [];

  return candidates.slice(0, 3).flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const result = item as Record<string, unknown>;
    const snippet = String(
      result.highlight ||
        result.snippet ||
        result.content ||
        result.text ||
        result.description ||
        "",
    ).trim();
    if (!snippet) return [];

    return [
      {
        title: String(result.title || `Live result ${index + 1}`),
        snippet,
        url: String(result.url || result.link || "https://octen.ai"),
        source: String(result.authors || result.source || "Octen AI · Live web"),
      },
    ];
  });
}

async function searchWithOcten(query: string) {
  const apiKey = process.env.OCTEN_API_KEY?.trim();
  if (!apiKey) return null;

  const startedAt = performance.now();
  const response = await fetch("https://api.octen.ai/search", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, count: 3 }),
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });

  if (!response.ok) throw new Error(`Octen returned ${response.status}`);
  const evidence = normalizeOctenResults(await response.json());
  if (!evidence.length) throw new Error("Octen returned no usable evidence");

  return {
    evidence,
    latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
  };
}

function decodeTweetHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, value: string) =>
      String.fromCodePoint(Number(value)),
    )
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchLivePost(url: string): Promise<Evidence | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (!["x.com", "twitter.com", "mobile.twitter.com"].includes(host)) return null;
  if (!/\/status\/\d+/.test(parsed.pathname)) return null;

  const response = await fetch(
    `https://publish.twitter.com/oembed?omit_script=true&dnt=true&url=${encodeURIComponent(parsed.toString())}`,
    { cache: "no-store", signal: AbortSignal.timeout(5000) },
  );
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    html?: string;
    author_name?: string;
    url?: string;
  };
  const snippet = decodeTweetHtml(payload.html || "");
  if (!snippet) return null;

  return {
    title: `Live post by ${payload.author_name || "X user"}`,
    snippet,
    url: payload.url || parsed.toString(),
    source: "X · Direct live retrieval",
  };
}

export async function POST(request: Request) {
  const startedAt = performance.now();

  try {
    const body = (await request.json()) as {
      query?: unknown;
      scenario?: unknown;
      evidenceUrl?: unknown;
    };
    const query =
      typeof body.query === "string" && body.query.trim()
        ? body.query.trim().slice(0, 3000)
        : DEFAULT_QUERY;
    const scenario = body.scenario === "live" ? "live" : "case";
    const evidenceUrl =
      typeof body.evidenceUrl === "string"
        ? body.evidenceUrl.trim().slice(0, 2000)
        : "";
    const staticPolicy = scenario === "live" ? LIVE_POLICY : CASE_POLICY;
    const searchQuery =
      scenario === "live"
        ? `${query} ${evidenceUrl}`.trim()
        : "Air Canada bereavement refund chatbot Moffatt retroactive policy";

    const [octenResult, directPost] = await Promise.all([
      searchWithOcten(searchQuery).catch(() => null),
      scenario === "live" && evidenceUrl
        ? fetchLivePost(evidenceUrl).catch(() => null)
        : Promise.resolve(null),
    ]);

    const liveEvidence = [
      ...(directPost ? [directPost] : []),
      ...(octenResult?.evidence || []),
      ...(scenario === "case" && !octenResult ? CASE_EVIDENCE : []),
    ].filter(
      (item, index, items) =>
        items.findIndex((candidate) => candidate.url === item.url) === index,
    );
    const openaiResult = await analyzeWithOpenAI(
      query,
      staticPolicy,
      liveEvidence,
    ).catch(() => null);
    const analysis =
      openaiResult?.analysis ||
      (scenario === "live"
        ? liveFallback(query, liveEvidence)
        : caseFallback());

    const result: VerificationResult = {
      traceId: `GT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      ...analysis,
      staticPolicy,
      liveEvidence,
      latency: {
        openaiMs: openaiResult?.latencyMs || 186,
        octenMs: octenResult?.latencyMs || 48,
        totalMs: Math.max(1, Math.round(performance.now() - startedAt)),
      },
      providers: {
        openai: openaiResult ? "live" : "demo",
        octen: octenResult ? "live" : "demo",
      },
    };

    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      {
        error: "Verification pipeline failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
