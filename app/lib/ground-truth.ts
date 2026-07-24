export type ProviderMode = "live" | "demo";

export type Evidence = {
  title: string;
  snippet: string;
  url: string;
  source: string;
};

export type VerificationResult = {
  traceId: string;
  claim: {
    summary: string;
    exception: string;
    searchQuery: string;
    riskSignals: string[];
  };
  staticPolicy: Evidence;
  liveEvidence: Evidence[];
  verdict: {
    conflictDetected: boolean;
    riskLevel: "HIGH" | "MEDIUM" | "LOW";
    riskScore: number;
    headline: string;
    reason: string;
    recommendedAction: string;
    suggestedReply: string;
    auditNote: string;
  };
  latency: {
    openaiMs: number;
    octenMs: number;
    totalMs: number;
  };
  providers: {
    openai: ProviderMode;
    octen: ProviderMode;
  };
};

export type ZendeskActionResult = {
  success: boolean;
  mode: "live" | "sandbox";
  provider: "Composio";
  ticketId: string;
  action: string;
  tags: string[];
  timestamp: string;
};
