# Relay

Relay is an ACP-compatible commerce execution layer that makes onchain commerce
executable across merchants and services. Agents and users express a commerce
intent; Relay handles provider selection, execution, USDC payment, Arc
settlement, and verifiable receipt minting — all without the user needing to
manage gas, bridges, or provider-specific APIs.

Built at a hackathon using Circle's developer platform, Arc Testnet, and the
Arc Commerce Payments Protocol (ACP).

---

## What Relay Does

Relay accepts a structured commerce request and executes it end-to-end:

1. **Intent parsing** — natural-language or structured constraints are parsed
   into a normalized form (`parseConstraints`).
2. **Provider selection** — Relay routes the intent to the matching adapter
   (Shopify, Saleor, Reloadly, Duffel).
3. **Checkout / order creation** — the adapter creates a real order or quote
   with the provider's API.
4. **Liquidity assurance** — if the user's Arc wallet lacks sufficient USDC,
   Relay auto-bridges from another supported chain via Circle CCTP, then
   *waits* for the funds to arrive before proceeding (PAY-04 fix).
5. **USDC payment** — transfers USDC from the user's Circle-managed SCA wallet
   to Relay's treasury. Gas is sponsored by Circle Gas Station — the user needs
   zero native Arc gas.
6. **Settlement** — Relay forwards value to the merchant and confirms the order.
7. **Receipt minting** — an NFT receipt is minted to the buyer's address on Arc
   with embedded JSON metadata. The returned `txHash` is the real blockchain
   transaction hash so the ArcScan link always works (BC-05 fix).

---

## ACP Compatibility

Relay implements the Arc Commerce Payments Protocol (ACP) on top of EIP-3009
(transferWithAuthorization) and a deploy of the `AuthCaptureEscrow` and
`ERC3009PaymentCollector` contracts on Arc Testnet.

ACP flow:
```
Agent / UI
  → POST /agent/escrow/intent           (build payment info + nonce for EIP-3009 authorization)
  → POST /agent/escrow/authorize        (submit signed authorization, lock funds in escrow)
  → POST /agent/escrow/capture          (capture escrow + settle to merchant)
  → POST /agent/escrow/void             (void an authorized-but-uncaptured escrow)
  → POST /agent/escrow/refund           (refund a captured payment)
  → GET  /agent/receipt-status/:checkoutId  (retrieve minted receipt + txHash)
```

The `RelayAPP` class in `backend/src/core/app/` implements the server side of
the ACP standard; `ReloadlyACP` in `core/acp/` wraps the Reloadly airtime
provider for ACP-compatible access.

---

## Merchant / Service Integrations

| Provider | Adapter | Status |
|---|---|---|
| **Shopify** | `ShopifyAdapter.ts` | Functional — product search, storefront checkout |
| **Saleor** | `SaleorAdapter.ts` | Functional — GraphQL product search, order creation |
| **Saleor GraphQL** | `routes/saleorPayment.ts` | Functional — direct GraphQL payment route |
| **Reloadly** | `ReloadlyAdapter.ts` + `ReloadlyACP.ts` | Functional — airtime top-up via ACP |
| **Duffel** | `DuffelAdapter.ts` | Partial — flight search integrated, booking not wired to payment |

---

## Payments

### USDC

All payments use USDC on Arc Testnet. Relay reads balances via ERC-20
`balanceOf()` on the USDC contract (6-decimal precision). The native Arc gas
representation (18 decimal) is never shown to users.

### Circle Programmable Wallets

Relay uses Circle Developer-Controlled Wallets (DCW) to custody user funds:

- **Arc wallet (SCA)** — created with `accountType: "SCA"`. Eligible for Circle
  Gas Station gas sponsorship. This is the wallet that holds user USDC and
  executes payments.
- **CCTP funding wallets (EOA)** — one EOA per supported chain (ETH-SEPOLIA,
  ARB-SEPOLIA, BASE-SEPOLIA, OP-SEPOLIA, AVAX-FUJI). These are used as CCTP
  burn-side wallets and must hold native gas on their respective chains.

### Arc

Relay targets Arc Testnet (`chainId: 5042002`). Arc uses USDC as the native gas
token; the ERC-20 USDC address is `0x3600000000000000000000000000000000000000`.

### CCTP (Cross-Chain Transfer Protocol)

If a user's Arc USDC balance is insufficient for a purchase, Relay checks the
user's other-chain wallets for available USDC and bridges the shortfall via
Circle CCTP V2. The bridge is fire-and-wait — Relay polls the Arc balance until
the bridged funds arrive before proceeding to payment (3-minute timeout).

### Escrow

The `AuthCaptureEscrow` contract provides an authorize-then-capture pattern
compatible with ACP. Funds are locked in escrow at authorization time and
released to the merchant on successful settlement.

### Receipt / NFT

After a successful purchase, Relay calls `mintTo(address, tokenURI)` on the
deployed `RelayReceipt` NFT contract. The tokenURI is an embedded base64 JSON
object (no IPFS dependency). The receipt's blockchain `txHash` is retrieved by
polling the Circle transaction until it reaches on-chain COMPLETE state — never
the Circle operation UUID.

### Sponsored Gas / Gas Station

New user wallets are created as SCA. Circle Gas Station for Arc Testnet
auto-applies a default policy on signup (50 USDC/day). This means:

- Users pay zero native Arc gas
- Transactions are sponsored automatically by Circle's Gas Station paymaster
- No code change per-transaction — the DCW SDK routes to Gas Station when the
  wallet is SCA and a policy is active

**Limitation:** existing EOA wallets (created before this change) are not
eligible for Gas Station and must hold native USDC for gas. There is no in-place
upgrade path from EOA to SCA; those users require a wallet migration.

---

## End-to-End Flow

```
Commerce request (natural language or structured)
  ↓
parseConstraints()
  ↓
Provider adapter (Shopify / Saleor / Reloadly / Duffel)
  ↓
Order / quote created at provider
  ↓
ensureArcLiquidity()
  → Arc USDC sufficient?  ──→ proceed
  → No? bridge via CCTP   ──→ poll until USDC arrives on Arc (PAY-04 fix)
  ↓
sendUsdcPayment()
  → SCA wallet? Gas Station sponsors gas automatically
  → EOA wallet? Gas deducted from wallet's USDC balance
  ↓
USDC transferred to treasury (real on-chain txHash from DCW polling)
  ↓
Merchant settlement (provider API)
  ↓
mintReceipt()
  → Circle DCW createContractExecutionTransaction
  → poll until txHash present (BC-05 fix)
  ↓
Receipt NFT on Arc + real txHash → ArcScan link works
```

---

## Architecture

```
frontend/              Next.js 14 App Router frontend
  src/app/
    dashboard/         Authenticated user dashboard
      page.tsx         Main dashboard + wallet overview
      wallet/          Arc wallet + CCTP funding wallet management
      shop/            Purchase flow UI
      airtime/         Reloadly top-up UI
      services/        ACP service listing

backend/               Express + TypeScript backend
  src/
    server.ts          Route registration entry point
    chain.ts           Arc viem client, ERC-20 USDC balance (BC-02)
    wallet.ts          Circle DCW wallet creation (SCA, MOD-5)
    autoLiquidity.ts   CCTP bridge + balance polling (PAY-04)
    agent/
      sendPayment.ts   USDC transfer with Gas Station support (MOD-5)
      mintReceipt.ts   NFT receipt minting + txHash polling (BC-05)
      constraintParser.ts
      executePurchaseSearch.ts
      executePayment.ts
    merchants/
      ShopifyAdapter.ts
      SaleorAdapter.ts
      ReloadlyAdapter.ts
      DuffelAdapter.ts
    core/
      app/             ACP protocol implementation (RelayAPP)
      acp/             ACP adapters (ReloadlyACP)
      settlement/      Settlement helpers
    routes/            Express route handlers
    contracts/         ABI + address constants for Arc contracts
```

Key external services:
- **Circle Developer API** — wallet custody, token transfers, Gas Station
- **Supabase** — user auth + wallet/order persistence
- **Arc Testnet RPC** — `https://rpc.testnet.arc.network`
- **ArcScan** — `https://testnet.arcscan.app`

---

## Demo / Setup

### Prerequisites

- Node.js 18+ or Bun
- A Circle developer account with Arc Testnet access
- Supabase project
- (Optional) Shopify storefront, Saleor GraphQL endpoint, Reloadly account

### Environment variables

Create `backend/.env`:

```env
# Circle
CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
CIRCLE_WALLET_SET_ID=

# Relay wallets (Arc Testnet)
RELAY_TREASURY_CIRCLE_WALLET_ID=
RELAY_TREASURY_ADDRESS=
RELAY_RECEIPT_CONTRACT_ADDRESS=
USDC_TOKEN_ID=
USDC_CONTRACT_ADDRESS=0x3600000000000000000000000000000000000000

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=

# Providers (optional — set as needed)
SHOPIFY_STORE_URL=
SHOPIFY_STOREFRONT_TOKEN=
SALEOR_API_URL=
RELOADLY_CLIENT_ID=
RELOADLY_CLIENT_SECRET=
DUFFEL_ACCESS_TOKEN=

# App
PORT=4000
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Setup

```bash
# Install backend
cd backend && npm install

# Register entity secret (once per Circle entity)
# Follow the Circle developer console:
# https://console.circle.com/wallets/dev/configurator/entity-secret

# Deploy receipt contract (once)
cd backend && npx ts-node src/deployReceiptContract.ts

# Install frontend
cd frontend && npm install
```

### Running

```bash
# Terminal 1 — backend
cd backend && npm run dev
# Starts Express on http://localhost:4000

# Terminal 2 — frontend
cd frontend && npm run dev
# Starts Next.js on http://localhost:3000
```

### Testnet configuration

1. Log in to the Circle developer console.
2. Toggle to **Testnet**.
3. Create a **wallet set** and set `CIRCLE_WALLET_SET_ID`.
4. Deploy a treasury wallet (SCA) on ARC-TESTNET and fund it with testnet USDC
   via [https://faucet.circle.com](https://faucet.circle.com).
5. Navigate to **Gas Station** and confirm a default testnet policy exists for
   Arc Testnet (it is created automatically on signup).
6. Set `RELAY_TREASURY_CIRCLE_WALLET_ID` and `RELAY_TREASURY_ADDRESS`.

### Example commerce flow

1. Sign up at `http://localhost:3000`
2. Relay creates an SCA wallet on Arc Testnet for you
3. Fund the wallet via the Circle testnet faucet (Arc Testnet USDC)
4. Navigate to **Shop** — search for a product on Shopify or Saleor
5. Click **Buy** — Relay executes the purchase end-to-end
6. Gas is sponsored by Circle Gas Station (zero native gas needed)
7. On success, a receipt NFT is minted and you receive an ArcScan link

### Payment flow details

- USDC is transferred from your SCA wallet to Relay's treasury
- If your Arc balance is low, Relay bridges from another chain automatically
- Gas is sponsored — you never need to acquire native Arc gas
- The receipt hash links directly to the minted NFT on ArcScan

### Receipt verification

```
GET /receipt/{orderId}
```

Returns `{ txHash, arcScanUrl, tokenURI, metadata }`. The `txHash` is the real
on-chain transaction hash; the ArcScan link opens the minted NFT transaction.

### Gas Station test

```bash
cd backend && bun run src/test/mod6-gas-station-test.ts
```

Creates a fresh SCA wallet, verifies it has zero native gas, checks the ERC-20
USDC balance reads correctly, and confirms Gas Station eligibility.

---

## Security

**This is a hackathon prototype. It is NOT production-grade.**

Known limitations:
- Circle Developer-Controlled Wallets means Circle custodies all user keys. This
  is appropriate for a hackathon demo; a production system would use
  User-Controlled Wallets or a non-custodial model.
- No formal audit. Smart contracts (`AuthCaptureEscrow`, `ERC3009PaymentCollector`)
  are proof-of-concept deployments on Arc Testnet.
- All credentials must be in `.env` — do not commit `.env` files.
- The Circle Entity Secret recovery file (`recovery_file_*.dat`) must never be
  committed to version control. The root `.gitignore` prevents this.
- Supabase RLS is not hardened — Row-Level Security policies should be reviewed
  before any user-facing deployment.
- API routes have no rate limiting.
- The backend has no authentication middleware beyond Supabase session validation.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, Tailwind CSS, TypeScript |
| Backend | Express, TypeScript, Bun |
| Wallet custody | Circle Developer-Controlled Wallets |
| Gas sponsorship | Circle Gas Station (ERC-4337, Arc Testnet) |
| Payment token | USDC on Arc Testnet |
| Bridging | Circle CCTP V2 |
| Settlement | Arc Commerce Payments Protocol (ACP) |
| Contracts | Solidity (AuthCaptureEscrow, ERC3009PaymentCollector, RelayReceipt NFT) |
| Chain | Arc Testnet (chainId: 5042002) |
| Database | Supabase (Postgres) |
| Commerce providers | Shopify Storefront API, Saleor GraphQL, Reloadly, Duffel |

---

## Submission Notes for Judges

Relay demonstrates that onchain commerce can be **completely invisible to the
user**. A user with USDC and zero native gas can:

1. Click **Buy** on a real product
2. Have Relay auto-bridge liquidity from another chain if needed
3. Have their transaction gas sponsored by Circle Gas Station
4. Receive a verifiable NFT receipt with a working ArcScan link

All of this happens with no manual gas management, no bridge UI, and no
provider-specific knowledge required from the user or the agent triggering the
purchase.

The ACP integration means any ACP-compatible agent can call Relay's endpoints
to execute commerce — making Relay a composable commerce execution primitive
for the Arc agentic economy.

**Live demo:** Connect the backend and frontend, fund a wallet with testnet USDC
from [https://faucet.circle.com](https://faucet.circle.com), and walk through
the Shop or Airtime demo flows. Gas sponsorship activates automatically for
new SCA wallets.
