# AI Oracle Dependency and Data Manipulation

**Category:** AI Agent Security
**Severity:** medium
**Related SWCs:** SWC-116 (Block Values as Time Proxies), SWC-120 (Weak Sources of Randomness)

## Description

AI agents that make autonomous financial decisions rely on data — price feeds, market signals, protocol states, and external APIs. This data dependency creates a unique attack surface: if the data is wrong, stale, or manipulated, the AI agent makes wrong decisions at machine speed.

The core risk is that AI agents operate autonomously. A human trader who sees a suspicious price might pause and verify. An AI agent sees the same price and executes the trade in milliseconds. This speed advantage becomes a catastrophic liability when the underlying data is compromised.

**Key risk categories:**

1. **Stale Oracle Data** — The agent reads a price from Chainlink or another oracle, but the data is hours or days old. During volatile markets, the last reported price may diverge significantly from the real price. The agent executes a trade based on outdated information.

2. **Oracle Manipulation for AI Exploitation** — An attacker deliberately manipulates an oracle to trigger the AI agent's trading logic. For example, if the agent automatically buys when a token price drops 10%, the attacker temporarily crashes the price to trigger the buy, then dumps on the agent.

3. **Single-Source Data Dependency** — The agent relies on one oracle, one API, or one data source. If that source fails (downtime, hack, rate limiting), the agent either stops functioning or acts on no data — both dangerous outcomes.

4. **Data Freshness Without Verification** — The agent receives data but doesn't verify its freshness or accuracy. It doesn't check the oracle's `updatedAt` timestamp, doesn't cross-reference with a second source, and doesn't apply sanity checks (e.g., "price shouldn't change more than 20% in one block").

5. **Automated Trading Without Circuit Breakers** — The agent has no maximum loss threshold, no daily loss limit, no "stop trading if loss exceeds X%". A manipulated data feed can cause the agent to repeatedly execute losing trades.

6. **Off-Chain Data Injection** — If the agent consumes data from off-chain APIs (weather, social media, news), those APIs can be manipulated or spoofed. This is a prompt-injection-equivalent for financial AI agents.

## Vulnerable Code

```solidity
// VULNERABLE: AI agent that trades on oracle data without safety checks
contract VulnerableTradingAgent {
    IChainlinkFeed public priceFeed;
    IERC20 public tradingToken;
    uint256 public buyThreshold; // Buy if price drops below this
    uint256 public sellThreshold; // Sell if price rises above this
    address public owner;

    // Executes trades autonomously based on oracle price
    function autoTrade() external {
        // VULNERABILITY 1: No staleness check — price may be hours old
        (, int256 price,,,) = priceFeed.latestRoundData();

        // VULNERABILITY 2: No price deviation check
        // If price is manipulated, agent trades on bad data

        if (uint256(price) < buyThreshold) {
            // Buy: no limit on purchase amount
            uint256 amount = address(this).balance; // Spend ALL ETH
            _buyOnDEX(amount);
        } else if (uint256(price) > sellThreshold) {
            // Sell: no limit on sale amount
            uint256 balance = tradingToken.balanceOf(address(this));
            _sellOnDEX(balance); // Sell ALL tokens
        }

        // VULNERABILITY 3: No circuit breaker
        // VULNERABILITY 4: No daily loss limit
        // VULNERABILITY 5: No human-in-the-loop for large trades
    }

    function _buyOnDEX(uint256 amount) internal {
        // Swap ETH for token on DEX
        // No slippage protection
        // No deadline check
        // No minimum output check
    }

    function _sellOnDEX(uint256 amount) internal {
        // Swap token for ETH on DEX
        // Same missing protections
    }

    // VULNERABILITY 6: Anyone can call autoTrade
    // Attacker can trigger trade when oracle is stale
}
```

## Fixed Code

```solidity
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract SecureTradingAgent is Ownable, ReentrancyGuard, Pausable {
    IChainlinkFeed public immutable priceFeed;
    IERC20 public tradingToken;

    // ─── Safety Parameters ──────────────────────────
    uint256 public constant HEARTBEAT = 1 hours;     // Max oracle staleness
    uint256 public constant MAX_PRICE_CHANGE = 20e16; // 20% max deviation
    uint256 public constant MAX_DAILY_LOSS = 1 ether; // Daily loss limit
    uint256 public constant MAX_TRADE_SIZE = 5 ether; // Single trade cap
    uint256 public constant HUMAN_THRESHOLD = 10 ether; // Requires approval above this

    uint256 public buyThreshold;
    uint256 public sellThreshold;
    uint256 public dailyLoss;
    uint256 public lastResetDay;
    uint256 public lastKnownPrice;

    event TradeExecuted(bool isBuy, uint256 amount, uint256 price);
    event CircuitBreakerTriggered(string reason);
    event LargeTradePending(uint256 amount, uint256 price);

    modifier checkCircuitBreaker() {
        _resetDailyCounters();

        require(dailyLoss < MAX_DAILY_LOSS, "Daily loss limit reached");
        require(!paused(), "Circuit breaker active");
        _;
    }

    function autoTrade() external nonReentrant checkCircuitBreaker {
        uint256 price = _getVerifiedPrice();

        // Check price deviation from last known price
        if (lastKnownPrice > 0) {
            uint256 deviation = price > lastKnownPrice
                ? ((price - lastKnownPrice) * 1e18) / lastKnownPrice
                : ((lastKnownPrice - price) * 1e18) / lastKnownPrice;

            if (deviation > MAX_PRICE_CHANGE) {
                _pause();
                emit CircuitBreakerTriggered("Price deviation too high");
                return;
            }
        }

        lastKnownPrice = price;

        if (price < buyThreshold) {
            uint256 amount = address(this).balance;
            require(amount > 0, "No balance");

            // Cap trade size
            if (amount > MAX_TRADE_SIZE) amount = MAX_TRADE_SIZE;

            // Human-in-the-loop for large trades
            if (amount > HUMAN_THRESHOLD) {
                emit LargeTradePending(amount, price);
                return; // Wait for owner approval
            }

            _buyOnDEX(amount, price);
            emit TradeExecuted(true, amount, price);

        } else if (price > sellThreshold) {
            uint256 balance = tradingToken.balanceOf(address(this));
            require(balance > 0, "No tokens");

            if (balance > _tokenAmountFromEth(MAX_TRADE_SIZE)) {
                balance = _tokenAmountFromEth(MAX_TRADE_SIZE);
            }

            _sellOnDEX(balance, price);
            emit TradeExecuted(false, balance, price);
        }
    }

    function _getVerifiedPrice() internal view returns (uint256) {
        (, int256 price,, uint256 updatedAt,) = priceFeed.latestRoundData();
        require(price > 0, "Invalid oracle price");
        require(
            block.timestamp - updatedAt < HEARTBEAT,
            "Stale oracle data — refusing to trade"
        );
        return uint256(price);
    }

    function _buyOnDEX(uint256 amount, uint256 referencePrice) internal {
        // Swap with slippage protection (max 1% deviation from reference)
        uint256 minOutput = (amount * referencePrice * 99) / (100 * 1e18);
        uint256 deadline = block.timestamp + 300; // 5 min deadline

        // Execute DEX swap with safety parameters
        // ... DEX integration code ...
    }

    function _sellOnDEX(uint256 amount, uint256 referencePrice) internal {
        uint256 minOutput = (amount * 1e18 * 99) / (referencePrice * 100);
        uint256 deadline = block.timestamp + 300;
        // ... DEX integration code ...
    }

    function _resetDailyCounters() internal {
        if (block.timestamp >= lastResetDay + 1 days) {
            dailyLoss = 0;
            lastResetDay = block.timestamp;
        }
    }

    function recordLoss(uint256 amount) external onlyOwner {
        dailyLoss += amount;
        if (dailyLoss >= MAX_DAILY_LOSS) {
            _pause();
            emit CircuitBreakerTriggered("Daily loss limit reached");
        }
    }

    function _tokenAmountFromEth(uint256 ethAmount) internal pure returns (uint256) {
        // Convert ETH amount to token amount at current price
        return ethAmount; // Simplified
    }
}
```

## Real-World Impact

**DeFi Saver Automation Issues** — DeFi Saver's automation feature, which automatically adjusts positions based on oracle prices, experienced issues during periods of oracle latency. Users who relied on the automation for liquidation protection found that stale price data caused their positions to be liquidated before the automation could act.

**Compound Oracle Failures** — Compound's price feed experienced several incidents where the posted price diverged from the market price. During these periods, automated strategies built on top of Compound made incorrect decisions, leading to unnecessary liquidations or failed arbitrage attempts.

**Chainlink ETH/USD Stale Data (June 2020)** — Chainlink's ETH/USD feed experienced a period where the price was not updated for over an hour during a volatile market movement. Automated trading systems relying on this feed made decisions based on prices that were significantly different from the actual market price.

**Automated Market Maker Bots (2023-2024)** — Multiple MEV bots and automated trading agents suffered losses when they acted on manipulated oracle data during flash loan attacks. The bots bought tokens at inflated prices or sold at depressed prices within the same transaction as the manipulation.

For AI agent contracts, oracle dependency is a critical risk because the entire value proposition of autonomous trading depends on accurate data. TrustLayer evaluates how well an agent validates its data inputs — an agent that blindly trusts a single oracle without staleness checks is fundamentally unsafe.

## How TrustLayer Detects This

TrustLayer identifies oracle dependency risks through:

- **Permission Mapper (Step 5, 25% weight)** flags `oracle_read` and `automated_execution` patterns. It checks whether the agent validates data freshness, uses multiple oracle sources, and has circuit breakers for when data quality is poor.

- **Slither (Step 3, 30% weight)** traces the data flow from oracle calls to financial decisions. It identifies when oracle data is used without staleness checks, deviation checks, or sanity bounds.

- **AI Analysis (Step 7, 10% weight)** evaluates the agent's overall data dependency architecture — assessing whether the agent has appropriate safeguards for automated decision-making, including daily loss limits, human-in-the-loop thresholds, and pause mechanisms.

- **TX History (Step 6, 15% weight)** can identify patterns of trades executed at suspicious prices, suggesting the agent may have acted on manipulated or stale data.

## References

- Chainlink Data Feeds: https://docs.chainlink.dev/data-feeds
- Oracle Freshness Best Practices: https://blog.openzeppelin.com/secure-smart-contract-guidelines-the-devil-is-in-the-details/
- DeFi Saver Automation: https://defisaver.com/
- Compound Price Oracle: https://docs.compound.finance/v2/prices/
- AI Agent Security Research: https://arxiv.org/abs/2306.06422
