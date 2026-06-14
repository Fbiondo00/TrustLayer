// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {TrustLayerToken} from "../src/TrustLayerToken.sol";

contract TrustLayerTokenTest is Test {
    TrustLayerToken public token;
    address public owner;
    address public alice;
    address public bob;

    uint256 constant MINT_AMOUNT = 1000 * 1e18;

    function setUp() public {
        owner = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        token = new TrustLayerToken(owner);
    }

    // ─── Deployment ───────────────────────────────────────────

    function test_Deployment() public view {
        assertEq(token.name(), "TrustLayer");
        assertEq(token.symbol(), "TRUST");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 0);
        assertEq(token.owner(), owner);
    }

    function test_MaxSupply() public view {
        assertEq(token.MAX_SUPPLY(), 10_000_000 * 1e18);
    }

    // ─── Minting ──────────────────────────────────────────────

    function test_Mint() public {
        token.mint(alice, MINT_AMOUNT);
        assertEq(token.balanceOf(alice), MINT_AMOUNT);
        assertEq(token.totalSupply(), MINT_AMOUNT);
    }

    function test_MintToOwner() public {
        token.mint(owner, MINT_AMOUNT);
        assertEq(token.balanceOf(owner), MINT_AMOUNT);
    }

    function test_MintMultipleTimes() public {
        token.mint(alice, 1000 * 1e18);
        token.mint(bob, 2000 * 1e18);
        assertEq(token.totalSupply(), 3000 * 1e18);
    }

    function test_RevertWhen_MintExceedsMaxSupply() public {
        uint256 maxSupply = token.MAX_SUPPLY();
        vm.expectRevert(
            abi.encodeWithSelector(TrustLayerToken.ExceedsMaxSupply.selector, maxSupply + 1, maxSupply)
        );
        token.mint(alice, maxSupply + 1);
    }

    function test_MintUpToMaxSupply() public {
        uint256 maxSupply = token.MAX_SUPPLY();
        token.mint(alice, maxSupply);
        assertEq(token.totalSupply(), maxSupply);

        // Next mint should fail — 0 remaining
        vm.expectRevert(
            abi.encodeWithSelector(TrustLayerToken.ExceedsMaxSupply.selector, 1, 0)
        );
        token.mint(bob, 1);
    }

    function test_RevertWhen_NonOwnerMints() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice));
        token.mint(alice, MINT_AMOUNT);
    }

    // ─── Burning ──────────────────────────────────────────────

    function test_Burn() public {
        token.mint(alice, MINT_AMOUNT);

        vm.prank(alice);
        token.burn(500 * 1e18);

        assertEq(token.balanceOf(alice), 500 * 1e18);
        assertEq(token.totalSupply(), 500 * 1e18);
    }

    function test_BurnAll() public {
        token.mint(alice, MINT_AMOUNT);

        vm.prank(alice);
        token.burn(MINT_AMOUNT);

        assertEq(token.balanceOf(alice), 0);
        assertEq(token.totalSupply(), 0);
    }

    // ─── Transfers ────────────────────────────────────────────

    function test_Transfer() public {
        token.mint(alice, MINT_AMOUNT);

        vm.prank(alice);
        token.transfer(bob, 100 * 1e18);

        assertEq(token.balanceOf(alice), 900 * 1e18);
        assertEq(token.balanceOf(bob), 100 * 1e18);
    }

    function test_ApproveAndTransferFrom() public {
        token.mint(alice, MINT_AMOUNT);

        vm.prank(alice);
        token.approve(bob, 100 * 1e18);

        vm.prank(bob);
        token.transferFrom(alice, bob, 100 * 1e18);

        assertEq(token.balanceOf(bob), 100 * 1e18);
    }

    // ─── Permit (EIP-2612) ────────────────────────────────────

    function test_Permit() public {
        token.mint(alice, MINT_AMOUNT);

        uint256 privateKey = 0x1234;
        address signer = vm.addr(privateKey);

        // Give tokens to signer instead
        token.mint(signer, MINT_AMOUNT);

        uint256 amount = 100 * 1e18;
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = token.nonces(signer);

        bytes32 domainSeparator = token.DOMAIN_SEPARATOR();
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                signer,
                bob,
                amount,
                nonce,
                deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);

        vm.prank(signer);
        token.permit(signer, bob, amount, deadline, v, r, s);

        assertEq(token.allowance(signer, bob), amount);

        vm.prank(bob);
        token.transferFrom(signer, bob, amount);

        assertEq(token.balanceOf(bob), amount);
    }

    // ─── Fuzz ─────────────────────────────────────────────────

    function testFuzz_MintUpToMax(uint256 amount) public {
        uint256 maxSupply = token.MAX_SUPPLY();
        amount = bound(amount, 1, maxSupply);

        token.mint(alice, amount);
        assertEq(token.balanceOf(alice), amount);
    }

    function testFuzz_Transfer(uint256 amount) public {
        uint256 maxSupply = token.MAX_SUPPLY();
        amount = bound(amount, 1, maxSupply);

        token.mint(alice, amount);

        vm.prank(alice);
        token.transfer(bob, amount);

        assertEq(token.balanceOf(alice), 0);
        assertEq(token.balanceOf(bob), amount);
    }
}
