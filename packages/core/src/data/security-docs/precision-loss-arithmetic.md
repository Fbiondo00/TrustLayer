# Precision Loss and Arithmetic Errors

**Category:** DeFi Vulnerability
**Severity:** medium
**Related SWCs:** SWC-101 (Integer Overflow/Underflow)

## Description

Solidity has no floating-point numbers. All arithmetic is done with integers, which means division always truncates toward zero. This creates a category of subtle bugs where small rounding errors accumulate over millions of operations, or where the order of operations causes significant value to be lost in a single calculation.

While Solidity 0.8.x eliminated integer overflow/underflow (reverting on wrap-around), precision loss remains a fundamental challenge in DeFi contracts that handle financial calculations. Every DEX swap, yield vault deposit, reward distribution, and fee calculation involves division, and every division can lose precision.

**Key vulnerability categories:**

1. **Division Truncation** — `(a * b) / c` rounds down. If an attacker can control the order of operations, they can cause the result to truncate to zero (losing all precision) or to a value significantly lower than expected.

2. **Multiply-Before-Divide Rule** — `a / b * c` loses more precision than `a * c / b`. The first expression divides first (losing fractional parts), then multiplies. The second multiplies first (preserving precision), then divides. Failing to follow this rule is one of the most common DeFi bugs.

3. **Decimal Mismatches** — Different tokens use different decimal places (USDC uses 6, most ERC20 tokens use 18, some use 8 or 2). If a contract assumes all tokens have 18 decimals, calculations with USDC (6 decimals) will be off by a factor of 10^12.

4. **Rounding Direction Attacks** — In some protocols, rounding should favor the protocol (ceil for user costs, floor for user benefits). If rounding is implemented in the wrong direction, attackers can exploit the error at scale by performing many small operations.

5. **Accumulation Attacks** — Individual rounding errors may be tiny (a few wei), but over thousands of operations, they can accumulate to significant amounts. Attackers can automate this process to drain value from vulnerable protocols.

6. **Fixed-Point Precision** — Many protocols use a fixed-point number system (e.g., 1e18 = 1.0). The precision of this system is limited to 18 decimal places. For very small amounts or very large ratios, precision can become insufficient.

## Vulnerable Code

```solidity
// VULNERABLE: Multiple precision loss issues
contract VulnerableRewards {
    mapping(address => uint256) public stakes;
    mapping(address => uint256) public rewardDebt;
    uint256 public accRewardPerShare; // Scaled by 1e18
    uint256 public totalStaked;
    uint256 public rewardRate; // Rewards per second

    function updatePool() public {
        if (totalStaked == 0) return;

        // BUG: Division before multiply — loses precision
        // Should be: (elapsed * rewardRate * 1e18) / totalStaked
        uint256 reward = (block.timestamp - lastUpdate) / totalStaked * rewardRate;

        accRewardPerShare += reward;
        lastUpdate = block.timestamp;
    }

    function pendingRewards(address user) public view returns (uint256) {
        uint256 acc = accRewardPerShare;
        if (totalStaked > 0) {
            uint256 elapsed = block.timestamp - lastUpdate;
            // BUG: Multiply AFTER division — truncation loses precision
            acc += (elapsed * rewardRate) / totalStaked * 1e18;
            // Correct: (elapsed * rewardRate * 1e18) / totalStaked
        }

        // BUG: For users with small stakes, this may return 0
        // due to truncation even though they should receive rewards
        return (stakes[user] * acc) / 1e18 - rewardDebt[user];
    }

    function claimRewards() external {
        updatePool();
        uint256 reward = pendingRewards(msg.sender);
        require(reward > 0, "No rewards");

        // BUG: Rounding is always in user's favor (floor division)
        // Attacker can exploit by making many small claims
        rewardDebt[msg.sender] += reward;
        rewardToken.transfer(msg.sender, reward);
    }

    // Missing: no protection against precision loss for small stakes
    // Missing: no minimum reward amount to prevent dust exploitation
}
```

## Fixed Code

```solidity
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract SecureRewards {
    using SafeERC20 for IERC20;

    uint256 private constant PRECISION = 1e18;
    uint256 public constant MIN_STAKE = 1e15; // 0.001 tokens minimum

    mapping(address => uint256) public stakes;
    mapping(address => uint256) public rewardDebt;
    uint256 public accRewardPerShare;
    uint256 public totalStaked;
    uint256 public rewardRate;
    uint256 public lastUpdate;

    IERC20 public immutable rewardToken;
    IERC20 public immutable stakingToken;

    function updatePool() public {
        if (totalStaked == 0) {
            lastUpdate = block.timestamp;
            return;
        }

        uint256 elapsed = block.timestamp - lastUpdate;

        // CORRECT: Multiply BEFORE divide, full precision
        uint256 reward = (elapsed * rewardRate * PRECISION) / totalStaked;
        accRewardPerShare += reward;
        lastUpdate = block.timestamp;
    }

    function pendingRewards(address user) public view returns (uint256) {
        uint256 acc = accRewardPerShare;
        if (totalStaked > 0) {
            uint256 elapsed = block.timestamp - lastUpdate;
            // CORRECT: Multiply all numerators first, divide once
            acc += (elapsed * rewardRate * PRECISION) / totalStaked;
        }

        // Use Math.mulDiv for precision-safe multiplication
        uint256 grossReward = Math.mulDiv(
            stakes[user],
            acc,
            PRECISION,
            Math.Rounding.Floor // Floor = round in protocol's favor
        );

        return grossReward - rewardDebt[user];
    }

    function stake(uint256 amount) external {
        require(amount >= MIN_STAKE, "Below minimum stake");

        updatePool();

        // Update reward debt BEFORE changing stake
        if (stakes[msg.sender] > 0) {
            uint256 pending = pendingRewards(msg.sender);
            if (pending > 0) {
                rewardToken.safeTransfer(msg.sender, pending);
            }
        }

        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        totalStaked += amount;
        stakes[msg.sender] += amount;
        rewardDebt[msg.sender] = (stakes[msg.sender] * accRewardPerShare) / PRECISION;
    }

    function claimRewards() external {
        updatePool();
        uint256 reward = pendingRewards(msg.sender);
        require(reward > 0, "No rewards");

        // Round reward debt UP (protocol favorable)
        rewardDebt[msg.sender] = Math.mulDiv(
            stakes[msg.sender],
            accRewardPerShare,
            PRECISION,
            Math.Rounding.Ceil // Round UP = user gets slightly less
        );

        rewardToken.safeTransfer(msg.sender, reward);
    }
}
```

## Real-World Impact

**YieldVault Rounding Exploits (Multiple, 2023-2024)** — Several yield vaults suffered from rounding direction errors where the vault rounded in the user's favor instead of the protocol's favor. Attackers automated thousands of small deposit/withdrawal cycles, each extracting a few wei through rounding errors. Over time, this accumulated to significant value.

**SafeMoon Fee Calculation Errors** — SafeMoon's tokenomics included complex fee calculations with multiple divisions. The order of operations in the fee calculation caused precision loss, resulting in incorrect fee distribution and accounting discrepancies.

**KyberSwap ($47M, 2023)** — While primarily a tick math vulnerability, the exploit involved precision issues in fee reinvestment calculations within KyberSwap's concentrated liquidity pools.

**SushiSwap MasterChef (2021)** — The original MasterChef contract had a well-known precision loss issue where the `accSushiPerShare` calculation could lose precision for pools with very large total deposits, causing some users to receive fewer rewards than expected.

For AI agent contracts, precision loss is relevant when agents calculate yields, distribute rewards, or perform any financial arithmetic. An agent with imprecise math could systematically lose user funds through accumulated rounding errors.

## How TrustLayer Detects This

TrustLayer identifies precision loss and arithmetic vulnerabilities through:

- **Slither (Step 3, 30% weight)** uses the `divide-before-multiply` detector to find the most common precision error pattern. The `incorrect-equality` detector catches cases where exact equality is used instead of inequality comparisons with precision-safe calculations.

- **Permission Mapper (Step 5, 25% weight)** flags `arithmetic_heavy` and `reward_calculation` patterns, noting contracts that perform complex financial calculations without using safe math libraries.

- **AI Analysis (Step 7, 10% weight)** evaluates the mathematical architecture — detecting multiply-before-divide violations, missing precision scaling, decimal mismatches, and rounding direction errors. RAG-enhanced context helps identify known precision loss patterns.

## References

- Solidity Division and Precision: https://docs.soliditylang.org/en/latest/types.html#division
- OpenZeppelin Math Library: https://docs.openzeppelin.com/contracts/5.x/api/utils#Math
- PRBMath Fixed-Point Library: https://github.com/PaulRBerg/prb-math
- MasterChef Precision Issue: https://github.com/sushiswap/sushiswap/issues/243
