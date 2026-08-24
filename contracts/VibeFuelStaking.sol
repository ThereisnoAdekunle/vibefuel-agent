// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract VibeFuelStaking {
    IERC20 public immutable token;
    mapping(address => uint256) public stakedBalance;
    uint256 public totalStaked;

    event Staked(address indexed account, uint256 amount);
    event Unstaked(address indexed account, uint256 amount);

    constructor(address tokenAddress) {
        require(tokenAddress != address(0), "zero token");
        token = IERC20(tokenAddress);
    }

    function stake(uint256 amount) external {
        require(amount > 0, "zero amount");
        require(token.transferFrom(msg.sender, address(this), amount), "transfer failed");
        stakedBalance[msg.sender] += amount;
        totalStaked += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external {
        require(amount > 0 && amount <= stakedBalance[msg.sender], "invalid amount");
        stakedBalance[msg.sender] -= amount;
        totalStaked -= amount;
        require(token.transfer(msg.sender, amount), "transfer failed");
        emit Unstaked(msg.sender, amount);
    }
}
