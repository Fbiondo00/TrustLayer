// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleDAO {
    mapping(address => uint256) public credit;

    function donate(address to) external payable {
        credit[to] += msg.value;
    }

    function withdraw() external {
        uint256 bal = credit[msg.sender];
        require(bal > 0);
        (bool ok, ) = msg.sender.call{value: bal}("");
        require(ok);
        credit[msg.sender] = 0;
    }

    function queryCredit(address to) external view returns (uint256) {
        return credit[to];
    }
}
