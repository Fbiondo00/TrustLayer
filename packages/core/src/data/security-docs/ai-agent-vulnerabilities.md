# AI Agent Vulnerabilities

**Category:** AI Agent Security
**Severity:** high
**Related SWCs:** SWC-105 (Unprotected Ether Withdrawal), SWC-112 (Delegatecall to Untrusted Callee), SWC-134 (Message Call with External Data)

## Description

AI crypto agents are smart contracts that automate financial operations on behalf of users — trading, yield farming, portfolio rebalancing, cross-chain bridging, and more. The fundamental trust question is: when you connect your wallet to an AI agent, what can it do with your funds?

This is the core problem TrustLayer solves. AI agent contracts introduce a unique category of vulnerabilities because they combine smart contract risks with the additional attack surface of autonomous decision-making. A vulnerable agent contract can lose user funds through exploits, rug pulls, or unintended interactions with malicious protocols.

**Key vulnerability categories specific to AI agents:**

1. **Unrestricted Wallet Access** — The agent can execute arbitrary transactions from the user's wallet with no limits on destination, amount, or frequency. If the agent contract is compromised, the attacker has full access to all connected wallets.

2. **Arbitrary Contract Calls** — The agent's `execute()` function calls any address with any calldata, without whitelisting. An attacker who gains control of the agent (or who exploits a callback) can call any malicious contract, transfer tokens, or trigger unwanted operations.

3. **Callback Exploits** — The agent calls external protocols which then call back into the agent during the same transaction. If the agent doesn't handle reentrancy from callbacks, the callback can manipulate the agent's state mid-execution.

4. **Unlimited ERC20 Approvals** — The agent requests unlimited token approvals from users. If the agent is compromised, the attacker can transfer all approved tokens without further user interaction.

5. **Rug Pull Vectors** — The contract owner can drain all user funds through a privileged function (e.g., `drain()`, `emergencyWithdraw()` to owner address, `selfdestruct`). No time-lock, no multi-sig, no governance oversight.

6. **Owner Key Compromise** — If the contract uses `onlyOwner` for critical functions, a compromised owner key gives the attacker complete control. No multi-sig or distributed key management.

7. **Unbounded Execution Authority** — The agent can execute unlimited transactions per time period, with no daily limits, no rate limiting, and no cooldown between operations.

## Vulnerable Code

```solidity
// VULNERABLE: AI agent contract with maximum attack surface
// (Based on MaliciousAgent.sol demo contract — target F score)
contract VulnerableAgent {
    address public owner;
    uint256 public totalExecuted;
    mapping(address => bool) public whitelisted;

    constructor() {
        owner = msg.sender;
    }

    receive() external payable {} // Accepts ETH from anyone

    // VULNERABILITY 1: No access control — anyone can execute
    // VULNERABILITY 2: Arbitrary call to any address with any data
    // VULNERABILITY 3: No whitelist check on target
    function execute(address target, uint256 value, bytes calldata data)
        external payable returns (bytes memory)
    {
        // Anyone can call any contract with any calldata
        (bool ok, bytes memory ret) = target.call{value: value}(data);
        require(ok, "Call failed");
        totalExecuted++;

        // VULNERABILITY 4: Callback to target after execution (reentrancy)
        if (target.code.length > 0) {
            ICallback(target).onExecuted(address(this), totalExecuted);
        }

        return ret;
    }

    // VULNERABILITY 5: Anyone can add to whitelist
    function addWhitelisted(address account) external {
        whitelisted[account] = true;
    }

    // VULNERABILITY 6: Owner can drain all funds instantly — no delay
    function drain(address to) external {
        payable(to).transfer(address(this).balance);
    }

    // VULNERABILITY 7: Owner can self-destruct the contract
    function destroy(address to) external {
        selfdestruct(payable(to));
    }

    // VULNERABILITY 8: Unchecked return value on token transfer
    function transferTokens(address token, address to, uint256 amount) external {
        IERC20(token).transfer(to, amount);
    }

    // VULNERABILITY 9: Owner can change owner to zero address (brick contract)
    function setOwner(address newOwner) external {
        owner = newOwner;
    }
}

interface ICallback {
    function onExecuted(address agent, uint256 count) external;
}
```

## Fixed Code

```solidity
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// SECURE: AI agent contract with comprehensive safety measures
// (Based on SafeAgent.sol demo contract — target A+ score)
contract SecureAgent is Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ─── Security Parameters ────────────────────────
    uint256 public constant MAX_DAILY_TRANSFER = 5 ether;
    uint256 public constant TIMELOCK_DURATION = 2 days;
    uint256 public constant MAX_OPERATIONS_PER_DAY = 20;

    // ─── Whitelist ──────────────────────────────────
    mapping(address => bool) public whitelistedTargets;
    address[] public whitelistEntries;

    // ─── Rate Limiting ──────────────────────────────
    mapping(address => uint256) public dailySpent;
    mapping(address => uint256) public dailyOps;
    mapping(address => uint256) public lastReset;

    // ─── Timelock for Critical Operations ───────────
    mapping(bytes32 => uint256) public timelockedOps;

    event Executed(address indexed target, uint256 value, bytes data);
    event TargetWhitelisted(address indexed target);
    event TargetRemoved(address indexed target);
    event EmergencyPaused(address indexed by);

    // ─── Execution ──────────────────────────────────

    function execute(address target, uint256 value, bytes calldata data)
        external payable onlyOwner nonReentrant whenNotPaused returns (bytes memory)
    {
        // Check 1: Target must be whitelisted
        require(whitelistedTargets[target], "Target not whitelisted");

        // Check 2: Rate limit — reset daily counters
        if (block.timestamp >= lastReset[msg.sender] + 1 days) {
            dailySpent[msg.sender] = 0;
            dailyOps[msg.sender] = 0;
            lastReset[msg.sender] = block.timestamp;
        }

        // Check 3: Daily transfer limit
        require(
            dailySpent[msg.sender] + value <= MAX_DAILY_TRANSFER,
            "Daily limit exceeded"
        );

        // Check 4: Daily operation count limit
        require(
            dailyOps[msg.sender] < MAX_OPERATIONS_PER_DAY,
            "Daily ops limit exceeded"
        );

        // Update state BEFORE external call (CEI pattern)
        dailySpent[msg.sender] += value;
        dailyOps[msg.sender]++;

        // Execute the call (no callback vulnerability)
        (bool ok, bytes memory ret) = target.call{value: value}(data);
        require(ok, "Call failed");

        emit Executed(target, value, data);
        return ret;
    }

    // ─── Whitelist Management (owner + timelock) ────

    function proposeWhitelist(address target) external onlyOwner {
        bytes32 hash = keccak256(abi.encode("WHITELIST", target));
        timelockedOps[hash] = block.timestamp + TIMELOCK_DURATION;
    }

    function executeWhitelist(address target) external onlyOwner {
        bytes32 hash = keccak256(abi.encode("WHITELIST", target));
        require(timelockedOps[hash] > 0, "Not proposed");
        require(block.timestamp >= timelockedOps[hash], "Timelock active");
        whitelistedTargets[target] = true;
        whitelistEntries.push(target);
        delete timelockedOps[hash];
        emit TargetWhitelisted(target);
    }

    function removeTarget(address target) external onlyOwner {
        whitelistedTargets[target] = false;
        emit TargetRemoved(target);
    }

    // ─── Emergency ──────────────────────────────────

    function pause() external onlyOwner {
        _pause();
        emit EmergencyPaused(msg.sender);
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ─── No drain, no selfdestruct, no owner change without 2-step ──
    // Ownable2Step requires acceptOwnership() for transfer
    // No function exists to drain user funds
    // No selfdestruct capability
}
```

## Real-World Impact

**AI Trading Bot Exploits (2023-2024)** — Multiple AI-powered trading bots on Ethereum and BSC were exploited due to unrestricted execution capabilities. Attackers found that the bot contracts allowed anyone to trigger trades, enabling sandwich attacks against the bot's own users.

**Agent Wallet Drainers** — Several "smart wallet" or "AI assistant" contracts were deployed with `execute(address, bytes)` functions that had no access control. Attackers simply called the function to drain all approved tokens from connected wallets.

**Unlimited Approval Exploits** — Users who approved AI agents for unlimited ERC20 spending lost funds when the agent contract was compromised. The attacker called `transferFrom()` to move all approved tokens to their address, exploiting the unlimited approval pattern.

**The Parity Wallet Hack (2017, $150M+ frozen)** — While not an AI agent, the Parity multi-sig wallet had a similar vulnerability pattern: an unprotected function that allowed anyone to claim ownership, then self-destruct the contract. This is exactly the pattern seen in vulnerable AI agent contracts.

TrustLayer's primary use case is preventing these exact scenarios. Before a user connects their wallet to an AI agent, TrustLayer scans the agent's contract and provides a trust score. A contract with the vulnerabilities listed above would receive an **F grade** — alerting the user not to connect.

## How TrustLayer Detects This

This is TrustLayer's core detection capability. The pipeline is specifically designed to identify AI agent vulnerabilities:

- **Permission Mapper (Step 5, 25% weight)** is the primary detector. It maps all capabilities of the agent contract: `arbitrary_call` (execute to any address), `self_destruct`, `owner_drain` (drain function), `transfer_unlimited` (no daily limits), `unprotected_execution` (no access control on execute). Each permission has a severity weight that directly impacts the trust score.

- **Slither (Step 3, 30% weight)** detects SWC-134 (arbitrary external calls), SWC-105 (unprotected ETH withdrawal), SWC-112 (untrusted delegatecall), and SWC-107 (reentrancy). These are the most critical detectors for agent contracts.

- **AI Analysis (Step 7, 10% weight)** provides contextual explanation — not just "reentrancy found" but "this agent contract allows arbitrary calls to untrusted contracts, creating a reentrancy risk that could be exploited to drain user funds."

- **TX History (Step 6, 15% weight)** checks for patterns like recently deployed contracts, unusual transaction patterns, or known-exploit signatures.

- **Trust Score Calculator** combines all findings using the weighted formula: Slither 30% + Dedaub 20% + Permissions 25% + TX History 15% + AI 10%. A contract with arbitrary calls, no access control, and self-destruct would score well below 20 (F grade).

## References

- TrustLayer Architecture: https://github.com/trustlayer/docs
- SWC-134: Arbitrary External Call: https://swcregistry.io/docs/SWC-134
- OpenZeppelin Access Control: https://docs.openzeppelin.com/contracts/5.x/access-control
- Agent Security Best Practices: https://ethereum.org/en/developers/docs/security/
- MaliciousAgent.sol Demo: packages/contracts/demo/MaliciousAgent.sol
- SafeAgent.sol Demo: packages/contracts/demo/SafeAgent.sol
