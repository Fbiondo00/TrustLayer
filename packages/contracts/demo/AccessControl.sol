// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PoorAccessControl {
    address public owner;
    mapping(address => bool) public admins;

    constructor() {
        owner = msg.sender;
    }

    function addAdmin(address newAdmin) external {
        admins[newAdmin] = true;
    }

    function withdraw() external {
        require(admins[msg.sender], "Not admin");
        payable(msg.sender).transfer(address(this).balance);
    }
}
