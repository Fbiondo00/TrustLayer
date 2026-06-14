# Liquidation Risks

**Category:** DeFi Vulnerability
**Severity:** medium
**Related SWCs:** SWC-107 (Reentrancy), SWC-116 (Block Values as Time Proxies)

## Description

Liquidation is the mechanism by which lending protocols maintain solvency — when a borrower's collateral value drops below the required threshold, their position can be liquidated (partially or fully) to repay the debt. While liquidation is a safety feature, the mechanics of how liquidations are executed create several categories of risk.

Liquidation risks affect both protocols (risk of bad debt) and users (risk of unfair or cascading liquidations). The key issue is that liquidation mechanisms operate at the intersection of price feeds, gas markets, MEV, and protocol accounting — any failure in these systems can cascade.

**Key risk categories:**

1. **Cascade Liquidations** — During a market crash, falling prices trigger liquidations. The liquidated collateral is sold on the open market, pushing prices down further, which triggers more liquidations. This creates a death spiral that can destroy a protocol's solvency. The infamous "Black Thursday" event saw this pattern on MakerDAO.

2. **Bad Debt Accumulation** — When a position becomes undercollateralized faster than it can be liquidated (e.g., during a flash crash, or if the liquidation incentive is insufficient to attract liquidators), the protocol accumulates "bad debt" — debt that is not backed by any collateral. This debt must eventually be socialized among remaining users.

3. **MEV Liquidation Racing** — Liquidations are profitable (liquidators receive a discount on collateral). Multiple MEV bots compete to execute liquidations, leading to priority gas auctions. This can result in excessive gas costs being passed to users, or liquidations being front-run by MEV extractors.

4. **Insufficient Liquidation Incentives** — If the liquidation discount (bonus) is too small, liquidators may not find it profitable to liquidate positions, especially during periods of high gas prices. This allows bad debt to accumulate.

5. **Oracle Delay During Volatility** — If the oracle updates slowly during rapid price movements, positions may be liquidated at stale prices, or may not be liquidated when they should be. This creates unfair outcomes for borrowers.

6. **Sudden Collateral Factor Changes** — If a protocol governance can instantly change collateral factors (the percentage of an asset's value that can be borrowed against), it can trigger immediate mass liquidations without giving users time to adjust.

## Vulnerable Code

```solidity
// VULNERABLE: Lending protocol with naive liquidation mechanism
contract VulnerableLending {
    struct Position {
        uint256 collateral;
        uint256 borrowed;
        uint256 lastUpdate;
    }

    mapping(address => Position) public positions;
    uint256 public constant COLLATERAL_RATIO = 150; // 150% required
    uint256 public constant LIQUIDATION_BONUS = 5;  // 5% bonus (may be too low)
    IPriceOracle public oracle;

    function liquidate(address borrower, uint256 repayAmount) external {
        Position storage pos = positions[borrower];

        // Check if position is undercollateralized
        uint256 collateralValue = (pos.collateral * oracle.getPrice()) / 1e18;
        uint256 borrowValue = (pos.borrowed * oracle.getPrice()) / 1e18;

        // BUG: No stale price check
        // BUG: No check if position is actually liquidatable (might liquidate healthy position)
        require(
            collateralValue < (borrowValue * COLLATERAL_RATIO) / 100,
            "Position healthy"
        );

        // Calculate collateral to seize
        uint256 seizeAmount = (repayAmount * (100 + LIQUIDATION_BONUS)) / 100;

        // BUG: No maximum seize amount check
        // BUG: No check that seizeAmount <= pos.collateral
        // BUG: Can liquidate 100% of position even partial is enough

        pos.borrowed -= repayAmount;
        pos.collateral -= seizeAmount;

        // External calls — reentrancy risk
        IERC20(debtToken).transferFrom(msg.sender, address(this), repayAmount);
        IERC20(collateralToken).transfer(msg.sender, seizeAmount);
    }

    // Missing: no bad debt handling mechanism
    // Missing: no circuit breaker for cascade liquidations
    // Missing: no partial liquidation limits
}
```

## Fixed Code

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SecureLending is ReentrancyGuard {
    struct Position {
        uint256 collateral;
        uint256 borrowed;
    }

    mapping(address => Position) public positions;
    uint256 public constant MIN_COLLATERAL_RATIO = 150; // 150%
    uint256 public constant LIQUIDATION_BONUS = 10;     // 10% bonus
    uint256 public constant MAX_LIQUIDATION = 50;        // Max 50% of position per liquidation
    uint256 public constant HEARTBEAT = 1 hours;

    IChainlinkOracle public immutable oracle;
    address public immutable debtToken;
    address public immutable collateralToken;

    // Bad debt tracking
    uint256 public badDebt;
    uint256 public totalDeposits;

    event Liquidated(address indexed borrower, address indexed liquidator, uint256 repaid, uint256 seized);
    event BadDebtAccumulated(uint256 amount);

    function liquidate(address borrower, uint256 repayAmount) external nonReentrant {
        Position storage pos = positions[borrower];
        require(pos.borrowed > 0, "No debt");

        // Get fresh oracle price with staleness check
        uint256 collateralPrice = _getFreshPrice();
        uint256 collateralValue = (pos.collateral * collateralPrice) / 1e18;
        uint256 borrowValue = pos.borrowed; // Assume 1:1 for simplicity

        // Only liquidate if actually undercollateralized
        require(
            collateralValue * 100 < borrowValue * MIN_COLLATERAL_RATIO,
            "Position healthy"
        );

        // Cap liquidation to MAX_LIQUIDATION% of debt
        uint256 maxRepay = (pos.borrowed * MAX_LIQUIDATION) / 100;
        uint256 actualRepay = repayAmount > maxRepay ? maxRepay : repayAmount;

        // Calculate collateral to seize with bonus
        uint256 seizeAmount = (actualRepay * collateralPrice * (100 + LIQUIDATION_BONUS)) / (100 * 1e18);

        // Safety: cannot seize more than available collateral
        if (seizeAmount > pos.collateral) {
            seizeAmount = pos.collateral;
            // Record bad debt for the remainder
            uint256 unrecovered = pos.borrowed - actualRepay;
            badDebt += unrecovered;
            emit BadDebtAccumulated(unrecovered);
        }

        // Update state BEFORE transfers (CEI)
        pos.borrowed -= actualRepay;
        pos.collateral -= seizeAmount;

        // Safe transfers
        IERC20(debtToken).safeTransferFrom(msg.sender, address(this), actualRepay);
        IERC20(collateralToken).safeTransfer(msg.sender, seizeAmount);

        emit Liquidated(borrower, msg.sender, actualRepay, seizeAmount);
    }

    function _getFreshPrice() internal view returns (uint256) {
        (, int256 price,, uint256 updatedAt,) = oracle.latestRoundData();
        require(price > 0, "Invalid price");
        require(block.timestamp - updatedAt < HEARTBEAT, "Stale oracle");
        return uint256(price);
    }

    // Socialize bad debt among depositors
    function handleBadDebt() external {
        require(badDebt > 0, "No bad debt");
        uint256 toSocialize = badDebt;
        badDebt = 0;
        // Reduce all depositor balances proportionally
        // ... implementation depends on protocol design
    }
}
```

## Real-World Impact

**MakerDAO Black Thursday ($8.3M bad debt, March 2020)** — On March 12, 2020, ETH dropped over 50% in 24 hours. MakerDAO's liquidation mechanism failed because: (1) the Dutch auction system had no minimum price, allowing liquidators to buy collateral for nearly zero, (2) network congestion prevented many liquidation transactions from being included, and (3) the Keeper system was undercapitalized. This resulted in $8.3 million in bad debt that had to be covered by MKR token holders through an emergency debt auction.

**Mango Markets ($114M, October 2022)** — While primarily an oracle manipulation exploit, the aftermath revealed liquidation mechanism failures. The protocol's liquidation parameters were insufficient to handle the extreme price deviation, allowing the attacker's positions to remain open far longer than they should have.

**Venus Protocol (2021)** — Venus experienced cascading liquidations when the XVS token price crashed. The protocol allowed XVS as collateral at high collateral factors, and the rapid price decline triggered a wave of liquidations that further depressed the price.

**Compound V2 (Multiple incidents)** — Compound has experienced several liquidation-related issues, including instances where large liquidations caused DAI price spikes on DEXes, creating secondary effects across DeFi.

For AI agent contracts, liquidation risks are relevant when agents manage leveraged positions, lend user funds, or interact with lending protocols. An agent that doesn't properly monitor health factors could allow user positions to be liquidated at unfavorable terms.

## How TrustLayer Detects This

TrustLayer identifies liquidation-related risks through:

- **Permission Mapper (Step 5, 25% weight)** flags `liquidation`, `borrow`, and `collateral_management` patterns. It specifically evaluates: maximum liquidation caps, bad debt handling mechanisms, and circuit breaker presence.

- **Slither (Step 3, 30% weight)** traces price-dependent conditionals and identifies reentrancy vectors in liquidation functions. The `reentrancy-eth` detector catches CEI violations in the critical liquidation path.

- **AI Analysis (Step 7, 10% weight)** evaluates the liquidation mechanism holistically — assessing whether liquidation incentives are adequate, whether bad debt can accumulate, and whether cascade scenarios are mitigated.

- **TX History Analyzer (Step 6, 15% weight)** can identify patterns of frequent liquidations or suspicious liquidation activity associated with the contract.

## References

- MakerDAO Black Thursday Post-Mortem: https://blog.makerdao.com/the-market-collapse-of-march-12-2020-how-it-impacted-makerdao/
- Aave Liquidation Docs: https://docs.aave.com/developers/guides/liquidations
- Compound Liquidation Mechanics: https://docs.compound.finance/v2/liquidation/
- MEV and Liquidations: https://ethereum.org/en/developers/docs/mev/
