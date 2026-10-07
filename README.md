# EqubFlow

Autonomous rotating savings and credit association (Equb) on **Arc Testnet** in USDC.

Software independently verifies every contribution, an agent proposes and explains decisions within fixed action sets, and a deterministic safety layer decides whether money may move.

## Architecture

- **`packages/domain`**: Pure TypeScript core with zero I/O.
  - All monetary values are `bigint` base units of 6-decimal USDC (`1 USDC = 1000000n`).
  - RFC 8785 JSON Canonicalization Scheme (`canonicalJson`) strictly rejecting floats, BigInts in payloads, NaNs, and unformatted dates.
  - Cryptographic decision record chain with SHA-256 hash linkage.
  - Deterministic contribution classifier and payout authorizer.
- **`packages/db`**: Database migrations, RLS policies, integrity triggers, and permission test suites.
  - Least-privilege roles: `agent`, `executor`, `watcher`, `authorizer`, `evidence`, `authenticated`, `anon`.
  - Non-recursive member RLS via `is_member(group_id)` security definer helper.
  - Triggers freezing core columns (`kind`, `to_address`, `amount`, `group_id`) on authorized actions.
  - Strict destination verification (payouts to round recipient only, contributions to group destination only, refunds to original transfer sender only, float deposits to authorized Teller only).
  - Explicit truncate blocking on decision records and authorized actions.
- **`apps/`**:
  - `apps/worker`: Ingestion and chain watcher.
  - `apps/executor`: Single component holding wallet credentials, executes authorized actions.
  - `apps/agent`: AI proposal generator (pinned to `gemini-3.1-flash-lite`).
  - `apps/web`: Next.js member interface with real-time Supabase subscriptions.

## Security Model & Honest Limits

1. **Model Output is an Input, Never the Release Condition**: The agent chooses proposals from fixed action sets; the deterministic validator, rule engine, and database authorizer decide; only the executor moves funds.
2. **Honest Boundary (Ledger Integrity)**:
   > **A compromised authorizer role could forge a self-consistent chain**, since the signing key lives there. The periodic head anchors written to **Arc Testnet** (`chain_anchors`) are what make such history rewrites externally detectable.
3. **Fail-Closed Design**: Any discrepancy, ambiguous transfer, or unexpected error halts payout automation and routes to human review.
4. **USDC Transfer Log Visibility (Native vs. ERC-20)**:
   > On Arc Testnet, USDC is the native gas token. Member contributions created via the EqubFlow app and app-managed wallets explicitly execute transfers via the canonical USDC ERC-20 interface (`0x3600000000000000000000000000000000000000`), emitting standard `Transfer` logs captured by the watcher. Plain native-value transfers sent from arbitrary external wallets without invoking the ERC-20 contract do not emit ERC-20 event logs and cannot be detected by log filtering alone.

## Arc Testnet Reference

- **RPC URL**: `https://rpc.testnet.arc.network`
- **Chain ID**: `5042002`
- **USDC Token Interface**: `0x3600000000000000000000000000000000000000` (6 decimals)
- **USYC Teller**: `0x9fdF14c5B14173D74C08Af27AebFf39240dC105A`
- **Treasury Agent Wallet**: `0xeb21103e749d682c3f0e36a23852f246b1b4d016`
