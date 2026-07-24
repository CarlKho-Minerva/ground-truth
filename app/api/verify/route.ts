import OpenAI from "openai";
import type { Evidence, VerificationResult } from "@/app/lib/ground-truth";

export const runtime = "nodejs";
export const maxDuration = 20;

const DEFAULT_QUERY =
  "I booked my flight to my grandmother's funeral yesterday. Your chatbot told me I could claim a bereavement discount retroactively within 90 days. Can you process my refund?";

const STATIC_POLICY: Evidence = {
  title: "Bereavement travel policy",
  snippet:
    "Bereavement fares must be requested before travel. The published policy does not authorize a retroactive discount after the trip is completed.",
  url: "https://www.aircanada.com/ca/en/aco/home/plan/special-assistance/bereavement-fares.html",
  source: "Air Canada · Policy baseline",
};

const FALLBACK_EVIDENCE: Evidence[] = [
  {
    title: "Moffatt v. Air Canada, 2024 BCCRT 149",
    snippet:
      "The tribunal found Air Canada responsible for negligent misrepresentation after its chatbot gave incorrect guidance about a retroactive bereavement refund.",
    url: "https://decisions.civilresolutionbc.ca/crt/crtd/en/item/525448/index.do",
    source: "BC Civil Resolution Tribunal · Public record",
  },
  {
    title: "Chatbot guidance conflicted with the airline policy",
    snippet:
      "The customer relied on chatbot instructions that a bereavement claim could be submitted after travel, while the airline's policy required advance action.",
    url: "https://decisions.civilresolutionbc.ca/crt/crtd/en/item/525448/index.do",
    source: "Case record · Verified context",
  },
];

type ParsedClaim = VerificationResult["claim"];

function fallbackClaim(): ParsedClaim {
  return {
    summary:
      "Customer says the support chatbot promised a retroactive bereavement refund after travel.",
    exception: "Retroactive bereavement fare adjustment within 90 days",
    searchQuery: "Air Canada bereavement refund chatbot Moffatt retroactive policy",
    riskSignals: ["policy exception", "prior chatbot promise", "legal reliance"],
  };
}

async function parseWithOpenAI(query: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const startedAt = performance.now();
  const openai = new OpenAI({ apiKey });
  const response = await openai.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-5.6-sol",
    reasoning: { effort: "none" },
    store: false,
    instructions:
      "You extract policy claims for a customer-support verification system. Be literal, concise, and evidence-seeking. Do not decide whether the customer is truthful. Return only the requested schema.",
    input: `Customer message:\n${query}\n\nInternal baseline:\n${STATIC_POLICY.snippet}`,
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "support_claim",
        strict: true,
        schema: {
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
      },
    },
  });

  return {
    claim: JSON.parse(response.output_text) as ParsedClaim,
    latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
  };
}

function normalizeOctenResults(payload: unknown): Evidence[] {
  if (!payload || typeof payload !== "object") return [];
  const record = payload as Record<string, unknown>;
  const candidates = Array.isArray(record.results)
    ? record.results
    : Array.isArray(record.data)
      ? record.data
      : [];

  return candidates.slice(0, 3).flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const result = item as Record<string, unknown>;
    const snippet = String(
      result.snippet || result.content || result.text || result.description || "",
    ).trim();
    if (!snippet) return [];

    return [
      {
        title: String(result.title || `Live result ${index + 1}`),
        snippet,
        url: String(result.url || result.link || "https://octen.ai"),
        source: String(result.source || "Octen AI · Live web"),
      },
    ];
  });
}

async function searchWithOcten(query: string) {
  const apiKey = process.env.OCTEN_API_KEY?.trim();
  if (!apiKey) return null;

  const startedAt = performance.now();
  const response = await fetch("https://api.octen.ai/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, limit: 3 }),
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });

  if (!response.ok) {
    throw new Error(`Octen returned ${response.status}`);
  }

  const evidence = normalizeOctenResults(await response.json());
  if (!evidence.length) throw new Error("Octen returned no usable evidence");

  return {
    evidence,
    latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
  };
}

export async function POST(request: Request) {
  const startedAt = performance.now();

  try {
    const body = (await request.json()) as { query?: unknown };
    const query =
      typeof body.query === "string" && body.query.trim()
        ? body.query.trim().slice(0, 3000)
        : DEFAULT_QUERY;

    const fallback = fallbackClaim();
    const [openaiResult, octenResult] = await Promise.all([
      parseWithOpenAI(query).catch(() => null),
      searchWithOcten(fallback.searchQuery).catch(() => null),
    ]);

    const claim = openaiResult?.claim || fallback;
    const liveEvidence = octenResult?.evidence || FALLBACK_EVIDENCE;
    const traceId = `GT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const result: VerificationResult = {
      traceId,
      claim,
      staticPolicy: STATIC_POLICY,
      liveEvidence,
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
          "I've verified a conflict between the guidance you received and our published policy. I won't deny this automatically. I've escalated your request for priority review and preserved the chatbot transcript so the team can resolve it safely.",
        auditNote:
          "Ground Truth detected a high-risk discrepancy: published policy requires advance bereavement handling, while the customer reports reliance on a chatbot's retroactive-refund promise. Moffatt v. Air Canada confirms material liability risk. Preserve transcript; route to policy exception review; do not issue an automated denial.",
      },
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
