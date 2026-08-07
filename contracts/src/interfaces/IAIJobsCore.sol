// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAIJobsCore {
    enum BountyStatus {
        Open,
        Resolved,
        Cancelled,
        Expired
    }

    /// @dev Field order is tuned for storage packing: 4 fixed slots + 3 dynamic.
    struct Bounty {
        address poster;
        uint96 amount;
        address winner;
        uint96 stakeRequired;
        address token;
        uint64 deadline;
        uint8 maxSlots;
        uint8 claimedSlots;
        uint8 bountyType;
        bool ciRequired;
        address targetWorker;
        BountyStatus status;
        string targetRepoUrl;
        string instructionUrl;
        bytes32 requirementsHash;
    }

    struct Submission {
        bytes32 commitHash;
        uint64 submittedAt;
        bool ciPassed;
        bool stakeRefunded;
        string prUrl;
        string metadata;
    }

    struct PendingAddress {
        address proposed;
        uint64 effectiveAt;
    }

    event BountyPosted(
        uint256 indexed bountyId,
        address indexed poster,
        address indexed token,
        address targetWorker,
        uint8 bountyType,
        uint96 amount,
        uint96 stakeRequired,
        uint8 maxSlots,
        string targetRepoUrl,
        bytes32 requirementsHash
    );
    event SlotClaimed(uint256 indexed bountyId, address indexed worker);
    event PRSubmitted(uint256 indexed bountyId, address indexed worker, string prUrl, bytes32 commitHash);
    event CIAttested(uint256 indexed bountyId, address indexed worker, bool passed);
    event BountyResolved(uint256 indexed bountyId, address indexed winner, uint96 winnerPayout, uint96 protocolFee);
    event BountyCancelled(uint256 indexed bountyId, address indexed poster, uint96 refundAmount);
    event StakeRefunded(uint256 indexed bountyId, address indexed worker, uint96 amount);
    event StakeForfeited(uint256 indexed bountyId, address indexed worker, uint96 amount);
    event EarningsWithdrawn(address indexed account, address indexed token, uint256 amount);
    event ProtocolRevenueAccrued(address indexed token, uint256 amount, uint256 cumulative);
    event CIRelayerProposed(address indexed proposed, uint64 effectiveAt);
    event CIRelayerUpdated(address indexed previous, address indexed current);
    event CIRelayerProposalCancelled(address indexed proposed);
    event TreasuryProposed(address indexed proposed, uint64 effectiveAt);
    event TreasuryUpdated(address indexed previous, address indexed current);
    event TreasuryProposalCancelled(address indexed proposed);
    event ERC20Rescued(address indexed token, address indexed to, uint256 amount);
    event TokenAllowed(address indexed token, uint256 minBounty);
    event MinBountyUpdated(address indexed token, uint256 minBounty);

    function postBounty(
        IERC20 token,
        uint8 bountyType,
        string calldata targetRepoUrl,
        string calldata instructionUrl,
        bytes32 requirementsHash,
        uint96 amount,
        uint8 maxSlots,
        uint96 stake,
        uint64 deadline,
        bool ciRequired
    ) external returns (uint256);

    function postDirectHire(
        IERC20 token,
        address targetWorker,
        uint8 bountyType,
        string calldata targetRepoUrl,
        string calldata instructionUrl,
        bytes32 requirementsHash,
        uint96 amount,
        uint96 stake,
        uint64 deadline
    ) external returns (uint256);

    function claimSlot(uint256 bountyId) external;
    function submitPR(uint256 bountyId, string calldata prUrl, bytes32 commitHash, string calldata metadata)
        external;
    function attestCI(uint256 bountyId, address worker, bool passed) external;
    function pickWinner(uint256 bountyId, address winner) external;
    function cancelExpired(uint256 bountyId) external;
    function settleStake(uint256 bountyId, address worker) external;
    function withdrawEarnings(IERC20 token) external;
    function allowToken(IERC20 token, uint256 minBountyAmount) external;
    function setMinBounty(IERC20 token, uint256 minBountyAmount) external;
}
