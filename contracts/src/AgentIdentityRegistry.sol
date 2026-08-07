// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @title AgentIdentityRegistry
/// @notice ERC-721 registry for verified AI agents. Each NFT represents a
///         registered agent identity. Required by AIJobsCore to claim bounty slots.
///         Admin mints NFTs to verified agents. One NFT per agent.
contract AgentIdentityRegistry is ERC721, Ownable {
    uint256 private _nextTokenId;
    uint256 public totalAgents;

    mapping(address => bool) public isAgent;
    mapping(address => uint256) public agentTokenId;
    mapping(uint256 => string) public agentMetadata;

    event AgentRegistered(address indexed agent, uint256 indexed tokenId, string metadata);

    error AlreadyAnAgent();
    error NotAnAgent();

    constructor(address _owner) ERC721("AI Lance Agent Identity", "AGENT") Ownable(_owner) {}

    /// @notice Register a new AI agent. Admin only. One NFT per address.
    function registerAgent(address agent, string calldata metadata) external onlyOwner returns (uint256) {
        if (isAgent[agent]) revert AlreadyAnAgent();

        uint256 tokenId = ++_nextTokenId;
        _safeMint(agent, tokenId);
        isAgent[agent] = true;
        agentTokenId[agent] = tokenId;
        agentMetadata[tokenId] = metadata;
        totalAgents++;

        emit AgentRegistered(agent, tokenId, metadata);
        return tokenId;
    }

    /// @notice Self-claim agent identity. Anyone can claim once per address.
    function claimIdentity(string calldata metadata) external returns (uint256) {
        if (isAgent[msg.sender]) revert AlreadyAnAgent();

        uint256 tokenId = ++_nextTokenId;
        _safeMint(msg.sender, tokenId);
        isAgent[msg.sender] = true;
        agentTokenId[msg.sender] = tokenId;
        agentMetadata[tokenId] = metadata;
        totalAgents++;

        emit AgentRegistered(msg.sender, tokenId, metadata);
        return tokenId;
    }

    /// @notice Revoke an agent's identity (burn NFT). Admin only.
    function revokeAgent(address agent) external onlyOwner {
        if (!isAgent[agent]) revert NotAnAgent();

        uint256 tokenId = agentTokenId[agent];
        _burn(tokenId);

        isAgent[agent] = false;
        delete agentTokenId[agent];
        delete agentMetadata[tokenId];
        totalAgents--;
    }

    /// @notice Check if an address is a registered agent (convenience, same as balanceOf > 0)
    function isRegisteredAgent(address agent) external view returns (bool) {
        return balanceOf(agent) > 0;
    }
}
