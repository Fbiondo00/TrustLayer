// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TrustLayerToken
 * @notice $TRUST — the utility token for the TrustLayer platform
 *
 * Users buy $TRUST → approve TrustLayerCredits → purchase scan credits
 * → pay per contract scan through the pipeline.
 *
 * Features:
 * - ERC20 with 18 decimals
 * - Owner minting (for presale / rewards)
 * - Burnable by holders
 * - Permit (gasless approvals via EIP-2612)
 * - Capped max supply of 10 000 000 TRUST
 */
contract TrustLayerToken is ERC20, ERC20Burnable, ERC20Permit, Ownable {
    uint256 public constant MAX_SUPPLY = 10_000_000 * 1e18;

    error ExceedsMaxSupply(uint256 requested, uint256 remaining);

    constructor(address initialOwner)
        ERC20("TrustLayer", "TRUST")
        ERC20Permit("TrustLayer")
        Ownable(initialOwner)
    {}

    /**
     * @notice Mint new TRUST tokens (owner only)
     * @param to     Recipient address
     * @param amount Amount in wei-units (1e18 = 1 TRUST)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        uint256 remaining = MAX_SUPPLY - totalSupply();
        if (amount > remaining) {
            revert ExceedsMaxSupply(amount, remaining);
        }
        _mint(to, amount);
    }
}
