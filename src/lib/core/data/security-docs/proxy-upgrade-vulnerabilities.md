# Proxy Upgrade Vulnerabilities

**Category:** Governance Security
**Severity:** high
**Related SWCs:** SWC-112 (Delegatecall to Untrusted Callee), SWC-119 (Shadowing State Variables)

## Description

Upgradeable smart contracts use the proxy pattern: a proxy contract holds user funds and state, while a separate implementation contract contains the logic. The proxy delegates all function calls to the implementation via `delegatecall`. When an upgrade is needed, the proxy's implementation pointer is changed to a new contract address.

This pattern introduces a unique category of vulnerabilities related to the interaction between proxy and implementation. The fundamental challenge is that `delegatecall` executes the implementation's code in the proxy's storage context — any mismatch between what the implementation expects and what the proxy actually stores can lead to catastrophic failures.

**Key attack vectors:**

1. **Storage Collision** — The proxy and implementation share storage slots. If the implementation declares state variables in a different order than the proxy expects, the variables map to wrong storage slots. For example, the implementation's `owner` variable might actually read the proxy's `implementation` address, giving the attacker control.

2. **Function Selector Clashes** — In diamond/multi-facet proxies (EIP-2535), different implementation facets are selected by function selector. If two functions from different facets have the same selector (hash collision or naming conflict), calls may be routed to the wrong implementation.

3. **Initializer Re-Initialization** — Upgradeable contracts use `initialize()` instead of `constructor()`. If `initialize()` is not protected against being called multiple times, an attacker can call it again to reset state variables — including `owner` — gaining control of the contract.

4. **Unprotected Upgrade Function** — The `_upgradeTo()` or `setImplementation()` function has no access control, allowing anyone to change the implementation to a malicious contract.

5. **Implementation Self-Destruction** — If the implementation contract has a function that calls `selfdestruct`, anyone can call it directly on the implementation (not through the proxy), destroying the code. All proxy calls then fail because the implementation no longer exists.

6. **Storage Gap Mismanagement** — Upgradeable contracts use storage gaps (reserved empty arrays) to allow adding variables in future versions without shifting existing storage. If storage gaps are not properly maintained, adding a variable in an upgrade causes storage collision with downstream variables.

## Vulnerable Code

```solidity
// VULNERABLE: Proxy with multiple security flaws
contract VulnerableProxy {
    // VULNERABILITY 1: Storage layout not using EIP-1967 slots
    // These variables are in slots 0, 1, 2 — collision risk with implementation
    address public implementation;   // slot 0
    address public admin;           // slot 1
    uint256 public version;         // slot 2

    // VULNERABILITY 2: No access control on fallback
    fallback() external payable {
        address impl = implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    // VULNERABILITY 3: Anyone can upgrade the implementation
    function upgradeTo(address newImpl) external {
        implementation = newImpl;
        version++;
    }

    // VULNERABILITY 4: Admin can be changed without timelock
    function changeAdmin(address newAdmin) external {
        admin = newAdmin;
    }
}

// VULNERABILITY 5: Implementation can be re-initialized
contract VulnerableImpl {
    uint256 public value;          // slot 0 — COLLIDES with proxy's implementation!
    address public owner;          // slot 1 — COLLIDES with proxy's admin!

    // No initializer guard — can be called multiple times
    function initialize() external {
        owner = msg.sender; // Actually writes to proxy's admin slot
    }

    function setValue(uint256 _value) external {
        value = _value; // Actually writes to proxy's implementation slot!
    }
}
```

## Fixed Code

```solidity
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

// SECURE: UUPS proxy pattern with proper storage management
contract SecureImplV1 is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    // State variables in implementation — slots DO NOT collide because
    // Initializable, Ownable, etc. use well-defined storage slots

    uint256 public value;
    mapping(address => uint256) public balances;

    // Storage gap for future upgrades — reserves 50 slots
    uint256[50] private __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); // Prevents implementation from being initialized
    }

    // PROTECTED: Can only be called once (initializer guard)
    function initialize() external initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
    }

    // ACCESS CONTROLLED: Only owner can authorize upgrades
    function _authorizeUpgrade(address newImplementation)
        internal override onlyOwner
    {}

    function setValue(uint256 _value) external onlyOwner {
        value = _value;
    }

    function deposit() external payable nonReentrant {
        balances[msg.sender] += msg.value;
    }
}

// V2 — adds a new variable safely using storage gap
contract SecureImplV2 is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    uint256 public value;
    mapping(address => uint256) public balances;

    // NEW VARIABLE — takes one slot from the gap
    uint256 public maxDeposit;

    // Reduced gap: 50 - 1 = 49
    uint256[49] private __gap;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initializeV2() external reinitializer(2) {
        maxDeposit = 100 ether;
    }

    function _authorizeUpgrade(address newImplementation)
        internal override onlyOwner
    {}

    function deposit() external payable nonReentrant {
        require(msg.value <= maxDeposit, "Exceeds max deposit");
        balances[msg.sender] += msg.value;
    }
}
```

## Real-World Impact

**Parity Wallet Hack #2 ($150M+ ETH frozen, November 2017)** — The most infamous proxy vulnerability. The Parity multi-sig wallet used a library contract with an unprotected `initWallet()` function. An attacker called `initWallet()` directly on the library contract, becoming the owner, and then called `kill()` which self-destructed the library. Since all Parity wallets delegated to this library, every wallet became permanently frozen — over 500,000 ETH (worth $150M+ at the time, billions today) was locked forever.

**Audius ($6M, July 2022)** — The attacker called `initialize()` directly on the implementation contract (not through the proxy), which reset the contract's state and gave the attacker ownership. The implementation didn't have `_disableInitializers()` in its constructor, leaving it vulnerable to direct initialization.

**Uniswap V2 Router Incident** — While not an exploit, an incident where a new Uniswap V2 router was deployed but some frontends still pointed to the old router, causing user confusion. This highlighted the operational risks of proxy upgrades even when executed correctly.

**Numerous DeFi Protocols** — Many DeFi protocols have experienced "upgrade incidents" where a proxy upgrade introduced storage layout changes that caused temporary accounting errors. While most were caught before exploitation, they demonstrate the fragility of the proxy pattern.

For AI agent contracts, proxy upgrade vulnerabilities are relevant when agents use upgradeable contracts. If an attacker can upgrade the agent's implementation to a malicious version, they gain full control over all user funds the agent manages.

## How TrustLayer Detects This

TrustLayer identifies proxy upgrade vulnerabilities through:

- **Slither (Step 3, 30% weight)** uses the `controlled-delegatecall` detector to identify delegatecall patterns. It also checks for unprotected upgrade functions, missing initializer guards, and storage collision risks between proxy and implementation.

- **Permission Mapper (Step 5, 25% weight)** flags `proxy_upgrade`, `initializer`, and `delegatecall` patterns. It evaluates whether the upgrade mechanism has proper access control (onlyOwner, multi-sig, governance), whether initializers are protected, and whether the proxy uses EIP-1967 storage slots.

- **AI Analysis (Step 7, 10% weight)** evaluates the upgrade architecture holistically — identifying unprotected initializers, missing `_disableInitializers()`, storage gap management, and whether the implementation pattern (UUPS vs Transparent vs Diamond) introduces specific risks.

## References

- EIP-1967: Proxy Storage Slots: https://eips.ethereum.org/EIPS/eip-1967
- OpenZeppelin Upgrades Plugin: https://docs.openzeppelin.com/upgrades-plugins/1.x/
- UUPS vs Transparent Proxy: https://docs.openzeppelin.com/contracts/5.x/api/proxy
- Parity Wallet Hack Analysis: https://parity.io/security-alert/
- EIP-2535: Diamond Standard: https://eips.ethereum.org/EIPS/eip-2535
