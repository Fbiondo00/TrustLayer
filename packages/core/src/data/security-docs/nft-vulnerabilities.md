# NFT and Marketplace Vulnerabilities

**Category:** NFT Security
**Severity:** medium
**Related SWCs:** SWC-107 (Reentrancy), SWC-104 (Unchecked Return Value), SWC-105 (Unprotected Ether Withdrawal)

## Description

Non-Fungible Tokens (NFTs) represent unique digital assets — art, collectibles, game items, and increasingly financial positions (Uniswap V3 LP positions are ERC-721 NFTs). NFT marketplaces facilitate trading, and the combination of unique assets, auction mechanics, and marketplace escrow creates specific vulnerability patterns.

NFT vulnerabilities differ from typical DeFi bugs because NFTs involve identity (specific token IDs matter), metadata (off-chain content), and marketplace mechanics (listing, bidding, escrow). These unique properties create attack vectors not found in fungible token systems.

**Key attack vectors:**

1. **Marketplace Reentrancy** — When an NFT is purchased, the marketplace transfers the NFT to the buyer and then updates internal accounting. If the NFT transfer triggers a callback (`onERC721Received`), the receiver can re-enter the marketplace to list/buy another NFT before the first purchase state is fully updated.

2. **Royalty Bypass** — ERC-2981 specifies a standard for NFT royalties, but enforcement depends on marketplace cooperation. A marketplace can choose not to pay royalties, or users can transfer NFTs outside marketplaces to avoid fees.

3. **Metadata Manipulation** — NFT metadata (image, attributes) is typically stored off-chain (IPFS, centralized server). If the metadata URI is mutable, the NFT owner or contract admin can change the content after sale. Centralized metadata storage can also go offline, making the NFT worthless.

4. **Unlimited Minting** — The contract has no supply cap, or the cap can be bypassed. Attackers can mint unlimited NFTs and flood the market.

5. **Access Control on Mint** — The `mint()` or `safeMint()` function has no access control, allowing anyone to mint NFTs. If the NFT is supposed to be limited or earned, unrestricted minting destroys value.

6. **Auction Manipulation** — English auctions can be manipulated by bidding slightly above the current price to extend the auction, or by colluding to suppress bids. Vickrey (sealed-bid) auctions can leak bid information through calldata.

7. **ERC-721/ERC-1155 Callback Reentrancy** — Both standards define `safeTransferFrom()` which calls `onERC721Received()` / `onERC1155Received()` on the recipient. Malicious recipients can use this callback for reentrancy.

## Vulnerable Code

```solidity
// VULNERABLE: NFT marketplace with multiple security issues
contract VulnerableMarketplace {
    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    mapping(uint256 => Listing) public listings;
    IERC721 public nft;

    // VULNERABILITY 1: Reentrancy via onERC721Received callback
    function buyNFT(uint256 tokenId) external payable {
        Listing storage listing = listings[tokenId];
        require(listing.active, "Not listed");
        require(msg.value >= listing.price, "Insufficient payment");

        // State update AFTER NFT transfer — reentrancy risk
        // NFT transfer triggers onERC721Received callback
        nft.safeTransferFrom(listing.seller, msg.sender, tokenId);

        // VULNERABILITY 2: State updated after external call
        listing.active = false;

        // VULNERABILITY 3: Payment to seller after NFT is already transferred
        // Seller can re-enter via callback
        payable(listing.seller).transfer(listing.price);

        // VULNERABILITY 4: No refund of excess payment
    }

    function listNFT(uint256 tokenId, uint256 price) external {
        // VULNERABILITY 5: No check that caller owns the NFT
        // VULNERABILITY 6: No check that marketplace is approved
        listings[tokenId] = Listing(msg.sender, price, true);
    }

    // VULNERABILITY 7: No royalty enforcement
    // VULNERABILITY 8: No cancellation mechanism
}
```

## Fixed Code

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

contract SecureMarketplace is ReentrancyGuard, ERC721Holder {
    struct Listing {
        address seller;
        uint256 price;
        uint256 royaltyBps;
        address royaltyReceiver;
    }

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => bool) public isListed;
    IERC721 public immutable nft;

    uint256 public constant MAX_ROYALTY_BPS = 1000; // 10% max royalty

    event Listed(uint256 indexed tokenId, address seller, uint256 price);
    event Sold(uint256 indexed tokenId, address buyer, uint256 price);
    event Cancelled(uint256 indexed tokenId);

    constructor(address _nft) {
        nft = IERC721(_nft);
    }

    function listNFT(uint256 tokenId, uint256 price) external nonReentrant {
        require(price > 0, "Price must be > 0");
        require(!isListed[tokenId], "Already listed");
        require(nft.ownerOf(tokenId) == msg.sender, "Not owner");
        require(
            nft.isApprovedForAll(msg.sender, address(this)) ||
            nft.getApproved(tokenId) == address(this),
            "Not approved"
        );

        // Get royalty info if ERC-2981 compliant
        uint256 royaltyBps = 0;
        address royaltyReceiver = address(0);
        if (IERC2981(address(nft)).supportsInterface(type(IERC2981).interfaceId)) {
            (royaltyReceiver, royaltyBps) = IERC2981(address(nft)).royaltyInfo(tokenId, price);
            require(royaltyBps <= MAX_ROYALTY_BPS, "Royalty too high");
        }

        // Transfer NFT to marketplace escrow
        nft.safeTransferFrom(msg.sender, address(this), tokenId);

        listings[tokenId] = Listing(msg.sender, price, royaltyBps, royaltyReceiver);
        isListed[tokenId] = true;

        emit Listed(tokenId, msg.sender, price);
    }

    function buyNFT(uint256 tokenId) external payable nonReentrant {
        require(isListed[tokenId], "Not listed");
        Listing storage listing = listings[tokenId];
        require(msg.value >= listing.price, "Insufficient payment");

        // CEI: Update state BEFORE transfers
        isListed[tokenId] = false;
        delete listings[tokenId];

        // Calculate royalty
        uint256 royalty = (listing.price * listing.royaltyBps) / 10000;
        uint256 sellerProceeds = listing.price - royalty;

        // Transfer NFT (this contract holds it in escrow, no callback to buyer)
        nft.transferFrom(address(this), msg.sender, tokenId);

        // Pay royalty
        if (royalty > 0 && listing.royaltyReceiver != address(0)) {
            payable(listing.royaltyReceiver).transfer(royalty);
        }

        // Pay seller
        payable(listing.seller).transfer(sellerProceeds);

        // Refund excess payment
        uint256 excess = msg.value - listing.price;
        if (excess > 0) {
            payable(msg.sender).transfer(excess);
        }

        emit Sold(tokenId, msg.sender, listing.price);
    }

    function cancelListing(uint256 tokenId) external nonReentrant {
        require(isListed[tokenId], "Not listed");
        Listing storage listing = listings[tokenId];
        require(listing.seller == msg.sender, "Not seller");

        isListed[tokenId] = false;
        delete listings[tokenId];

        // Return NFT to seller
        nft.transferFrom(address(this), msg.sender, tokenId);

        emit Cancelled(tokenId);
    }
}
```

## Real-World Impact

**OpenSea Wyvern Exploit ($700K, January 2022)** — An attacker exploited a vulnerability in the Wyvern protocol (used by OpenSea) through a malicious NFT listing. The attack involved manipulating the marketplace's listing mechanism to purchase NFTs at below-market prices.

**NFT Trader Reentrancy (December 2023)** — Multiple NFT trading platforms experienced reentrancy attacks where the `onERC721Received` callback was used to re-enter the marketplace during a purchase, allowing the attacker to buy multiple NFTs for the price of one.

**Revest Finance ($2M, March 2022)** — A reentrancy attack on the Revest Protocol's NFT vault system. The attacker exploited the ERC-721 callback mechanism to manipulate vault state during a token unlock operation.

**Various Minting Exploits** — Multiple NFT projects have suffered from unlimited minting bugs where the supply cap was incorrectly implemented or could be bypassed. Attackers minted thousands of NFTs, flooding the market and destroying the value for legitimate holders.

For AI agent contracts, NFT vulnerabilities are relevant when agents manage NFT positions (Uniswap V3 LP NFTs), trade collectibles, or interact with NFT marketplaces on behalf of users.

## How TrustLayer Detects This

TrustLayer identifies NFT-related vulnerabilities through:

- **Slither (Step 3, 30% weight)** uses `reentrancy-eth` to detect the callback-to-reentrancy pattern in `safeTransferFrom` flows. It identifies CEI violations in marketplace buy/sell functions.

- **Permission Mapper (Step 5, 25% weight)** flags `nft_mint`, `marketplace`, and `nft_transfer` patterns. It evaluates mint access control, supply caps, royalty enforcement, and marketplace escrow safety.

- **AI Analysis (Step 7, 10% weight)** evaluates the NFT architecture — detecting metadata mutability, missing royalty enforcement, auction manipulation risks, and callback reentrancy vectors.

## References

- ERC-721 Standard: https://eips.ethereum.org/EIPS/eip-721
- ERC-1155 Multi-Token: https://eips.ethereum.org/EIPS/eip-1155
- ERC-2981 Royalty Standard: https://eips.ethereum.org/EIPS/eip-2981
- Wyvern Protocol: https://github.com/wyvernprotocol/wyvern-v3
- NFT Security Best Practices: https://consensys.github.io/smart-contract-best-practices/
