// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Rewards {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract VibeFuelRewards {
    uint256 public constant CLAIM_INTERVAL = 7 days;
    uint256 public constant MINIMUM_STAKE = 100_000 ether;
    uint256 private constant REWARD_TOKEN_COUNT = 5;

    address public immutable owner;
    IERC20Rewards public immutable stakeToken;
    IERC20Rewards[REWARD_TOKEN_COUNT] public rewardTokens;
    uint256[REWARD_TOKEN_COUNT] public rewardPerPeriod;

    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public lastClaimAt;
    uint256 public totalStaked;
    uint256 public totalEligibleStaked;

    bool private locked;

    event Staked(address indexed account, uint256 amount);
    event Unstaked(address indexed account, uint256 amount);
    event RewardsClaimed(address indexed account, uint256 periods, uint256[REWARD_TOKEN_COUNT] amounts);
    event RewardTermsUpdated(uint256[REWARD_TOKEN_COUNT] amounts);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier nonReentrant() {
        require(!locked, "reentrant call");
        locked = true;
        _;
        locked = false;
    }

    constructor(address stakeTokenAddress, address[REWARD_TOKEN_COUNT] memory rewardTokenAddresses) {
        require(stakeTokenAddress != address(0), "zero stake token");
        owner = msg.sender;
        stakeToken = IERC20Rewards(stakeTokenAddress);
        for (uint256 index = 0; index < REWARD_TOKEN_COUNT; index++) {
            require(rewardTokenAddresses[index] != address(0), "zero reward token");
            rewardTokens[index] = IERC20Rewards(rewardTokenAddresses[index]);
            rewardPerPeriod[index] = 1_000 ether;
        }
    }

    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "zero amount");
        _claimIfEligible(msg.sender);
        uint256 previousStake = stakedBalance[msg.sender];
        require(stakeToken.transferFrom(msg.sender, address(this), amount), "stake transfer failed");
        stakedBalance[msg.sender] += amount;
        totalStaked += amount;
        if (previousStake < MINIMUM_STAKE && stakedBalance[msg.sender] >= MINIMUM_STAKE) {
            lastClaimAt[msg.sender] = block.timestamp;
            totalEligibleStaked += stakedBalance[msg.sender];
        } else if (previousStake >= MINIMUM_STAKE) {
            totalEligibleStaked += amount;
        }
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0 && amount <= stakedBalance[msg.sender], "invalid amount");
        _claimIfEligible(msg.sender);
        uint256 previousStake = stakedBalance[msg.sender];
        stakedBalance[msg.sender] -= amount;
        totalStaked -= amount;
        if (previousStake >= MINIMUM_STAKE && stakedBalance[msg.sender] < MINIMUM_STAKE) {
            totalEligibleStaked -= previousStake;
        } else if (previousStake >= MINIMUM_STAKE) {
            totalEligibleStaked -= amount;
        }
        require(stakeToken.transfer(msg.sender, amount), "unstake transfer failed");
        if (stakedBalance[msg.sender] < MINIMUM_STAKE) {
            lastClaimAt[msg.sender] = block.timestamp;
        }
        emit Unstaked(msg.sender, amount);
    }

    function claimRewards() external nonReentrant {
        _claimIfEligible(msg.sender);
    }

    function claimablePeriods(address account) public view returns (uint256) {
        if (stakedBalance[account] < MINIMUM_STAKE || lastClaimAt[account] == 0) return 0;
        return (block.timestamp - lastClaimAt[account]) / CLAIM_INTERVAL;
    }

    function pendingRewards(address account) external view returns (uint256[REWARD_TOKEN_COUNT] memory amounts) {
        uint256 periods = claimablePeriods(account);
        for (uint256 index = 0; index < REWARD_TOKEN_COUNT; index++) {
            amounts[index] = totalEligibleStaked == 0 ? 0 : rewardPerPeriod[index] * periods * stakedBalance[account] / totalEligibleStaked;
        }
    }

    function setRewardTerms(uint256[REWARD_TOKEN_COUNT] calldata amounts) external onlyOwner {
        for (uint256 index = 0; index < REWARD_TOKEN_COUNT; index++) {
            rewardPerPeriod[index] = amounts[index];
        }
        emit RewardTermsUpdated(amounts);
    }

    function fundRewards(uint256[REWARD_TOKEN_COUNT] calldata amounts) external onlyOwner nonReentrant {
        for (uint256 index = 0; index < REWARD_TOKEN_COUNT; index++) {
            require(rewardTokens[index].transferFrom(msg.sender, address(this), amounts[index]), "fund transfer failed");
        }
    }

    function rewardBalances() external view returns (uint256[REWARD_TOKEN_COUNT] memory balances) {
        for (uint256 index = 0; index < REWARD_TOKEN_COUNT; index++) {
            balances[index] = rewardTokens[index].balanceOf(address(this));
        }
    }

    function _claimIfEligible(address account) internal {
        uint256 periods = claimablePeriods(account);
        if (periods == 0) return;

        uint256[REWARD_TOKEN_COUNT] memory amounts;
        for (uint256 index = 0; index < REWARD_TOKEN_COUNT; index++) {
            amounts[index] = totalEligibleStaked == 0 ? 0 : rewardPerPeriod[index] * periods * stakedBalance[account] / totalEligibleStaked;
            require(rewardTokens[index].balanceOf(address(this)) >= amounts[index], "rewards not funded");
        }
        lastClaimAt[account] += periods * CLAIM_INTERVAL;
        for (uint256 index = 0; index < REWARD_TOKEN_COUNT; index++) {
            require(rewardTokens[index].transfer(account, amounts[index]), "reward transfer failed");
        }
        emit RewardsClaimed(account, periods, amounts);
    }
}
