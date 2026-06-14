# Checks-Effects-Interactions Pattern (CEI)

**Category:** Best Practice
**Related SWCs:** SWC-107 (Reentrancy)

## Description

The Checks-Effects-Interactions (CEI) pattern is the most fundamental defense against reentrancy attacks in Solidity smart contracts. It prescribes a strict ordering of operations within any function that makes external calls:

1. **Checks** — Validate all inputs and preconditions first. Use `require()` statements to verify that the caller has sufficient balance, that input parameters are valid, that the contract is in the correct state, and that all business logic preconditions are met.

2. **Effects** — Update all state variables before making any external calls. Zero out balances, update counters, set flags, and make any other state changes that the function requires. This ensures that if an external call triggers a reentrancy, the contract's state already reflects the current operation.

3. **Interactions** — Make external calls last. Send Ether via `.call()`, call functions on other contracts, and perform any operations that transfer control flow to external addresses.

The CEI pattern is not just a convention — it is a structural defense. When state is updated before external calls, a reentrant call encounters the updated state and cannot exploit stale values. For example, if a withdrawal function zeros the user's balance before sending Ether, a reentrant withdrawal attempt will see a zero balance and fail the balance check.

## Vulnerable Code (Violates CEI)

```solidity
// BAD: Interactions before Effects — vulnerable to reentrancy
function withdraw(uint256 amount) external {
    // Check
    require(balances[msg.sender] >= amount, "Insufficient balance");

    // Interaction (BEFORE effect — dangerous!)
    (bool ok, ) = msg.sender.call{value: amount}("");
    require(ok, "Transfer failed");

    // Effect (too late — reentrancy already happened)
    balances[msg.sender] -= amount;
}
```

## Fixed Code (Follows CEI)

```solidity
// GOOD: Checks → Effects → Interactions — safe from reentrancy
function withdraw(uint256 amount) external nonReentrant {
    // Checks
    require(balances[msg.sender] >= amount, "Insufficient balance");

    // Effects (state updated BEFORE external call)
    balances[msg.sender] -= amount;

    // Interactions (external call last)
    (bool ok, ) = msg.sender.call{value: amount}("");
    require(ok, "Transfer failed");
}
```

## CEI in Depth

The pattern works because of how the Ethereum Virtual Machine processes transactions. When a contract makes an external call (via `.call()`, `.delegatecall()`, or even `.transfer()`), control flow transfers to the called contract. If the called contract calls back into the original contract (reentrancy), the original function's execution is paused but its state changes are already committed to the EVM state.

By committing state changes before external calls, the reentrant call sees the updated state. The attacker cannot withdraw more than their balance because the balance has already been reduced. The pattern effectively "closes the window" for reentrancy by making the state consistent before any external code runs.

### Beyond Basic CEI

While CEI is the primary defense, modern best practices combine it with additional protections:

- **Reentrancy Guards** — Use OpenZeppelin's `ReentrancyGuard` modifier (`nonReentrant`) as an additional safety layer. This prevents reentrancy at the function level by using a lock variable.
- **Pull-over-Push** — Instead of sending Ether directly to recipients (push), let recipients withdraw their own funds (pull). This eliminates the need for external calls in many operations and follows the CEI pattern naturally.
- **State Machine Pattern** — Use explicit state variables (enum states) to track the contract's lifecycle and enforce that operations can only occur in valid states.

### When CEI Is Not Enough

In some cases, the CEI pattern alone is insufficient:

- **Cross-function reentrancy** — When the reentrant call targets a different function that shares state with the vulnerable function. The second function may read state that was partially updated by the first function.
- **Cross-contract reentrancy** — When the vulnerability spans multiple contracts. State updates in one contract may not protect against reentrancy through another contract that reads stale state.
- **Read-only reentrancy** — When a view function (which does not modify state) is called during reentrancy and returns inconsistent data to an external protocol.

In these cases, a reentrancy guard (`nonReentrant`) provides stronger protection than CEI alone.

## Real-World Impact

The Checks-Effects-Interactions pattern (or lack thereof) was at the heart of **The DAO hack** (June 2016), the most significant exploit in Ethereum history. The DAO's `splitDAO` function sent Ether before updating the user's balance, allowing the attacker's fallback function to recursively call `splitDAO` and withdraw the same funds multiple times. The total loss was approximately 3.6 million ETH.

Since The DAO hack, CEI has become the most widely taught and applied security pattern in Solidity development. Every major audit firm checks for CEI compliance, and automated tools like Slither, Securify, and Mythril flag violations of the pattern.

## How TrustLayer Evaluates CEI Compliance

TrustLayer's pipeline evaluates CEI compliance through multiple detectors:

- **Slither's `reentrancy-eth`** detector identifies functions where external calls precede state updates, which is a CEI violation.
- **The Permission Mapper** tracks functions that make external calls while modifying shared state, flagging them for potential CEI violations.
- **The AI Analysis step** examines the overall code structure and provides explanations of any CEI violations found, along with specific recommendations for restructuring the code.

CEI compliance is a significant factor in the trust score. Violations are weighted through the Slither (30%) and Permissions (25%) components, and the AI analysis (10%) provides contextual explanation of why the pattern violation matters for the specific contract being analyzed.

## References

- Solidity Documentation — Security Considerations: https://docs.soliditylang.org/en/latest/security-considerations.html
- Consensys Best Practices: https://consensys.github.io/smart-contract-best-practices/
- OpenZeppelin ReentrancyGuard: https://docs.openzeppelin.com/contracts/4.x/api/security#ReentrancyGuard
- SWC-107 Reentrancy: https://swcregistry.io/docs/SWC-107
