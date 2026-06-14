# MEV and Front-Running Attacks

**Category:** Transaction-Level Security
**Severity:** medium
**Related SWCs:** SWC-114 (Transaction Order Dependence), SWC-116 (Block Values as Time Proxies)

## Description

Maximal Extractable Value (MEV) refers to the profit that block producers (miners in PoW, validators in PoS) or searchers can extract by including, excluding, or reordering transactions within a block. MEV is not a smart contract vulnerability per se — it's a fundamental property of how blockchain transaction ordering works. However, MEV extraction directly impacts users, and contracts can be designed to be MEV-resistant or MEV-vulnerable.

The total MEV extracted from Ethereum users is estimated at over $1.4 billion (2020-2024 cumulative), with sandwich attacks alone accounting for hundreds of millions in losses. For protocols that handle user trades, MEV exposure is a critical design consideration.

**Key attack vectors:**

1. **Sandwich Attacks** — The most common MEV pattern. An attacker sees a user's swap transaction in the mempool, front-runs it with a buy (pushing the price up), then back-runs it with a sell (capturing the price difference). The user gets a worse price, and the attacker pockets the spread.

2. **Just-in-Time (JIT) Liquidity** — A liquidity provider sees a large swap in the mempool, adds concentrated liquidity just before the swap executes (capturing the fee), then removes the liquidity immediately after. The existing LPs lose fee revenue.

3. **Liquidation Racing** — Multiple searchers compete to liquidate undercollateralized positions. The competition drives up gas prices (priority gas auctions), and the value that could go to the protocol or users is captured by searchers.

4. **Generalized Frontrunners** — Automated bots that monitor the mempool for any transaction that creates an MEV opportunity. They copy the transaction, replace the sender address, and submit it with higher gas to be included first.

5. **Approval Front-Running** — When a user submits an `approve()` transaction, a frontrunner can submit a `transferFrom()` at higher gas to steal tokens before the intended operation.

6. **NFT Mint Front-Running** — When a desirable NFT drops, frontrunners submit mint transactions with high gas to secure valuable token IDs before regular users.

## Vulnerable Code

```solidity
// VULNERABLE: DEX swap with no MEV protection
contract VulnerableDEX {
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        // VULNERABILITY 1: No deadline parameter
        // Transaction can be delayed in mempool and executed at unfavorable time

        // VULNERABILITY 2: No minimum output amount
        // Frontrunner can push price, user gets much less than expected
        amountOut = getAmountOut(tokenIn, tokenOut, amountIn);

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        // No slippage check — user can be sandwiched freely
    }

    function getAmountOut(address in_, address out_, uint256 amt) public view returns (uint256) {
        uint256 reserveIn = IERC20(in_).balanceOf(address(this));
        uint256 reserveOut = IERC20(out_).balanceOf(address(this));
        // Constant product formula
        return (reserveOut * amt) / (reserveIn + amt);
    }

    // VULNERABILITY 3: Adding liquidity without slippage protection
    function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB) external {
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);
        // No minimum LP tokens — attacker can JIT this
        // No deadline — can be delayed
        _mintLP(msg.sender, amountA, amountB);
    }
}
```

## Fixed Code

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MEVResistantDEX is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant FEE_BPS = 30;

    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;  // Slippage protection
        uint256 deadline;      // MEV: expire stale transactions
        address recipient;
    }

    event SwapExecuted(
        address indexed sender,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    function swap(SwapParams calldata params) external nonReentrant returns (uint256) {
        // MEV Protection 1: Deadline check
        require(block.timestamp <= params.deadline, "Swap expired");

        // Calculate expected output
        uint256 amountOut = getAmountOut(params.tokenIn, params.tokenOut, params.amountIn);

        // MEV Protection 2: Slippage check (minimum output)
        require(amountOut >= params.minAmountOut, "Slippage too high");

        // Safe token transfers
        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        IERC20(params.tokenOut).safeTransfer(params.recipient, amountOut);

        emit SwapExecuted(msg.sender, params.tokenIn, params.tokenOut, params.amountIn, amountOut);
        return amountOut;
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 minLPTokens,  // Slippage protection for LP
        uint256 deadline
    ) external nonReentrant {
        require(block.timestamp <= deadline, "Expired");

        // Calculate expected LP tokens
        uint256 lpTokens = _calculateLPTokens(amountA, amountB);
        require(lpTokens >= minLPTokens, "Insufficient LP tokens");

        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);

        _mintLP(msg.sender, lpTokens);
    }

    // MEV Protection 3: Support for Flashbots Protect submission
    // Users can submit swaps through private mempool to avoid frontrunning
    function swapPrivate(SwapParams calldata params) external nonReentrant returns (uint256) {
        require(block.timestamp <= params.deadline, "Swap expired");

        // Verify caller is from Flashbots Protect (or similar)
        // block.coinbase check for MEV-boost builder
        uint256 amountOut = getAmountOut(params.tokenIn, params.tokenOut, params.amountIn);
        require(amountOut >= params.minAmountOut, "Slippage too high");

        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        IERC20(params.tokenOut).safeTransfer(params.recipient, amountOut);

        return amountOut;
    }

    function getAmountOut(address in_, address out_, uint256 amt) public view returns (uint256) {
        uint256 reserveIn = IERC20(in_).balanceOf(address(this));
        uint256 reserveOut = IERC20(out_).balanceOf(address(this));
        uint256 amountInWithFee = (amt * (10000 - FEE_BPS)) / 10000;
        return (reserveOut * amountInWithFee) / (reserveIn + amountInWithFee);
    }

    function _calculateLPTokens(uint256 a, uint256 b) internal pure returns (uint256) {
        // Geometric mean as approximation
        return sqrt(a * b);
    }

    function _mintLP(address to, uint256 amount) internal {
        // LP token minting logic
    }

    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
```

## Real-World Impact

**Sandwich Attacks ($200M+ in 2023)** — Research from Eigenphi and Flashbots shows that sandwich attacks extracted over $200 million from Ethereum users in 2023 alone. The attacks primarily targeted Uniswap V2 and V3 pools, with the average sandwich attack extracting $500-$5,000 per transaction.

**Cumulative MEV ($1.4B+, 2020-2024)** — According to Flashbots and Eigenphi data, over $1.4 billion in MEV has been extracted from Ethereum users. The majority comes from sandwich attacks, DEX arbitrage, and liquidations.

**JIT Liquidity on Uniswap V3** — Research shows that JIT liquidity providers consistently outperform regular LPs by adding liquidity immediately before large swaps and removing it right after. This extracts value from long-term LPs who earn less fee revenue than they should.

**Priority Gas Auctions** — During periods of high MEV opportunity (e.g., large liquidations, popular NFT mints), searchers bid up gas prices dramatically. During the CryptoPunks peak, gas prices spiked to over 10,000 gwei as searchers competed to mint valuable punks.

For AI agent contracts, MEV is relevant when agents execute trades on behalf of users. An agent that submits swaps without slippage protection or deadline checks exposes users to sandwich attacks. TrustLayer evaluates the agent's MEV resistance as part of the trust score.

## How TrustLayer Detects This

TrustLayer identifies MEV exposure through:

- **Permission Mapper (Step 5, 25% weight)** flags `swap_execution`, `liquidity_management`, and `token_transfer` patterns. It evaluates whether swap functions include slippage parameters (`minAmountOut`), deadline checks, and support for private mempool submission.

- **Slither (Step 3, 30% weight)** traces the data flow in swap functions, identifying when output amounts are calculated but not validated against a minimum. The `unchecked-lowlevel` detector catches token transfers without return value checks.

- **AI Analysis (Step 7, 10% weight)** evaluates the contract's MEV resistance holistically — identifying missing deadline parameters, absent slippage protection, and whether the contract supports Flashbots/MEV-Boost private submission.

## References

- Flashbots Docs: https://docs.flashbots.net/
- MEV-Explore Dashboard: https://explore.flashbots.net/
- Ethereum.org MEV: https://ethereum.org/en/developers/docs/mev/
- Eigenphi MEV Data: https://eigenphi.io/
- CoW Protocol (MEV-resistant): https://docs.cow.fi/
