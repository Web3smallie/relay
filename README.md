# Relay

## The commerce execution layer for AI agents and humans

Relay is a commerce execution layer that helps people and AI agents complete real-world transactions across different service providers.

It gives an agent one programmable path to discover a service, carry out the provider-specific steps, make a stablecoin payment, settle the transaction, verify the result, and receive a verifiable on-chain receipt.

In simple terms, Relay turns:

**“I want this”**

into:

**“It has been completed, paid for, settled, verified, and recorded.”**

> AI agents should be able to do more than recommend a purchase. They should be able to execute it safely and leave a verifiable record.

## Why Relay exists

AI can already understand requests such as:

> “Find a product under $100 and buy it if it is available.”

But understanding a request is only the beginning.

To complete a real transaction, a system may need to:

- Search a provider's catalogue
- Check availability
- Create a checkout
- Select delivery or shipping options
- Authorize and execute payment
- Confirm that the transaction succeeded
- Keep a verifiable receipt

Every provider handles these steps differently. One may use REST APIs, another GraphQL, and another a completely custom transaction flow.

Without Relay, every agent would need to separately understand and integrate with every provider:

```text
Agent or human -> Provider A
Agent or human -> Provider B
Agent or human -> Provider C
```

Relay creates a common execution layer:

```text
Agent or human -> Relay -> Service provider
```

Relay handles the translation, orchestration, payment execution, settlement, verification, and transaction record.

## What Relay does

Relay is a working commerce system with an implemented end-to-end execution path.

It combines:

- Service discovery
- Provider-specific transaction execution
- Relay-built programmable stablecoin payments
- Settlement on Arc
- Circle Programmable Wallet integration
- Bidirectional USDC bridging with CCTP
- Payment verification
- On-chain NFT transaction receipts
- Working ACP integrations for Saleor and Reloadly

## Core capabilities

### Service discovery and commerce execution

Relay receives a request from a person or AI agent and turns it into a structured transaction flow.

For example:

> “Find a product under $100 and buy it if it is available.”

Relay can identify requirements such as:

- The product or service being requested
- Maximum price
- Availability requirements
- Delivery or shipping details
- Payment requirements

Relay then sends the request to the relevant provider integration and prepares the provider-specific transaction.

### Provider adapters

Every commerce provider has different APIs, authentication methods, product formats, and checkout rules.

Relay solves this through adapters.

An adapter acts as a translator between Relay and a provider. Relay uses one consistent execution model, while each adapter handles the details required by that specific provider.

Current provider work includes:

- **Saleor** - GraphQL search and checkout operations, including shipping-method selection
- **Shopify** - Integration foundation for Shopify commerce flows
- **Reloadly** - Provider and agent-commerce integration work

This makes Relay extensible: adding a provider should mean adding an adapter, not rebuilding the entire agent or payment system.

### Programmable stablecoin payments

Relay has its own programmable stablecoin payment system, built from scratch.

The payment system is separate from Circle Programmable Wallets. Circle Wallets provide wallet infrastructure; Relay owns the payment orchestration and execution logic.

Relay's programmable payment flow currently uses USDC and can:

- Authorize a payment
- Execute a payment
- Track payment and transaction information
- Track payer addresses
- Verify payment completion
- Track receipt status
- Connect payment to the broader commerce transaction

```text
Commerce request
        |
        v
Payment authorization
        |
        v
Payment execution
        |
        v
Settlement
        |
        v
Verification
        |
        v
NFT receipt
```

This means payment is not treated as a separate manual handoff. It is part of the same commerce execution flow.

### Settlement on Arc

Relay is built on **Arc**, which provides the settlement foundation for commerce transactions.

Arc is the underlying settlement environment. Relay is the execution layer built on top of it.

Relay coordinates:

- The user's request
- Provider-specific actions
- Payment logic
- Settlement
- Verification
- Transaction records

### Circle Programmable Wallets

Relay integrates with **Circle Programmable Wallets**.

This is a separate capability from Relay's programmable payment system. Wallets provide application-connected wallet infrastructure for users, while Relay's payment system determines how a payment is authorized, executed, and verified.

Implemented wallet capabilities include:

- Creating wallets for users
- Saving wallet information
- Retrieving wallet information
- Looking up wallet balances

### Bidirectional CCTP bridging

Relay includes **bidirectional CCTP bridging** for USDC.

CCTP enables native USDC to move between supported blockchain networks.

Bidirectional support means Relay can support USDC movement in either direction. This is useful when a user's funds and the service or settlement environment are on different supported networks.

### Payment verification and NFT receipts

Relay does not stop after sending a payment.

It tracks:

- Transaction hashes
- Payer addresses
- Payment verification status
- Receipt status

After a transaction is completed, Relay can mint an NFT receipt through its deployed smart contract.

The receipt is not a collectible for its own sake. It is a persistent, verifiable on-chain record that a commerce transaction was completed.

## Receipt contract

Relay uses a deployed smart contract to mint completed transaction receipts as NFTs.

| Contract detail | Value |
| --- | --- |
| Contract address | `0xf0cbdb78977dff70375185d98ceb4c84b91891b7` |
| Network | To be added |
| Explorer | To be added |

Once the network and explorer link are added, users will be able to inspect the contract and independently verify minted receipts.

## How Relay works

A typical Relay transaction follows this flow:

```text
1. A person or AI agent requests a service.
             |
2. Relay understands the request and its constraints.
   Example: product, budget, availability, destination.
             |
3. Relay selects the correct provider adapter.
             |
4. The adapter searches the provider and prepares
   the provider-specific transaction or checkout.
             |
5. Relay runs its programmable stablecoin payment flow.
             |
6. The transaction settles on Arc.
             |
7. Relay verifies the payment and transaction outcome.
             |
8. Relay mints an NFT receipt through its contract.
             |
9. The person or AI agent receives the transaction result.
```

The complete lifecycle is:

**Discover -> Execute -> Pay -> Settle -> Verify -> Mint receipt**

## Architecture

Relay is organized in layers so that new providers, payment methods, and agent workflows can be added without rebuilding the whole system.

```text
People and AI agents
        |
        v
Relay interface
  - Authentication
  - Profiles
  - Addresses
  - Agent workflows
  - Request and constraint handling
        |
        v
Commerce execution core
  - Provider selection
  - Checkout orchestration
  - Transaction coordination
  - Payment coordination
  - Verification
        |
        +-------------------+----------------------+-------------------+
        |                   |                      |                   |
        v                   v                      v                   v
Provider adapters     Payment system        Verification          Receipt contract
  - Saleor             - Relay-built          - Payment checks      - NFT minting
  - Shopify               stablecoin flow      - Transaction data
  - Reloadly           - USDC
                       - Arc settlement
                       - Circle Wallets
                       - CCTP bridging
```

### Interface and agent layer

This layer is where people and AI agents interact with Relay.

It receives everyday requests or structured instructions and turns them into a transaction plan. It also handles authentication, user profiles, and address information.

### Commerce execution core

The execution core is Relay's coordinator.

It decides which provider adapter should handle a request, runs the required provider actions, coordinates payment and settlement, verifies the result, and records the final transaction state.

### Provider adapters

Adapters isolate provider-specific complexity.

Each provider may have different APIs and checkout rules, but Relay presents a consistent execution model to agents and users.

### Payment and settlement layer

Relay's programmable stablecoin payment system handles payment authorization, execution, tracking, and verification.

Arc provides settlement infrastructure. Circle Programmable Wallets provide wallet infrastructure. CCTP supports movement of USDC between supported chains.

| Capability | Role |
| --- | --- |
| Relay programmable payment system | Handles payment authorization, execution, tracking, and verification |
| Arc | Provides the settlement foundation |
| Circle Programmable Wallets | Provides wallet infrastructure for users |
| CCTP | Enables native USDC movement across supported chains |

### Verification and receipt layer

Relay verifies that payment and provider actions completed successfully.

It then mints an NFT receipt through the deployed receipt contract, creating a durable on-chain record of the transaction.

## Agent Commerce Protocol integrations

Relay includes working ACP integrations:

- `SaleorACP`
- `ReloadlyACP`

ACP is part of the current system, not merely future work.

These integrations allow agent-oriented workflows to access commerce capabilities through Relay instead of requiring every agent to directly manage each provider's API.

## Application structure

Relay combines a Next.js frontend with a backend execution service and supporting integrations.

```text
relay/
|
├── frontend/
│   ├── app/                    # Pages and user-facing application flows
│   ├── components/             # Reusable interface components
│   └── lib/                    # Frontend helpers and API access
|
├── backend/
│   ├── agent/                  # Intent, constraints, search, and execution logic
│   ├── merchants/              # Provider-specific adapters
│   │   ├── ShopifyAdapter/
│   │   └── SaleorAdapter/
│   ├── routes/                 # API routes for user and transaction actions
│   ├── core/
│   │   ├── app/                # Relay application and execution core
│   │   └── acp/                # SaleorACP and ReloadlyACP integrations
│   ├── wallet/                 # Wallet management
│   ├── chain/                  # CCTP and receipt-contract interactions
│   ├── supabaseClient/         # User-facing Supabase access
│   ├── supabaseAdmin/          # Privileged server-side Supabase access
│   ├── verifiedPaymentsCache/  # Payment-verification records
│   └── mintedReceiptsCache/    # Receipt-minting records
|
└── README.md
```

## Frontend

The Next.js frontend gives people a direct way to use Relay.

It is responsible for the user experience, including:

- Sign-in
- User profiles
- Address information
- Commerce requests
- Transaction views
- Payment and receipt status

## Backend

The backend is Relay's execution engine.

It receives requests from the frontend or agent workflows, calls the appropriate provider adapter, coordinates payments and settlement, verifies transaction outcomes, and triggers receipt minting.

## Supabase

Supabase supports authentication, user profiles, and application data.

It gives Relay a persistent identity and data layer so that transactions can be associated with the correct user and application state.

## Local development

### Prerequisites

- Node.js and npm
- A Supabase project
- Arc configuration for settlement
- Circle configuration for Programmable Wallets and receipt minting
- Credentials for merchant or service integrations you enable

Clone the repository:

```bash
git clone <YOUR_REPOSITORY_URL>
cd relay
```

Relay has separate frontend and backend applications. Install and run each from its own directory:

```bash
# In the backend directory
npm install
npm run dev

# In the frontend directory
npm install
npm run dev
```

The backend is typically available at:

```text
http://localhost:4000
```

The Next.js frontend is typically available at:

```text
http://localhost:3000
```

Check the relevant `package.json` files for the exact scripts and configured ports.

## Configuration and security

Relay needs configuration for the integrations you choose to run, including:

- Supabase
- Arc
- Circle
- Merchant providers
- Blockchain and RPC services

Never commit API keys, service-role credentials, or private keys to source control.

Keep sensitive credentials on the server and configure production values through your deployment platform. The frontend should use a configured production API URL rather than a hard-coded localhost address.

## What comes next

Relay is designed to add new providers and commerce categories while keeping one execution model for agents and humans.

Planned areas of expansion include:

- A fuller Reloadly consumer-facing catalogue and frontend experience
- Duffel travel search and booking execution
- StableFX, pending KYC and additional integration work
- x402 support
- MPP support
- More transaction policies and permissions
- More agent-to-agent commerce workflows
- Production-scale idempotency, reconciliation, retries, rate limits, observability, and durable transaction state

## Contributing

Useful contributions include:

- Provider adapters
- Commerce execution workflows
- Payment verification
- Receipt systems
- Security
- Testing
- Observability

When adding a provider, keep provider-specific logic behind an adapter rather than coupling it directly to the agent layer.

## License

Consult the repository license and project terms before commercial reuse or redistribution.