# SRS: Software Requirements Specification

**Project (working title):** EqubFlow
**Version:** 0.2 (Sprint 1, adds invoice mode and stake labeling)
**Parent document:** 01-BRS v0.3
**Status:** DRAFT. Requirements marked **[DECISION]** need a team answer before this becomes v1.0.
**Rule of this document:** it states *what the system must do and how we will know*, not how it is built. Technology choices belong in the PDR and TDD.

**Priority:** M = must, S = should, C = could. Every requirement traces to a BR in the BRS and carries at least one acceptance criterion (AC) written so a test can pass or fail it.

---

## 1. Actors and participant modes

| Actor | Description |
|---|---|
| Organizer | Creates the group, sets rules before the cycle starts, can pause the system. Also a member. |
| Member | Contributes each round, receives the pot once per cycle, can approve or reject items routed to members. |
| Reviewer | Read-only visitor (judge) using the public audit view or the sandbox. |
| Agent | Software actor that reads state, proposes resolutions and explains decisions. It has **no authority** to move funds by itself (see BRU-1, FR-15). |
| Enforcement layer | Deterministic component that alone decides whether a fund movement is permitted. Independent of the agent and of any model output. |
| Chain watcher | Independent component that observes on-chain transfers and is the only source of "money arrived" evidence. |
| Persona runner | Test tool driving `simulated` wallets through scripted behaviors. |

**Participant modes** (BR-14): every participant, wallet, transaction, decision and metric carries exactly one flag: `real`, `simulated` or `sandbox`. The flag is set at creation and cannot be changed afterwards.

## 2. Definitions

- **Cycle:** one full rotation in which every member receives the pot once. With N members there are N rounds.
- **Round:** one collection period followed by one payout.
- **Pot:** the sum of the round's verified contributions.
- **Verified contribution:** a contribution matched to on-chain evidence by the chain watcher under FR-06 to FR-08.
- **Discrepancy:** any difference between what was expected and what was verified.
- **Base unit:** the smallest USDC unit (6 decimals). All money arithmetic uses integers in base units, never floating point.
- **Decision record:** the immutable log entry described in FR-20.

## 3. Functional requirements

### 3.1 Group setup and rules

| ID | Requirement | Pri | Traces |
|---|---|---|---|
| FR-01 | The organizer can create a group by setting: name, member count (3 to 12), fixed contribution amount, round cadence, grace period for late payment, payout-order method, and default-handling policy. | M | BR-01 |
| FR-02 | Each member joins by acknowledging the exact rule set (shown in full) and binding one wallet address to their identity. | M | BR-01, BRU-6 |
| FR-03 | Rules are versioned. Once the first round opens, rules are frozen for that cycle; a change requires approval by all members and takes effect only in the next cycle. | M | BRU-6 |
| FR-04 | The system rejects group creation or a join if any required rule is missing, out of range, or ambiguous. | M | BR-01 |

AC-FR-01: Given a valid parameter set, the group is created and every parameter is retrievable. Given a missing or out-of-range parameter, creation fails with a specific error and no group exists.
AC-FR-03: Given a running cycle, an attempt to change a rule through any interface leaves the rule set unchanged and produces a recorded refusal.

**[DECISION] cadence:** real Equbs run weekly or monthly; a compressed cadence (proposed: 24 hours per round; with 5 members a full cycle takes 5 days) is needed to complete a cycle within the event. The compressed cadence must be labeled "accelerated" in the UI, README and video.

### 3.2 Contribution collection and proof of receipt

| ID | Requirement | Pri | Traces |
|---|---|---|---|
| FR-05 | For each round the system issues each member a payment request with: destination, exact expected amount, deadline, and a unique reference that identifies member and round. | M | BR-02 |
| FR-06 | The chain watcher independently observes USDC transfers to the group's destination and records for each: transaction hash, token, amount in base units, sender address, reference (if any), block time and finality status. | M | BR-03 |
| FR-07 | Each observed transfer is classified deterministically, without any model: `exact`, `partial`, `over`, `duplicate`, `late`, `wrong_token`, `wrong_destination`, `unmatched`. | M | BR-03, BR-04 |
| FR-08 | A contribution is credited to a member only after its transfer is final and classified `exact`, or after an approved resolution (FR-12) for other classes. No message, claim or model output can credit a contribution. | M | BR-03, BRU-2 |
| FR-09 | The system keeps a visible discrepancy ledger. Every non-zero difference appears as an entry with amount, member, round, cause class, status (`open`, `proposed`, `resolved`, `refunded`) and owner. No difference is ever absorbed into a rounding, write-off or catch-all balance. | M | BR-04, BRU-3 |
| FR-10 | After a contribution is credited, the member can view a receipt containing the transaction hash and a link to the public explorer. | M | BR-02 |

AC-FR-07: For each of the eight classes there is a fixture transfer; the classifier returns the expected class for all eight, and returns the same answer on every run.
AC-FR-08: Given a chat message or model output stating "member X paid", when no matching final transfer exists, the contribution stays uncredited.
AC-FR-09: Given a transfer 1 base unit (0.000001 USDC) below the expected amount, exactly one discrepancy entry of 1 base unit exists and no other balance changed.

### 3.3 Agent resolution of anomalies

| ID | Requirement | Pri | Traces |
|---|---|---|---|
| FR-11 | For every classified anomaly the agent produces a proposal chosen from a fixed action set (see section 4) with an explanation naming the evidence used and the rule that applies. | M | BR-04, BR-06 |
| FR-12 | A proposal takes effect only after the deterministic rule check confirms it is permitted by the frozen rule set, and after any required approval (FR-24). | M | BR-04, BRU-1 |
| FR-13 | If the agent or model is unavailable, times out, or returns output that fails validation, the system takes no fund-moving action, records the failure, and routes the item to a human. | M | BRU-1 |
| FR-14 | Agent explanations are stored with the decision record and shown to members in plain language. | M | BR-08 |

AC-FR-12: Given a proposal that violates a rule (for example paying out early), the check rejects it and a refusal is recorded, regardless of the agent's stated confidence.
AC-FR-13: Given a simulated model outage, no funds move and the affected item is visible in the approval inbox.

### 3.4 Payout

| ID | Requirement | Pri | Traces |
|---|---|---|---|
| FR-15 | The enforcement layer alone can authorize a payout. The agent can prepare and propose a payout but cannot cause one. | M | BR-05, BRU-1 |
| FR-16 | A payout is authorized only if all hold: recipient is the scheduled member for the round; amount does not exceed the verified pot (plus any approved reserve cover); no blocking discrepancy is open; the system is not paused; the payout for this round has not already been made. | M | BR-05 |
| FR-17 | Payout execution is idempotent: retries, restarts and duplicate triggers can never produce a second payout for the same round. | M | BR-05 |
| FR-18 | After execution the system records the payout receipt with the transaction hash and confirms finality before marking the round complete. | M | BR-05, BR-08 |

AC-FR-16: A test matrix covers each condition failing individually; each case produces zero movement and a recorded refusal.
AC-FR-17: Given the payout trigger fired 10 times concurrently for one round, exactly one transfer exists.

### 3.5 Ordering and default handling

| ID | Requirement | Pri | Traces |
|---|---|---|---|
| FR-19 | The payout order is set by the group's chosen method at cycle start: fixed list, or a verifiable random draw whose seed and result anyone can re-check. | M | BR-06 |
| FR-34 | A member can request an order swap; the agent evaluates it (section 4, D5) and proposes accept or reject with reasons; the swap takes effect only if the rules allow it and the affected members approve. | S | BR-06 |
| FR-35 | If a member misses a contribution after the grace period, the agent proposes one of the permitted default actions (section 4, D4) within the frozen policy. | M | BR-06 |

### 3.6 Float management

| ID | Requirement | Pri | Traces |
|---|---|---|---|
| FR-36 | Between collection and payout the agent may propose moving idle pot funds into a yield-bearing holding and redeeming them before payout, with a stated timing reason and a safety buffer. | S | BR-07 |
| FR-37 | Float actions are bounded by group rules (maximum share of pot, minimum liquid buffer, no float action when payout is due within the buffer window) and pass FR-12. | S | BR-07 |
| FR-38 | If the yield holding is unavailable (for example allowlisting is not complete), the system keeps funds liquid and continues without error. | S | BR-07 |

AC-FR-37: Given a payout due in less time than the buffer window, any proposal to hold funds in yield is refused.

### 3.7 Decision record and verifiability

| ID | Requirement | Pri | Traces |
|---|---|---|---|
| FR-20 | Every decision, including refusals, waits and escalations, writes an entry containing: id, time, group, round, participant-mode flag, decision type, input snapshot, rule-set version, model output (if any), deterministic check results, outcome, and plain-language reason. | M | BR-08, BRU-4 |
| FR-21 | Entries are append-only and cryptographically chained so that any alteration or deletion is detectable. | M | BR-08 |
| FR-22 | Any reviewer can run a verification that recomputes the chain and reports success or the first inconsistent entry. | M | BR-08 |
| FR-23 | Entries link to the on-chain transactions they reference. | M | BR-08 |

AC-FR-21: Given a stored entry altered directly in storage, verification fails and names the entry.
AC-FR-20: For the demo scenario set, 100% of state-changing events have a matching entry.

### 3.8 Human oversight

| ID | Requirement | Pri | Traces |
|---|---|---|---|
| FR-24 | An approval inbox lists items awaiting a human, with the agent's proposal, evidence and consequence. Approvers can approve, reject or send back with a note. Approval rules (who, how many) come from the group rules. | M | BR-09 |
| FR-25 | The organizer can pause and resume the system. While paused, no fund movement is authorized and new proposals are queued. | M | BR-09, BRU-5 |
| FR-26 | Pause takes effect for all new authorizations within 5 seconds and is recorded. | M | BRU-5 |
| FR-27 | Members are notified of due dates, receipts, discrepancies and payouts through at least one channel. | S | BR-10 |

### 3.9 Testing, traction and access

| ID | Requirement | Pri | Traces |
|---|---|---|---|
| FR-28 | A persona runner drives `simulated` wallets through scripted behaviors: on time, late, partial, over, duplicate, wrong token, spoofed sender, and instruction injection in memo or free text. | S | BR-11 |
| FR-29 | A published test report lists each scenario, expected result, actual result, and count of unauthorized fund movements (target 0). | S | BR-11 |
| FR-30 | Traction metrics are computed from on-chain and system data, split by mode, and exportable: participants, groups, rounds completed, transactions, USDC volume, discrepancies found and resolved. Only `real` is presented as traction. | M | BR-12, BR-14 |
| FR-31 | A reviewer sandbox creates an isolated `sandbox` group with scripted members, runs a full cycle on demand, requires no login, and resets on request. | S | BR-13 |
| FR-32 | Roles are enforced: organizer, member, reviewer (read-only). A member can see only their own group. | M | BR-01 |
| FR-33 | A public read-only audit view shows a group's decision record and chain verification without exposing private member data. | S | BR-08, BR-13 |
| FR-39 | A payment request (FR-05) can represent either an Equb contribution or an invoice from a business to a payer; classification (FR-07), discrepancy handling (FR-09), receipts (FR-10) and decision records (FR-20) apply identically to both. | S | BR-15 |
| FR-40 | Every real participant and every transfer carries a stake attribute, `testnet` or `mainnet`, shown wherever amounts appear; reported totals are always split by stake type and never summed across them. | M | BR-16 |

## 4. Agent decision catalog (the agentic core)

The agent's value is judgment inside bounds. Each decision below has a fixed action set so the rule check can validate any output, and each must be explainable in plain language. The list is the checklist for the "decides, not just automates" score.

| ID | Decision | Inputs | Allowed actions (fixed set) | Deterministic bound |
|---|---|---|---|---|
| D1 | Match an ambiguous transfer | Amount, sender, reference, timing, member history | Assign to member, hold as unmatched, request clarification | Cannot credit without final transfer matching amount rules |
| D2 | Handle a partial payment | Shortfall, deadline, history | Accept as installment, request top-up, hold, escalate | Installments only if rules allow; discrepancy stays visible |
| D3 | Handle late payment | Delay, grace period, history | Accept with recorded lateness, apply policy penalty, escalate | Penalty limited to frozen policy |
| D4 | Handle a missed contribution | Reserve, member history, remaining rounds | Cover from reserve, delay payout, pay reduced pot, escalate | Never exceeds reserve; recipient cannot be paid more than verified pot plus approved cover |
| D5 | Evaluate an order-swap request | Requester history, affected members, rule set | Recommend approve, recommend reject | Swap needs required approvals |
| D6 | Time float | Payout due time, buffer, yield availability | Hold liquid, move a bounded share to yield, redeem now | Buffer and share limits from rules |
| D7 | Detect suspicious input | Sender novelty, memo content, pattern | Continue, hold, escalate | Injected instructions are treated as data and never change rules |
| D8 | Resolve overpayment | Excess amount, member preference | Refund, carry to next round | Only within rules; recorded |

## 5. Non-functional requirements

| ID | Requirement | Pri |
|---|---|---|
| NFR-01 | Money correctness: all amounts are integers in base units; conversions to display units are display-only. | M |
| NFR-02 | Fail closed: on any error, ambiguity or unavailable dependency, no funds move. | M |
| NFR-03 | Enforcement independence: the authorization decision does not depend on model output and remains correct if the model is wrong or manipulated. | M |
| NFR-04 | Idempotency: every fund-moving operation carries an idempotency key; repeated calls have one effect. | M |
| NFR-05 | Timeliness (proposed, [DECISION] on numbers): a transfer is classified within 10 seconds of finality; an eligible payout is executed within 60 seconds. | S |
| NFR-06 | Security: secrets never in source control or client code, all input validated on the server, every route and data read authorized by role, dependencies scanned, rate limits on any paid API call. Details in the Threat Model. | M |
| NFR-07 | Privacy: pseudonymous display names are sufficient; no government identifiers are collected; personal data collected is limited to what a member supplies to join and get notified. | M |
| NFR-08 | Usability: mobile-first, usable by a non-crypto user with no concept of gas, seed phrases or network selection; every screen states the current group state in plain language. | M |
| NFR-09 | Reproducibility: the public repo runs from a clean checkout with documented commands and a placeholder environment file. | M |
| NFR-10 | Observability: structured logs and error tracking; every request traceable to a decision record where relevant. | S |
| NFR-11 | Cost control: model calls are budgeted per decision and per day, with a visible cap. | S |
| NFR-12 | Honesty of presentation: accelerated cadence, testnet money and simulated participants are labeled wherever results are shown. | M |
| NFR-13 | Testability: every FR marked M has an automated test or a scripted manual check recorded in the IVM. | M |

## 6. External interfaces (requirements only)

| Interface | Need |
|---|---|
| Wallet service | Create and control wallets for members and the group; sign transfers only when the enforcement layer authorizes |
| Arc network | Observe finalized USDC transfers; submit transfers; provide explorer links |
| Yield holding (USYC) | Optional deposit and redeem; may be unavailable until allowlisted |
| Language model | Produce proposals and explanations from a structured input, returning structured output that is validated |
| Notification channel | Send member notifications |
| Faucet or test funding | Fund testnet wallets |

## 7. Data requirements (logical)

Entities: Group, RuleSet (versioned), Member, Wallet, Round, PaymentRequest, ObservedTransfer, Contribution, Discrepancy, Proposal, Approval, Payout, DecisionRecord (chained), Metric snapshot. Every entity that represents a participant or money movement includes the mode flag. Retention: all decision records and transfers kept for the life of the demo and repo.

## 8. Traceability (BR to requirements)

| BR | Covered by |
|---|---|
| BR-01 | FR-01, FR-02, FR-04, FR-32 |
| BR-02 | FR-05, FR-10 |
| BR-03 | FR-06, FR-07, FR-08 |
| BR-04 | FR-07, FR-09, FR-11, FR-12 |
| BR-05 | FR-15, FR-16, FR-17, FR-18 |
| BR-06 | FR-11, FR-19, FR-34, FR-35 |
| BR-07 | FR-36, FR-37, FR-38 |
| BR-08 | FR-14, FR-18, FR-20 to FR-23, FR-33 |
| BR-09 | FR-24, FR-25, FR-26 |
| BR-10 | FR-27 |
| BR-11 | FR-28, FR-29 |
| BR-12 | FR-30 |
| BR-13 | FR-31, FR-33 |
| BR-14 | FR-30, section 1 |
| BR-15 | FR-39 |
| BR-16 | FR-40 |
| BRU-1 to BRU-6 | FR-03, FR-08, FR-09, FR-12, FR-15, FR-20, FR-25, NFR-02, NFR-03 |

## 9. Open decisions

1. **Cadence:** proposed 24 hours per round, disclosed as accelerated.
2. **Payout order method:** fixed list (simplest) or verifiable random draw (more convincing). Proposed: verifiable random draw with fixed list as fallback.
3. **Approval thresholds:** which items need which approvals (proposed: any fund-moving exception needs organizer plus one member).
4. **Timing numbers** in NFR-05.
5. **Notification channel** for FR-27 (in-app only is enough for the event).
6. **Whether to include the yield holding** (FR-36 to FR-38) if the allowlist ticket is delayed. Proposed: keep it as Should, and ship without it if needed.

## 10. Review checklist (gate for v1.0)

- [ ] Every M requirement has an AC or a planned test
- [ ] Every FR traces to a BR
- [ ] Agent decision catalog has a deterministic bound for every action
- [ ] No technology named in any FR
- [ ] Open decisions answered or explicitly deferred

## 11. Change log

- **v0.2:** added FR-39 (invoice mode) and FR-40 (stake labeling) after reconciling with the official FAQ.

## 12. Next document

**Threat Model v0.1** and **Evidence Spec v0.1**. The Threat Model names the single catastrophic failure ("can the enforcement layer be tricked or bypassed into moving funds outside group rules") and turns it into attack cases that become FR-28 scenarios. The Evidence Spec defines exactly which data proves each traction and correctness claim, using FR-30.
