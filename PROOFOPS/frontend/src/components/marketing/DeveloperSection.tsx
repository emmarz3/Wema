import { Link } from 'react-router-dom';
import { Terminal } from 'lucide-react';
import { Panel, PanelHeader } from '../ui/Panel';
import { CodeBlock } from '../ui/CodeBlock';
import { Button } from '../ui/Button';

const STEPS = [
  {
    title: 'Create a key',
    body: 'Scoped API keys live in the developer console. The secret is shown once at creation and cannot be retrieved afterwards.',
  },
  {
    title: 'Verify a claim',
    body: 'POST a reference to the verification endpoint with an idempotency key. The response reports status and checks as the source produces them.',
  },
  {
    title: 'Receive events',
    body: 'Subscribe to webhook events for verifications and deliveries. Every payload is signed; verify signatures server-side.',
  },
  {
    title: 'Inspect and reconcile',
    body: 'Fetch proof records, delivery attempts and reconciliation results through the same endpoints the interface uses.',
  },
];

/**
 * Developer integration section. The examples mirror the documented
 * contract (src/api/contract.ts) exactly — nothing is shown that the
 * interface does not itself call.
 */
export function DeveloperSection() {
  return (
    <section
      id="developers"
      className="section-anchor border-b border-line bg-canvas py-16 lg:py-20"
      aria-labelledby="developers-heading"
    >
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold tracking-wide text-brand uppercase">Developers</p>
          <h2 id="developers-heading" className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Integrate the same contract the interface uses
          </h2>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-secondary">
            Every endpoint the ProofOps interface calls is documented, with
            request and response examples, idempotency guidance and webhook
            signature verification.
          </p>
        </header>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <div className="min-w-0 space-y-3">
            <CodeBlock
              language="shell"
              code={`# 1. Verify a claim (idempotent — reuse the key safely)
curl -X POST https://api.proofops.test/v1/verifications \\
  -H "Authorization: Bearer $PROOFOPS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: 9f21c4ee-88437" \\
  -d '{
    "reference": "TRX-88437",
    "provider": "bank-a",
    "claimedAmountMinor": 50000000,
    "currency": "NGN"
  }'`}
            />
            <CodeBlock
              language="json"
              code={`{
  "id": "vrf_88437",
  "reference": "TRX-88437",
  "status": "complete",
  "result": "mismatch",
  "claimedAmount": { "amountMinor": 50000000, "currency": "NGN" },
  "sourceAmount": { "amountMinor": 25000000, "currency": "NGN" },
  "checks": [
    { "key": "amount", "outcome": "failed",
      "observed": "25000000 NGN", "expected": "50000000 NGN" },
    { "key": "reference", "outcome": "passed" }
  ],
  "proofId": "PRF-2026-1044"
}`}
            />
            <CodeBlock
              language="json"
              code={`// Webhook event — signed with the endpoint secret (verify server-side)
// X-ProofOps-Signature: t=1728752522,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
{
  "id": "evt_9f21c4ee",
  "type": "verification.completed",
  "createdAt": "2026-10-12T18:41:05Z",
  "data": {
    "verificationId": "vrf_88437",
    "reference": "TRX-88437",
    "result": "mismatch",
    "proofId": "PRF-2026-1044"
  }
}`}
            />
          </div>

          <div className="min-w-0 space-y-4">
            <Panel>
              <PanelHeader title="Integration steps" description="From key to first event, in order" />
              <ol className="divide-y divide-line">
                {STEPS.map((step, index) => (
                  <li key={step.title} className="flex gap-3 p-4">
                    <span
                      aria-hidden
                      className="flex size-6 shrink-0 items-center justify-center rounded-full border border-brand-line bg-brand-soft text-xs font-semibold text-brand"
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-[0.8125rem] font-medium text-ink">{step.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-secondary">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>

            <Panel>
              <PanelHeader title="Conventions worth knowing" />
              <ul className="space-y-2 p-4 text-xs leading-relaxed text-ink-secondary">
                <li>
                  <strong className="font-medium text-ink">Idempotency.</strong> Send an
                  Idempotency-Key on creating operations. Reusing a key returns the original
                  result instead of repeating the operation.
                </li>
                <li>
                  <strong className="font-medium text-ink">Signatures.</strong> Webhook payloads
                  are signed; verification happens on your server with the endpoint secret,
                  which is never displayed again after creation.
                </li>
                <li>
                  <strong className="font-medium text-ink">Money.</strong> Amounts travel as
                  minor units plus a currency code — never floats.
                </li>
                <li>
                  <strong className="font-medium text-ink">Statuses.</strong> Transaction status,
                  verification result, delivery status and incident status are separate fields
                  and are never collapsed into one.
                </li>
              </ul>
            </Panel>

            <Link to="/app/developer">
              <Button variant="secondary" icon={<Terminal aria-hidden className="size-4" />}>
                Open the developer console
              </Button>
            </Link>
            <p className="text-xs text-ink-secondary">
              The console opens in the workspace. Sandbox keys and endpoints are
              labelled as simulated.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
