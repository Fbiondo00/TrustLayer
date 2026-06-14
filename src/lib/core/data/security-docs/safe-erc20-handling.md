# Safe ERC20 Handling

**Category:** Best Practice
**Related SWCs:** SWC-104 (Unchecked Call Return Value), SWC-107 (Reentrancy)

## Description

The ERC20 token standard (EIP-20) defines a standard interface for fungible tokens on Ethereum. However, the standard is intentionally minimal and leaves several behaviors unspecified, creating pitfalls that have led to hundreds of millions of dollars in losses. Safe ERC20 handling refers to the set of practices and libraries that address these ambiguities and protect against common token-related vulnerabilities.

The three core issues with the ERC20 standard are:

1. **Missing return value** — The ERC20 standard specifies that `transfer()` and `transferFrom()` should return a `bool` indicating success. However, some prominent tokens (notably USDT/USDC on some chains) do not return any value. Calling these tokens through a standard interface that expects a return value will cause the transaction to revert because Solidity tries to decode a return value that does not exist.

2. **Silent failures** — Some ERC20 tokens do not revert on failure but instead return `false`. If the calling contract does not check the return value, the "failed" transfer is treated as successful, leading to accounting mismatches.

3. **Reentrancy through hooks** — The newer ERC777 and ERC20 with hooks standards introduce callback functions (`tokensReceived`, `tokensToSend`) that are called during transfers. These callbacks create reentrancy vectors that are not present in plain ETH transfers.

Beyond these core issues, additional ERC20 hazards include: fee-on-transfer tokens that deduct a fee from each transfer (meaning the received amount is less than the sent amount), rebasing tokens that automatically adjust balances (e.g., stETH, AMPL), and tokens with blocklists that can prevent specific addresses from sending or receiving.

## Vulnerable Code (Unsafe ERC20 Handling)

```solidity
// DANGEROUS: Multiple issues

// Issue 1: Raw transfer without checking return value
function deposit(address token, uint256 amount) external {
    IERC20(token).transferFrom(msg.sender, address(this), amount);
    balances[msg.sender] += amount; // Assumes full amount was received
}

// Issue 2: Assuming transferFrom returns bool (breaks with USDT)
function safeDeposit(address token, uint256 amount) external {
    require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
    // ^ Reverts with USDT because USDT doesn't return bool
    balances[msg.sender] += amount;
}

// Issue 3: Approve without setting to zero first (front-running risk)
function setApproval(address token, address spender, uint256 amount) external {
    IERC20(token).approve(spender, amount);
    // Some tokens require setting approval to 0 before setting a new value
}

// Issue 4: Reentrancy through token transfer
function withdraw(address token, uint256 amount) external {
    require(balances[msg.sender] >= amount);
    // State not updated before transfer — reentrancy risk
    IERC20(token).transfer(msg.sender, amount);
    balances[msg.sender] -= amount;
}
```

## Fixed Code (Safe ERC20 Handling)

```solidity
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

using SafeERC20 for IERC20;

contract SafeTokenHandler is ReentrancyGuard {
    mapping(address => mapping(address => uint256)) public balances;

    // Safe deposit: handles non-standard tokens and fee-on-transfer
    function deposit(address token, uint256 amount) external nonReentrant {
        uint256 before = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(token).balanceOf(address(this)) - before;
        balances[token][msg.sender] += received;
        // Uses actual received amount, handles fee-on-transfer tokens
    }

    // Safe withdraw: CEI pattern + SafeERC20
    function withdraw(address token, uint256 amount) external nonReentrant {
        require(balances[token][msg.sender] >= amount, "Insufficient balance");

        // Effect: update state BEFORE transfer
        balances[token][msg.sender] -= amount;

        // Interaction: use SafeERC20 for safe transfer
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    // Safe approve: handles non-standard tokens
    function setApproval(address token, address spender, uint256 amount) external {
        IERC20(token).forceApprove(spender, amount);
        // forceApprove handles tokens that require 0 approval first
    }
}
```

## The SafeERC20 Library

OpenZeppelin's `SafeERC20` library wraps all ERC20 operations to handle non-standard token behavior:

- **`safeTransfer`** — Handles tokens that don't return a boolean. Wraps `transfer()` and checks for non-reverting failures.
- **`safeTransferFrom`** — Same as `safeTransfer` but for `transferFrom()`. Handles tokens like USDT that don't return a boolean.
- **`safeApprove`** — Handles tokens that require setting approval to zero before setting a new value (e.g., USDT). Wraps the approve-and-check pattern.
- **`forceApprove`** — Forcibly sets approval to the desired value by first setting it to zero (if needed). Handles tokens that revert on non-zero-to-non-zero approval changes.

## Common ERC20 Pitfalls

### Fee-on-Transfer Tokens

Some tokens (e.g., SafeMoon, many rebase tokens) charge a fee on each transfer. When you call `transfer(to, 100)`, the recipient may only receive 95 tokens (with 5 tokens going to a fee recipient). If your contract records `deposits[amount] = 100` but only received 95, the accounting is wrong and the contract will become insolvent.

**Fix:** Always measure the balance before and after the transfer, and use the actual received amount.

```solidity
uint256 before = token.balanceOf(address(this));
token.safeTransferFrom(msg.sender, address(this), amount);
uint256 received = token.balanceOf(address(this)) - before;
```

### Rebasing Tokens

Rebasing tokens (e.g., stETH, AMPL) automatically adjust holder balances. If your contract holds 100 stETH, the balance might increase to 101 stETH after a rebase. This can cause issues if your contract's internal accounting doesn't match the actual balance.

**Fix:** Track shares instead of absolute amounts, or use a vault pattern that accounts for balance changes.

### Tokens with Blocklists

Some tokens (e.g., USDC, USDT on certain chains) can block specific addresses from sending or receiving. If your contract tries to transfer tokens to a blocked address, the transfer will revert.

**Fix:** Handle transfer failures gracefully and allow users to specify an alternative recipient.

### Unlimited Approvals

Many contracts approve the maximum `uint256` amount for gas efficiency (avoiding repeated approval transactions). However, this gives the approved contract unlimited access to the user's tokens. If the approved contract is compromised, the attacker can drain all user tokens.

**Fix:** Approve only the exact amount needed for each operation, or use permit2 (Uniswap's universal approval system) for better security.

## Real-World Impact

The **Unilkex exploit (2021)** lost approximately $3.8 million due to a reentrancy vulnerability in the token transfer function. The attacker used a token with a hook to re-enter the contract during a transfer, manipulating the exchange rate.

The **bZx hack (2020)** exploited an inconsistency between the contract's internal accounting and the actual token balance. The attacker manipulated the token balance through a flash loan and reentrancy, stealing approximately $8 million.

For AI agent contracts, safe ERC20 handling is essential because agents routinely interact with multiple tokens across multiple protocols. An agent that doesn't properly handle token transfers could lose user funds through accounting errors, become insolvent by not accounting for fee-on-transfer tokens, or become a reentrancy attack vector through token hooks.

## How TrustLayer Evaluates ERC20 Handling

TrustLayer's pipeline evaluates ERC20 handling through multiple mechanisms:

- **Slither's `unchecked-lowlevel`** detector identifies ERC20 calls where the return value is not checked, which is a SWC-104 violation.
- **Slither's `reentrancy-eth`** detector identifies token transfer patterns that create reentrancy vectors.
- **The Permission Mapper** tracks token-related functions and flags those with unsafe patterns, categorizing risks as **unchecked_token_transfer**, **fee_on_transfer_risk**, or **token_reentrancy**.
- **The Dedaub TokIn API** (Step 4 of the pipeline) analyzes the specific tokens used by the contract, checking for non-standard behavior, fee-on-transfer mechanisms, blocklists, and other risk flags across 30+ categories.
- **The AI Analysis step** examines the overall token handling architecture and provides specific recommendations for safer ERC20 interactions.

ERC20 handling is evaluated through the Slither weight (30%), Permissions weight (25%), Dedaub Token Risk weight (20%), and AI analysis weight (10%), making it one of the most comprehensively evaluated aspects of the trust score.

## References

- OpenZeppelin SafeERC20: https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#SafeERC20
- EIP-20 (ERC20 Standard): https://eips.ethereum.org/EIPS/eip-20
- EIP-777 (Advanced Token Standard): https://eips.ethereum.org/EIPS/eip-777
- Uniswap Permit2: https://github.com/Uniswap/permit2
- Consensys Token Pitfalls: https://consensys.github.io/smart-contract-best-practices/development-recommendations/solidity-specific/token_interaction/
