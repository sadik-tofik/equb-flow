# Day-by-day schedule: Oct 2 to the deadline

**Version:** 0.1. **Times:** Addis Ababa local (UTC+3) unless stated. New York is in daylight time (UTC-4) until November.
**Deadline:** Oct 10, 11:59 PM ET = **Oct 11, 06:59 AM Addis**. Target for the first full submission: **Oct 9**; use Oct 10 only for resubmitting.
**Who:** **You** (human actions), **CA** (coding agent), **UI** (UI agent), **Claude** (documents and reviews). Milestones refer to `05-PDR.md` section 11; test names refer to `08-IVM.md`.

## The critical path (everything else can slip, these cannot)

1. A confirmed list of real people (Equb members and one invoice payer) by **end of Oct 2**.
2. Sign-in, join, pay-my-contribution, watcher, payout and the decision record working by **Oct 3 evening**.
3. Security audit A1 passed (no CRITICAL or HIGH open) before any real participant joins.
4. First real round opened on **Oct 4**. Calendar time (24-hour rounds) cannot be sped up afterwards.

## Round arithmetic (24-hour rounds)

| Group size | Round 1 opens | Cycle completes (last payout) |
|---|---|---|
| 4 members | Oct 4, 15:00 | about Oct 8, 15:30 |
| 5 members | Oct 4, 15:00 | about Oct 9, 15:30 |
| 4 members, start slips to Oct 5 | Oct 5, 15:00 | about Oct 9, 15:30 |

**Recommendation:** start with **4 members**; add a fifth only if the person is already confirmed and onboarded. Interviews (C14) happen within 48 hours after the cycle ends. A start later than Oct 5 afternoon requires switching to 12-hour rounds, which must be disclosed as even more accelerated.

## Daily routine (15 minutes, every day from Oct 3)

1. Run the evidence pack and commit the snapshot.
2. Check the watcher, executor and database are running; check the Supabase keepalive fired.
3. Look at open discrepancies and the approval inbox.
4. Update the IVM status column.
5. Note any model quota or rate-limit problems.

## Day by day

### Fri Oct 2 (today): M0 and M1, people list
- **You:** confirm the people list (at least 3 Equb members, 1 invoice payer); this is the riskiest assumption. Retry the USYC deposit between **15:31 and 21:00** and paste the output. Keep enabling the commit hook and check `git status` shows no env files.
- **CA:** monorepo skeleton and CI; apply the schema migrations to **both** Supabase projects; create the database roles; `packages/domain`: money, classifier, `authorizePayout`, rules validation, with the unit tests named in the IVM (FR-04, FR-07, FR-08, FR-09, FR-16, NFR-01).
- **CA (second thread):** `packages/contracts` scaffold and `EqubGate` with the nine invariants as Foundry tests.
- **UI:** milestone M-A against the mock API (tokens, shell, sign-in, invitation, group home, pay flow, round detail).
- **Claude:** answers questions; reviews the first domain code against the TDD when you paste it.
- **Spikes today:** 1 (developer-controlled wallet sends USDC), 4 (ERC-20 events), 5 (finality), 7 (RPC limits), 8 (database roles through the pooler).
- **Exit check:** domain tests green; both databases migrated; people list confirmed.

### Sat Oct 3: M2 and M3, audit A1, go/no-go
- **CA:** chain watcher, authorizer, executor, decision-record function, API routes for group, invite, join, pay, round; member wallet creation (app-managed); gate contract passing fuzz and invariant tests and deployed to testnet; executor integrated with the gate or service-only fallback.
- **UI:** M-A finished; start M-B (approvals, discrepancies, log) with the mock API; switch to the live API when CA publishes the routes.
- **You:** onboard **one family member on a phone** as an alpha (sign in, accept rules, pay a tiny test amount, see the receipt). Write down every point of confusion. Create the daily keepalive.
- **Evening, A1:** run the Security Audit Prompt (sections 1 to 8) on the repo; fix all CRITICAL and HIGH findings.
- **Go/no-go (about 21:00):** go only if (a) A1 is clean, (b) a full round works on testnet with the alpha user, (c) pause works. If no-go, start Oct 5 with 12-hour rounds or fewer members; do not start a real group on an unaudited system.

### Sun Oct 4: first real round
- **You, morning:** create the real group; invite members; confirm each accepted the rules and has an account; open **round 1 at about 15:00**. Fund test balances as needed (use the faucet and TestMint; keep contributions tiny, for example 0.5 USDC).
- **CA:** do not ship risky changes during the first hours; monitor logs; fix onboarding problems first. Then start the agent service (adapter with the pinned model, D2 and D3 first).
- **UI:** M-B continues; fix anything the real users trip on.
- **Claude:** helps triage problems you paste (no keys, no codes).
- **Exit check:** round 1 collecting; at least 3 contributions credited with receipts.

### Mon Oct 5: M4, invoice pilot starts
- **CA:** agent decisions D1 to D5, D7, D8 with the validator and replay fixtures; approval inbox and discrepancy flows end to end; model budget and rate limiter; engine fallback.
- **You:** issue the first **real invoice** to your pilot payer (record the real-world amount and purpose); onboard them.
- **UI:** M-C (organizer console) and M-D start.
- **Round 1 payout happens about 15:30 (checkpoint: first real payout).**

### Tue Oct 6: M5, scenarios and verification, audit A2
- **CA:** persona runner with all S-xx scenarios on simulated wallets in the **sandbox** database; test report generator; verify CLI and tamper test; head anchoring through the gate; latency measurement.
- **You:** retry USYC if still pending; start recruiting the second pilot payer if time allows.
- **Evening, A2:** run the audit prompt again; fix CRITICAL and HIGH.

### Wed Oct 7: M6, **re-login**
- **You:** **re-run `circle wallet login ... --testnet`**; the testnet session expires after about 7 days (your login was Oct 1).
- **CA:** float and USYC flow (only if the live test passed; otherwise ship the liquid-hold behavior and omit float from claims); invoice mode finished; notifications; observability.
- **Decision point:** if float is not working by midday, drop it from the plan and the claims.
- **UI:** M-D and M-E.

### Thu Oct 8: M7 begins, **feature freeze at the end of the day**
- **CA:** sandbox (replay by default), public audit view with static export, evidence pack script complete, `README`, clean-checkout run test.
- **You:** an outsider (not on the project) follows the reviewer path alone: README, sandbox, audit view, verification. Fix whatever confuses them.
- **Cycle ends (4 members): last payout about 15:30.** Start interviews (Worksheet B, Mode 3) with the real members the same evening or the next morning.
- **UI:** M-F (landing page) only if M-A to M-E are solid.

### Fri Oct 9: evidence, video, submit
- **CA:** fixes only, no new features. Generate the final evidence pack; commit it; run A3.
- **You:** finish interviews (C14); record the **under-3-minute video** from the plan in the Evidence Spec section 9; fill the submission form from the evidence files; **submit** (you can resubmit).
- **Claude:** reviews the README and the submission answers against the evidence files if you paste them.

### Sat Oct 10: buffer
- Resubmit only to correct errors or add final numbers. **Do not wait for the last hours.** Aim to be done by midday Addis; the real deadline is 06:59 AM Addis on Oct 11.
- After submitting, keep the sandbox and keepalive running through the judging period.

## Cut lines (decide in advance, not at 3 AM)

| Trigger | Action |
|---|---|
| A1 fails or the first full round is not working by Oct 3, 21:00 | Delay the real start to Oct 5 and use 12-hour rounds or a smaller group |
| Gate contract not ready by Oct 3 night | Start the real cycle with service-only enforcement, disclosed; use the gate for the sandbox and later cycles |
| USYC deposit still failing after a larger test amount | Ship without float; remove float from the claims (FR-38 behavior) |
| Fewer than 3 real members confirmed by Oct 3 | Run the real group at 3, and make the sandbox the main demo; say so plainly |
| Model provider fails or hits its quota | Engine fallback proposals; report the model-versus-fallback share openly |
| Behind schedule on Oct 8 | Freeze scope; drop the landing page, then notifications, then the invoice pilot extras, in that order |

## Human tasks that cannot be automated

Recruiting and onboarding people, collecting their consent, running interviews, the daily check, the Circle re-login, submitting the form, recording the video. Put each in your calendar now.
