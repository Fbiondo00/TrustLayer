// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FlashLoanVulnerable {
    uint256 public price;
    uint256 public constant MAX_PRICE = 1e18;

    function updatePrice(uint256 newPrice) external {
        require(newPrice <= MAX_PRICE, "Price too high");
        price = newPrice;
    }

    function buy() external payable {
        require(msg.value >= price, "Insufficient payment");
    }
}
