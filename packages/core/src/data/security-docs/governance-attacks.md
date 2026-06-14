# Governance Attacks

**Category:** Governance Security
**Severity:** high
**Related SWCs:** SWC-105 (Unprotected Ether Withdrawal), SWC-107 (Reentrancy), SWC-115 (Authorization through tx.origin)

## Description

On-chain governance allows token holders to propose and vote on changes to a protocol — parameter adjustments, fund allocations, contract upgrades, and more. When governance is compromised, the attacker gains control over the protocol's entire operation, including the ability to drain treasuries, modify critical parameters, or upgrade contracts to malicious implementations.

Governance attacks are particularly dangerous because they exploit the legitimate governance mechanism — the transactions are "valid" according to the protocol's own rules. This makes them difficult to prevent technically and controversial to reverse socially.

**Key attack vectors:**

1. **Flash Loan Governance** — The attacker borrows a massive amount of governance tokens via flash loan, votes on a malicious proposal, and repays the loan in the same transaction. The protocol's own governance mechanism is used against it.

2. **Vote Buying and Bribery** — Attacker pays token holders to vote in a specific direction. While technically not a hack, this undermines the assumption that governance outcomes reflect genuine community preferences.

3. **Proposal Obfuscation** — A malicious proposal is hidden within a large, complex multi-sig transaction. Voters may approve the proposal without understanding all its implications because the calldata is too complex to audit.

4. **Emergency Commit Functions** — Some governance contracts allow "emergency" proposals that bypass normal timelocks or voting periods. An attacker who gains temporary voting power can exploit these fast-track mechanisms.

5. **Quorum Manipulation** — If the quorum requirement is low, a small number of voters can pass proposals that affect all token holders. Attackers can exploit low voter turnout to push through malicious changes.

6. **Proxy Re-Initialization** — In upgradeable governance contracts, an attacker calls `initialize()` again to reset governance parameters, gaining control of the protocol.

7. **Sybil Attacks** — Splitting holdings across many addresses to gain disproportionate influence, particularly effective in systems with quadratic voting or per-address voting power.

## Vulnerable Code

```solidity
// VULNERABLE: Governance contract susceptible to flash loan attack
contract VulnerableGovernance {
    IERC20 public governanceToken;
    uint256 public proposalCount;
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public constant QUORUM = 4; // 4% quorum — very low

    struct Proposal {
        address proposer;
        bytes callData;
        address target;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 deadline;
        bool executed;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // VULNERABILITY: Voting power checked at current balance (flash-loanable)
    function propose(address target, bytes calldata callData) external returns (uint256) {
        require(
            governanceToken.balanceOf(msg.sender) > 1000e18,
            "Need tokens to propose"
        );

        Proposal storage p = proposals[++proposalCount];
        p.proposer = msg.sender;
        p.target = target;
        p.callData = callData;
        p.deadline = block.timestamp + VOTING_PERIOD;
        // VULNERABILITY: Short voting period
        // VULNERABILITY: No timelock before execution
        return proposalCount;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp < p.deadline, "Voting ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        // VULNERABILITY: Uses current balance — attacker can flash loan
        uint256 votes = governanceToken.balanceOf(msg.sender);

        if (support) {
            p.forVotes += votes;
        } else {
            p.againstVotes += votes;
        }
        hasVoted[proposalId][msg.sender] = true;
    }

    function execute(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp >= p.deadline, "Voting active");
        require(!p.executed, "Already executed");
        require(p.forVotes > p.againstVotes, "Rejected");
        // VULNERABILITY: No quorum check
        // VULNERABILITY: No timelock before execution

        p.executed = true;
        // Execute proposal immediately — no delay
        (bool ok,) = p.target.call(p.callData);
        require(ok, "Execution failed");
    }
}
```

## Fixed Code

```solidity
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SecureGovernance is Ownable, ReentrancyGuard {
    IERC20 public governanceToken;
    uint256 public constant VOTING_PERIOD = 7 days;     // Longer voting period
    uint256 public constant TIMELOCK = 2 days;           // Timelock before execution
    uint256 public constant QUORUM = 10e16;              // 10% of total supply
    uint256 public constant MIN_PROPOSAL_THRESHOLD = 1e16; // 1% to propose
    uint256 public constant SNAPSHOT_DELAY = 1 days;     // Snapshot before voting starts

    struct Proposal {
        address proposer;
        address target;
        bytes callData;
        uint256 snapshotBlock;
        uint256 votingStart;
        uint256 votingEnd;
        uint256 executionTime; // votingEnd + TIMELOCK
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
        bool canceled;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(address => uint256) public lockedBalance; // Time-locked tokens

    uint256 public proposalCount;
    uint256 public totalSupplySnapshot;

    event Proposed(uint256 indexed id, address proposer);
    event Voted(uint256 indexed id, address voter, bool support, uint256 weight);
    event Executed(uint256 indexed id);

    function propose(address target, bytes calldata callData)
        external returns (uint256)
    {
        // Must have tokens locked for at least SNAPSHOT_DELAY
        require(
            lockedBalance[msg.sender] > 0,
            "Must lock tokens to propose"
        );

        uint256 id = ++proposalCount;
        Proposal storage p = proposals[id];
        p.proposer = msg.sender;
        p.target = target;
        p.callData = callData;
        p.snapshotBlock = block.number; // Snapshot NOW
        p.votingStart = block.timestamp + SNAPSHOT_DELAY;
        p.votingEnd = block.timestamp + SNAPSHOT_DELAY + VOTING_PERIOD;
        p.executionTime = p.votingEnd + TIMELOCK;

        emit Proposed(id, msg.sender);
        return id;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp >= p.votingStart, "Voting not started");
        require(block.timestamp < p.votingEnd, "Voting ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        // Use balance at SNAPSHOT BLOCK — flash loan resistant
        uint256 votes = governanceToken.balanceOfAt(
            msg.sender,
            p.snapshotBlock
        );

        require(votes > 0, "No voting power");

        if (support) {
            p.forVotes += votes;
        } else {
            p.againstVotes += votes;
        }
        hasVoted[proposalId][msg.sender] = true;

        emit Voted(proposalId, msg.sender, support, votes);
    }

    function execute(uint256 proposalId) external nonReentrant {
        Proposal storage p = proposals[proposalId];
        require(block.timestamp >= p.executionTime, "Timelock active");
        require(!p.executed, "Already executed");
        require(!p.canceled, "Canceled");

        // Quorum check
        uint256 totalVotes = p.forVotes + p.againstVotes;
        uint256 quorum = (totalSupplySnapshot * QUORUM) / 1e18;
        require(totalVotes >= quorum, "Quorum not reached");
        require(p.forVotes > p.againstVotes, "Rejected");

        p.executed = true;
        (bool ok,) = p.target.call(p.callData);
        require(ok, "Execution failed");

        emit Executed(proposalId);
    }

    // Cancel malicious proposals before execution
    function cancel(uint256 proposalId) external onlyOwner {
        Proposal storage p = proposals[proposalId];
        require(!p.executed, "Already executed");
        p.canceled = true;
    }

    // Lock tokens for governance participation (flash-loan resistant)
    function lock(uint256 amount) external {
        governanceToken.transferFrom(msg.sender, address(this), amount);
        lockedBalance[msg.sender] += amount;
    }
}
```

## Real-World Impact

**Beanstalk Farms ($181M, April 2022)** — The most infamous governance flash loan attack. The attacker used a flash loan to borrow $1 billion in assets, acquired enough BEAN tokens to achieve 99% voting power, passed a malicious emergency proposal that drained the protocol's treasury of $181 million, and repaid the flash loan — all in a single transaction. The attack exploited Beanstalk's emergency commit function that bypassed the normal timelock.

**Audius ($6M, July 2022)** — An attacker exploited a proxy re-initialization vulnerability in Audius's governance contract. By calling `initialize()` on the implementation contract directly, the attacker reset the governance parameters, set themselves as the sole voter, passed a malicious proposal, and drained approximately $6 million in AUDIO tokens.

**Build Finance ($470K, February 2022)** — The attacker acquired enough governance tokens to pass an emergency proposal that gave them control over the protocol's treasury. The governance contract had no timelock on emergency proposals, allowing the attacker to execute the malicious proposal immediately.

For AI agent contracts, governance attacks are relevant when agents participate in protocol governance on behalf of users. An agent that votes based on flash-loanable token balances could be tricked into supporting malicious proposals.

## How TrustLayer Detects This

TrustLayer identifies governance attack vulnerabilities through:

- **Permission Mapper (Step 5, 25% weight)** flags `governance`, `proposal`, `voting`, and `execution` patterns. It evaluates voting power calculation (current balance vs snapshot), timelock presence, quorum requirements, and emergency function access controls.

- **Slither (Step 3, 30% weight)** detects unprotected privileged functions, reentrancy in proposal execution, and access control issues in governance contracts.

- **AI Analysis (Step 7, 10% weight)** evaluates the governance mechanism's flash-loan resistance — checking for snapshot-based voting, minimum lock periods, timelocks, and quorum thresholds.

## References

- OpenZeppelin Governor: https://docs.openzeppelin.com/contracts/5.x/governance
- Beanstalk Post-Mortem: https://rekt.news/beanstalk-rekt/
- Audius Incident: https://rekt.news/audius-rekt/
- Flash Loan Governance Research: https://arxiv.org/abs/2202.02356
