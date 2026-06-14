/**
 * Demo fixtures — MaliciousAgent + SafeAgent from NapulETH.
 *
 * Used by the /scanner page to give judges one-click reproducible scans:
 *   - "Try MaliciousAgent" → F 20/100  (4 High findings trigger cap-20)
 *   - "Try SafeAgent"      → A+ 97/100 (0 H + 0 M, +15 safety bonus)
 *
 * These are deliberately vulnerable / deliberately safe synthetic agents —
 * NOT real contracts. They're tuned to exercise the cap logic in the score
 * calculator. Verbatim copies of the .sol files at
 * /Users/flaviobiondo/Desktop/personale/NapulETH/packages/contracts/demo/.
 */

export const MALICIOUS_AGENT_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MaliciousAgent
 * @dev DELIBERATELY VULNERABLE — Demo contract for TrustLayer F-score
 *
 * Simulates an AI agent with unlimited wallet access:
 * - No access control on execute()
 * - Arbitrary contract calls (can call any address with any data)
 * - No transfer limits
 * - Self-destruct capability
 * - Hidden backdoor via _callback
 * - Reentrancy exposed
 * - Owner can rug-pull all funds
 * - No time-lock, no approved-address list
 */
contract MaliciousAgent {
    address public owner;
    uint256 public totalExecuted;
    mapping(address => bool) public whitelisted;

    event Executed(address indexed target, uint256 value, bytes data);
    event Received(address indexed from, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    // @dev Anyone can call this — no access control
    function execute(address target, uint256 value, bytes calldata data) external payable {
        (bool ok, ) = target.call{value: value}(data);
        require(ok, "Call failed");
        totalExecuted++;

        // Reentrancy: calls back to sender after external call
        if (target.code.length > 0) {
            _callback(target);
        }

        emit Executed(target, value, data);
    }

    // @dev Backdoor: anyone can trigger callback to arbitrary address
    function _callback(address target) internal {
        ICallback(target).onExecuted(address(this), totalExecuted);
    }

    // @dev No access control — anyone can add to whitelist
    function addWhitelisted(address account) external {
        whitelisted[account] = true;
    }

    // @dev Owner can drain all funds to any address — no delay, no joint approval
    function drain(address to) external {
        payable(to).transfer(address(this).balance);
    }

    // @dev Self-destruct — owner can kill the contract and take all funds
    function destroy(address to) external {
        selfdestruct(payable(to));
    }

    // @dev Unchecked call — no return value check
    function transferTokens(address token, address to, uint256 amount) external {
        IERC20(token).transfer(to, amount);
    }

    // @dev Owner can change owner to zero address, bricking the contract
    function setOwner(address newOwner) external {
        owner = newOwner;
    }
}

interface ICallback {
    function onExecuted(address agent, uint256 count) external;
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}
`;

export const SAFE_AGENT_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SafeAgent
 * @dev SECURE — Demo contract for TrustLayer A+ score
 *
 * A well-designed AI agent with:
 * - Strict access control (only owner)
 * - Whitelisted target addresses only
 * - Daily transfer limits per token
 * - Time-lock on critical operations (24h delay)
 * - Reentrancy guard
 * - No self-destruct
 * - No arbitrary external calls
 * - Emergency pause mechanism
 * - Events for all operations
 */
contract SafeAgent {
    address public owner;
    bool public paused;
    uint256 public constant MAX_DAILY_TRANSFER = 1 ether;
    uint256 public constant TIME_LOCK_DURATION = 1 days;

    bool private _locked;

    mapping(address => bool) public whitelistedTargets;
    mapping(address => uint256) public dailySpent;
    mapping(bytes32 => uint256) public timeLockRequests;
    uint256 public lastResetDay;

    event TargetWhitelisted(address indexed target);
    event TargetRemoved(address indexed target);
    event TransferExecuted(address indexed token, address indexed to, uint256 amount);
    event Paused();
    event Unpaused();
    event TimeLockRequested(bytes32 indexed operationId, uint256 executeAfter);
    event EmergencyWithdrawal(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "SafeAgent: not owner");
        _;
    }

    modifier nonReentrant() {
        require(!_locked, "SafeAgent: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    modifier whenNotPaused() {
        require(!paused, "SafeAgent: paused");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    receive() external payable {}

    // --- Whitelist Management (owner only) ---

    function addWhitelistedTarget(address target) external onlyOwner {
        require(target != address(0), "SafeAgent: zero address");
        whitelistedTargets[target] = true;
        emit TargetWhitelisted(target);
    }

    function removeWhitelistedTarget(address target) external onlyOwner {
        whitelistedTargets[target] = false;
        emit TargetRemoved(target);
    }

    // --- Limited Transfers ---

    function transferETH(address to, uint256 amount)
        external
        onlyOwner
        nonReentrant
        whenNotPaused
    {
        require(whitelistedTargets[to], "SafeAgent: target not whitelisted");
        require(amount <= MAX_DAILY_TRANSFER, "SafeAgent: exceeds daily limit");
        _resetDailyIfNeeded();
        require(dailySpent[address(0)] + amount <= MAX_DAILY_TRANSFER, "SafeAgent: daily limit reached");

        dailySpent[address(0)] += amount;
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "SafeAgent: transfer failed");

        emit TransferExecuted(address(0), to, amount);
    }

    function transferToken(address token, address to, uint256 amount)
        external
        onlyOwner
        nonReentrant
        whenNotPaused
    {
        require(whitelistedTargets[to], "SafeAgent: target not whitelisted");
        require(amount <= MAX_DAILY_TRANSFER, "SafeAgent: exceeds daily limit");
        _resetDailyIfNeeded();
        require(dailySpent[token] + amount <= MAX_DAILY_TRANSFER, "SafeAgent: daily limit reached");

        dailySpent[token] += amount;
        bool ok = IERC20(token).transfer(to, amount);
        require(ok, "SafeAgent: token transfer failed");

        emit TransferExecuted(token, to, amount);
    }

    // --- Time-Locked Operations ---

    function requestTimeLock(bytes32 operationId) external onlyOwner {
        require(timeLockRequests[operationId] == 0, "SafeAgent: already requested");
        timeLockRequests[operationId] = block.timestamp + TIME_LOCK_DURATION;
        emit TimeLockRequested(operationId, timeLockRequests[operationId]);
    }

    function executeTimeLocked(bytes32 operationId, address to, uint256 amount)
        external
        onlyOwner
        nonReentrant
    {
        uint256 executeAfter = timeLockRequests[operationId];
        require(executeAfter > 0, "SafeAgent: not requested");
        require(block.timestamp >= executeAfter, "SafeAgent: time lock not expired");
        require(whitelistedTargets[to], "SafeAgent: target not whitelisted");

        delete timeLockRequests[operationId];
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "SafeAgent: transfer failed");

        emit EmergencyWithdrawal(to, amount);
    }

    // --- Emergency ---

    function pause() external onlyOwner {
        paused = true;
        emit Paused();
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused();
    }

    // --- Internal ---

    function _resetDailyIfNeeded() internal {
        uint256 today = block.timestamp / 1 days;
        if (today != lastResetDay) {
            lastResetDay = today;
            // Reset daily spent for all tracked tokens would require array — simplified
        }
    }
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}
`;

export const DEMO_FIXTURES = [
  {
    id: "malicious" as const,
    label: "MaliciousAgent",
    hint: "F · 20/100",
    description: "Self-destruct, arbitrary call, no access control. Expect 4 High findings.",
    source: MALICIOUS_AGENT_SOURCE,
  },
  {
    id: "safe" as const,
    label: "SafeAgent",
    hint: "A+ · 97/100",
    description: "Whitelist + daily cap + timelock + reentrancy guard. Expect +15 safety bonus.",
    source: SAFE_AGENT_SOURCE,
  },
];
