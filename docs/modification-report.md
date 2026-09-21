# Relay Hackathon Modification Report

Date: 2026-09-20
Repository: https://github.com/Web3smallie/relay
Checkpoint tag: pre-modification-checkpoint (commit b4759f6)
New HEAD: commit 29df837 (two commits ahead of origin/main after history rewrite)

---

## A. Files Modified

README.md — Full rewrite: accurate architecture, setup, security, demo instructions.
backend/src/chain.ts — BC-02: getBalance() replaced with ERC-20 balanceOf() at 6-decimal USDC precision.
backend/src/agent/mintReceipt.ts — BC-05: Polls Circle API until real on-chain txHash available before returning.
backend/src/agent/sendPayment.ts — MOD-5: Added gasSponsored boolean return; wallet type logged for audit.
backend/src/autoLiquidity.ts — PAY-04: Added waitForArcBalance() poll loop after bridge completes.
backend/src/wallet.ts — MOD-5: createWallet() now uses accountType "SCA"; added getWalletAccountType() helper.
frontend/src/app/dashboard/page.tsx — Label: "EOA" -> "SCA".
frontend/src/app/dashboard/wallet/page.tsx — Badge: "EOA Account" -> "SCA Account".

---

## B. Files Deleted

backend/recovery_file_28d9d51f-0194-4b5b-af65-23586e5f6a5c.dat
Reason: Circle Entity Secret recovery artifact must not be in version control.

---

## C. Files Added

backend/src/test/mod6-gas-station-test.ts — Test script for zero-native-gas flow.

---

## D. Dependencies Changed

None. No packages added, removed, or upgraded.

---

## E. Git History Changes

Before: Single commit b4759f6 contained the recovery file. The backend/.gitignore
rule (recovery_file_*.dat) was added in the same commit as the file, so the rule
had no effect on an already-tracked file.

Action taken:
1. git rm backend/recovery_file_28d9d51f-0194-4b5b-af65-23586e5f6a5c.dat
2. Added recovery_file_*.dat to the root .gitignore
3. Used commit-tree + update-ref to create a clean replacement root commit
   (b99e66b) that contains the original tree minus the recovery file, with
   original author/date preserved.
4. main was moved to point at b99e66b (clean root).
5. All hackathon modifications committed on top as 29df837.

Final git log on main:
  29df837  fix: remove recovery artifact, USDC balance, receipt hash, CCTP race, Gas Station
  b99e66b  feat: integrate Commerce Payments Protocol on Arc and redesign colorful frontend

The old commit b4759f6 remains accessible only via the local
pre-modification-checkpoint tag, which was NOT pushed and should be deleted
before the final force-push:
  git tag -d pre-modification-checkpoint
  git push origin main --force

---

## F. Paymaster / Gas Station Implementation

Mechanism: Circle Gas Station for Developer-Controlled Wallets (ERC-4337).

Supported on Arc Testnet: YES (confirmed from Circle docs — supported for
both Developer-Controlled and User-Controlled wallets).

Paymaster contract address on Arc Testnet:
  0x7ceA357B5AC0639F89F9e378a1f03Aa5005C0a25

How it works:
- Circle Gas Station auto-creates a default testnet policy on account signup.
- Daily sponsored limit on Arc Testnet: 50 USDC.
- Gas sponsorship applies automatically to any createTransaction() call from
  an SCA wallet when the policy is active — no per-transaction API change.
- The SDK fee field is still required (governs gas pricing strategy); the
  paymaster intercepts and covers the actual cost.

What changed:
- wallet.ts createWallet(): accountType "EOA" -> "SCA" for Arc user wallets.
- wallet.ts: getWalletAccountType() helper added.
- sendPayment.ts: gasSponsored boolean returned to callers.

What did NOT change:
- CCTP funding wallets remain EOA (they bridge from chains where Gas Station
  is not applicable to this use case).
- Existing user wallets unchanged (no in-place EOA->SCA upgrade path exists).
- No custom paymaster built — uses Circle's existing infrastructure.

Hard constraint reported as required by MOD-5 instructions:
  Existing EOA user wallets cannot benefit from Gas Station without wallet
  recreation. A full migration was out of scope for this modification set.

---

## G. Tests

Backend typecheck: 0 new errors in modified files. Pre-existing failures from
uninstalled packages (express, graphql-request, etc.) unchanged.

Frontend typecheck: 0 new errors in modified files. Pre-existing failures from
uninstalled next package unchanged.

MOD-6 test script covers:
  T1: createWallet() -> accountType SCA           [needs Circle credentials]
  T2: getWalletAccountType() -> "SCA"             [needs Circle credentials]
  T3: getBalance() -> 6-decimal USDC string       [needs Circle credentials]
  T4: new SCA wallet has zero native gas          [needs Circle credentials]
  T5: sponsored USDC payment via SCA wallet       [manual step, needs funded wallet]
  T6: failure paths (bad address, bad walletId)   [needs Circle credentials]

Live run: not possible without CIRCLE_API_KEY + CIRCLE_ENTITY_SECRET in sandbox.

Build, backend startup, frontend startup: not tested (node_modules not installed).
No structural changes to server.ts or route layer.

---

## H. Remaining Issues

1. No migration path for existing EOA wallets to SCA.
2. Duffel booking not connected to payment flow (documented in README as partial).
3. Pre-existing typecheck failures from uninstalled packages.
4. Supabase RLS not hardened (noted in README security section).
5. No rate limiting on API routes (noted in README security section).
6. pre-modification-checkpoint tag retains old commit — delete before force-push.
7. USDC_CONTRACT_ADDRESS in .env.example is redundant with contracts/index.ts.
