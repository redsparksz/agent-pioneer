// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

/// @notice Test-only mock of the Agent ID registry (balanceOf).
contract MockRegistry {
    mapping(address => uint256) public balances;

    function set(address account, uint256 value) external {
        balances[account] = value;
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }
}
