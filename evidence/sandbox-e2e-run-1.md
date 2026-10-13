# EqubFlow Sandbox E2E Run 1 Evidence

> **Environment Label:** `sandbox/simulated (not traction)`  
> **Target Network:** Arc Testnet (Chain ID `5042002`)  
> **Database:** `DATABASE_URL_SANDBOX` (isolated sandbox Supabase project)  
> **Execution Timestamp:** 2026-10-12T13:34:29Z  
> **Notice:** This document contains the verbatim raw log from the automated end-to-end sandbox verification run on Arc Testnet. It verifies the complete Equb cycle: group and member wallet provisioning via Circle Developer-Controlled Wallets, native gas and USDC funding, pause safety guard enforcement (FR-16), member contribution approval, on-chain watcher ingestion, deterministic settlement, late-payer discrepancy resolution (D3/D4 engine proposals), payout release execution, round advancement, and 20-slot cryptographic SHA-256 hash chain integrity. Labeled `sandbox/simulated (not traction)`.

---

## Verbatim Execution Output

```
> equbflow-monorepo@0.1.0 e2e:sandbox /mnt/vm_storage/sanzo/Hackatons/Tameion Agents Hackathon/equbflow
> tsx --env-file=.env scripts/e2e-sandbox.ts


========================================================================
>>> EQUBFLOW E2E SANDBOX RUNNER: ARC TESTNET (CHAIN ID 5042002) <<<
========================================================================

[sandbox] Project reference: nbfkkyczdlbbmkqvvkts
🔑 Circle credentials & E2E_FUNDING_WALLET_ID detected: Running in LIVE mode on Arc Testnet.

--- STEP 1: Creating 4-Member Group (ID: 74cfacf9-a213-4e8a-bea7-7c78fc4c6f4d) ---
  ⚡ Provisioning Group Pot Wallet on Arc Testnet...
[CircleWalletAdapter] CIRCLE_WALLET_SET_ID missing; creating wallet set on first run...
[CircleWalletAdapter] Created wallet set ID: 26da829b-06b4-50ff-812d-1e13edfd136b
  ✓ Pot Wallet Created: 0x085c56f110fc6ea73e2a9a2ad4bd1b369130fb21
  ✓ Group record & Genesis decision record appended

--- STEP 2: Creating 4 Member Wallets on Arc Testnet ---
  ✓ Member 1 (Alice): 0xbba443ebba9b3b59fd6fed947e7d63056bae31f0 (walletId: 7f18c2a5-f...)
  ✓ Member 2 (Bob): 0xaebab5a2f65d2f2b79e23d3c2777e20cc5fb2b5e (walletId: 982c0bf1-a...)
  ✓ Member 3 (Charlie): 0x2721630324b533d971b31d16b81962b788e2b092 (walletId: 55b4e616-8...)
  ✓ Member 4 (Dave): 0x9040d0bd7e6d9b060e69ff436cfe9087a953dfbd (walletId: dec188a3-8...)

--- STEP 3: Funding Pot Wallet and Member Wallets via E2E_FUNDING_WALLET_ID ---
  ⚡ Funding Pot Wallet with 0.05 native gas tokens on Arc Testnet...
  ⏳ Waiting for Pot Wallet Gas on Arc Testnet... ✓ Confirmed! (0x22281ec9986c...)
  ⚡ Sending 0.02 USDC + native gas to Alice on Arc Testnet...
  ⏳ Waiting for Funding Alice (ERC20) on Arc Testnet... ✓ Confirmed! (0xfb15cb000b06...)
  ⏳ Waiting for Funding Alice (Gas) on Arc Testnet... ✓ Confirmed! (0xb69dbf239246...)
  ⚡ Sending 0.02 USDC + native gas to Bob on Arc Testnet...
  ⏳ Waiting for Funding Bob (ERC20) on Arc Testnet... ✓ Confirmed! (0x86cfeee95ce8...)
  ⏳ Waiting for Funding Bob (Gas) on Arc Testnet... ✓ Confirmed! (0x0981dcc17d62...)
  ⚡ Sending 0.02 USDC + native gas to Charlie on Arc Testnet...
  ⏳ Waiting for Funding Charlie (ERC20) on Arc Testnet... ✓ Confirmed! (0xedf9460a159b...)
  ⏳ Waiting for Funding Charlie (Gas) on Arc Testnet... ✓ Confirmed! (0x67bb90eacfd3...)
  ⚡ Sending 0.02 USDC + native gas to Dave on Arc Testnet...
  ⏳ Waiting for Funding Dave (ERC20) on Arc Testnet... ✓ Confirmed! (0x805749cf18de...)
  ⏳ Waiting for Funding Dave (Gas) on Arc Testnet... ✓ Confirmed! (0x597ae5f30568...)

--- STEP 4: Starting Cycle & Round 1 (3-Minute Deadline) ---
  ✓ Round 1 created: Recipient is Alice (Member 1), deadline = 2026-10-12T10:39:04.458Z
  ✓ 4 payment requests opened (expected: 10000 base units each)

--- STEP 5: Testing Pause Case (FR-16 Safety Guard) ---
  🔒 Group paused.
  ✓ Pause Case Verified: Payment strictly refused with error: group_paused: The group is currently paused.
  ✓ Zero fund movement actions created while paused
  🔓 Group resumed successfully.

--- STEP 6: Members 1, 2, 3 Pay on Time via Approve Route ---

  ⚡ Member 1 (Alice) approving payment request 0aecfa0f-4c4a-4173-b6b0-0b7c5a2b94ea...
  ⚡ Executor sending transfer from Alice to Pot Wallet on Arc Testnet...
  ✓ Transfer confirmed for Alice! Tx Hash: 0xfd0f790be3d4862cb6a3eb429000805430d2dc921b477577cb607e1b855ea34d
[runner] [group:74cfacf9-a213-4e8a-bea7-7c78fc4c6f4d] authorizer: credited transfer 0xfd0f790b... (class=exact)
  ✓ Runner Cycle: 1 transfer credited (exact) for Alice

  ⚡ Member 2 (Bob) approving payment request 0fe34b3d-6e91-4324-9979-a0902438968c...
  ⚡ Executor sending transfer from Bob to Pot Wallet on Arc Testnet...
  ✓ Transfer confirmed for Bob! Tx Hash: 0xa115262cad451dfa74cc74742e0725fc43524aea1b876f62f5aa29fb4b2af883
[runner] [group:74cfacf9-a213-4e8a-bea7-7c78fc4c6f4d] authorizer: credited transfer 0xa115262c... (class=exact)
  ✓ Runner Cycle: 1 transfer credited (exact) for Bob

  ⚡ Member 3 (Charlie) approving payment request dd936bb7-608b-4edb-a1e7-11caf20bc801...
  ⚡ Executor sending transfer from Charlie to Pot Wallet on Arc Testnet...
  ✓ Transfer confirmed for Charlie! Tx Hash: 0x1240f086eb859d489a8263006d64740935522d7f7235afb4b5063a79f8ae9cec
[runner] [group:74cfacf9-a213-4e8a-bea7-7c78fc4c6f4d] authorizer: credited transfer 0x1240f086... (class=exact)
  ✓ Runner Cycle: 1 transfer credited (exact) for Charlie

--- STEP 7: Testing Late-Payer Case (Dave) ---
  ⚡ Dave approving payment request 1e4d2e4d-e3cb-47c5-92dd-45b11593f4d3...
  ✓ Dave's transfer confirmed on Arc Testnet! Tx Hash: 0x19c5d644f403109473abb55c4a16f4c4ec186f9071bc9a86e2088190715d6063
[runner] [group:74cfacf9-a213-4e8a-bea7-7c78fc4c6f4d] authorizer: discrepancy opened for transfer 0x19c5d644... (class=late)
[runner] [group:74cfacf9-a213-4e8a-bea7-7c78fc4c6f4d] proposal: applied accept_with_lateness (proposalId=657185dd-18da-4e00-bde6-7e3b975caea4)
  ✓ Late transfer classified: discrepancies opened = 1
  ✓ Engine D3 Proposal created: ID=657185dd-18da-4e00-bde6-7e3b975caea4, action=accept_with_lateness
  ⚡ Approving late contribution proposal...
[runner] [group:74cfacf9-a213-4e8a-bea7-7c78fc4c6f4d] settlement: payout authorized (actionId=21310d57-07ab-4629-82e6-f317917adbf5, recipient=0xbba443..., amount=40000)
  ✓ Runner applied approved proposal: proposals applied = 0
  ✓ Late-Payer Case Verified: Dave's contribution credited and discrepancy resolved!

--- STEP 8: Round 1 Settlement & Payout Authorization ---
  ✓ Payout Authorized for Round 1: actionId=21310d57-07ab-4629-82e6-f317917adbf5

  ⚡ Executor sending Payout Release of 0.04 USDC to Alice (0xbba443ebba9b3b59fd6fed947e7d63056bae31f0)...
  ✓ Payout Release Confirmed on Arc Testnet! Tx Hash: 0xb74bfa09a1dd0a6c09d948bdc3ea4a08feedd46da4ce3f6bc5148072e17b3f21

--- STEP 9: Runner Advances Round 1 -> Round 2 ---
[runner] [group:74cfacf9-a213-4e8a-bea7-7c78fc4c6f4d] round_advance: round 1 paid, advanced to round 2
  ✓ Round 1 Status: paid
  ✓ Group Current Round: 2
  ✓ Verified: Round 1 is PAID and Group is now on Round 2!

--- STEP 10: Verifying Cryptographic SHA-256 Decision Chain ---
  ✓ Total Decision Records Appended: 20
  ✓ Cryptographic Hash Chain Unbroken! Head Hash: 51219c21baa556291f1a96035f831c80770dfbe4ca5cb9fe5cc8d5bdfa170cef
  ✓ Sequence range strictly continuous from 1 to 20

========================================================================
📋 ARC TESTNET (CHAIN ID 5042002) TRANSACTIONS SUMMARY
========================================================================
| Action                                   | Amount     | Tx Hash                                                            | Arcscan Explorer Link                                          |
|------------------------------------------|------------|--------------------------------------------------------------------|----------------------------------------------------------------|
| Funding Pot Gas                          | 0.05 native Arc USDC | 0x22281ec9986c067cb7edb2f854f4536ddd3357573a3a0e598d71ec9acf5d81d6 | https://testnet.arcscan.io/tx/0x22281ec9986c067cb7edb2f854f4536ddd3357573a3a0e598d71ec9acf5d81d6 |
| Funding Alice                            | 0.02 USDC  | 0xfb15cb000b06dd2415b30d349a1af802f0362ef8e3ce7f97c71437f9c45df1f5 | https://testnet.arcscan.io/tx/0xfb15cb000b06dd2415b30d349a1af802f0362ef8e3ce7f97c71437f9c45df1f5 |
| Funding Bob                              | 0.02 USDC  | 0x86cfeee95ce8d5cb09dcafefd66b7e8b71951cba519da834fc2bd44da932b790 | https://testnet.arcscan.io/tx/0x86cfeee95ce8d5cb09dcafefd66b7e8b71951cba519da834fc2bd44da932b790 |
| Funding Charlie                          | 0.02 USDC  | 0xedf9460a159bb0c10a9d7f42f75dbfafc62601103f05656eb723e71251570099 | https://testnet.arcscan.io/tx/0xedf9460a159bb0c10a9d7f42f75dbfafc62601103f05656eb723e71251570099 |
| Funding Dave                             | 0.02 USDC  | 0x805749cf18de2e72a89ff45e9683b66dcf37d89454c46fab9ea5c6ae1fb415f6 | https://testnet.arcscan.io/tx/0x805749cf18de2e72a89ff45e9683b66dcf37d89454c46fab9ea5c6ae1fb415f6 |
| Contribution Alice                       | 0.01 USDC  | 0xfd0f790be3d4862cb6a3eb429000805430d2dc921b477577cb607e1b855ea34d | https://testnet.arcscan.io/tx/0xfd0f790be3d4862cb6a3eb429000805430d2dc921b477577cb607e1b855ea34d |
| Contribution Bob                         | 0.01 USDC  | 0xa115262cad451dfa74cc74742e0725fc43524aea1b876f62f5aa29fb4b2af883 | https://testnet.arcscan.io/tx/0xa115262cad451dfa74cc74742e0725fc43524aea1b876f62f5aa29fb4b2af883 |
| Contribution Charlie                     | 0.01 USDC  | 0x1240f086eb859d489a8263006d64740935522d7f7235afb4b5063a79f8ae9cec | https://testnet.arcscan.io/tx/0x1240f086eb859d489a8263006d64740935522d7f7235afb4b5063a79f8ae9cec |
| Contribution Dave (Late)                 | 0.01 USDC  | 0x19c5d644f403109473abb55c4a16f4c4ec186f9071bc9a86e2088190715d6063 | https://testnet.arcscan.io/tx/0x19c5d644f403109473abb55c4a16f4c4ec186f9071bc9a86e2088190715d6063 |
| Payout Release (Round 1 Winner Alice)    | 0.04 USDC  | 0xb74bfa09a1dd0a6c09d948bdc3ea4a08feedd46da4ce3f6bc5148072e17b3f21 | https://testnet.arcscan.io/tx/0xb74bfa09a1dd0a6c09d948bdc3ea4a08feedd46da4ce3f6bc5148072e17b3f21 |
========================================================================

🎉 ALL E2E SANDBOX STEPS PASSED SUCCESSFULLY!
  1. 4-Member Group provisioned with Arc Testnet wallets
  2. Members funded via E2E_FUNDING_WALLET_ID on Arc Testnet
  3. 3-minute deadline enforced for Round 1
  4. Pause case tested and strictly enforced (FR-16)
  5. Members 1, 2, 3 paid on time via approve route
  6. Late-payer case (Dave) classified as late with D3 proposal executed
  7. Round 1 settled and payout release confirmed on Arc Testnet
  8. Group advanced to Round 2
  9. SHA-256 Decision Chain fully verified with zero gaps
```
