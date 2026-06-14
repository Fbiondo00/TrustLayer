# Cross-Chain Messaging Vulnerabilities

**Category:** Cross-Chain Security
**Severity:** high
**Related SWCs:** SWC-104 (Unchecked Return Value), SWC-112 (Delegatecall to Untrusted Callee)

## Description

Cross-chain messaging protocols (LayerZero, CCIP, Axelar, Hyperlane) enable smart contracts on different blockchains to communicate. Unlike simple token bridges that lock-and-mint, messaging protocols support arbitrary data passing — enabling cross-chain governance, multi-chain DeFi strategies, and interconnected applications.

The security model of cross-chain messaging differs from token bridges. Instead of locking assets, messaging protocols rely on verification networks (Decentralized Verifier Networks or DVNs) that confirm message delivery and integrity. The trust assumption is that enough honest verifiers will correctly validate messages between chains.

**Key attack vectors:**

1. **DVN Configuration Attacks** — The messaging protocol allows the receiver to configure which DVNs must verify a message. If the configuration requires only 1-of-1 DVNs, a single compromised verifier can approve fraudulent messages. This is the cross-chain equivalent of a 1-of-1 multisig bridge.

2. **Relayer Manipulation** — The relayer (which submits messages on the destination chain) can reorder, delay, or selectively deliver messages. If the protocol doesn't enforce strict message ordering, the relayer can exploit timing differences between chains.

3. **State Inconsistency** — The source chain's state changes (e.g., token burn) and the destination chain's state changes (e.g., token mint) happen at different times with different finality guarantees. An attacker can exploit the gap between these state changes.

4. **Message Ordering Attacks** — Messages are delivered out of order, causing dependent operations to execute in the wrong sequence. For example, a "set price" message executes after a "trade at price" message, causing the trade to use an outdated price.

5. **Fraudulent Proof Submission** — The verification system accepts a proof that is technically valid (correct format, valid signatures) but represents a fraudulent state. This can happen when the proof system doesn't verify the full state transition, only a snapshot.

6. **Gas Limit Exploitation** — Cross-chain messages have gas limits for execution on the destination chain. If the gas limit is too low, the message fails. If too high, the excess gas is wasted. An attacker can manipulate gas limits to cause message failures or excessive costs.

## Vulnerable Code

```solidity
// VULNERABLE: Cross-chain executor with weak verification
contract VulnerableCrossChain {
    address public relayer;
    mapping(uint256 => bytes32) public chainConfigs;
    mapping(bytes32 => bool) public executedMessages;

    // VULNERABILITY: Single relayer, no multi-DVN verification
    function executeMessage(
        uint256 sourceChain,
        bytes32 messageId,
        address target,
        bytes calldata data,
        bytes calldata proof
    ) external {
        // Only checks that caller is the relayer — single point of trust
        require(msg.sender == relayer, "Not relayer");

        // Replay protection
        require(!executedMessages[messageId], "Already executed");
        executedMessages[messageId] = true;

        // VULNERABILITY: Proof is accepted but never actually verified
        // The "proof" parameter is ignored — anyone who is the relayer
        // can submit any message

        // VULNERABILITY: No message ordering enforcement
        // Messages can be delivered in any order

        // VULNERABILITY: No gas limit on the external call
        (bool ok,) = target.call(data);
        require(ok, "Execution failed");

        // VULNERABILITY: No cap on what operations can be executed
        // Relayer can trigger any function on any contract
    }

    // VULNERABILITY: Relayer can change instantly
    function setRelayer(address newRelayer) external {
        require(msg.sender == relayer);
        relayer = newRelayer;
    }
}
```

## Fixed Code

```solidity
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract SecureCrossChain is Ownable2Step, ReentrancyGuard, Pausable {
    uint256 public constant REQUIRED_DVNS = 2;
    uint256 public constant MAX_GAS = 500_000;

    struct DVNConfig {
        address dvn;
        bool active;
    }

    struct Message {
        uint256 sourceChain;
        uint256 nonce;
        address target;
        bytes data;
        uint256 gasLimit;
    }

    mapping(uint256 => uint256) public expectedNonce; // Per-chain nonce tracking
    mapping(bytes32 => bool) public executedMessages;
    mapping(address => bool) public whitelistedTargets;

    DVNConfig[] public dvns;

    event MessageExecuted(uint256 indexed sourceChain, uint256 nonce, bytes32 messageId);
    event DVNUpdated(address dvn, bool active);

    function executeMessage(
        Message calldata message,
        bytes[] calldata dvnSignatures
    ) external nonReentrant whenNotPaused {
        bytes32 messageId = keccak256(abi.encode(message));

        // Check 1: Message ordering — must match expected nonce
        require(
            message.nonce == expectedNonce[message.sourceChain],
            "Message out of order"
        );

        // Check 2: Already executed
        require(!executedMessages[messageId], "Already executed");

        // Check 3: Target must be whitelisted
        require(whitelistedTargets[message.target], "Target not whitelisted");

        // Check 4: Gas limit within bounds
        require(message.gasLimit <= MAX_GAS, "Gas limit too high");

        // Check 5: Multi-DVN signature verification
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageId));
        uint256 validSigs = 0;
        address lastSigner = address(0);

        for (uint256 i = 0; i < dvnSignatures.length; i++) {
            address signer = recoverSigner(ethSignedHash, dvnSignatures[i]);
            require(signer > lastSigner, "Unordered signers");
            if (isDVN(signer)) validSigs++;
            lastSigner = signer;
        }
        require(validSigs >= REQUIRED_DVNS, "Insufficient DVN attestations");

        // Update state BEFORE execution (CEI)
        executedMessages[messageId] = true;
        expectedNonce[message.sourceChain] = message.nonce + 1;

        // Execute with gas limit
        (bool ok,) = message.target.call{gas: message.gasLimit}(message.data);
        require(ok, "Execution failed");

        emit MessageExecuted(message.sourceChain, message.nonce, messageId);
    }

    function isDVN(address addr) public view returns (bool) {
        for (uint256 i = 0; i < dvns.length; i++) {
            if (dvns[i].dvn == addr && dvns[i].active) return true;
        }
        return false;
    }

    // Admin: manage DVNs (owner + timelock)
    function addDVN(address dvn) external onlyOwner {
        dvns.push(DVNConfig(dvn, true));
        emit DVNUpdated(dvn, true);
    }

    function removeDVN(address dvn) external onlyOwner {
        for (uint256 i = 0; i < dvns.length; i++) {
            if (dvns[i].dvn == dvn) {
                dvns[i].active = false;
                emit DVNUpdated(dvn, false);
                return;
            }
        }
    }

    function setWhitelistedTarget(address target, bool status) external onlyOwner {
        whitelistedTargets[target] = status;
    }

    function recoverSigner(bytes32 hash, bytes memory sig) internal pure returns (address) {
        require(sig.length == 65, "Invalid signature");
        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        return ecrecover(hash, v, r, s);
    }
}
```

## Real-World Impact

**KelpDAO ($292M at risk, 2024)** — A security researcher discovered that KelpDAO's LayerZero configuration used a 1-of-1 DVN setup, meaning a single compromised verifier could have approved fraudulent cross-chain messages. While no exploit occurred, the TVL at risk was approximately $292 million. This highlighted the critical importance of proper DVN configuration in cross-chain messaging.

**Multichain (anyswap, $125M+, July 2023)** — The CEO of Multichain was arrested by Chinese authorities, and the protocol's centralized key management became compromised. Since Multichain relied on a small set of trusted parties for cross-chain verification, the arrest effectively broke the protocol's security model. Users lost access to over $125 million in assets across multiple chains.

**Axie Infinity / Ronin Validator Compromise** — While categorized as a bridge hack, the Ronin incident was fundamentally a cross-chain messaging failure. The compromised validator keys allowed the attacker to send fraudulent withdrawal messages across chains.

**LayerZero V1 Incidents** — Several protocols built on LayerZero V1 suffered from misconfigured DVN setups, where the default configuration provided insufficient verification. Protocol teams had to manually configure their security parameters, and those who used defaults were under-protected.

For AI agent contracts, cross-chain messaging risks arise when agents operate across multiple chains. An agent that sends cross-chain messages without proper DVN verification or nonce tracking could be exploited to execute unauthorized operations on destination chains.

## How TrustLayer Detects This

TrustLayer identifies cross-chain messaging vulnerabilities through:

- **Permission Mapper (Step 5, 25% weight)** flags `cross_chain_message`, `remote_execution`, and `message_verification` patterns. It evaluates the verification scheme (single-relayer vs multi-DVN), message ordering enforcement, and whitelist mechanisms.

- **Slither (Step 3, 30% weight)** detects reentrancy in message execution, unchecked return values on cross-chain calls, and access control issues in the message handler.

- **AI Analysis (Step 7, 10% weight)** evaluates the cross-chain architecture — identifying single points of failure in the verification network, missing message ordering guarantees, and insufficient DVN thresholds.

- **TX History (Step 6, 15% weight)** checks for suspicious cross-chain activity, including failed message deliveries, unexpected message senders, or recent changes to DVN configuration.

## References

- LayerZero V2 Documentation: https://docs.layerzero.network/v2
- Chainlink CCIP: https://docs.chain.link/ccip
- L2Beat Cross-Chain Risk: https://l2beat.com/scaling/risk
- KelpDAO DVN Configuration: https://medium.com/immunefi
- Multichain Incident: https://rekt.news/multichain-rekt/
