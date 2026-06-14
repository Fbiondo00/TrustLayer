# Supply Chain and Compiler Attacks

**Category:** Infrastructure Security
**Severity:** high
**Related SWCs:** SWC-103 (Floating Pragma), SWC-102 (Outdated Compiler Version)

## Description

Not all smart contract vulnerabilities originate in the contract's own code. Supply chain and compiler attacks exploit the toolchain and infrastructure used to develop, compile, and deploy contracts. These attacks are particularly insidious because the contract's source code may appear perfectly secure, but the compiled bytecode contains vulnerabilities introduced by a compromised compiler, dependency, or build process.

This category of attacks is growing in importance as the DeFi ecosystem matures and attackers shift from exploiting contract logic to exploiting the development pipeline.

**Key attack vectors:**

1. **Compiler Bugs** — The Solidity or Vyper compiler has a bug that causes it to generate incorrect bytecode. The contract source is correct, but the compiled code behaves differently. This is not theoretical — the Vyper reentrancy guard bug (2023) caused real losses.

2. **Malicious Dependencies** — An attacker publishes a malicious package to npm or pip that mimics a popular library (typosquatting) or compromises an existing package's maintainer account. When a developer installs the dependency, the attacker gains code execution in the build pipeline.

3. **Backdoored Contract Templates** — An attacker publishes a seemingly helpful contract template or tutorial that contains subtle vulnerabilities. Developers who copy the template deploy vulnerable contracts without realizing it.

4. **Compromised Build Environment** — The developer's machine or CI/CD pipeline is compromised, allowing the attacker to modify the compiled bytecode before deployment. The deployed bytecode doesn't match the source code.

5. **Verification Bypass** — The deployed contract's source code doesn't match the actual bytecode, but the block explorer's verification process is fooled (e.g., via immutable variables, constructor arguments, or metadata hash manipulation).

6. **Library Vulnerabilities** — The OpenZeppelin or other widely-used library has a vulnerability that affects all contracts using it. The SolarWinds-style attack on smart contract infrastructure.

## Vulnerable Code

```solidity
// VULNERABLE: Contract compiled with vulnerable Vyper version
// This code LOOKS correct but the compiler generates faulty bytecode

// Compiled with Vyper 0.2.15, 0.2.16, 0.3.0 — reentrancy guard broken
// The @nonreentrant decorator is compiled to a no-op in these versions

// @nonreentrant("lock")  // BROKEN: compiler bug makes this ineffective
balance: uint256
locked: bool

@external
def withdraw():
    # This should be protected by @nonreentrant but the compiler
    # generates code that doesn't actually prevent reentry
    amount: uint256 = self.balance
    raw_call(msg.sender, b"", max_outsize=0, value=amount)
    self.balance = 0  # State update AFTER external call, no guard
```

```solidity
// VULNERABLE: Contract using compromised dependency
// Developer installed "openzeppelin-contract" (typo of "openzeppelin-contracts")
// The fake package contains a modified ReentrancyGuard that does nothing

import "@fake-openzeppelin/security/ReentrancyGuard.sol"; // Typosquatted!
import "@fake-openzeppelin/token/ERC20/ERC20.sol";        // Malicious!

contract FakeGuardToken is ERC20, ReentrancyGuard {
    // ReentrancyGuard from fake package is a no-op
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external nonReentrant {
        // nonReentrant modifier from fake package does nothing
        uint256 amount = balances[msg.sender];
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok);
        balances[msg.sender] = 0; // State after call, no real guard
    }
}
```

## Fixed Code

```solidity
// SECURE: Proper compiler version pinning and dependency verification
//(foundry.toml)
// [profile.default]
// solc = "0.8.28"           # Pin exact version
// optimizer = true
// optimizer_runs = 200
// bytecode_hash = "none"    # Remove metadata hash for reproducible builds

// Verify checksums: forge build --checksum
// Verify dependencies: forge install OpenZeppelin/openzeppelin-contracts@v5.0.2
// Verify deployment: forge verify-contract with exact source

// In Solidity: use exact pragma (not floating)
pragma solidity 0.8.28; // PINNED — not ^0.8.0

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";  // Verified source
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SecureToken is ERC20, ReentrancyGuard {
    constructor() ERC20("SecureToken", "STK") {
        _mint(msg.sender, 1_000_000e18);
    }

    function deposit() external payable nonReentrant {
        // ReentrancyGuard from verified OpenZeppelin v5.0.2
        require(msg.value > 0, "Zero deposit");
        balances[msg.sender] += msg.value;
    }

    function withdraw() external nonReentrant {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "No balance");

        // CEI pattern
        balances[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");
    }

    mapping(address => uint256) public balances;
}
```

## Real-World Impact

**Curve Finance ($70M, July 2023)** — The most significant compiler bug incident in DeFi history. Certain versions of the Vyper compiler (0.2.15, 0.2.16, 0.3.0) failed to properly implement the `@nonreentrant` decorator when multiple functions used the same lock identifier. This meant that Vyper contracts compiled with these versions had non-functional reentrancy guards. Multiple Curve pools were exploited, with approximately $70 million drained. The source code was correct — the compiler introduced the vulnerability.

**npm typosquatting attacks** — Multiple incidents where attackers published packages with names similar to popular Ethereum libraries (e.g., "etheres" instead of "ethers", "web4" instead of "web3"). Developers who accidentally installed the wrong package would have malicious code executed during build, potentially modifying the compiled output.

**Solidity Compiler Bugs** — The Solidity compiler has had numerous bugs documented in its bug registry. While most are minor or edge cases, some could theoretically affect contract behavior. The Solidity team maintains a public bug registry and recommends always using the latest stable version.

**Library Update Attacks** — When a widely-used library (like OpenZeppelin) releases a security update, not all contracts upgrade promptly. Contracts running outdated library versions remain vulnerable to known issues. This is a systemic risk in the smart contract ecosystem.

For AI agent contracts, supply chain risks are relevant when evaluating the contract's compilation environment, dependency tree, and verification status. TrustLayer considers whether the deployed bytecode matches the verified source code and whether the compilation toolchain is known to be safe.

## How TrustLayer Detects This

TrustLayer identifies supply chain and compiler risks through:

- **Pipeline Step 2 (Decompile)** — When analyzing deployed bytecode, TrustLayer can detect patterns that suggest compiler-specific vulnerabilities. Decompilation reveals the actual executed logic, not just the source code.

- **Dedaub TokIn API (Step 4, 20% weight)** — Analyzes the contract's metadata, including compiler version and optimization settings. Flags contracts compiled with known-vulnerable compiler versions.

- **AI Analysis (Step 7, 10% weight)** — Evaluates supply chain indicators: whether the source code is verified, whether compiler version is pinned, whether floating pragmas are used, and whether the dependency tree includes known-vulnerable libraries.

- **Permission Mapper (Step 5, 25% weight)** — Checks for patterns introduced by specific compiler bugs (e.g., non-functional reentrancy guards from the Vyper incident).

## References

- Vyper Security Advisories: https://vyperlang.org/#security
- Solidity Bug Registry: https://docs.soliditylang.org/en/latest/bugs.html
- Curve Reentrancy Post-Mortem: https://rekt.news/curve-rekt/
- npm Supply Chain Attacks: https://blog.npmjs.org/post/185725549791/security-advisory-malicious-packages
- Reproducible Builds: https://reproducible-builds.org/
