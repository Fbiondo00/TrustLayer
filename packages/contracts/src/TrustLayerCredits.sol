// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TrustLayerCredits
 * @notice Payment gateway for the TrustLayer trust-scoring platform
 *
 * Flow:
 *   1. User approves $TRUST to this contract
 *   2. User calls buyCredits() → TRUST is pulled, scan credits credited
 *   3. User calls consumeCredit() → one credit burned, TRUST released to treasury
 *   4. Owner can set price, withdraw stuck tokens, pause
 *
 * Security:
 *   - Checks-Effects-Interactions pattern
 *   - ReentrancyGuard on all state-mutating externals
 *   - No unchecked external calls
 *   - Events emitted for off-chain tracking
 */
contract TrustLayerCredits is Ownable, ReentrancyGuard {
    // ─── State ────────────────────────────────────────────────

    IERC20 public immutable trustToken;

    /// @notice Cost of 1 scan credit in TRUST (wei-units)
    uint256 public creditPrice;

    /// @notice How many scan credits each user holds
    mapping(address => uint256) public credits;

    /// @notice Whether the gateway is paused
    bool public paused;

    /// @notice Treasury address that receives TRUST payments
    address public treasury;

    // ─── Events ───────────────────────────────────────────────

    event CreditsPurchased(address indexed user, uint256 count, uint256 cost);
    event CreditConsumed(address indexed user, bytes32 indexed scanId);
    event CreditPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event Paused();
    event Unpaused();
    event Withdrawn(address indexed token, address indexed to, uint256 amount);

    // ─── Errors ───────────────────────────────────────────────

    error GatewayPaused();
    error GatewayNotPaused();
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientCredits(uint256 available, uint256 required);
    error TransferFailed();

    // ─── Modifiers ────────────────────────────────────────────

    modifier whenNotPaused() {
        if (paused) revert GatewayPaused();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────

    constructor(
        address _trustToken,
        address _treasury,
        uint256 _creditPrice
    ) Ownable(msg.sender) {
        if (_trustToken == address(0) || _treasury == address(0)) revert ZeroAddress();
        if (_creditPrice == 0) revert ZeroAmount();

        trustToken = IERC20(_trustToken);
        treasury = _treasury;
        creditPrice = _creditPrice;
    }

    // ─── User Actions ─────────────────────────────────────────

    /**
     * @notice Purchase scan credits by paying $TRUST
     * @param count  Number of credits to buy (must be > 0)
     *
     * TRUST is transferred from msg.sender to the treasury.
     * User must have called trustToken.approve() first.
     */
    function buyCredits(uint256 count) external nonReentrant whenNotPaused {
        if (count == 0) revert ZeroAmount();

        uint256 cost = count * creditPrice;

        // Effects
        credits[msg.sender] += count;

        // Interaction — CEI pattern: state updated before external call
        bool ok = trustToken.transferFrom(msg.sender, treasury, cost);
        if (!ok) revert TransferFailed();

        emit CreditsPurchased(msg.sender, count, cost);
    }

    /**
     * @notice Consume one credit to run a scan
     * @param scanId  Unique identifier for the scan (off-chain generated)
     *
     * Called by the TrustLayer backend (owner) on behalf of a user after
     * the pipeline completes. Credits are consumed; no TRUST moves here.
     */
    function consumeCredit(address user, bytes32 scanId) external onlyOwner nonReentrant {
        if (credits[user] == 0) revert InsufficientCredits(0, 1);

        // Effects
        credits[user] -= 1;

        emit CreditConsumed(user, scanId);
    }

    // ─── View ─────────────────────────────────────────────────

    /**
     * @notice Preview cost for buying `count` credits
     */
    function previewCost(uint256 count) external view returns (uint256) {
        return count * creditPrice;
    }

    // ─── Owner Admin ──────────────────────────────────────────

    /**
     * @notice Update the price per credit
     */
    function setCreditPrice(uint256 newPrice) external onlyOwner {
        if (newPrice == 0) revert ZeroAmount();
        uint256 oldPrice = creditPrice;
        creditPrice = newPrice;
        emit CreditPriceUpdated(oldPrice, newPrice);
    }

    /**
     * @notice Update the treasury address
     */
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @notice Pause the gateway (no buys, no consumes)
     */
    function pause() external onlyOwner {
        if (paused) revert GatewayPaused();
        paused = true;
        emit Paused();
    }

    /**
     * @notice Unpause the gateway
     */
    function unpause() external onlyOwner {
        if (!paused) revert GatewayNotPaused();
        paused = false;
        emit Unpaused();
    }

    /**
     * @notice Rescue tokens accidentally sent to this contract
     * @param token  Token address (address(0) for ETH)
     * @param to     Recipient
     * @param amount Amount to withdraw
     */
    function withdraw(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        if (token == address(0)) {
            (bool ok, ) = payable(to).call{value: amount}("");
            if (!ok) revert TransferFailed();
        } else {
            bool ok = IERC20(token).transfer(to, amount);
            if (!ok) revert TransferFailed();
        }

        emit Withdrawn(token, to, amount);
    }

    /// @notice Allow contract to receive ETH
    receive() external payable {}
}
