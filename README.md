# Ground Truth

Ground Truth is a real-time verification and action layer for AI support agents. It extracts a customer's policy claim with OpenAI, checks the static policy against live public context from Octen AI, identifies liability-causing discrepancies, and executes a safe Zendesk workflow through Composio.

## Demo

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then:

1. Click **Run Ground Truth** to verify the Moffatt v. Air Canada scenario.
2. Watch the policy, live evidence, and legal discrepancy resolve in the evidence trace.
3. Click **Apply safe resolution** to tag and update the Zendesk ticket through Composio.

The app automatically uses live integrations when their environment variables are configured. Without credentials, it uses clearly labeled deterministic demo data so the complete judge flow remains presentable.

## Stack

- OpenAI Responses API with strict structured outputs
- Octen AI live search
- Composio action execution
- Zendesk ticket workflow
- Next.js 16, React 19, TypeScript, Tailwind CSS

## API routes

- `POST /api/verify` — claim extraction, policy check, live evidence, and verdict
- `POST /api/action` — Composio-powered Zendesk ticket update
