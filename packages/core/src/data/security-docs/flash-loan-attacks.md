# Flash Loan Attacks

**Category:** DeFi Vulnerability
**Severity:** high
**Related SWCs:** SWC-107 (Reentrancy), SWC-104 (Unchecked Return Value), SWC-114 (Transaction Order Dependence)

## Description

Flash loans are uncollateralized loans that must be borrowed and repaid within a single atomic transaction. If the loan is not repaid by the end of the transaction, the entire transaction reverts. While flash loans are a powerful DeFi primitive for arbitrage, liquidations, and collateral swaps, they have become the weapon of choice for attackers because they provide instant access to massive capital with zero upfront cost.

The core threat is **price manipulation within a single transaction**. An attacker borrows millions of dollars, uses that capital to distort prices on a DEX or manipulate an oracle, exploits a protocol that relies on the distorted price, repays the flash loan, and keeps the profit — all in one atomic transaction that cannot be front-run or stopped.

There are several attack patterns that leverage flash loans:

1. **Oracle price manipulation** — The attacker uses borrowed funds to massively shift the reserves of a DEX pool, causing protocols that read spot prices from that pool to misprice assets. The attacker then exploits the mispricing (e.g., borrow against inflated collateral).

2. **Collateral inflation** — The attacker inflates the price of a low-liquidity token used as collateral, borrows the maximum amount against the artificially inflated collateral, then lets the price crash. The protocol is left with undercollateralized debt.

3. **Governance attacks** — The attacker borrows governance tokens, uses them to pass a malicious proposal, executes the proposal to drain funds, and repays the loan — all in one transaction.

4. **Cross-protocol composability exploits** — The attacker chains operations across multiple DeFi protocols in a single transaction, exploiting inconsistencies in how protocols interact.

## Vulnerable Code

```solidity
// VULNERABLE: Lending protocol using spot price from a single DEX
contract VulnerableLending {
    IUniswapPair public priceOracle;
    mapping(address => uint256) public collateralBalance;
    mapping(address => uint256) public borrowBalance;

    // Reads spot price directly — manipulable via flash loan
    function getPrice(address token) public view returns (uint256) {
        (uint112 reserve0, uint112 reserve1,) = priceOracle.getReserves();
        // Spot price: no TWAP, no time delay
        return (uint256(reserve1) * 1e18) / uint256(reserve0);
    }

    function depositCollateral(address token, uint256 amount) external {
        // Accepts deposits at current spot price
        uint256 price = getPrice(token);
        collateralBalance[msg.sender] += (amount * price) / 1e18;
        IERC20(token).transferFrom(msg.sender, address(this), amount);
    }

    function borrow(uint256 amount) external {
        // Allows borrowing up to 80% of collateral value at spot price
        uint256 price = getPrice(address(0)); // ETH price
        require(
            amount <= (collateralBalance[msg.sender] * price * 80) / (100 * 1e18),
            "Insufficient collateral"
        );
        borrowBalance[msg.sender] += amount;
        payable(msg.sender).transfer(amount);
    }
}
```

## Fixed Code

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SecureLending is ReentrancyGuard {
    IChainlinkFeed public oracle;
    uint256 public constant MAX_LTV = 75; // 75% loan-to-value
    uint256 public constant HEARTBEAT = 1 hours;

    mapping(address => uint256) public collateralDeposited;
    mapping(address => uint256) public collateralValue; // stored at deposit time
    mapping(address => uint256) public borrowed;

    // Uses Chainlink with staleness check — not manipulable by flash loans
    function getSafePrice() public view returns (uint256) {
        (, int256 price,, uint256 updatedAt,) = oracle.latestRoundData();
        require(price > 0, "Invalid price");
        require(block.timestamp - updatedAt < HEARTBEAT, "Stale oracle");
        return uint256(price);
    }

    function depositCollateral() external payable nonReentrant {
        uint256 price = getSafePrice();
        uint256 value = (msg.value * price) / 1e18;
        collateralDeposited[msg.sender] += msg.value;
        collateralValue[msg.sender] += value;
    }

    function borrow(uint256 amount) external nonReentrant {
        uint256 price = getSafePrice(); // Fresh oracle price
        uint256 maxBorrow = (collateralDeposited[msg.sender] * price * MAX_LTV) / (100 * 1e18);
        require(borrowed[msg.sender] + amount <= maxBorrow, "Insufficient collateral");
        borrowed[msg.sender] += amount;
        payable(msg.sender).transfer(amount);
    }
}
```

## Real-World Impact

**Cream Finance ($130M, October 2021)** — An attacker used a flash loan to manipulate the price of a Cream liquidity pool token on Alpha Finance. The inflated price allowed the attacker to borrow far more than their actual collateral was worth, draining $130 million from the protocol.

**bZx Protocol ($1M+, February 2020)** — The first major flash loan attack. The attacker borrowed 10,000 ETH via a Kyber flash loan, used it to manipulate the price of sUSD on Uniswap, then exploited the price discrepancy on bZx to profit. A second attack days later used a similar pattern for additional profit.

**Warp Finance ($7.7M, December 2020)** — The attacker used flash loans to manipulate the price of LP tokens used as collateral on Warp, then borrowed stablecoins far exceeding the real value of the collateral.

**Elephant Money ($22M, April 2022)** — Flash loan attack on the BSC-based protocol that exploited price manipulation in the token's bonding curve mechanism.

For AI agent contracts, flash loan attacks are particularly dangerous because agents may interact with multiple DeFi protocols simultaneously. If an agent's price oracle is manipulable, an attacker can use a flash loan to trick the agent into executing unfavorable trades or releasing collateral at distorted prices.

## How TrustLayer Detects This

TrustLayer's multi-layered pipeline detects flash loan vulnerabilities through several mechanisms:

- **Slither (Step 3, 30% weight)** traces external calls to price oracles and identifies contracts that read DEX spot prices (`getReserves()`) without time-weighted averaging. The `reentrancy-eth` and `unchecked-lowlevel` detectors catch related patterns.

- **Permission Mapper (Step 5, 25% weight)** flags `oracle_interaction` and `price_dependent` patterns, specifically noting when a contract reads spot prices that could be influenced by flash loan capital within a single transaction.

- **Dedaub TokIn API (Step 4, 20% weight)** analyzes the tokens used by the contract, flagging low-liquidity tokens that are particularly vulnerable to flash loan manipulation.

- **AI Analysis (Step 7, 10% weight)** uses RAG-enhanced context to identify the overall architecture pattern — detecting when a lending/borrowing protocol relies on a single-spot oracle source without TWAP protection, Chainlink integration, or circuit breakers.

## References

- EIP-3156: Flash Loan Standard: https://eips.ethereum.org/EIPS/eip-3156
- Cream Finance Post-Mortem: https://rekt.news/cream-rekt/
- bZx Flash Loan Attack Analysis: https://hackernoon.com/flash-loans-explained-briefly-what-happened-to-bzx
- Warp Finance Incident: https://rekt.news/warp-finance-rekt/
- Uniswap V2 Flash Swaps: https://docs.uniswap.org/protocol/V2/guides/smart-contract-integration/flash-swaps
