# Oracle Manipulation

**Category:** DeFi Vulnerability
**Severity:** high
**Related SWCs:** SWC-120 (Weak Sources of Randomness), SWC-116 (Block Values as Time Proxies)

## Description

Oracles are the bridges between smart contracts and off-chain data. In DeFi, price oracles are critical — they determine collateral values, liquidation thresholds, exchange rates, and trading decisions. When an oracle can be manipulated, every downstream financial calculation becomes unreliable.

Oracle manipulation attacks exploit the way protocols source price data. The fundamental issue is that many protocols trust a single data source without adequate safeguards. If that source can be distorted — even temporarily within a single transaction — the protocol can be exploited.

**Key attack vectors:**

1. **Spot price manipulation** — Reading the current price directly from a DEX pool reserve ratio. An attacker can shift reserves with a large swap, causing the spot price to diverge wildly from the true market price.

2. **TWAP gaming** — Time-Weighted Average Prices are more resistant to manipulation, but an attacker who can influence prices over the TWAP measurement window (especially short windows like 10 minutes) can still skew the average enough to exploit protocols.

3. **Reserve skewing** — Directly manipulating token reserves in a liquidity pool through large deposits or withdrawals, affecting the price calculation without necessarily completing a trade.

4. **Stale oracle data** — Using Chainlink or another oracle without checking the `updatedAt` timestamp. During periods of high volatility or oracle downtime, the last reported price may be hours or days old.

5. **Single-source oracle risk** — Relying on one oracle (whether a DEX, Chainlink, or custom source) with no fallback. If that source fails or is compromised, the protocol has no safe price to fall back on.

6. **Self-inflation attacks** — Manipulating the price of a token that the attacker created, where the token has low liquidity and the attacker controls the supply.

## Vulnerable Code

```solidity
// VULNERABLE: Protocol reading spot price with no protection
contract VulnerableVault {
    IUniswapPair public pair;
    address public tokenA;
    address public tokenB;

    // Reads spot price — easily manipulated by a single large swap
    function getTokenPrice() external view returns (uint256) {
        (uint112 reserve0, uint112 reserve1,) = pair.getReserves();
        // No TWAP, no time window, no deviation check
        if (tokenA < tokenB) {
            return (uint256(reserve1) * 1e18) / uint256(reserve0);
        } else {
            return (uint256(reserve0) * 1e18) / uint256(reserve1);
        }
    }

    function deposit(uint256 amount) external {
        uint256 price = this.getTokenPrice();
        // Uses manipulable price for accounting
        shares[msg.sender] += (amount * price) / 1e18;
        IERC20(tokenA).transferFrom(msg.sender, address(this), amount);
    }

    function borrow(uint256 amount) external {
        uint256 price = this.getTokenPrice();
        // Collateral check uses manipulable price
        require(
            shares[msg.sender] >= amount * price / 1e18,
            "Undercollateralized"
        );
        IERC20(tokenB).transfer(msg.sender, amount);
    }
}
```

## Fixed Code

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SecureVault is ReentrancyGuard {
    IChainlinkFeed public chainlinkOracle;
    IUniswapPair public backupPair;

    uint256 public constant HEARTBEAT = 3600; // 1 hour max staleness
    uint256 public constant MAX_DEVIATION = 5e16; // 5% max deviation from TWAP

    // Primary: Chainlink with staleness + deviation check
    // Secondary: Uniswap TWAP (30 min) as sanity check
    function getSafePrice() public view returns (uint256) {
        // 1. Read Chainlink
        (, int256 clPrice,, uint256 updatedAt,) = chainlinkOracle.latestRoundData();
        require(clPrice > 0, "Invalid Chainlink price");
        require(block.timestamp - updatedAt < HEARTBEAT, "Stale oracle");

        // 2. Read TWAP from Uniswap (30-min average)
        uint256 twapPrice = _getTWAP(1800); // 30 min window

        // 3. Cross-check: deviation must be < 5%
        uint256 deviation = clPrice > int256(twapPrice)
            ? uint256(clPrice) - twapPrice
            : twapPrice - uint256(clPrice);
        uint256 maxDev = (uint256(clPrice) * MAX_DEVIATION) / 1e18;
        require(deviation <= maxDev, "Oracle deviation too high");

        return uint256(clPrice);
    }

    function _getTWAP(uint256 period) internal view returns (uint256) {
        // Read Uniswap V3 TWAP (simplified)
        // Real implementation uses observe() with historical cumulative prices
        (uint160 sqrtPriceX96,,,,,,) = IUniswapV3Pool(backupPair).slot0();
        return (uint256(sqrtPriceX96) * uint256(sqrtPriceX96)) / (1 << 192);
    }

    function deposit(uint256 amount) external nonReentrant {
        uint256 price = getSafePrice();
        shares[msg.sender] += (amount * price) / 1e18;
        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amount);
    }
}
```

## Real-World Impact

**Mango Markets ($114M, October 2022)** — Avraham Eisenberg manipulated the price of MNGO token on the Mango Markets DEX by taking a large position, inflating the oracle price, and borrowing against the inflated collateral. The exploit was technically legal under the protocol's own rules but drained $114 million. Eisenberg was later arrested and charged.

**BonqDAO ($120M, February 2023)** — An attacker manipulated the price of WALBT token on the Chainlink oracle by exploiting low liquidity. The attacker created a massive short position, drove the price down, and triggered liquidations across the protocol, profiting from the cascading effect.

**WOOFi ($8.5M, March 2024)** — The attacker exploited a vulnerability in WOOFi's swap contract that allowed price manipulation through flash loans. The protocol's price oracle was derived from its own pool reserves, creating a circular dependency that could be exploited.

**Venus Protocol (2021)** — Venus suffered a price manipulation incident where the XVS token price was inflated on Binance, causing massive liquidations on Venus. This highlighted the risk of relying on a single centralized exchange as an oracle source.

For AI agent contracts, oracle manipulation is a critical risk because agents may make autonomous trading decisions based on oracle data. If an agent reads a manipulated price and executes a trade, the user's funds are lost before the manipulation is detected.

## How TrustLayer Detects This

TrustLayer identifies oracle manipulation vulnerabilities through multiple pipeline steps:

- **Permission Mapper (Step 5, 25% weight)** flags `oracle_interaction` and `price_dependent` permission patterns, specifically noting contracts that read external price data. It distinguishes between Chainlink integrations (lower risk) and spot DEX price reads (high risk).

- **Slither (Step 3, 30% weight)** traces the data flow from price source to financial calculation. It identifies when a function reads `getReserves()` or similar spot-price functions and uses the result in collateral or borrowing calculations.

- **Dedaub TokIn API (Step 4, 20% weight)** analyzes the tokens involved, flagging low-liquidity tokens that are especially vulnerable to oracle manipulation.

- **AI Analysis (Step 7, 10% weight)** evaluates the overall oracle architecture — detecting single-source oracles, missing staleness checks, absent deviation thresholds, and other patterns that make oracle manipulation feasible.

## References

- Chainlink Data Feeds: https://docs.chainlink.dev/data-feeds
- Uniswap V3 TWAP: https://docs.uniswap.org/protocol/concepts/V3-overview/oracle
- Mango Markets Post-Mortem: https://rekt.news/mango-rekt/
- BonqDAO Incident: https://rekt.news/bonq-rekt/
- Oracle Manipulation Research: https://eprint.iacr.org/2022/1419
