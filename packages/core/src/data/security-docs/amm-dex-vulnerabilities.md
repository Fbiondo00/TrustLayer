# AMM / DEX Vulnerabilities

**Category:** DeFi Vulnerability
**Severity:** high
**Related SWCs:** SWC-101 (Integer Overflow), SWC-107 (Reentrancy), SWC-116 (Block Values as Time Proxies)

## Description

Automated Market Makers (AMMs) are the backbone of decentralized trading. Unlike traditional order-book exchanges, AMMs use mathematical formulas to determine prices and facilitate swaps. The three dominant AMM models are:

- **Constant Product (Uniswap V2):** `x * y = k` — the product of two token reserves must remain constant.
- **Concentrated Liquidity (Uniswap V3):** Liquidity providers choose specific price ranges, and positions are represented as non-fungible tokens with tick-based math.
- **StableSwap (Curve):** A modified formula optimized for assets that should trade near parity (stablecoins), using a combination of constant product and constant sum curves.

Each model has unique mathematical properties that, if implemented incorrectly, create exploitable vulnerabilities. The complexity of AMM math — especially concentrated liquidity with tick calculations, fee accumulation, and position sizing — creates numerous edge cases where small implementation errors can lead to massive exploits.

**Key vulnerability categories:**

1. **K-value manipulation** — In constant product AMMs, the invariant `k = x * y` must hold after every swap. If a protocol allows the k-value to be manipulated (e.g., through direct token transfers, fee misaccounting, or rounding errors), attackers can drain the pool.

2. **Tick math errors** — Uniswap V3-style concentrated liquidity uses tick-based price ranges. Errors in tick-to-price conversion, tick spacing validation, or boundary checks can allow swaps at incorrect prices.

3. **Fee calculation errors** — Swap fees must be correctly calculated and distributed to liquidity providers. Errors in fee accumulation, particularly at tick boundaries or during position updates, can be exploited.

4. **Liquidity manipulation** — Adding or removing liquidity in ways that game the AMM math, particularly in concentrated liquidity where position value depends on the current tick.

5. **Flash loan + AMM exploits** — Using flash loans to shift reserves, exploit rounding errors, or manipulate fee calculations within a single transaction.

## Vulnerable Code

```solidity
// VULNERABLE: Custom AMM pool with k-value check but no rounding protection
contract VulnerablePool {
    uint256 public reserve0;
    uint256 public reserve1;
    uint256 public feeBps = 30; // 0.3%

    function swap(uint256 amountIn, bool zeroToOne) external returns (uint256 amountOut) {
        require(amountIn > 0, "Zero input");

        if (zeroToOne) {
            // Calculate output using constant product
            uint256 amountInWithFee = (amountIn * (10000 - feeBps)) / 10000;
            // Rounding truncation: attacker can exploit by splitting into
            // many small swaps that each round down the output
            amountOut = (reserve1 * amountInWithFee) / (reserve0 + amountInWithFee);

            // BUG: k-value check uses wrong formula — doesn't account for fees
            // This allows k-value to decrease over time via rounding accumulation
            require(
                (reserve0 + amountIn) * (reserve1 - amountOut) >= reserve0 * reserve1,
                "K-value decreased"
            );

            reserve0 += amountIn;
            reserve1 -= amountOut;
        } else {
            uint256 amountInWithFee = (amountIn * (10000 - feeBps)) / 10000;
            amountOut = (reserve0 * amountInWithFee) / (reserve1 + amountInWithFee);

            reserve1 += amountIn;
            reserve0 -= amountOut;
        }

        // Missing: minimum output check (slippage protection)
        // Missing: deadline check (MEV protection)
    }
}
```

## Fixed Code

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SecurePool is ReentrancyGuard {
    uint256 private reserve0;
    uint256 private reserve1;
    uint256 public constant FEE_BPS = 30;
    uint256 public constant FEE_SCALE = 10000;

    // k-value must increase or stay same after every swap
    uint256 public kLast;

    event Swap(address indexed sender, uint256 amountIn, uint256 amountOut, bool zeroToOne);

    function swap(
        uint256 amountIn,
        bool zeroToOne,
        uint256 minAmountOut,  // Slippage protection
        uint256 deadline       // MEV / front-running protection
    ) external nonReentrant returns (uint256 amountOut) {
        require(amountIn > 0, "Zero input");
        require(block.timestamp <= deadline, "Expired deadline");

        if (zeroToOne) {
            uint256 amountInWithFee = (amountIn * (FEE_SCALE - FEE_BPS)) / FEE_SCALE;
            // Round output DOWN (in swapper's favor for the denominator)
            amountOut = (reserve1 * amountInWithFee) / (reserve0 + amountInWithFee);
        } else {
            uint256 amountInWithFee = (amountIn * (FEE_SCALE - FEE_BPS)) / FEE_SCALE;
            amountOut = (reserve0 * amountInWithFee) / (reserve1 + amountInWithFee);
        }

        // Slippage check
        require(amountOut >= minAmountOut, "Insufficient output");

        // Update reserves BEFORE transfer (CEI pattern)
        if (zeroToOne) {
            reserve0 += amountIn;
            reserve1 -= amountOut;
        } else {
            reserve1 += amountIn;
            reserve0 -= amountOut;
        }

        // Verify k-value increased (includes fee component)
        uint256 newK = reserve0 * reserve1;
        require(newK >= kLast, "K-value must not decrease");
        kLast = newK;

        emit Swap(msg.sender, amountIn, amountOut, zeroToOne);
    }

    function getReserves() external view returns (uint256, uint256) {
        return (reserve0, reserve1);
    }
}
```

## Real-World Impact

**KyberSwap ($47M, November 2023)** — An attacker exploited a tick math vulnerability in KyberSwap Elastic (concentrated liquidity AMM). The exploit involved manipulating the pool's tick state by swapping back and forth across tick boundaries, causing the reinvestment curve to compute incorrect fee amounts. The attacker drained approximately $47 million across multiple chains.

**Curve Finance ($70M, July 2023)** — While primarily a compiler vulnerability (certain Vyper versions failed to implement the reentrancy guard), the exploit targeted Curve's StableSwap pools. The reentrancy allowed attackers to manipulate pool state during swaps, draining multiple pools. This combined an infrastructure vulnerability with AMM-specific state manipulation.

**Balancer ($23M, August 2023)** — A read-only reentrancy vulnerability in Balancer V2 pools allowed attackers to manipulate the protocol's internal accounting during token transfers, exploiting the AMM math to extract value.

**Merlin DEX ($2.3M, 2023)** — A custom AMM implementation with a flawed price curve that could be exploited by carefully crafted swap sequences, allowing the attacker to extract more value than the pool's fees should permit.

For AI agent contracts, AMM vulnerabilities are relevant when agents interact with DEXs for trading, liquidity provision, or arbitrage. An agent that swaps through a vulnerable AMM pool could lose user funds through manipulated prices, or its own liquidity positions could be drained through tick math exploits.

## How TrustLayer Detects This

TrustLayer's pipeline identifies AMM-related vulnerabilities through:

- **Slither (Step 3, 30% weight)** uses the `divide-before-multiply` and `incorrect-equality` detectors to find arithmetic issues in swap calculations. The `reentrancy-eth` detector identifies CEI pattern violations in pool contracts.

- **Permission Mapper (Step 5, 25% weight)** flags `pool_management`, `swap_execution`, and `liquidity_management` patterns. It specifically notes contracts that implement custom AMM math (higher risk) versus those using audited libraries (lower risk).

- **Dedaub TokIn API (Step 4, 20% weight)** analyzes the tokens used in pool contracts, flagging known-vulnerable token combinations and liquidity levels that make AMM exploits feasible.

- **AI Analysis (Step 7, 10% weight)** evaluates the AMM architecture holistically, identifying missing slippage checks, absent deadline parameters, rounding direction issues, and whether the k-value invariant is properly enforced.

## References

- Uniswap V3 Whitepaper: https://uniswap.org/whitepaper-v3.pdf
- Curve StableSwap Paper: https://curve.fi/files/stableswap-paper.pdf
- KyberSwap Post-Mortem: https://rekt.news/kyberswap-rekt/
- Curve Reentrancy Incident: https://rekt.news/curve-rekt/
- AMM Security Research: https://github.com/Uniswap/v3-core/blob/main/audits/tob/
