# Access Control Patterns

**Category:** Design Pattern
**Related SWCs:** SWC-105 (Unprotected Withdrawal), SWC-106 (Unprotected Selfdestruct), SWC-112 (Delegatecall to Untrusted Callee)

## Description

Access control is the set of mechanisms that determine who can execute specific functions in a smart contract. Without proper access control, any external caller can invoke any function, including those intended for privileged operators only. This is one of the most fundamental security requirements for any smart contract, and its absence has led to some of the largest hacks in blockchain history.

Smart contract access control operates differently from traditional web applications. There is no session management, no cookies, and no server-side state. Instead, authentication is based on the `msg.sender` global variable, which contains the address of the immediate caller (either an externally-owned account or another contract). Authorization is then implemented through modifiers, role checks, or ownership patterns.

The challenge is implementing access control that is both secure and flexible. Overly restrictive access control can prevent legitimate operations (e.g., a time-locked withdrawal that cannot be executed even by the owner before the lock expires). Overly permissive access control exposes functions to unauthorized use. The right balance depends on the contract's purpose, the value it manages, and the trust model of its users.

## Common Access Control Patterns

### 1. onlyOwner (Single Owner)

The simplest and most common pattern. A single address is designated as the owner and has exclusive access to privileged functions. The ownership can typically be transferred to a new address.

```solidity
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyContract is Ownable {
    function adminWithdraw() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    function setFee(uint256 newFee) external onlyOwner {
        fee = newFee;
    }
}
```

**Pros:** Simple to implement and understand. Clear single point of accountability.
**Cons:** Single point of failure. If the owner's private key is compromised, the entire contract is compromised. No way to recover if the owner loses their key (unless two-step ownership transfer is used). Centralization risk.

### 2. Role-Based Access Control (RBAC)

Multiple roles with different permission levels. Each role grants access to a specific set of functions. Users can be granted or revoked roles independently.

```solidity
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MyContract is AccessControl {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function operate() external onlyRole(OPERATOR_ROLE) {
        // Operator-only logic
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function grantOperator(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(OPERATOR_ROLE, account);
    }
}
```

**Pros:** Fine-grained permissions. Principle of least privilege. Multiple operators. Separation of concerns.
**Cons:** More complex to implement and manage. Role management itself requires access control (who can grant roles?).

### 3. Multi-Signature Control

Multiple addresses must approve an action before it can be executed. Typically implemented as a separate multi-sig wallet (e.g., Gnosis Safe) that owns the contract.

```solidity
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyContract is Ownable {
    // Owner is a Gnosis Safe (multi-sig wallet)
    // Requires M-of-N signatures to execute

    function criticalAction() external onlyOwner {
        // This can only be called after multi-sig approval
    }
}
```

**Pros:** No single point of failure. Requires consensus for critical operations. Key compromise of one signer does not compromise the contract.
**Cons:** Slower execution (requires multiple signatures). Higher gas costs for multi-sig operations. More complex operational overhead.

### 4. Time-Locked Access

Critical operations are delayed by a mandatory time period, giving users time to review and react to proposed changes.

```solidity
import "@openzeppelin/contracts/governance/TimelockController.sol";

contract MyContract {
    address public timelock;

    modifier onlyTimelock() {
        require(msg.sender == timelock, "Only timelock");
        _;
    }

    function updateCriticalParam(uint256 newValue) external onlyTimelock {
        // Can only be called through the timelock
        // Users have 48 hours to review before execution
        criticalParam = newValue;
    }
}
```

**Pros:** Users can review changes before they take effect. Opportunity to exit if disagreeable changes are proposed. Transparent governance.
**Cons:** Slow response to emergencies. Cannot quickly fix critical bugs through timelocked functions. Requires fallback mechanisms for emergencies.

### 5. Two-Step Ownership Transfer

Instead of directly transferring ownership, use a two-step process: the current owner proposes a new owner, and the new owner must accept.

```solidity
import "@openzeppelin/contracts/access/Ownable2Step.sol";

contract MyContract is Ownable2Step {
    // transferOwnership(newOwner) — proposes new owner
    // acceptOwnership() — new owner accepts
    // Prevents accidental transfer to wrong address
}
```

**Pros:** Prevents accidental transfer to a wrong or invalid address. New owner must explicitly accept.
**Cons:** Slightly more complex. Requires two transactions.

## Vulnerable Code (No Access Control)

```solidity
// DANGEROUS: Anyone can call these functions
function setPrice(uint256 _price) external {
    price = _price;
}

function withdrawFees() external {
    payable(msg.sender).transfer(collectedFees);
}

function emergencyPause() external {
    paused = true;
}
```

## Fixed Code (Proper Access Control)

```solidity
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract SecureAgent is AccessControl, Pausable {
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(OPERATOR_ROLE, msg.sender);
    }

    function setPrice(uint256 _price) external onlyRole(ADMIN_ROLE) {
        price = _price;
    }

    function withdrawFees() external onlyRole(ADMIN_ROLE) {
        uint256 fees = collectedFees;
        collectedFees = 0;
        payable(msg.sender).transfer(fees);
    }

    function emergencyPause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }
}
```

## Real-World Impact

The **Parity Wallet Hack (July 2017)** was a direct result of missing access control on the `initWallet` function. The attacker called the unprotected function to take ownership of multi-sig wallets and drained approximately 150,000 ETH (~$30 million).

The **Poly Network hack (August 2021)**, one of the largest DeFi exploits ever ($611 million stolen, later returned), exploited a vulnerability in the access control of the cross-chain protocol's `verifyHeaderAndExecuteTx` function. The attacker was able to bypass the modifier check by crafting a specific transaction that passed the ownership verification.

For AI agent contracts, access control is critical because the agent manages user funds and executes trades. If an attacker can call the agent's trading functions, they can execute trades that benefit themselves at the expense of users. If they can call configuration functions, they can change fee rates, redirect funds, or disable safety checks.

## How TrustLayer Evaluates Access Control

TrustLayer's pipeline evaluates access control through multiple mechanisms:

- **Slither's `missing-access-control`** detector identifies functions that perform sensitive operations without access control modifiers.
- **The Permission Mapper** catalogs all functions and their access control, flagging functions with no protection as **unprotected_admin**, **withdraw_without_auth**, or similar categories.
- **Transaction History Analysis** looks for patterns of access control exploitation, such as recent changes to ownership or role assignments.
- **The AI Analysis step** examines the overall access control architecture and identifies potential weaknesses, such as excessive centralization or missing multi-sig requirements.

Access control is a major factor in the trust score, contributing through the Slither weight (30%), Permissions weight (25%), and AI analysis weight (10%). Contracts with missing or weak access control receive significant score penalties.

## References

- OpenZeppelin Access Control: https://docs.openzeppelin.com/contracts/4.x/api/access
- OpenZeppelin Ownable: https://docs.openzeppelin.com/contracts/4.x/api/access#Ownable
- OpenZeppelin AccessControl: https://docs.openzeppelin.com/contracts/4.x/api/access#AccessControl
- Gnosis Safe (Multi-Sig): https://gnosis-safe.io/
- OpenZeppelin TimelockController: https://docs.openzeppelin.com/contracts/4.x/api/governance#TimelockController
