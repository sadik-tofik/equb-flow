# Evidence Spec

**Project (working title):** EqubFlow
**Version:** 0.2 (adds custody type to the wallet registry)
**Parents:** 01-BRS v0.3, 02-SRS v0.2, 03-Threat Model v0.1
**Purpose:** define, before building, exactly what data proves each claim we will make to judges, where it comes from, and how a reviewer who was never in the room can check it. Judging is asynchronous, so evidence that cannot be verified alone does not count.

---

## 1. Principles

1. **Chain first.** If a claim can be proven from on-chain data, it is. Our own database is second. Screenshots and statements are last.
2. **Generated, not typed.** Every number in the README, video and submission form is produced by a script that reads chain data and the decision record. No hand-edited figures.
3. **Split by mode and stake.** `real`, `simulated` and `sandbox` are never added together. `testnet` and `mainnet` are never added together (SRS FR-30, FR-40).
4. **Delta, not total.** The organizers judge what changed during the event (FAQ Q6). We record a baseline and report the difference.
5. **Say what it doesn't show.** Each claim has a stated limit. Overclaiming is a credibility risk (Threat Model T18).

## 2. Evidence classes (strongest to weakest)

| Class | Source | Example |
|---|---|---|
| E1 | On-chain data | Transaction hashes, wallet balances, explorer links |
| E2 | Verifiable decision record | Hash-chained log entries with verification output |
| E3 | Automated test output | Scenario suite report, CI results |
| E4 | Human attestation | Member confirmation, interview notes, short quotes |
| E5 | Recorded demonstration | Video, screenshots |

A headline claim needs at least one E1 or E2 source. E4 and E5 support, never stand alone.

## 3. Baseline (record at project start)

Recorded once, committed to the repo, and referenced in the submission.

| Item | Baseline value |
|---|---|
| Baseline date | Date the first commit is made (target: Oct 1, 2026) |
| Repo state | Commit hash of the initial scaffold |
| Real participants | 0 |
| Real groups | 0 |
| Invoice pilot businesses | 0 |
| Transactions and volume | 0 |
| Product state | Documents only (BRS, SRS, Threat Model, Evidence Spec); no running code |

If any of the team's earlier work is reused, list it explicitly here with its own state, so the delta stays honest.

## 4. Claim register

Each claim has a metric, source, method, target, limit and artifact. "Target" values are proposals to accept or change.

| ID | Claim | Metric | Source | Verification method | Target | What it does not prove | Artifact |
|---|---|---|---|---|---|---|---|
| C1 | Real people used it | Distinct `real` participants each with their own wallet | E1, E2, E4 | Wallet registry lists each address with role and mode; each real member confirms participation; transfers originate from distinct addresses | 3 to 5+ | That they would use it without us asking | `evidence/participants.md` |
| C2 | A real group completed a full cycle | Rounds completed and payouts made in the `real` group | E1, E2 | Count of finalized payout transfers, one per member, matched to decision entries | Every member paid once | Behavior under real-money stakes if stake is testnet | `evidence/rounds.json` |
| C3 | USDC actually moved | Sum of finalized contribution and payout amounts, per stake type | E1 | Script sums transfers from chain data by registered wallet set | Reported, no minimum | That volume equals value or demand | `evidence/volume.json` |
| C4 | Real businesses used it for a real problem | Businesses or freelancers settling real invoices through the reconciler | E1, E4 | Invoice records matched to on-chain receipts; short attestation from each | 2 or more (proposed) | Long-term retention | `evidence/pilots.md` |
| C5 | The agent decides, not just automates | Count of decisions by type D1 to D8, the share where the agent's proposal differed from the default action, and the share proposed by the model versus the engine fallback (reported openly) | E2 | Script tallies decision records by type and outcome | 5+ types exercised | That the model is better than a human in general | `evidence/decisions.json` |
| C6 | Every decision is explained | Share of state-changing events that have a decision record with a reason | E2 | Script cross-checks chain events against records | 100% | Quality of the reasoning | `evidence/coverage.json` |
| C7 | The agent cannot be tricked into moving funds | Unauthorized fund movements across the scenario suite | E3, E1 | Persona-runner report plus a check of every simulated wallet's transfers | 0 | Safety against unknown attacks | `evidence/scenarios.md` |
| C8 | The record cannot be silently changed | Chain verification result, and result after a deliberate tamper test | E2, E3 | Verification tool outputs pass, then fail naming the altered entry | Pass then detect | Protection if the whole store and chain-head publication are both compromised | `evidence/integrity.md` |
| C9 | Discrepancies are surfaced, not hidden | Discrepancies detected and resolved; seeded 1-base-unit case caught | E2, E3 | Discrepancy ledger export vs. seeded scenarios S-DUST | All seeded cases caught | Real-world frequency of such errors | `evidence/discrepancies.md` |
| C10 | Circle and Arc tools are used meaningfully | List of primitives used, each with a transaction or contract link | E1 | Table of primitive to on-chain example | Wallets, USDC settlement, plus any others we actually use | Depth beyond what is shown | `evidence/circle-usage.md` |
| C11 | Payouts are idempotent | Number of payouts under 10 concurrent triggers | E3, E1 | S-RACE run plus chain check | Exactly 1 per round | Behavior under extreme load | `evidence/scenarios.md` |
| C12 | It is fast enough | Time from transfer finality to classification, and from eligibility to payout | E1, E2 | Timestamps from chain vs. record | Within NFR-05 numbers | Performance at scale | `evidence/latency.json` |
| C13 | We intend to keep building | Written post-event plan, with a stated first month | E4 | Roadmap section in README | Present | Any future outcome | `README.md` |
| C14 | Members found it useful | Answers to the six-question interview guide from real members | E4 | Interviews within 48 hours of the cycle ending, using Worksheet B Mode 3; verbatim quotes with consent | 3 or more | Statistical significance | `evidence/interviews.md` |

## 5. Wallet registry (the anchor for honesty)

A committed file listing every wallet the project uses:

| Field | Meaning |
|---|---|
| Address | Public address |
| Mode | `real`, `simulated`, `sandbox`, or `system` (group treasury) |
| Stake | `testnet` or `mainnet` |
| Custody | `app-managed` (our backend holds the keys, each action needs the member's own sign-in approval) or `self-custody` |
| Stake | `testnet` or `mainnet` |
| Owner role | Member device, persona runner, sandbox, or system |
| Funding source | Faucet, another registered wallet, or external |
| Added on | Date |

Rules:
- A `real` participant authenticates with their own email, approves each contribution themselves, and appears in the registry with a custody type. Custody type is stated openly in the README and video. People who do not make their own decisions (for example someone whose actions are clicked for them) are `simulated`, not `real`.
- `simulated` wallets are named by persona (for example `late-payer`) so a reviewer can tell them apart.
- No transfers between registered wallets purely to raise volume. Protocol flows (contribution, payout, refund, float) are the only counted movements.
- Any wallet not in the registry is excluded from all metrics.

## 6. The verification pack

One command reproduces every number in the claim register.

- **Inputs:** the wallet registry, chain data via public endpoints, the decision record.
- **Outputs:** the `evidence/` folder listed above, each file stamped with the generation time and repo commit.
- **Reviewer path:** clone, set placeholder configuration, run the command, compare to the README and video. The public audit view (FR-33) shows the same results without running anything.
- **Freeze:** a final pack is generated and committed before submission; later resubmissions regenerate it and note the new commit.

## 7. Mapping to the submission form

| Form asks for | Filled from |
|---|---|
| Public repo link | Repo with this documentation, tests, and `evidence/` |
| Video under 3 minutes | Script covering C2, C5, C7, C8 (see section 9) |
| Live link (optional, encouraged) | Sandbox plus public audit view (FR-31, FR-33) |
| How many businesses onboarded | C4 (invoice pilots) and C1 (real group), reported separately with plain wording |
| How much value the agent moved | C3, split by stake type and mode |
| What problems you are solving | C14 quotes plus the problem statement in the BRS |
| Whether we intend to continue | C13 |

## 8. Collection timeline

| When | Action |
|---|---|
| Day 0 | Commit baseline, create wallet registry, decide stake type |
| Daily | Run the verification pack, commit the snapshot, note anomalies |
| First real group start | Snapshot immediately before and after the first round |
| Mid-point | Dry run: a teammate not on the project follows the reviewer path alone |
| Cycle end | Run interviews (C14) within 48 hours; freeze traction figures |
| Two days before deadline | Generate final pack, submit early; resubmission is allowed |

## 9. Video plan (under 3 minutes)

1. Problem in one sentence, in a member's own words if available (15 s)
2. A real round: contributions arrive, agent verifies, one deliberate discrepancy shown openly (45 s)
3. The agent's judgment on a partial or late payment, with the explanation shown (30 s)
4. Attack scenes: injected memo and forged sender both refused, zero funds moved (30 s)
5. Tamper test: edit a log entry, run verification, see it caught (20 s)
6. Numbers slide generated by the pack, split by mode and stake, plus the delta from baseline (20 s)
7. What we will build next (10 s)

## 10. Quality bar for evidence

- Every number in public materials is traceable to a file in `evidence/`.
- No claim appears in the README that is not in the claim register.
- Limits ("what it does not prove") are stated next to each headline number.
- A first-time reviewer can reach every headline number in under 5 minutes.

## 11. Open decisions

1. **RESOLVED (team): testnet stake.** Wording of C2, C3 and the video must say "testnet USDC" plainly; mainnet is a post-event option.
2. **Invoice pilots (C4):** family members or coworkers (team decision). Each must be a real payer with a real invoice for a real amount of work or goods, settled in test USDC from their own wallet on their own device. The invoice's real-world amount and purpose are recorded next to the test USDC amount.
3. **Interview consent wording** for C14 and the public audit view.
4. **Where to publish the chain head** (repo, chain, or both).
5. **Numbers in NFR-05** for C12.

## 12. Next document

**PDR v0.1:** architecture options and trade-offs (including where the enforcement layer lives, how the agent is bounded, how float timing is decided, and the Circle Agent Stack components used), with one recommended option for the team to accept. Each option will be scored against the SRS, the Threat Model's H threats, and the evidence claims above.
