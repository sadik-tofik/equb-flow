# BRS: Business Requirements Specification

**Project (working title):** EqubFlow, an autonomous Equb (rotating savings group) treasury agent with a built-in proof-of-receipt reconciler
**Event:** Tameion Agents Hackathon (Canteen x Circle), settled in USDC on Arc
**Version:** 0.5 (deadline extended to Oct 17)
**Deadline:** October 17, 2026, 11:59 PM ET (about 6:59 AM Oct 18, Addis Ababa); extended by the organizers from Oct 10
**Status:** DRAFT. Nothing here is locked until the review checklist at the end is signed off.

**Source tags** (used throughout so unverified claims never pass as findings):
`[Sponsor]` from the hackathon brief or organizer posts. `[General]` common knowledge about Equbs, to be verified with real groups. `[Assumption]` our own belief, not yet tested. `[Interview]` reserved for real conversations (none yet).

---

## 1. Purpose

Define why this product exists, who it serves, what success means, and what is deliberately out of scope, so that the SRS, design documents and code can be traced back to a business reason. This document says nothing about technology choices; those start in the SRS and PDR.

## 2. Business context

- The hackathon asks for AI agents that manage a business's money on the owner's behalf, settled in USDC on Arc. `[Sponsor]`
- Judging weights: Agentic Sophistication 30%, Traction 30%, Circle tool usage 20%, Innovation 20%. `[Sponsor]`
- Traction means genuine usage during the event window: real participants, real payment flow, volume that can be pointed to. Test USDC counts; real mainnet USDC counts more. `[Sponsor]`
- The organizers' published research warns that a ledger can balance while an agent pays the wrong vendor, pays twice, or records a payment that never happened, and that model output must be an input to a decision, never the release condition. `[Sponsor]`
- The generic "treasury dashboard + on-chain budget cap + yield sweep + hashed audit log" space already has strong entries. `[Sponsor]` (public Discord posts)
- Official FAQ, in priority order: it runs on Arc with USDC actually flowing on the Circle Agent Stack; the team intends to keep building after the event; a business is already using it for a real problem. `[Sponsor]`
- FAQ on traction: a real business can be small (a freelancer chasing three invoices counts); a synthetic dataset does not count; "if nobody's actual money is on the other side of the decision, the agent isn't being tested." `[Sponsor]`
- FAQ on autonomy: the agent should be useful without asking permission for every payment, bounded by something it cannot talk its way past (a contract, a human-signing threshold, a complete after-the-fact record). `[Sponsor]`
- FAQ on prior work: judged on the delta between where the project stood when Tameion began and where it ends, for both product and traction. `[Sponsor]` Our baseline is a new project: zero users and zero transactions at start (to be recorded in the Evidence Spec).

## 3. Problem statement

*(No solution in this section, per the playbook rule.)*

A rotating savings group pools money from members every round and pays the whole pot to one member each round. `[General]` Someone must track who paid, how much, and when; decide or enforce who is paid next; handle members who pay late, partially or not at all; and keep the pot safe between collection and payout. Today that role is a person with a notebook or a phone, which makes the group depend on one human's honesty, availability and record-keeping. `[General]` `[Assumption]`: the pot also sits idle, earning nothing, between collection and payout.

## 4. Stakeholders

| Stakeholder | Interest | Notes |
|---|---|---|
| Equb member (contributor and eventual recipient) | Fair order, safe pot, proof of what was paid and received | Primary user |
| Equb organizer / treasurer | Less manual tracking, fewer disputes, no personal liability for the pot | Primary user; `[Assumption]` most likely early adopter |
| Hackathon judges | Real usage, a genuinely deciding agent, strong Circle stack use, novelty | Review asynchronously, without us in the room |
| Other Tameion builders | Possible reviewers or testers; not target users | Optional source of extra traction |
| Development team | Clear, traceable scope | Owner of this document set |

## 5. Business objectives

Targets are **proposed** and marked for the team to accept or change in review.

| ID | Objective | Measure (proposed target) | Rubric link |
|---|---|---|---|
| BO-1 | Show real people running real Equb rounds through the product during the event window | 1 or more real group of 3 to 5+ human members, each with their own wallet, completing one full cycle (every member receives the pot once); more members or groups only if recruited. Simulated participants are reported separately and never counted here | Traction 30% |
| BO-2 | Show that the agent makes explainable decisions, not scheduled actions | 100% of agent decisions recorded with inputs, rule applied and reason; 5 or more decision types that visibly change the outcome | Agentic Sophistication 30% |
| BO-3 | Guarantee the agent cannot move money outside group rules, even if it is deceived | Adversarial test suite passes: 0 unauthorized fund movements across all injected attack cases | Innovation 20%, safety |
| BO-4 | Use the Circle and Arc stack meaningfully | Wallets, USDC settlement and USYC float management all working end to end; other primitives only if they earn their place | Circle tool usage 20% |
| BO-5 | Produce reviewer-ready evidence with nobody present | Public repo, under-3-minute video, live link usable without login, traction numbers reproducible from on-chain data | All (submission requirements `[Sponsor]`) |
| BO-6 | Put the proof-of-receipt engine in front of real small businesses with a real money problem (freelancers or small studios collecting USDC invoices) | 2 or more real businesses or freelancers, each settling 1 or more real invoices through the reconciler (proposed) | Traction 30% (FAQ Q3) |

## 6. Scope

### In scope (business capabilities)

- Group setup: members, contribution amount, round schedule, payout rules.
- Contribution collection with independent verification that money actually arrived (the proof-of-receipt function).
- Payout order handling and payout release, bounded by group rules.
- Handling of late, partial, over- and mis-attributed contributions, with any discrepancy shown openly, never silently absorbed.
- Managing the pot's idle time between collection and payout, including the timing decision.
- A complete, verifiable decision record per group.
- Human oversight: members or organizer can approve, reject, pause.
- Three participant modes, flagged everywhere: `real` (a human with their own wallet), `simulated` (scripted persona wallets for stress tests), `sandbox` (reviewer-run, resettable, no login).

### Out of scope (exclusion list)

| Not building | Why not | Comes back when |
|---|---|---|
| Fiat on/off-ramps for real cash | Legal and time risk, not needed for the demo | After legal advice and a real pilot |
| Real-money pooling among the public | Regulatory exposure; test USDC is accepted by the sponsor | Only after legal review |
| Credit scoring beyond in-group behavior | No data, and easy to overclaim | After multi-cycle history exists |
| Cross-group lending or collateral markets | Scope explosion | Later roadmap |
| Native mobile apps | Web on any phone is enough | After validation |
| General-purpose ERP integrations (SolidInvoice, Odoo) | Different product; can appear as roadmap | Later roadmap |
| Multi-chain support | Arc only for this event | Later roadmap |

## 7. Business rules (non-negotiable)

- **BRU-1.** The agent may propose, explain and prepare; it may never be the sole reason funds move. Release conditions are deterministic and verifiable, and stay enforced even if the agent is wrong or manipulated.
- **BRU-2.** A contribution counts only when independently verified as received; a claim, message or model statement is not evidence.
- **BRU-3.** Any amount that does not reconcile is displayed as a visible discrepancy with an owner, never hidden in a rounding or catch-all account.
- **BRU-4.** Every agent decision, including refusals and waits, is recorded with its reasoning.
- **BRU-5.** A human authority can pause the system at any time.
- **BRU-6.** The group's rules are visible to all members before they join and cannot be changed silently mid-cycle.

## 8. Business requirements

Priority uses MoSCoW: **M**ust, **S**hould, **C**ould, **W**on't (this event).

| ID | Requirement | Priority | Traces to |
|---|---|---|---|
| BR-01 | An organizer can create a group with members, contribution amount, round cadence and payout rules | M | BO-1 |
| BR-02 | Members can contribute and see verified proof that their contribution was received | M | BO-1, BRU-2 |
| BR-03 | The system verifies each contribution against on-chain evidence before crediting it | M | BO-3, BRU-2 |
| BR-04 | Partial, late, duplicate and mis-attributed payments are detected and surfaced with a proposed resolution | M | BO-2, BRU-3 |
| BR-05 | The payout for each round is released only when group rules are satisfied | M | BO-3, BRU-1 |
| BR-06 | The agent proposes and explains payout ordering changes and default handling within group rules | M | BO-2 |
| BR-07 | Idle pot funds are managed between collection and payout, with the timing decision explained | S | BO-2, BO-4 |
| BR-08 | Every decision and its reasoning is recorded and independently verifiable | M | BO-2, BO-5, BRU-4 |
| BR-09 | Organizer or members can approve, reject or pause agent actions | M | BRU-5 |
| BR-10 | Members can be notified of due dates, receipts and payouts | S | BO-1 |
| BR-11 | The product runs against an adversarial test suite (duplicate, partial, spoofed, injected inputs) and the results are published | S | BO-3 |
| BR-12 | Traction metrics are computed from on-chain and system data and exposed for the submission form | M | BO-5 |
| BR-13 | A reviewer can try the product without creating an account or installing anything | S | BO-5 |
| BR-14 | Every participant and transaction is flagged `real`, `simulated` or `sandbox`; traction is reported from `real` only | M | BO-1, BO-5 |
| BR-15 | The same proof-of-receipt engine can verify a payment against an invoice, not only an Equb contribution | S | BO-6 |
| BR-16 | The system states, for every real participant, whether their stake is testnet or mainnet, and never blends the two in reported figures | M | BO-1, BO-5 |

## 9. Riskiest assumption (playbook Phase 3)

> **Real people will actually run repeated Equb rounds on this product, on testnet money, within the event window.**

If false, traction collapses to self-generated volume, which the rubric treats as the weakest kind. Everything on the demo path should also work with simulated participants, but the plan should treat real groups as the critical dependency and start recruiting immediately.

Two build tracks (playbook two-MVP split), to be detailed in the PDR:
- **Demo-path build:** the exact 3-minute walkthrough, with seeded groups and scripted edge cases allowed.
- **Real-path build:** the parts that must survive real messy input: receipt verification, discrepancy handling, and enforcement of release rules. These are the novel claim and are never faked.

## 10. Constraints

- Hard deadline: **Oct 17**, 11:59 PM ET (extended from Oct 10 by the organizers; about 6:59 AM Oct 18 in Addis Ababa). Judging is asynchronous, with no live demo day. Resubmission is allowed any number of times before the deadline. `[Sponsor]`
- Deliverables: public GitHub repo, video under 3 minutes, traction answers; live link strongly encouraged. `[Sponsor]`
- Must settle in USDC on Arc. `[Sponsor]`
- Testnet by default; any mainnet use only with legal and risk review. `[Assumption]`
- USYC on testnet requires wallet allowlisting through Circle Support, which takes 24 to 48 hours. `[Sponsor]` (Discord)
- Round cadence: real Equbs run weekly or monthly `[General]`, which fits only 1 or 2 rounds in the window. A compressed cadence (for example daily rounds) will be needed and must be disclosed honestly as accelerated. **Decision needed.**
- No LLM credits are provided; model choice and cost are ours. `[Sponsor]` (Discord)
- The FAQ frames traction around a business with a real money problem. An Equb of individuals may read as personal finance, so BO-6 (invoice pilots) is added as a second, FAQ-aligned traction channel.

## 11. Assumptions and dependencies

- `[Assumption]` Equb members are comfortable with a phone-based web flow and wallet abstraction (they should not need to understand gas or keys).
- `[Stated by team]` 3 to 5 team members will join as the first real group, each with their own wallet. `[Assumption]` extra outside members (classmates, Discord builders) can be added to make the group more convincing.
- `[Assumption]` Group participants will accept testnet money for a trial.
- Dependency: Circle Wallets, Arc testnet access, USYC allowlisting.
- Dependency: an LLM provider for the agent's judgment layer.

## 12. Top business risks (early)

| Risk | Impact | Early mitigation (detailed in the Threat Model and PDR) |
|---|---|---|
| Not enough real participants | Traction score collapses | Start recruiting now; also allow reviewer-run sandbox groups |
| Agent looks like a scheduled script | Agentic score collapses | Define decision types and record reasoning from Sprint 1 |
| Attack or bug moves funds wrongly | Loses credibility | Deterministic enforcement plus adversarial tests |
| Regulatory or reputational trouble with real-money pooling | Legal risk | Testnet only for the event |
| Overbuilding | Unfinished core | Fixed exclusion list, small Must set |

## 13. Open decisions for team review

1. Round cadence to use for the trial (proposed: compressed rounds, disclosed).
2. Whether any mainnet USDC is used at all (proposed: no).
3. Custody model: contract-held pot versus wallet-held pot (deferred to PDR, business need is only BRU-1).
4. Final name.
5. Acceptance of the proposed targets in section 5.
6. **RESOLVED (team): testnet only for this event.** Mainnet becomes a later option if marketing after the event shows demand. Original question: testnet only, or a small mainnet stake. Mainnet counts more per the rubric but adds legal and operational risk, and local rules on crypto must be checked by the team before any real-money use. This document does not give legal advice.
7. **RESOLVED (team): yes.** Invoice pilots (BO-6) will use family members or coworkers as payers, and possibly Discord volunteers. The real Equb group is family members and colleagues.

## 14. Review checklist (sign-off gate for v1.0)

- [ ] Every BR has a rubric or rule link
- [ ] Exclusion list has more rows than the "in scope" list has areas
- [ ] Riskiest assumption named and owned
- [ ] Targets accepted or changed
- [ ] No technology decisions leaked into this document

## 15. Change log

- **v0.2:** BO-1 lowered to one real group drawn from the team; added BR-14 and the three participant modes; replaced the two-group recruiting assumption.

- **v0.3:** added FAQ facts to the business context; added BO-6, BR-15, BR-16 and open decisions 6 and 7; recorded the delta baseline.

- **v0.4:** recorded the testnet-only decision and the participant sources for the Equb group and invoice pilots.
- **v0.5:** deadline moved from Oct 10 to Oct 17, 11:59 PM ET.

## 16. Next document

**SRS v0.1** will convert BR-01 to BR-13 into testable functional and non-functional requirements (IDs `FR-xx`, `NFR-xx`, each traced back to a `BR-xx`).