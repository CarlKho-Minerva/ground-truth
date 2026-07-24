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

***

### Script

| Time | Screen/action | What you say |
|---|---|---|
| 0:00 | Play airport ambience. | “Imagine the worst day of your life. Your grandmother has died. You’re standing in a loud airport, trying to get home—and you need one clear answer.” |
| 0:10 | Show Air Canada headline. | “Jake Moffatt asked Air Canada’s chatbot about its bereavement policy. The bot confidently told him: buy the ticket now, then request the discount within 90 days.” |
| 0:22 | Show legal image. | “But Air Canada’s real policy said the opposite: the discount had to be requested before travel. Jake trusted the bot, the airline denied his refund, and the tribunal held Air Canada responsible for the misinformation.” [Public decision](https://decisions.civilresolutionbc.ca/crt/crtd/en/item/525448/index.do) |
| 0:38 | Briefly show meme. | “The internet saw a ridiculous chatbot failure. Enterprises should see something more dangerous: an AI agent acting without verifying reality.” |
| 0:48 | Open Ground Truth story screen. | “The failure wasn’t simply hallucination. It was allowing hallucination to become company policy.” |
| 0:57 | Click **See Ground Truth intervene**. | “Ground Truth sits between an AI support agent and the actions it takes.” |
| 1:05 | Point to policy rules. | “Before the agent can commit, we load explicit guardrails: social posts are evidence, not financial authorization; external claims require first-party proof; and unverified refunds fail closed.” |
| 1:18 | Select **Live tweet**. | “But this isn’t a canned Air Canada replay. Let’s challenge it with something posted right now.” |
| 1:25 | Ask volunteer to post; paste URL. | “Please post the sentence shown here from any public X account.” |
| 1:35 | Click **Verify live post**. Stop speaking while telemetry runs. | Let the terminal telemetry breathe for three seconds. |
| 1:40 | Point to result and evidence. | “That is the exact post from seconds ago. Octen searches the wider live web. OpenAI compares the claim, the retrieved evidence, and the company rules. The customer claimed a refund was authorized—but the real post explicitly denies it.” |
| 1:53 | Click **Apply safe resolution**. | “The refund is blocked, the evidence is preserved, and Composio stages the verified Zendesk workflow with risk tags and an audit note.” |
| 2:05 | Pause on receipt. | “Ground Truth makes AI support accountable: verify before your AI commits.” |