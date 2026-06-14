# TrustLayer Contracts

Foundry project containing the **$TRUST token**, **payment gateway**, and **demo contracts** for the TrustLayer trust-scoring platform.

## Architecture

```
contracts/
├── src/
│   ├── TrustLayerToken.sol       ← $TRUST ERC20 (mintable, burnable, permit)
│   └── TrustLayerCredits.sol     ← Payment gateway (buy credits → pay per scan)
├── test/
│   ├── TrustLayerToken.t.sol     ← 15 tests (mint, burn, permit, fuzz)
│   └── TrustLayerCredits.t.sol   ← 31 tests (buy, consume, pause, admin, fuzz)
├── script/
│   └── Deploy.s.sol              ← Sepolia deployment script
├── demo/                         ← 8 demo contracts for pipeline testing
│   ├── MaliciousAgent.sol        ← Target F score (unlimited access, self-destruct)
│   ├── SafeAgent.sol             ← Target A+ score (whitelist, time-lock, limits)
│   ├── Reentrancy.sol            ← Classic reentrancy vulnerability
│   ├── DAOHack.sol               ← DAO-style drain attack
│   ├── AccessControl.sol         ← Missing access control
│   ├── UncheckedCall.sol         ← Unchecked return values
│   ├── FlashLoanVuln.sol         ← Flash loan manipulation
│   └── SafeContract.sol          ← Baseline safe contract
├── lib/
│   ├── forge-std/                ← Foundry testing library
│   └── openzeppelin-contracts/   ← OpenZeppelin v5 (ERC20, access control, utils)
└── foundry.toml                  ← solc 0.8.28, fuzz runs 50
```

## Contracts

### TrustLayerToken ($TRUST)

ERC20 utility token with:

| Feature | Implementation |
|---|---|
| **Standard** | OpenZeppelin `ERC20` (18 decimals) |
| **Minting** | `onlyOwner` with hard cap at 10,000,000 TRUST |
| **Burning** | Anyone can burn their own tokens (`ERC20Burnable`) |
| **Permit** | EIP-2612 gasless approvals via `ERC20Permit` |
| **Max Supply** | `10_000_000 * 1e18` — enforced in `mint()` |

```solidity
// Mint (owner only)
token.mint(recipient, 1000 * 1e18);

// Burn (any holder)
token.burn(100 * 1e18);

// Gasless approve (EIP-2612 permit)
token.permit(owner, spender, amount, deadline, v, r, s);
```

**Error:** `ExceedsMaxSupply(uint256 requested, uint256 remaining)` — reverts if mint would exceed 10M cap.

### TrustLayerCredits (Payment Gateway)

Handles the credit lifecycle: **buy → hold → consume per scan**.

**Flow:**
1. User calls `trustToken.approve(creditsAddress, amount)`
2. User calls `credits.buyCredits(count)` — TRUST moves to treasury, credits credited
3. TrustLayer backend (owner) calls `credits.consumeCredit(user, scanId)` — 1 credit burned

| Function | Access | Description |
|---|---|---|
| `buyCredits(count)` | Anyone | Purchase scan credits with TRUST |
| `consumeCredit(user, scanId)` | Owner only | Burn 1 credit after pipeline runs |
| `previewCost(count)` | View | Preview TRUST cost for N credits |
| `setCreditPrice(newPrice)` | Owner only | Update price per credit |
| `setTreasury(newTreasury)` | Owner only | Change treasury address |
| `pause()` / `unpause()` | Owner only | Emergency circuit breaker |
| `withdraw(token, to, amount)` | Owner only | Rescue accidentally sent tokens/ETH |

**Custom Errors:**
- `GatewayPaused()` — action blocked while paused
- `GatewayNotPaused()` — cannot unpause if not paused
- `ZeroAddress()` — zero address not allowed
- `ZeroAmount()` — zero amount not allowed
- `InsufficientCredits(available, required)` — user has no credits
- `TransferFailed()` — ERC20 transfer returned false

## Security Measures

### TrustLayerToken

| Threat | Mitigation |
|---|---|
| **Inflation attack** | Hard cap at 10M TRUST, enforced in `mint()` with pre-check before `_mint()` |
| **Unauthorized minting** | `onlyOwner` modifier from OpenZeppelin `Ownable` |
| **Overflow/underflow** | Solidity 0.8.28 built-in checked arithmetic |
| **Approval front-running** | EIP-2612 `permit()` — signed approvals, no on-chain tx needed |
| **Infinite approval drain** | Standard ERC20 `approve` — users control their own allowances |

### TrustLayerCredits

| Threat | Mitigation |
|---|---|
| **Reentrancy** | OpenZeppelin `ReentrancyGuard` on all external functions + strict CEI (Checks-Effects-Interactions) pattern: state updated before `transferFrom` |
| **Access control** | `onlyOwner` on all admin + consume functions; users can only buy for themselves |
| **Emergency response** | `pause()` blocks all buys and consumes; `withdraw()` recovers stuck tokens |
| ** Treasury change** | `setTreasury()` validates non-zero address; emits event for off-chain monitoring |
| **Price manipulation** | `setCreditPrice()` validates non-zero; emits old/new price event |
| **Stuck funds** | `withdraw()` handles both ETH and ERC20; `receive()` accepts ETH for rescue |
| **Integer overflow** | Solidity 0.8.28 checked arithmetic; `count * creditPrice` safe for realistic values |

### General

| Practice | Implementation |
|---|---|
| **Custom errors** | Gas-efficient revert reasons (no string storage) instead of `require("message")` |
| **Events on all state changes** | `CreditsPurchased`, `CreditConsumed`, `CreditPriceUpdated`, `TreasuryUpdated`, `Paused`, `Unpaused`, `Withdrawn` — full off-chain audit trail |
| **Immutable trust token** | `trustToken` is `immutable` — set once in constructor, cannot be changed |
| **Zero-address guards** | Constructor and all setters reject `address(0)` |
| **Zero-amount guards** | `buyCredits(0)`, `setCreditPrice(0)`, `withdraw(_, _, 0)` all revert |
| **No uninitialized state** | All critical state (treasury, price) set in constructor |
| **No self-destruct** | Neither contract uses `selfdestruct` or `delegatecall` |
| **OpenZeppelin base** | All base contracts (ERC20, Ownable, ReentrancyGuard) are audited, battle-tested library code |

## Quick Start

```bash
# Install dependencies (already done if lib/ exists)
forge install

# Build
forge build

# Run all tests
forge test -vvv

# Run with gas report
forge test --gas-report

# Run specific test
forge test --match-test test_BuyCredits -vvvv
```

## Deploy to Sepolia

```bash
# Set environment variables
export PRIVATE_KEY=0x...
export TREASURY_ADDRESS=0x...
export ETHERSCAN_API_KEY=...
export CREDIT_PRICE=10000000000000000000  # optional, default 10 TRUST

# Dry run
forge script script/Deploy.s.sol --rpc-url sepolia

# Deploy + verify
forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --verify
```

The deploy script:
1. Deploys `TrustLayerToken` with deployer as owner
2. Deploys `TrustLayerCredits` pointing to token + treasury
3. Mints 1,000,000 TRUST to deployer for initial liquidity

## Test Coverage

| Contract | Tests | Scenarios |
|---|---|---|
| TrustLayerToken | 15 | Deploy, mint, burn, transfer, approve, permit, max supply enforcement, fuzz |
| TrustLayerCredits | 31 | Buy, consume, full flow, pause/unpause, admin (price, treasury, withdraw), all revert paths, fuzz |
| **Total** | **46** | All passing ✅ |

## Dependencies

- **forge-std** — Foundry testing cheatcodes + assertions
- **openzeppelin-contracts** (v5) — ERC20, ERC20Burnable, ERC20Permit, Ownable, ReentrancyGuard, IERC20

## License

MIT
