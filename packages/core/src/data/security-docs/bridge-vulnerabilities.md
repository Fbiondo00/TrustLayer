# Bridge Vulnerabilities

**Category:** Cross-Chain Security
**Severity:** high
**Related SWCs:** SWC-112 (Delegatecall to Untrusted Callee), SWC-104 (Unchecked Return Value), SWC-120 (Weak Sources of Randomness)

## Description

Blockchain bridges connect two or more blockchains, enabling token transfers and message passing between networks. Bridges hold massive amounts of locked assets (the bridges with the highest TVL hold billions of dollars), making them the most lucrative targets in DeFi security. In 2022 alone, bridge exploits accounted for over $2 billion in losses.

The fundamental security challenge of bridges is **trust verification across chains**. When tokens are locked on Chain A and minted on Chain B, something must verify that the lock actually happened. This "something" — whether it's a set of validators, a light client, an optimistic proof, or a ZK proof — is the bridge's trust assumption. Every bridge hack has exploited a failure in this trust verification.

**Key attack vectors:**

1. **Validator/Key Compromise** — The bridge relies on a set of validators who sign messages confirming cross-chain transfers. If enough validator keys are compromised (via social engineering, malware, or insider threat), the attacker can forge messages and mint unbacked tokens.

2. **Signature Verification Bypass** — The bridge's smart contract verifies validator signatures incorrectly or incompletely. An attacker can craft messages that pass verification without valid signatures.

3. **Zero-Root / Uninitialized Proxy** — The bridge's verifier contract is deployed as a proxy that hasn't been initialized. Anyone can call `initialize()` to set themselves as the owner, then approve fraudulent messages.

4. **Message Replay** — A valid cross-chain message is submitted twice (or to a different chain than intended), causing double-minting or double-spending.

5. **Proof Verification Weakness** — The cryptographic proof system (Merkle proofs, ZK proofs) has an implementation flaw that allows invalid proofs to be accepted.

6. **Centralized Point of Failure** — A single entity controls the bridge (1-of-1 multisig, single relayer), making the entire system only as secure as that one entity.

## Vulnerable Code

```solidity
// VULNERABLE: Bridge with multiple security flaws
contract VulnerableBridge {
    address public admin;
    mapping(bytes32 => bool) public processedMessages;
    mapping(address => uint256) public locked;
    IToken public immutable wrappedToken;

    // VULNERABILITY 1: Only 1 signer required — single point of failure
    function processMessage(
        bytes32 messageId,
        address recipient,
        uint256 amount,
        bytes memory signature
    ) external {
        // VULNERABILITY 2: Signature verification is incomplete
        bytes32 hash = keccak256(abi.encode(messageId, recipient, amount));
        // Missing: EIP-712 domain separator
        // Missing: check for signature malleability
        address signer = ECDSA.recover(hash, signature);
        require(signer == admin, "Invalid signer");

        // VULNERABILITY 3: Replay protection uses wrong key
        // Uses messageId but doesn't include source chain
        require(!processedMessages[messageId], "Already processed");
        processedMessages[messageId] = true;

        // Mint wrapped tokens without checking if originals are locked
        wrappedToken.mint(recipient, amount);
    }

    function lock(uint256 amount) external {
        // VULNERABILITY 4: No cap on locked amount
        locked[msg.sender] += amount;
        IERC20(wrappedToken).transferFrom(msg.sender, address(this), amount);
        // Missing: emit event with source chain, message ID for verification
    }

    // VULNERABILITY 5: Admin can change admin instantly (no timelock)
    function setAdmin(address newAdmin) external {
        require(msg.sender == admin);
        admin = newAdmin;
    }

    // VULNERABILITY 6: Admin can mint unlimited tokens (no collateral check)
    function emergencyMint(address to, uint256 amount) external {
        require(msg.sender == admin);
        wrappedToken.mint(to, amount);
    }
}
```

## Fixed Code

```solidity
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract SecureBridge is Ownable2Step, ReentrancyGuard, Pausable, EIP712 {
    using ECDSA for bytes32;

    uint256 public constant REQUIRED_SIGNATURES = 3;
    uint256 public constant TOTAL_VALIDATORS = 5;
    uint256 public constant TIMELOCK = 2 days;
    uint256 public constant MAX_MINT_PER_MESSAGE = 1_000_000e18;

    mapping(address => bool) public validators;
    mapping(bytes32 => bool) public processedMessages;
    mapping(address => uint256) public locked;
    address[] public validatorList;

    // Source chain IDs for replay protection
    mapping(bytes32 => bool) public processedPerChain; // chainId+messageId => processed

    IToken public immutable wrappedToken;
    uint256 public immutable sourceChainId;

    event Locked(address indexed user, uint256 amount, bytes32 messageId);
    event Minted(address indexed recipient, uint256 amount, bytes32 messageId, uint256 sourceChain);

    constructor(address _wrappedToken, uint256 _sourceChainId)
        EIP712("SecureBridge", "1")
    {
        wrappedToken = IToken(_wrappedToken);
        sourceChainId = _sourceChainId;
    }

    function processMessage(
        uint256 sourceChain,
        bytes32 messageId,
        address recipient,
        uint256 amount,
        bytes[] calldata signatures
    ) external nonReentrant whenNotPaused {
        // Check 1: Amount within limits
        require(amount <= MAX_MINT_PER_MESSAGE, "Amount exceeds limit");

        // Check 2: Replay protection with source chain
        bytes32 chainMessageId = keccak256(abi.encode(sourceChain, messageId));
        require(!processedPerChain[chainMessageId], "Already processed");
        processedPerChain[chainMessageId] = true;

        // Check 3: EIP-712 typed data hash (domain separator included)
        bytes32 structHash = keccak256(abi.encode(
            keccak256("BridgeMessage(uint256 sourceChain,bytes32 messageId,address recipient,uint256 amount)"),
            sourceChain, messageId, recipient, amount
        ));
        bytes32 digest = _hashTypedDataV4(structHash);

        // Check 4: Multi-signature verification (3-of-5)
        uint256 validSigs = 0;
        address lastSigner = address(0);
        for (uint256 i = 0; i < signatures.length; i++) {
            address signer = digest.recover(signatures[i]);
            require(signer > lastSigner, "Signers not sorted"); // Prevent duplicate
            if (validators[signer]) validSigs++;
            lastSigner = signer;
        }
        require(validSigs >= REQUIRED_SIGNATURES, "Insufficient signatures");

        // Mint wrapped tokens
        wrappedToken.mint(recipient, amount);
        emit Minted(recipient, amount, messageId, sourceChain);
    }

    function lock(uint256 amount) external nonReentrant {
        require(amount > 0, "Zero amount");
        locked[msg.sender] += amount;
        IERC20(address(wrappedToken)).safeTransferFrom(msg.sender, address(this), amount);

        bytes32 messageId = keccak256(abi.encode(msg.sender, amount, block.number, sourceChainId));
        emit Locked(msg.sender, amount, messageId);
    }

    // Validator management with timelock
    function proposeValidator(address validator, bool status) external onlyOwner {
        bytes32 hash = keccak256(abi.encode("VALIDATOR", validator, status));
        timelockedOps[hash] = block.timestamp + TIMELOCK;
    }

    function executeValidatorChange(address validator, bool status) external onlyOwner {
        bytes32 hash = keccak256(abi.encode("VALIDATOR", validator, status));
        require(timelockedOps[hash] > 0 && block.timestamp >= timelockedOps[hash], "Timelock");
        validators[validator] = status;
        delete timelockedOps[hash];
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    mapping(bytes32 => uint256) public timelockedOps;
}
```

## Real-World Impact

**Ronin Bridge ($625M, March 2022)** — The largest bridge hack in history. Attackers compromised 5 of 9 validator keys through a combination of social engineering and compromised private keys. With majority control, they approved fraudulent withdrawals of 173,600 ETH and 25.5M USDC. The hack went undetected for nearly a week.

**Wormhole ($320M, February 2022)** — An attacker exploited a signature verification vulnerability in the Solana-Ethereum bridge. The bug allowed the attacker to forge a valid "guardian" signature, minting 120,000 wETH on Solana without corresponding ETH locked on Ethereum.

**Nomad Bridge ($190M, August 2022)** — A "zero-root" initialization vulnerability. During a routine upgrade, the `initialize()` function was called with a zero value for the Merkle root. This made every message "provably" valid (since `0 == 0`), allowing anyone to withdraw funds. The exploit was so simple that multiple copycat attackers joined in, creating a crowd-draining event.

**Harmony Horizon ($100M, June 2022)** — The bridge relied on a 2-of-5 multisig for validation. Attackers compromised two of the five keys, giving them enough signatures to approve fraudulent withdrawals. The low threshold (2-of-5 instead of 3-of-5 or higher) was a catastrophic design flaw.

**Poly Network ($611M, August 2021)** — The attacker exploited a flaw in the cross-chain message verification logic. The contract used a custom signature scheme that didn't properly verify the caller's identity, allowing the attacker to modify the keeper role and withdraw funds.

For AI agent contracts that interact with bridges, the risk is that the agent may bridge user funds to a compromised or insecure bridge. TrustLayer evaluates the security of the bridge contracts the agent interacts with.

## How TrustLayer Detects This

TrustLayer identifies bridge-related vulnerabilities through:

- **Permission Mapper (Step 5, 25% weight)** flags `cross_chain`, `bridge_lock`, `bridge_mint`, and `cross_chain_message` patterns. It evaluates the signature verification scheme, checking for multi-sig requirements, timelocks, and centralized control points.

- **Slither (Step 3, 30% weight)** detects signature verification issues (`sig-malleability`), uninitialized proxies, and unprotected privileged functions that are common in bridge contracts.

- **AI Analysis (Step 7, 10% weight)** evaluates the bridge's trust model — identifying single points of failure, insufficient validator thresholds, missing replay protection, and centralized admin capabilities.

- **TX History (Step 6, 15% weight)** checks the bridge's operational history for suspicious activity, including unusual minting patterns or recent contract upgrades.

## References

- Ronin Bridge Post-Mortem: https://rekt.news/ronin-rekt/
- Wormhole Post-Mortem: https://rekt.news/wormhole-rekt/
- Nomad Bridge Incident: https://rekt.news/nomad-rekt/
- L2Beat Bridge Risk Framework: https://l2beat.com/scaling/risk
- Bridge Security Comparison: https://medium.com/immunefi/hacking-bridges-understanding-bridge-exploits-part-1
