// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UncheckedReturn {
    function sendEther(address payable to, uint256 amount) external {
        to.call{value: amount}("");
    }

    function transferTokens(address token, address to, uint256 amount) external {
        (bool ok, ) = token.call(abi.encodeWithSignature("transfer(address,uint256)", to, amount));
    }
}
