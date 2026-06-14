/**
 * Fixture check for the permission mapper. Run with:
 *   pnpm tsx src/lib/core/__fixtures__/permissions-fixtures.ts
 *
 * Two synthetic contracts:
 *   - Malicious: transferFrom drain, public execute without onlyOwner,
 *     selfdestruct, external call without reentrancy guard.
 *     → expect self_destruct + no_access_control + reentrancy_exposed flagged,
 *       score in the danger band.
 *   - Safe: onlyOwner on withdraw, whitelist + nonReentrant + Ownable.
 *     → expect ownable + whitelist + reentrancy_guard + limited_withdrawal
 *       flagged, score in the safe band.
 */

import { PermissionMapper } from "../permissions";

const MALICIOUS_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MaliciousAgent {
    address public owner;

    constructor() { owner = msg.sender; }

    // public execute without onlyOwner — drains arbitrary balance
    function drain(address token, address from, address to, uint256 amount) public {
        IERC20(token).transferFrom(from, to, amount);
    }

    // external call without reentrancy guard — classic reentrancy bait
    function execute(address target) public payable {
        (bool ok, bytes memory data) = target.call(abi.encodeWithSignature("ping()"));
        require(ok);
    }

    // self-destruct path
    function destroy() public {
        selfdestruct(payable(owner));
    }
}
`;

const SAFE_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract SafeAgent is Ownable, ReentrancyGuard {
    mapping(address => bool) public isWhitelisted;
    uint256 public constant MAX_WITHDRAWAL = 1 ether;
    uint256 public constant TIME_LOCK = 48 hours;

    modifier onlyWhitelisted() {
        require(isWhitelisted[msg.sender], "not whitelisted");
        _;
    }

    function withdraw(uint256 amount) external nonReentrant onlyOwner {
        require(amount <= MAX_WITHDRAWAL, "over cap");
        payable(owner).transfer(amount);
    }

    function addWhitelist(address a) external onlyOwner {
        isWhitelisted[a] = true;
    }
}
`;

function run(name: string, source: string) {
  const mapper = new PermissionMapper();
  const report = mapper.analyze(source);
  console.log(`\n${name}`);
  console.log(`  score: ${report.score} (${report.risk_level})`);
  console.log(`  matched_ids: ${report.matched_ids.join(", ") || "(none)"}`);
  return report;
}

const malicious = run("MaliciousAgent-like source", MALICIOUS_SOURCE);
if (!malicious.matched_ids.includes("no_access_control")) {
  console.error("✗ expected no_access_control to fire"); process.exitCode = 1;
}
if (!malicious.matched_ids.includes("self_destruct")) {
  console.error("✗ expected self_destruct to fire"); process.exitCode = 1;
}
if (malicious.risk_level !== "danger") {
  console.error(`✗ expected danger risk, got ${malicious.risk_level}`); process.exitCode = 1;
}
console.log("  ✓ all expected negative patterns fired");

const safe = run("SafeAgent-like source", SAFE_SOURCE);
if (!safe.matched_ids.includes("ownable")) {
  console.error("✗ expected ownable to fire"); process.exitCode = 1;
}
if (!safe.matched_ids.includes("whitelist")) {
  console.error("✗ expected whitelist to fire"); process.exitCode = 1;
}
if (!safe.matched_ids.includes("reentrancy_guard")) {
  console.error("✗ expected reentrancy_guard to fire"); process.exitCode = 1;
}
if (!safe.matched_ids.includes("limited_withdrawal")) {
  console.error("✗ expected limited_withdrawal to fire"); process.exitCode = 1;
}
if (safe.risk_level !== "safe") {
  console.error(`✗ expected safe risk, got ${safe.risk_level}`); process.exitCode = 1;
}
console.log("  ✓ all expected positive patterns fired");

console.log("");
console.log(process.exitCode ? "FAIL" : "OK");
