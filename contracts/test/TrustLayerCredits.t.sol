// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {TrustLayerToken} from "../src/TrustLayerToken.sol";
import {TrustLayerCredits} from "../src/TrustLayerCredits.sol";

contract TrustLayerCreditsTest is Test {
    TrustLayerToken public token;
    TrustLayerCredits public credits;

    address public owner;
    address public treasury;
    address public alice;
    address public bob;

    uint256 constant CREDIT_PRICE = 10 * 1e18; // 10 TRUST per scan

    function setUp() public {
        owner = address(this);
        treasury = makeAddr("treasury");
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        token = new TrustLayerToken(owner);
        credits = new TrustLayerCredits(address(token), treasury, CREDIT_PRICE);
    }

    // ─── Deployment ───────────────────────────────────────────

    function test_Deployment() public view {
        assertEq(address(credits.trustToken()), address(token));
        assertEq(credits.creditPrice(), CREDIT_PRICE);
        assertEq(credits.treasury(), treasury);
        assertEq(credits.owner(), owner);
        assertFalse(credits.paused());
    }

    function test_RevertWhen_ZeroToken() public {
        vm.expectRevert(TrustLayerCredits.ZeroAddress.selector);
        new TrustLayerCredits(address(0), treasury, CREDIT_PRICE);
    }

    function test_RevertWhen_ZeroTreasury() public {
        vm.expectRevert(TrustLayerCredits.ZeroAddress.selector);
        new TrustLayerCredits(address(token), address(0), CREDIT_PRICE);
    }

    function test_RevertWhen_ZeroPrice() public {
        vm.expectRevert(TrustLayerCredits.ZeroAmount.selector);
        new TrustLayerCredits(address(token), treasury, 0);
    }

    // ─── Buy Credits ──────────────────────────────────────────

    function test_BuyCredits() public {
        token.mint(alice, 100 * 1e18);

        vm.startPrank(alice);
        token.approve(address(credits), 50 * 1e18);
        credits.buyCredits(5); // 5 × 10 TRUST = 50 TRUST
        vm.stopPrank();

        assertEq(credits.credits(alice), 5);
        assertEq(token.balanceOf(alice), 50 * 1e18);
        assertEq(token.balanceOf(treasury), 50 * 1e18);
    }

    function test_BuyCreditsSingle() public {
        token.mint(alice, CREDIT_PRICE);

        vm.startPrank(alice);
        token.approve(address(credits), CREDIT_PRICE);
        credits.buyCredits(1);
        vm.stopPrank();

        assertEq(credits.credits(alice), 1);
        assertEq(token.balanceOf(treasury), CREDIT_PRICE);
    }

    function test_BuyCreditsMultipleTimes() public {
        token.mint(alice, 100 * 1e18);

        vm.startPrank(alice);
        token.approve(address(credits), 100 * 1e18);
        credits.buyCredits(3);
        credits.buyCredits(2);
        vm.stopPrank();

        assertEq(credits.credits(alice), 5);
        assertEq(token.balanceOf(treasury), 50 * 1e18);
    }

    function test_RevertWhen_BuyZeroCredits() public {
        vm.expectRevert(TrustLayerCredits.ZeroAmount.selector);
        credits.buyCredits(0);
    }

    function test_RevertWhen_InsufficientAllowance() public {
        token.mint(alice, 100 * 1e18);

        vm.startPrank(alice);
        // No approval
        vm.expectRevert();
        credits.buyCredits(1);
        vm.stopPrank();
    }

    function test_RevertWhen_InsufficientBalance() public {
        token.mint(alice, 5 * 1e18); // not enough for 1 credit

        vm.startPrank(alice);
        token.approve(address(credits), CREDIT_PRICE);
        vm.expectRevert();
        credits.buyCredits(1);
        vm.stopPrank();
    }

    // ─── Consume Credits ──────────────────────────────────────

    function test_ConsumeCredit() public {
        // Setup: alice has 3 credits
        token.mint(alice, 100 * 1e18);
        vm.startPrank(alice);
        token.approve(address(credits), 100 * 1e18);
        credits.buyCredits(3);
        vm.stopPrank();

        // Owner consumes 1 credit for a scan
        bytes32 scanId = keccak256("scan-1");
        credits.consumeCredit(alice, scanId);

        assertEq(credits.credits(alice), 2);
    }

    function test_ConsumeAllCredits() public {
        token.mint(alice, 30 * 1e18);
        vm.startPrank(alice);
        token.approve(address(credits), 30 * 1e18);
        credits.buyCredits(3);
        vm.stopPrank();

        credits.consumeCredit(alice, keccak256("scan-1"));
        credits.consumeCredit(alice, keccak256("scan-2"));
        credits.consumeCredit(alice, keccak256("scan-3"));

        assertEq(credits.credits(alice), 0);
    }

    function test_RevertWhen_ConsumeWithNoCredits() public {
        vm.expectRevert(abi.encodeWithSelector(TrustLayerCredits.InsufficientCredits.selector, 0, 1));
        credits.consumeCredit(alice, keccak256("scan-1"));
    }

    function test_RevertWhen_NonOwnerConsumes() public {
        token.mint(alice, CREDIT_PRICE);
        vm.startPrank(alice);
        token.approve(address(credits), CREDIT_PRICE);
        credits.buyCredits(1);
        vm.stopPrank();

        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", bob));
        credits.consumeCredit(alice, keccak256("scan-1"));
    }

    // ─── Preview ──────────────────────────────────────────────

    function test_PreviewCost() public view {
        assertEq(credits.previewCost(1), CREDIT_PRICE);
        assertEq(credits.previewCost(5), 5 * CREDIT_PRICE);
        assertEq(credits.previewCost(0), 0);
    }

    // ─── Admin: Price ─────────────────────────────────────────

    function test_SetCreditPrice() public {
        uint256 newPrice = 20 * 1e18;
        credits.setCreditPrice(newPrice);
        assertEq(credits.creditPrice(), newPrice);
    }

    function test_RevertWhen_NonOwnerSetsPrice() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice));
        credits.setCreditPrice(20 * 1e18);
    }

    function test_RevertWhen_SetPriceZero() public {
        vm.expectRevert(TrustLayerCredits.ZeroAmount.selector);
        credits.setCreditPrice(0);
    }

    // ─── Admin: Treasury ──────────────────────────────────────

    function test_SetTreasury() public {
        address newTreasury = makeAddr("newTreasury");
        credits.setTreasury(newTreasury);
        assertEq(credits.treasury(), newTreasury);
    }

    function test_RevertWhen_SetTreasuryZero() public {
        vm.expectRevert(TrustLayerCredits.ZeroAddress.selector);
        credits.setTreasury(address(0));
    }

    // ─── Admin: Pause ─────────────────────────────────────────

    function test_Pause() public {
        credits.pause();
        assertTrue(credits.paused());
    }

    function test_Unpause() public {
        credits.pause();
        credits.unpause();
        assertFalse(credits.paused());
    }

    function test_RevertWhen_BuyWhilePaused() public {
        credits.pause();

        token.mint(alice, 100 * 1e18);
        vm.startPrank(alice);
        token.approve(address(credits), CREDIT_PRICE);

        vm.expectRevert(TrustLayerCredits.GatewayPaused.selector);
        credits.buyCredits(1);
        vm.stopPrank();
    }

    function test_RevertWhen_PauseTwice() public {
        credits.pause();
        vm.expectRevert(TrustLayerCredits.GatewayPaused.selector);
        credits.pause();
    }

    function test_RevertWhen_UnpauseWhileNotPaused() public {
        vm.expectRevert(TrustLayerCredits.GatewayNotPaused.selector);
        credits.unpause();
    }

    // ─── Admin: Withdraw ──────────────────────────────────────

    function test_WithdrawERC20() public {
        // Accidentally send tokens to the credits contract
        token.mint(address(credits), 1000 * 1e18);

        uint256 bobBefore = token.balanceOf(bob);
        credits.withdraw(address(token), bob, 500 * 1e18);

        assertEq(token.balanceOf(bob), bobBefore + 500 * 1e18);
    }

    function test_WithdrawETH() public {
        // Send ETH to the contract
        vm.deal(address(credits), 1 ether);

        credits.withdraw(address(0), bob, 0.5 ether);
        assertEq(bob.balance, 0.5 ether);
    }

    function test_RevertWhen_WithdrawZeroAddress() public {
        vm.expectRevert(TrustLayerCredits.ZeroAddress.selector);
        credits.withdraw(address(token), address(0), 100);
    }

    function test_RevertWhen_WithdrawZeroAmount() public {
        vm.expectRevert(TrustLayerCredits.ZeroAmount.selector);
        credits.withdraw(address(token), bob, 0);
    }

    // ─── Full Flow (integration) ──────────────────────────────

    function test_FullFlow_BuyScanConsume() public {
        // 1. Mint TRUST to alice
        token.mint(alice, 100 * 1e18);

        // 2. Alice buys 5 credits
        vm.startPrank(alice);
        token.approve(address(credits), 50 * 1e18);
        credits.buyCredits(5);
        vm.stopPrank();

        assertEq(credits.credits(alice), 5);
        assertEq(token.balanceOf(treasury), 50 * 1e18);

        // 3. Consume 2 credits for scans
        credits.consumeCredit(alice, keccak256("scan-1"));
        credits.consumeCredit(alice, keccak256("scan-2"));

        assertEq(credits.credits(alice), 3);

        // 4. Alice buys more credits
        vm.startPrank(alice);
        token.approve(address(credits), 20 * 1e18);
        credits.buyCredits(2);
        vm.stopPrank();

        assertEq(credits.credits(alice), 5);
        assertEq(token.balanceOf(treasury), 70 * 1e18);
    }

    // ─── Fuzz ─────────────────────────────────────────────────

    function testFuzz_BuyCredits(uint8 count) public {
        uint256 amount = uint256(count) * CREDIT_PRICE;
        vm.assume(amount > 0 && amount <= 1_000_000 * 1e18);

        token.mint(alice, amount);

        vm.startPrank(alice);
        token.approve(address(credits), amount);
        credits.buyCredits(count);
        vm.stopPrank();

        assertEq(credits.credits(alice), count);
    }
}
