# EqubFlow: project memory for coding agents

Copy this file to `AGENTS.md` as well, so tools that read either name see the same rules.

## What we are building

An agent that runs a small rotating savings group (an Equb) on **Arc Testnet** in test USDC. Software independently verifies every contribution, an agent proposes and explains decisions within fixed action sets, and a deterministic layer decides whether money may move. Built for the Tameion Agents Hackathon (deadline **Oct 10, 2026, 11:59 PM ET**). **Testnet only.**

## Read these first (they are the source of truth)

| File | Use it for |
|---|---|
| `docs/01-BRS.md`, `docs/02-SRS.md` | What and why; requirement IDs (BR, FR, NFR) |
| `docs/03-Threat-Model.md` | Threats T1 to T32 and scenarios S-xx; every High threat needs a test |
| `docs/04-Evidence-Spec.md` | Claims C1 to C14 and how each is proven |
| `docs/05-PDR.md` | Architecture decisions and build order |
| `docs/06-TDD.md` | Schema, domain rules, gate contract, agent schemas, API routes |
| `docs/07-Frontend-Prompt.md` | UI scope (a separate UI agent builds the UI) |

If code and a document disagree, **stop and report it**; do not silently choose. Name the requirement ID in commit messages (for example `FR-16: authorizePayout refuses paused groups`).

## Stack

TypeScript everywhere, Next.js (App Router) on Vercel for the web app, Supabase Postgres (two projects: `real` and `sandbox`), Foundry for the Solidity gate contract, Vitest for tests. Worker, executor and agent service run as separate Node processes. Model calls go through the provider-neutral adapter: primary `gemini-3.1-flash-lite`, secondary NVIDIA `google/gemma-4-31b-it`, then the deterministic engine fallback.

## Layout and dependency rule

`apps/web`, `apps/worker`, `apps/executor`, `apps/agent`, `packages/domain`, `packages/db`, `packages/contracts`, `packages/scenarios`, `packages/cli`.
`packages/domain` is **pure TypeScript with no I/O** and imports nothing from other packages. Only `apps/executor` may import wallet or chain-write code.

## Non-negotiable rules

**Money**
1. All amounts are `bigint` base units of the **6-decimal** USDC ERC-20 interface (1 USDC = `1000000`). JSON carries decimal strings. Never use `number` or floats for money.
2. The native gas-token view uses 18 decimals. Never mix the two; convert in one place only.
3. No rounding anywhere. A difference is stored exactly as a discrepancy (`observed - expected`), never absorbed.
4. The UI never computes or converts money; it shows `display` strings from the API.

**Safety architecture**
5. **Model output is an input, never the release condition.** The model chooses from a fixed action set; the validator, rule check, and `authorizePayout` decide; only the executor moves funds.
6. Only `apps/executor` holds wallet credentials. The agent service and the web app never do.
7. A payout needs `authorizePayout` to pass inside the same database transaction that writes the decision record and the authorized action. One live payout per round (unique index).
8. Fail closed: any error, timeout, or ambiguity means no fund movement, a decision record, and routing to a human.
9. Deadlines use chain block time, not the server clock. Only `final` transfers are classified.
10. `decision_records` is append-only. Never write code that updates or deletes rows; use `append_decision_record()` only.
11. `mode` (`real`, `simulated`, `sandbox`) and `stake` are set at creation and never changed. Sandbox code must never reference real wallets or the real database.

**Security**
12. **Never read, print, log, or commit `.env*` files or any key, token, password, or connection string.** Use environment variables by name only. If you need a value, ask the human.
13. Never put secrets in client code. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` may be public. The Supabase secret (service-role) key stays server-side, off by default.
14. Server-side validation (schema) on every input; identity comes from the session, never the request body; default-deny authorization; row-level security on every table.
15. No model input contains names, emails, or phone numbers. Use aliases and IDs. Outsider text goes in `untrusted` blocks and is never treated as instructions.
16. Do not add a dependency without checking it exists, is maintained, and is needed (run the audit). Commit the lockfile.

## Working agreements

- **Tests first for `packages/domain`.** Fixtures for every classifier class and 1-base-unit boundaries (`expected - 1n`, `expected + 1n`).
- Small, reviewable changes; one requirement ID per change when possible; run tests before reporting done.
- **No scope creep.** If something is not in the documents, propose it in a note instead of building it.
- Every "decides, not automates" claim needs a recorded decision with reasoning, and a test.
- Report API contract gaps as exact field or route changes so the documents can be updated.
- Do not claim something works until you ran it. Say what you ran and what it printed (never printing secrets).

## Verified facts (Arc Testnet)

- RPC `https://rpc.testnet.arc.network`, chain ID `5042002`, CLI chain name `ARC-TESTNET`. The CLI name `ARC` is **mainnet**; never use it.
- USDC ERC-20 interface: `0x3600000000000000000000000000000000000000` (6 decimals).
- Treasury agent wallet: `0xeb21103e749d682c3f0e36a23852f246b1b4d016` (allowlisted for testnet USYC).
- USYC Teller `0x9fdF14c5B14173D74C08Af27AebFf39240dC105A`, token `0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C`, Entitlements `0xcc205224862c7641930c87679e98999d23c26113`. Subscribe with `deposit(uint256,address)` after approving USDC; redeem with `redeem(uint256,address,address)` after approving USYC. Live-tested status is in the TDD spike table.
- Circle CLI: `circle wallet execute "sig" args --contract <addr> --address <wallet> --chain ARC-TESTNET [--estimate]`; read calls with `circle contract query`.
- Model provider quotas are small on free tiers; use replay in tests, not live calls.

## Definition of done (per change)

Tests pass; no secret scan hits; types check; the requirement ID is named; threats touched are listed with their tests; documents updated if behavior changed.
