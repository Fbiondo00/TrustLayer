// SPDX-License-Identifier: MIT
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
