// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {TrustLayerToken} from "../src/TrustLayerToken.sol";
import {TrustLayerCredits} from "../src/TrustLayerCredits.sol";

/**
 * @title Deploy
 * @notice Deploys TrustLayerToken + TrustLayerCredits to Sepolia
 *
 * Usage:
 *   forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --verify
 *
 * Environment variables (set in .env):
 *   PRIVATE_KEY       — deployer private key
 *   TREASURY_ADDRESS  — treasury that receives TRUST payments
 *   CREDIT_PRICE      — price per scan in TRUST wei (default 10e18)
 *   ETHERSCAN_API_KEY — for contract verification
 */
contract Deploy is Script {
    // Default: 10 TRUST per scan credit
    uint256 constant DEFAULT_CREDIT_PRICE = 10 * 1e18;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        uint256 creditPrice = vm.envOr("CREDIT_PRICE", DEFAULT_CREDIT_PRICE);

        vm.startBroadcast(deployerKey);

        // 1. Deploy $TRUST token — owner is deployer
        TrustLayerToken token = new TrustLayerToken(deployer);
        console.log("TrustLayerToken deployed at:", address(token));

        // 2. Deploy Credits gateway
        TrustLayerCredits credits = new TrustLayerCredits(
            address(token),
            treasury,
            creditPrice
        );
        console.log("TrustLayerCredits deployed at:", address(credits));

        // 3. Mint initial supply for liquidity (1M TRUST)
        token.mint(deployer, 1_000_000 * 1e18);
        console.log("Minted 1M TRUST to deployer");

        vm.stopBroadcast();

        // Summary
        console.log("=== Deployment Summary ===");
        console.log("Token:      ", address(token));
        console.log("Credits:    ", address(credits));
        console.log("Treasury:   ", treasury);
        console.log("Credit Price:", creditPrice);
    }
}
