import { ComposioToolSet } from "composio-core";
import type { ZendeskActionResult } from "@/app/lib/ground-truth";

export const runtime = "nodejs";
export const maxDuration = 20;

const DEFAULT_TAGS = [
  "ground_truth_verified",
  "policy_discrepancy",
  "liability_review",
];

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      ticketId?: unknown;
      auditNote?: unknown;
      tags?: unknown;
    };

    const ticketId =
      typeof body.ticketId === "string" ? body.ticketId.slice(0, 64) : "8942";
    const auditNote =
      typeof body.auditNote === "string"
        ? body.auditNote.slice(0, 6000)
        : "Ground Truth verified a high-risk policy discrepancy.";
    const tags = Array.isArray(body.tags)
      ? body.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 8)
      : DEFAULT_TAGS;

    let mode: ZendeskActionResult["mode"] = "demo";
    const apiKey = process.env.COMPOSIO_API_KEY?.trim();

    if (apiKey) {
      try {
        const composio = new ComposioToolSet({
          apiKey,
          entityId: process.env.COMPOSIO_ENTITY_ID || "default",
        });

        await composio.executeAction({
          action: "ZENDESK_UPDATE_TICKET",
          params: {
            ticket_id: ticketId,
            priority: "high",
            tags,
            comment: {
              body: `[Ground Truth verification audit]\n${auditNote}`,
              public: false,
            },
          },
        });
        mode = "live";
      } catch {
        // The deterministic demo result keeps the presentation usable if OAuth is
        // not connected yet. The response is explicitly labeled as demo mode.
      }
    }

    const result: ZendeskActionResult = {
      success: true,
      mode,
      provider: "Composio",
      ticketId,
      action: "ZENDESK_UPDATE_TICKET",
      tags,
      timestamp: new Date().toISOString(),
    };

    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      {
        error: "Zendesk action failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
