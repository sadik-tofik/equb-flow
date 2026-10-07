# PDR: Preliminary Design Review

**Project (working title):** EqubFlow
**Version:** 0.1 (Sprint 3, draft for review)
**Parents:** 01-BRS v0.4, 02-SRS v0.2, 03-Threat Model v0.1, 04-Evidence Spec v0.1
**Scope:** full SRS scope (all Must and Should requirements). Nothing is cut here. The build order in section 9 sequences the work so that something demonstrable exists at every milestone; it does not remove features.
**Status:** DRAFT. Each decision below has options, a scored comparison, a recommendation, and a "what would change my mind."

**Tags:** `[Known]` seen in Circle or Arc material during this project. `[Verify]` believed true but must be checked in the docs or on testnet before relying on it (each becomes a spike task in the TDD).

---

## 1. Design drivers

| Driver | Source | What it forces |
|---|---|---|
| The agent proposes, deterministic code decides | BRU-1, FR-12, FR-15, NFR-03 | A hard separation between agent, rule check and fund-moving credentials |
| Money arrived only if the chain says so | BRU-2, FR-06 to FR-08 | An independent chain watcher with finality handling |
| Discrepancies stay visible | BRU-3, FR-09, NFR-01 | Integer base-unit arithmetic, a discrepancy ledger |
| Everything is explainable and verifiable | BRU-4, FR-20 to FR-23 | An append-only chained decision record with a verifier |
| Humans can stop it | BRU-5, FR-25, FR-26 | Pause enforced at the authorization step |
| Real, mixed participants | BR-14, FR-30, FR-40 | Mode and stake flags on every row |
| Catastrophic failure: funds leave wrongly | Threat Model section 1 | Blast-radius limits that survive a compromised agent |
| Judges review alone | Evidence Spec | Sandbox, public audit view, one-command verification |
| Stack | Team decision | TypeScript, Next.js, Postgres; Solidity/Foundry for contracts |
| Constraints | Brief, Discord | Arc testnet; testnet spending policies on Agent Wallets are not available (mainnet only) `[Known]`; no LLM credits |

## 2. Decision D1: Where does the enforcement layer live?

This is the biggest decision, because it defines what "cannot talk its way past" means in practice (FAQ Q4).

### Options

**D1-A. Service-only enforcement.** The authorization logic is a TypeScript module inside a separate executor process. The executor alone holds wallet credentials. No contract beyond plain wallet transfers.

**D1-B. Contract-only enforcement.** All pot logic (contributions, eligibility, payout) lives in a Solidity vault. The service only relays calls.

**D1-C. Layered: service plus a minimal payout-gate contract.** The executor holds the credentials and runs full authorization (all FR-16 conditions). A small contract holds the pot and independently enforces the invariants that bound the damage if everything off-chain is compromised: fixed recipient per round, one payout per round, amount capped at the pot size, pause, no rebinding during a cycle.

### Comparison (1 = poor, 5 = strong)

| Criterion | Weight | A | B | C |
|---|---|---|---|---|
| Survives a compromised agent (T1, T2) | 5 | 4 | 5 | 5 |
| Survives a compromised executor or server (T3 to T8) | 5 | 1 | 5 | 4 |
| Build effort for one person with Claude | 3 | 5 | 2 | 3 |
| Fits proof-of-receipt story (reconciler stays meaningful) | 4 | 5 | 2 | 5 |
| Differentiation vs. teams already shipping on-chain budget caps | 3 | 2 | 2 | 4 |
| Evidence strength for judges (verifiable on chain) | 4 | 2 | 5 | 4 |
| Flexibility if requirements change mid-event | 2 | 5 | 2 | 4 |
| **Weighted total (max 130)** | | **92** | **95** | **112** |

### Recommendation: D1-C

- **Why not B:** if the contract itself records contributions, it knows who paid, and the reconciler (our core claim) becomes trivial for the Equb flow. The contract also cannot see off-chain facts like approvals, and a large contract is expensive to build and test alone.
- **Why not A:** a compromised executor can send the pot anywhere. The Threat Model rates T3, T5 and T6 as High.
- **What C gives us:** the worst case with a fully compromised agent *and* executor is that the scheduled recipient is paid early or in a reduced amount. Funds cannot go to anyone else, cannot go out twice, and cannot exceed the pot. That is a clear, testable, honest guarantee: **the blast radius is timing, not destination.**
- **Honest note on novelty:** on-chain spending bounds are not novel in this event (other teams ship them). Our difference is the round-scoped payout gate combined with independent proof-of-receipt, a decision catalog that visibly changes outcomes, and the Equb domain. The README should say that plainly.
- **Risk control:** the executor's authorization module is written against an interface that works with or without the gate. If the contract slips, the first real cycle can run under service-only enforcement, disclosed in the video and README, and later cycles and the sandbox use the gate.
- **What would change my mind:** a spike shows contract calls from the chosen wallet type are unreliable on Arc testnet, or the contract takes more than about a day and a half to build and test.

### Gate contract: required properties (detail in the TDD)

1. Members and payout order are fixed at cycle start and cannot change during the cycle.
2. `release(round)` callable only by the releaser role, only for the current round, only once per round, only to the member at that round's position, only for an amount not exceeding the cycle's pot size.
3. A pause flag, set by the organizer role, blocks every release.
4. The releaser and organizer roles are distinct addresses.
5. Emits events for cycle start, release and pause, plus an anchor event for decision-log head hashes (see D5).
6. Holds USDC through its ERC-20 interface `[Verify]` (confirm balance semantics and decimals against the native-token view; Arc exposes USDC both as the native gas token and via an ERC-20 interface, and the two may use different decimals).

## 3. Decision D2: Member wallets (custody and sign-in)

Family and coworkers must join from a phone with minimal crypto knowledge (NFR-08), and the Evidence Spec requires that real participants make their own decisions.

| Option | How it works | Pros | Cons |
|---|---|---|---|
| D2-A. App-managed wallets (Circle developer-controlled wallets) | Member signs in with email; our backend creates and controls a wallet; every fund-moving action requires the member's fresh in-app approval | Simplest UX, fastest to build, no key handling for the member | Server holds keys, so a server compromise exposes member wallets (testnet funds only); "own wallet" claim becomes "own login and approval" |
| D2-B. User-controlled wallets (Circle) | Member holds the credential (for example PIN or email challenge) | Closer to true member custody | `[Verify]` Arc testnet support and setup time; more moving parts |
| D2-C. Bring-your-own wallet | Member connects an existing wallet | True self-custody | Family and coworkers unlikely to have one; high friction |

**Recommendation: D2-A to start, with a spike on D2-B in parallel.** For the Evidence Spec, the wallet registry gains a **custody** column (`app-managed` or `self-custody`), and a participant counts as `real` when they authenticate with their own email, approve each contribution themselves, and are identified in the registry. We state the custody type openly in the README and video. The earlier rule "member creates the wallet on their own device" is replaced by this one.

The Threat Model gets a new threat for app-managed custody (T32, added in this revision).

## 4. Decision D3: Agent and model integration

**Pattern (recommended): propose, validate, authorize, execute.**

1. The decision engine gathers facts from the database (the classified transfer, member history, rules).
2. The agent receives a structured input and returns a structured proposal (JSON): decision type, chosen action from the fixed set for that type, parameters, reasoning, and the evidence IDs it relied on.
3. A validator checks the schema, that the action belongs to the decision type, and that cited evidence exists.
4. The rule check confirms the action is permitted by the frozen rule set.
5. The authorization step (FR-16) runs the full condition list and writes one transaction containing the decision record and, if permitted, an authorized action row.
6. The executor, a separate process, executes only rows in the authorized-actions table and rechecks chain state (for example whether the payout already exists) immediately before sending.

**Model hygiene:**
- Provider-neutral adapter; the provider and model are configuration. A schema-validated output is required; one retry on malformed output, then route to a human (FR-13).
- Free text from outside (memos, names, notes, invoice text) is passed as clearly delimited data, never as instructions, and is length-limited.
- Per-day and per-decision model budget with a hard cap (NFR-11).
- Cache and replay: store inputs and outputs so every decision can be replayed in the audit view and in tests.

**Decision engine versus agent:** the decision engine is deterministic code that picks which decision type applies (D1 to D8) and the legal action set. The agent chooses *within* that set and explains. This is what makes "decides, not automates" defensible: the model's choice changes the outcome inside bounds, and the bounds are code.

## 5. Decision D4: Chain watcher and receipt matching

- **Process:** a long-running worker polls Arc testnet over RPC `[Known: RPC https://rpc.testnet.arc.network, chain ID 5042002]`, tracks USDC transfers to registered destinations, and records each with transaction hash, token contract, amount in base units, sender, block number and finality state.
- **Do not rely on memos.** USDC transfers on EVM chains carry no memo field. The primary match key is **sender address bound to a member plus expected amount plus round window**, not a reference string. A reference can be added later if Arc supports one `[Verify]`. This replaces the "unique reference" mechanism in FR-05; the payment request still exists and states destination, amount and deadline.
- **Finality:** credit only after the confirmation rule chosen in the TDD (`[Verify]` how Arc reports finality; its fast deterministic finality should make this a short wait).
- **Reorg and gaps:** the watcher stores its last processed block, can rescan a range, and is idempotent per transaction hash.
- **Classifier:** a pure function in the domain core, with fixtures for all eight classes (FR-07).

## 6. Decision D5: Decision ledger and anchoring

- **Chain:** each entry stores the SHA-256 of canonical JSON of its content plus the previous entry's hash. Optional Ed25519 signature by a server key.
- **Verifier:** a CLI (`verify`) and an API that recompute the chain and report the first inconsistent entry (FR-22).
- **Anchoring (recommended):** publish the chain head hash on Arc every N entries or each round through the gate contract's anchor event, at about one cent per transaction `[Known: sub-cent fees]`. Also commit the head to the repo daily. Together these make silent rewriting visible to an outside reviewer and give an on-chain artifact for Circle tool usage (C10).

## 7. Decision D6: Hosting and runtime

| Option | Description | Pros | Cons |
|---|---|---|---|
| D6-A. Next.js on a serverless host, worker elsewhere | Web on a managed platform; worker and database on a small VPS or managed service | Easy web deploys | Two places to operate; secrets split |
| D6-B. Everything on one VPS with containers | Web, worker, executor and Postgres in one compose file behind a reverse proxy | One place, full control, cheap, long-running processes are easy | You manage uptime and TLS |

**Recommendation: D6-B** for the event, since the worker and executor are long-running and you are comfortable on Linux. The public sandbox and audit view run from the same host. Keep the executor on a separate container with its own secrets and no inbound public route.

## 8. Other design choices

**Float and USYC (FR-36 to FR-38).** A deterministic planner computes the safe window: time until the next payout minus a buffer, capped by the share limit in the rules. The agent chooses among hold, move a bounded share, or redeem, with reasoning. `[Known]` testnet USYC needs the allowlist; `[Verify]` Teller deposit and redeem flow and a report that early testnet token contracts were non-functional stubs, so a day-one spike must confirm it works. If it fails, the system holds funds liquid (FR-38) and the claim C10 omits USYC.

**Invoice mode (FR-39).** The same payment request, classifier, discrepancy ledger and receipt pipeline, with a payer and invoice record instead of a member and round.

**Notifications (FR-27).** In-app first; email as an option. Never include secrets or full addresses.

**Persona runner (FR-28) and sandbox (FR-31).** One library of scripted behaviors driving separately funded simulated wallets; the sandbox is the same scenarios against an isolated group with simulated funds and a reset button. Mode enforcement lives in the authorization step (T17).

**Roles and auth.** Email sign-in with server-side sessions; roles organizer, member, reviewer. Identity from the session only. Database-level access rules for tenant isolation where the database supports them.

**Frontend boundary.** Your UI agent builds screens against typed API contracts that the TDD will define. The backend returns plain-language state for every screen (NFR-08), so the UI stays thin.

**Tooling.** Monorepo with a shared domain package (pure TypeScript, no I/O, heavy unit tests), a Next.js app, a worker, an executor, a contracts package (Foundry), a scenarios package, and a CLI. Set up the Claude Code project structure from your notes (project memory file, rules per area, review and security-audit agents, hooks that block committing secrets and run tests).

## 9. Architecture overview

```
 Member phone / Reviewer browser
            |
      [ Next.js app ]  --- sessions, roles, API, plain-language state
            |
   +--------+-----------------------------+
   |                                      |
[ Domain core (pure TS) ]          [ Agent service ]
 classify, rules,                   builds input, calls model,
 authorize (FR-16)                  validates output (no credentials)
   |                                      |
   +----------- Postgres -----------------+
      groups, rules, transfers, discrepancies,
      proposals, approvals, authorized_actions,
      decision_records (hash chain), metrics
            |                      ^
            v                      |
    [ Executor (isolated) ]   [ Chain watcher ]
     only holder of wallet     reads Arc, records
     credentials; rechecks     finalized transfers
     chain, then sends
            |                      ^
            v                      |
      [ Circle wallet ] ----> Arc testnet <---- [ Gate contract ]
                                  (USDC)         pot, invariants, pause,
                                                 anchor events
```

**Credential map:** model API key lives only in the agent service; wallet credentials only in the executor; the web app holds neither. Compromise of any one component does not give fund-moving power by itself, and even the executor is limited by the gate.

## 10. Key flows

**Contribution:** member approves in app, wallet sends USDC to the group destination, watcher observes, finality, classifier labels it, decision record written; exact payments are credited; anything else opens a discrepancy and a proposal.

**Payout:** all conditions in FR-16 evaluated in one transaction; if satisfied, an authorized action is created; the executor rechecks that the round's release has not happened, calls the gate, waits for finality, records the receipt, and marks the round complete.

**Anomaly:** the classifier labels it, the decision engine selects the decision type, the agent proposes within the fixed set, validation and rule check run, and either the action executes (inside bounds) or an approval item appears for a human.

## 11. Build order (full scope, sequenced)

The calendar is set by two dates: the first real round must start by about **Oct 4** so a 4 to 5 member cycle at 24 hours per round finishes before the deadline (Oct 10, 11:59 PM ET), and the final evidence pack should be frozen by **Oct 9**.

| Milestone | Target | Contents | Demonstrable result |
|---|---|---|---|
| M0 | Oct 1 to 2 | Repo, monorepo skeleton, CI, secrets hygiene, baseline commit; database schema; spikes (see section 12) | Baseline committed; spike notes |
| M1 | Oct 2 to 3 | Domain core: classifier (8 classes), rules, authorization conditions, integer money, unit tests and fixtures | Test suite green against all FR-07 and FR-16 cases |
| M2 | Oct 2 to 4 | Chain watcher, executor, group setup, member sign-in and wallets, contribute and payout flows on testnet, decision ledger with chaining; frontend screens from the UI agent | A full round with real people on testnet |
| M3 | Oct 3 to 5 | Gate contract, Foundry tests, deployment, executor integration, pause | Payout through the gate; pause test |
| M4 | Oct 4 to 6 | Agent service for D1 to D5 and D7, D8 with validation; approval inbox; discrepancy ledger UI | Agent explains and acts on a partial payment |
| M5 | Oct 5 to 7 | Persona runner, scenario suite S-xx, test report, tamper test, verify CLI, head anchoring | Report with zero unauthorized movements |
| M6 | Oct 6 to 8 | Float and USYC (if allowlisted), invoice mode and pilots, notifications | Pilot invoice settled; float decision recorded |
| M7 | Oct 8 to 9 | Sandbox, public audit view, evidence pack, README, video, submission | Submitted by Oct 9; resubmit if needed |

**Pre-agreed cut lines (so decisions are not made at 3 a.m.):** if M2 slips past Oct 4, start the real group under service-only enforcement and disclose it. If M3 slips, ship the gate as designed with its tests but run live cycles service-only. If USYC is not allowlisted by Oct 6, ship FR-38 behavior and omit float from claims. These are fallbacks, not the plan. Calendar-bound items do not speed up with more coding help: recruiting participants, the allowlist wait, and the 24-hour rounds themselves.

## 12. Day-one spikes (each answers a `[Verify]`)

1. Create a developer-controlled wallet on Arc testnet and send a USDC transfer from code (confirms D2-A and the executor path).
2. Call a trivial contract from that wallet type (confirms D1-C is viable).
3. Check whether user-controlled wallets support Arc testnet and how long setup takes (D2-B).
4. Read the USDC ERC-20 interface on Arc: decimals, balance semantics, transfer events, and its relationship to the native view.
5. Confirm finality behavior and the fastest safe confirmation rule.
6. USYC: attempt a mint and redeem once allowlisted; record result.
7. Confirm RPC rate limits for the watcher; choose polling interval.

## 13. Risks specific to the design

| Risk | Mitigation |
|---|---|
| Wallet type cannot call contracts reliably | Spike 2 on day one; D1-C degrades to D1-A |
| App-managed custody weakens the "real participant" claim | State custody type openly; require per-action member approval; pursue D2-B if it proves easy |
| Native versus ERC-20 USDC decimals cause accounting bugs | Spike 4; all arithmetic in base units with one conversion point; tests with 1-base-unit cases |
| Real group starts late | Fallbacks in section 11; onboarding flow is part of M2, not later |
| Model misbehaves on adversarial input | Fixed action sets, validator, S-INJ scenarios, fail-closed |
| Operations on one VPS | Daily snapshots of the database; status page; a restart script |
| Scope is large | Build order gives a demonstrable result at every milestone; cut lines pre-agreed |

## 14. Consequences for earlier documents

- **SRS:** FR-05 changes from "unique reference" to "destination, amount, deadline, bound sender"; FR-02 wallet binding is created by the system under D2-A. TDD will carry the exact edits; SRS v0.3 follows.
- **Evidence Spec:** wallet registry gains a custody column and the real-participant rule changes as described in D2 (applied in this revision).
- **Threat Model:** adds T32 (app-managed custody) and reframes T10 and T11 to rely on sender binding rather than references (applied in this revision where noted).

## 15. Open decisions for you

1. Accept D1-C (layered enforcement) as the plan.
2. Accept D2-A (app-managed wallets with per-action approval) with a spike on D2-B.
3. Accept D6-B (single VPS with containers). Do you have a host (a spare machine with a public address, or a cloud VPS)?
4. Which model provider and model for the agent? Cost and rate limits matter, since no credits are provided.
5. Your Solidity comfort. With Claude as assistant it is workable, but tell me if you prefer to keep the contract as small as possible.

## 16. Review checklist (gate for v1.0)

- [ ] Every High threat is covered by a component named in section 9
- [ ] Every Must requirement has an owning component
- [ ] Spikes scheduled before dependent milestones
- [ ] Credential map reviewed
- [ ] Open decisions answered

## 17. Next document

**TDD v0.1:** data model and schema, API contracts (which the frontend prompt will use), the gate contract specification, the classifier and authorization rules in detail, the agent input and output schemas for D1 to D8, the decision record format, test plan skeleton, and the frontend prompt for your UI agent. Because the first real round must start by about Oct 4, the TDD is the priority after your answers.
