# IVM: Implementation and Verification Matrix

**Project (working title):** EqubFlow
**Version:** 0.1 (Sprint 5)
**Parents:** 02-SRS v0.3, 03-Threat Model v0.2, 04-Evidence Spec v0.2, 05-PDR v0.3, 06-TDD v0.1
**Purpose:** every requirement, threat and evidence claim maps to a component, a way to verify it, a named test, and the milestone that delivers it. This is the checklist for "done" and satisfies NFR-13.

**Verification kinds:** U unit (Vitest) | D database test | C contract test (Foundry unit, fuzz, invariant) | I integration on Arc Testnet | S scenario suite (`packages/scenarios`) | E end to end (Playwright, mock then live) | A audit prompt or security review | M manual scripted check.
**Status values:** `todo`, `building`, `tested`, `evidenced` (the artifact exists in `evidence/`). Update the Status column as work completes.
**Milestones:** M0 Oct 1-2 skeleton and spikes | M1 Oct 2-3 domain core | M2 Oct 2-4 watcher, executor, flows, first real round | M3 Oct 3-5 gate contract | M4 Oct 4-6 agent decisions | M5 Oct 5-7 scenarios and verification | M6 Oct 6-8 float, invoices, notifications | M7 Oct 8-9 sandbox, evidence pack, submission.


## 1. Requirements matrix

| ID | Requirement | Pri | Traces | Component | Verify | Test ID(s) | Threats | Evidence | Milestone | Owner | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| FR-01 | The organizer can create a group by setting: name, member count (3 to 12),... | M | BR-01 | web, db | U D E | FR01-create-valid; FR01-create-invalid | - | - | M2 | Coding + UI agent | todo |
| FR-02 | Each member joins by acknowledging the exact rule set (shown in full) and... | M | BR-01, BRU-6 | web, domain, db | I E | FR02-join-ack-rules; FR02-wallet-created | T5 | C1 | M2 | Coding + UI agent | todo |
| FR-03 | Rules are versioned. Once the first round opens, rules are frozen for that... | M | BRU-6 | db, domain | D S | FR03-rules-frozen; S-RULE | T6 | - | M2 | Coding agent | todo |
| FR-04 | The system rejects group creation or a join if any required rule is... | M | BR-01 | domain | U | FR04-rule-validation | - | - | M1 | Coding agent | todo |
| FR-05 | For each round the system issues each member a payment request with:... | M | BR-02 | domain, worker | U I | FR05-payment-request-bound-sender | T11 | - | M2 | Coding agent | todo |
| FR-06 | The chain watcher independently observes USDC transfers to the group's... | M | BR-03 | worker | I | FR06-watcher-records-final-transfers | T9, T10 | C3 | M2 | Coding agent | todo |
| FR-07 | Each observed transfer is classified deterministically, without any model:... | M | BR-03, BR-04 | domain | U S | FR07-classifier-8-classes; S-DUP; S-SPOOF; S-TOKEN; S-DEST; S-DUST | T10-T14 | C9 | M1 | Coding agent | todo |
| FR-08 | A contribution is credited to a member only after its transfer is final... | M | BR-03, BRU-2 | domain, authorizer | U S | FR08-no-credit-without-final-transfer; S-HALL; S-FINAL | T2, T9 | C6 | M1 | Coding agent | todo |
| FR-09 | The system keeps a visible discrepancy ledger. Every non-zero difference... | M | BR-04, BRU-3 | domain, db | U S | FR09-discrepancy-1-base-unit; S-DUST | T13 | C9 | M1 | Coding agent | todo |
| FR-10 | After a contribution is credited, the member can view a receipt containing... | M | BR-02 | web | E | FR10-receipt-view | - | C1 | M2 | UI agent | todo |
| FR-11 | For every classified anomaly the agent produces a proposal chosen from a... | M | BR-04, BR-06 | agent | U S | FR11-fixed-action-set; S-INJ-1..3 | T1 | C5 | M4 | Coding agent | todo |
| FR-12 | A proposal takes effect only after the deterministic rule check confirms... | M | BR-04, BRU-1 | domain, authorizer | U S | FR12-rule-check-rejects-violations | T1 | C7 | M4 | Coding agent | todo |
| FR-13 | If the agent or model is unavailable, times out, or returns output that... | M | BRU-1 | agent | U S | FR13-model-outage-no-funds-move | T31 | C5 | M4 | Coding agent | todo |
| FR-14 | Agent explanations are stored with the decision record and shown to... | M | BR-08 | agent, web | E | FR14-explanation-visible | - | C6 | M4 | Coding + UI agent | todo |
| FR-15 | The enforcement layer alone can authorize a payout. The agent can prepare... | M | BR-05, BRU-1 | authorizer, executor, contract | I C S | FR15-only-enforcement-authorizes; EqubGate-I7 | T1, T3 | C7 | M2 | Coding agent | todo |
| FR-16 | A payout is authorized only if all hold: recipient is the scheduled member... | M | BR-05 | domain | U S | FR16-condition-matrix; S-EARLY; S-PAUSE; S-APPR | T4, T7, T8 | C7 | M1 | Coding agent | todo |
| FR-17 | Payout execution is idempotent: retries, restarts and duplicate triggers... | M | BR-05 | executor, db, contract | D I S C | FR17-idempotent-payout; S-RACE; EqubGate-I2 | T3 | C11 | M2 | Coding agent | todo |
| FR-18 | After execution the system records the payout receipt with the transaction... | M | BR-05, BR-08 | executor | I | FR18-payout-receipt-and-finality | T9 | C2 | M2 | Coding agent | todo |
| FR-19 | The payout order is set by the group's chosen method at cycle start: fixed... | M | BR-06 | domain | U | FR19-order-fixed; FR19-verifiable-random | - | - | M2 | Coding agent | todo |
| FR-20 | Every decision, including refusals, waits and escalations, writes an entry... | M | BR-08, BRU-4 | authorizer, db | U D | FR20-record-complete-for-demo-scenarios | T16 | C6 | M2 | Coding agent | todo |
| FR-21 | Entries are append-only and cryptographically chained so that any... | M | BR-08 | db | D S | FR21-append-only-chain; S-LOG | T16 | C8 | M2 | Coding agent | todo |
| FR-22 | Any reviewer can run a verification that recomputes the chain and reports... | M | BR-08 | cli | U S | FR22-verify-detects-tamper | T16 | C8 | M5 | Coding agent | todo |
| FR-23 | Entries link to the on-chain transactions they reference. | M | BR-08 | web, db | E | FR23-records-link-to-chain | - | C10 | M4 | Coding + UI agent | todo |
| FR-24 | An approval inbox lists items awaiting a human, with the agent's proposal,... | M | BR-09 | web, domain | E S | FR24-approval-inbox; S-APPR | T7 | C5 | M4 | Coding + UI agent | todo |
| FR-25 | The organizer can pause and resume the system. While paused, no fund... | M | BR-09, BRU-5 | web, authorizer | E S | FR25-pause-resume; S-PAUSE | T8 | - | M3 | Coding + UI agent | todo |
| FR-26 | Pause takes effect for all new authorizations within 5 seconds and is... | M | BRU-5 | authorizer, contract | I C | FR26-pause-takes-effect-5s; EqubGate-I5 | T8 | C12 | M3 | Coding agent | todo |
| FR-27 | Members are notified of due dates, receipts, discrepancies and payouts... | S | BR-10 | web, worker | E M | FR27-notifications | - | - | M6 | Coding + UI agent | todo |
| FR-28 | A persona runner drives `simulated` wallets through scripted behaviors: on... | S | BR-11 | scenarios | S | FR28-persona-behaviors-all-S-xx | all High | C7 | M5 | Coding agent | todo |
| FR-29 | A published test report lists each scenario, expected result, actual... | S | BR-11 | scenarios | S | FR29-test-report-generated | - | C7 | M5 | Coding agent | todo |
| FR-30 | Traction metrics are computed from on-chain and system data, split by... | M | BR-12, BR-14 | cli, web | U M | FR30-metrics-split-by-mode-and-stake | T17, T18 | C1, C3 | M7 | Coding agent | todo |
| FR-31 | A reviewer sandbox creates an isolated `sandbox` group with scripted... | S | BR-13 | web, scenarios | E | FR31-sandbox-cycle-and-reset | T17 | C5 | M7 | Coding + UI agent | todo |
| FR-32 | Roles are enforced: organizer, member, reviewer (read-only). A member can... | M | BR-01 | web, db | D E A | FR32-roles-and-rls-matrix | T20 | - | M2 | Coding agent | todo |
| FR-33 | A public read-only audit view shows a group's decision record and chain... | S | BR-08, BR-13 | web | E | FR33-public-audit-no-private-data | T29 | C8 | M7 | Coding + UI agent | todo |
| FR-34 | A member can request an order swap; the agent evaluates it (section 4, D5)... | S | BR-06 | domain, web | U E | FR34-order-swap-requires-approvals | - | C5 | M6 | Coding agent | todo |
| FR-35 | If a member misses a contribution after the grace period, the agent... | M | BR-06 | domain, agent | U S | FR35-default-handling-D4-within-reserve | - | C5 | M4 | Coding agent | todo |
| FR-36 | Between collection and payout the agent may propose moving idle pot funds... | S | BR-07 | agent, domain | U I | FR36-float-proposal-with-reason | - | C10 | M6 | Coding agent | todo |
| FR-37 | Float actions are bounded by group rules (maximum share of pot, minimum... | S | BR-07 | domain | U S | FR37-float-refused-near-payout | - | C10 | M6 | Coding agent | todo |
| FR-38 | If the yield holding is unavailable (for example allowlisting is not... | S | BR-07 | domain, executor | U | FR38-float-unavailable-stays-liquid | T28 | - | M6 | Coding agent | todo |
| FR-39 | A payment request (FR-05) can represent either an Equb contribution or an... | S | BR-15 | domain, web | U E | FR39-invoice-mode-same-pipeline | - | C4 | M6 | Coding + UI agent | todo |
| FR-40 | Every real participant and every transfer carries a stake attribute,... | M | BR-16 | db, web | D E | FR40-stake-label-and-split | T18 | C3 | M2 | Coding + UI agent | todo |
| NFR-01 | Money correctness: all amounts are integers in base units; conversions to... | M | - | domain, lint | U A | NFR01-no-number-money-lint; property-tests | - | - | M1 | Coding agent | todo |
| NFR-02 | Fail closed: on any error, ambiguity or unavailable dependency, no funds move. | M | - | all | S I | NFR02-fail-closed-error-paths | T31 | C7 | M2 | Coding agent | todo |
| NFR-03 | Enforcement independence: the authorization decision does not depend on... | M | - | authorizer, contract | S C | NFR03-malicious-model-output-replay | T1 | C7 | M4 | Coding agent | todo |
| NFR-04 | Idempotency: every fund-moving operation carries an idempotency key;... | M | - | executor, db | D S | NFR04-idempotency-keys; S-RACE | T3 | C11 | M2 | Coding agent | todo |
| NFR-05 | Timeliness (proposed, [DECISION] on numbers): a transfer is classified... | S | - | worker, executor | I | NFR05-latency-measurement | - | C12 | M5 | Coding agent | todo |
| NFR-06 | Security: secrets never in source control or client code, all input... | M | - | all | A | NFR06-audit-prompt-3-checkpoints; secret-scan; dependency-audit | T19-T27 | - | M2, M7 | Coding agent | todo |
| NFR-07 | Privacy: pseudonymous display names are sufficient; no government... | M | - | agent, web | A M | NFR07-no-PII-to-model; consent-screen | T29 | - | M4 | Coding agent | todo |
| NFR-08 | Usability: mobile-first, usable by a non-crypto user with no concept of... | M | - | web | E M | NFR08-first-time-user-60s-walkthrough | - | C14 | M2 | UI agent | todo |
| NFR-09 | Reproducibility: the public repo runs from a clean checkout with... | M | - | repo | M | NFR09-clean-checkout-runs | - | - | M7 | Coding agent | todo |
| NFR-10 | Observability: structured logs and error tracking; every request traceable... | S | - | all | M | NFR10-logs-and-error-tracking | - | - | M6 | Coding agent | todo |
| NFR-11 | Cost control: model calls are budgeted per decision and per day, with a... | S | - | agent | U I | NFR11-daily-model-budget-cap | T23 | - | M4 | Coding agent | todo |
| NFR-12 | Honesty of presentation: accelerated cadence, testnet money and simulated... | M | - | web, docs | M | NFR12-labels-on-every-result-screen | T18 | - | M7 | Coding + UI agent | todo |
| NFR-13 | Testability: every FR marked M has an automated test or a scripted manual... | M | - | docs | M | NFR13-this-matrix-complete | - | - | M7 | You | todo |

Coverage check: 53 requirements in the SRS (40 functional, 13 non-functional), all present above; 40 Must and 13 Should.

## 2. Threat matrix (every High threat has a named test)

| ID | Threat | Pri | Requirements | Test or scenario | Milestone | Status |
|---|---|---|---|---|---|---|
| T1 | Prompt injection redirects payout | H | FR-11, FR-12, NFR-03 | S-INJ-1..3 | M4 | todo |
| T2 | Model hallucinates a payment | H | FR-08 | S-HALL | M1 | todo |
| T3 | Double payout by retry or race | H | FR-17, NFR-04 | S-RACE; EqubGate-I2 | M2 | todo |
| T4 | Early or out-of-order payout | H | FR-16 | S-EARLY; EqubGate-I4 | M1 | todo |
| T5 | Wallet-binding swap before payout | H | FR-02, FR-03 | S-SWAP | M2 | todo |
| T6 | Rule tampering mid-cycle | H | FR-03 | S-RULE | M2 | todo |
| T7 | Approval bypass or collusion | H | FR-24 | S-APPR | M4 | todo |
| T8 | Pause bypass | H | FR-25, FR-26 | S-PAUSE; EqubGate-I5 | M3 | todo |
| T9 | Credit from a non-final transfer | M | FR-06, FR-08 | S-FINAL | M2 | todo |
| T10 | Replay or reuse of a transfer | H | FR-07 | S-DUP | M1 | todo |
| T11 | Spoofed sender | H | FR-07 | S-SPOOF | M1 | todo |
| T12 | Wrong or lookalike token | H | FR-07 | S-TOKEN | M1 | todo |
| T13 | Dust and rounding exploits | H | FR-09, NFR-01 | S-DUST | M1 | todo |
| T14 | Wrong destination | M | FR-07 | S-DEST | M1 | todo |
| T15 | Overpayment abuse | M | D8 rules | S-OVER | M4 | todo |
| T16 | Decision-log tampering | H | FR-21, FR-22 | S-LOG | M5 | todo |
| T17 | Sandbox leaking into real metrics | H | FR-30, FR-31 | S-MODE; separate databases | M7 | todo |
| T18 | Inflated or blended traction | H | FR-30, FR-40, NFR-12 | registry-check CLI | M7 | todo |
| T19 | Secrets in source or client | H | NFR-06 | pre-commit hook; audit section 1 | M0 | todo |
| T20 | Broken access control | H | FR-32 | RLS matrix test; audit sections 2-3 | M2 | todo |
| T21 | Client-only validation | H | NFR-06 | route validation tests; audit section 4 | M2 | todo |
| T22 | Vulnerable or hallucinated dependencies | H | NFR-06 | dependency audit; audit section 5 | M2, M7 | todo |
| T23 | Cost and denial of service on paid APIs | H | NFR-11 | rate-limit tests; audit section 6 | M4 | todo |
| T24 | Over-permissive CORS | M | NFR-06 | audit section 7 | M7 | todo |
| T25 | Unsafe uploads | M | NFR-06 | audit section 8 (no uploads planned) | M7 | todo |
| T26 | Session theft or weak auth | M | FR-32 | session tests | M2 | todo |
| T27 | Fake webhook events | M | NFR-06 | signature tests (if webhooks used) | M6 | todo |
| T28 | Testnet or provider outage | M | FR-38, NFR-02 | outage drills | M6 | todo |
| T29 | Privacy leak via public audit view | M | FR-33, NFR-07 | audit-view data review | M7 | todo |
| T30 | Social engineering of organizer | M | FR-03, FR-24 | rule-freeze tests | M4 | todo |
| T31 | Model outage causes unsafe fallback | H | FR-13, NFR-02 | S-MODEL-DOWN | M4 | todo |
| T32 | App-managed custody exposure | H | FR-15, NFR-06 | credential-map review; role grant tests | M3 | todo |

Coverage check: 32 threats, 22 High, each High threat has at least one named test or review.

## 3. Evidence claims matrix

| Claim | Statement | Artifact (generated, never hand-edited) | Milestone | Status |
|---|---|---|---|---|
| C1 | Real people used it | evidence/participants.md | M7 | todo |
| C2 | A real group completed a full cycle | evidence/rounds.json | M7 | todo |
| C3 | USDC actually moved | evidence/volume.json | M7 | todo |
| C4 | Real businesses used it | evidence/pilots.md | M7 | todo |
| C5 | The agent decides, not just automates | evidence/decisions.json | M7 | todo |
| C6 | Every decision is explained | evidence/coverage.json | M7 | todo |
| C7 | Cannot be tricked into moving funds | evidence/scenarios.md; Foundry invariant output | M5 | todo |
| C8 | The record cannot be silently changed | evidence/integrity.md | M5 | todo |
| C9 | Discrepancies are surfaced | evidence/discrepancies.md | M5 | todo |
| C10 | Circle and Arc tools used meaningfully | evidence/circle-usage.md | M7 | todo |
| C11 | Payouts are idempotent | evidence/scenarios.md | M5 | todo |
| C12 | Fast enough | evidence/latency.json | M5 | todo |
| C13 | We intend to keep building | README roadmap | M7 | todo |
| C14 | Members found it useful | evidence/interviews.md | M7 | todo |

## 4. Spike results

| # | Spike | Status |
|---|---|---|
| 1 | Developer-controlled wallet sends USDC from code | Not started |
| 2 | Agent wallet calls a contract | **Passed** (Oct 2, approve tx 0x5092...9009) |
| 3 | User-controlled wallets on Arc Testnet | Not started |
| 4 | USDC ERC-20 events and balance semantics | Partly known (decimals 18 native, 6 ERC-20); events not tested |
| 5 | Finality rule | Not started |
| 6 | USYC approve, deposit, redeem | Partial: approve passed, deposit reverted outside reported window; retry 15:31-21:00 Addis |
| 7 | RPC rate limits | Not started |
| 8 | Supabase custom roles through the pooler | Not started |
| 9 | Hosted model returns valid JSON | **Passed** (gemini-3.1-flash-lite 10/10, 1.4 s median) |

## 5. Security audit checkpoints (use the Security Audit Prompt, sections 1 to 8)

| Checkpoint | When | Gate |
|---|---|---|
| A1 | After the enforcement layer exists and **before any real participant joins** (target Oct 3 evening) | No CRITICAL or HIGH finding open; otherwise the first real round does not start |
| A2 | After the agent service and approval inbox (target Oct 6) | No CRITICAL or HIGH open |
| A3 | Before submission (target Oct 9) | Rating recorded in the README; no CRITICAL or HIGH open |

## 6. Definition of done for a requirement

1. Code merged with the requirement ID in the commit message.
2. Every named test exists, passes, and fails when the behavior is broken (check by temporarily breaking it once).
3. Threats listed for the row are covered by their tests.
4. If the row has a claim, the evidence script produces the artifact from real data.
5. The Status column moves to `evidenced`.
