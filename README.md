# Ground Truth

> **Verify before your AI commits.**

[Live demo](https://ground-truth-eosin.vercel.app) · [Moffatt v. Air Canada decision](https://decisions.civilresolutionbc.ca/crt/crtd/en/item/525448/index.do)

## One passenger. One chatbot. Two conflicting policies.

Imagine standing in a noisy airport on the worst day of your life. Your grandmother has died, you need to get home, and you ask an airline chatbot one simple question:

_“Can I book this flight now and claim the bereavement discount afterward?”_

Air Canada’s chatbot told Jake Moffatt that he could request the discount retroactively within 90 days. He trusted it and booked the flight. But the airline’s published policy said the opposite: bereavement travel had to be arranged before departure.

Air Canada denied the refund. Moffatt took the screenshot to court. In 2024, the British Columbia Civil Resolution Tribunal held the airline responsible for its chatbot’s inaccurate guidance.

The failure was not merely that an AI hallucinated.

**The failure was allowing that hallucination to become a company decision without first verifying it.**

## Meet Ground Truth

Ground Truth is a real-time verification and action layer for AI customer support. Before an agent promises a refund, denies a claim, or changes an account, Ground Truth asks four questions:

1. What exactly is the customer claiming?
2. Which internal rules govern the requested action?
3. What does the live external evidence actually say?
4. Is the agent authorized to proceed—or should it block and escalate?

The answer is presented as an auditable evidence trace rather than an unexplained model response.

## The demo has two acts

### Act I — Replay the failure

The Air Canada case enters as a support ticket. Ground Truth loads cited decision rules, compares the published policy with the legal record, and catches the dangerous discrepancy.

Instead of automatically denying the customer, it preserves the chatbot’s earlier promise and escalates the case for a liability-safe review.

### Act II — Challenge it live

Ask someone in the audience to publish this from a public X account:

> We are NOT issuing $100 outage refunds today. Any message claiming otherwise is false. #GroundTruthDemo

Then claim the opposite inside the support ticket, paste the new post URL, and click **Verify live post**.

Ground Truth retrieves the seconds-old post directly, uses Octen AI to search the wider live web, and asks OpenAI to compare the customer claim against the exact evidence and internal refund rules. The verdict changes in real time: the unauthorized refund is blocked and the account is flagged for review.

While the request runs, the interface exposes terminal-style telemetry for every partner handoff. This is not a canned animation—the final provider badges, evidence, latency, and verdict come from the live result.

```text
Customer claim
      │
      ▼
Demo Policy Pack ──► cited authorization rules
      │
      ▼
Octen AI + direct URL retrieval ──► live external evidence
      │
      ▼
OpenAI Responses API ──► strict grounded verdict
      │
      ▼
Composio action contract ──► Zendesk workflow
```

## Run it locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-luna
OCTEN_API_KEY=
COMPOSIO_API_KEY=
COMPOSIO_ENTITY_ID=default
ZENDESK_MODE=sandbox
```

OpenAI and Octen run live whenever their keys are configured. Zendesk defaults to a clearly labeled sandbox receipt, so the full story works without a Zendesk account. Set `ZENDESK_MODE=live` only after connecting Zendesk through Composio.

## Built with

- **OpenAI Responses API** — grounded reasoning with strict structured output
- **Octen AI** — low-latency live web retrieval
- **Composio** — agent-to-tool action contract
- **Zendesk** — ticket workflow and audit destination
- **Next.js 16 + React 19** — interactive command center

## API routes

- `POST /api/verify` — retrieves evidence and returns the claim, policy, verdict, risk score, provider state, and latency
- `POST /api/action` — stages or executes the verified Zendesk ticket action

## The promise

AI agents should not be trusted because they sound confident. They should be trusted when every consequential action can show its rules, its evidence, and its authorization.

**That is Ground Truth.**
