# Deploy VibeFuelStaking

Deploy `VibeFuelStaking.sol` on Robinhood Chain Testnet with chain ID `46630`.

Constructor argument:

`0x5B575A0E3d09c3D6d27B475e2eabB45d13bBd91B`

After deployment:

1. Copy the staking contract address.
2. From the token contract, approve that address to spend VFUEL.
3. Call `stake(amount)` on the staking contract.
4. Call `unstake(amount)` to withdraw staked VFUEL.

Use a wallet or deployment tool that supports custom EVM networks. Never place a private key in this repository, the frontend, Vercel environment variables, or chat. This contract has no admin withdrawal function and does not mint rewards; it only locks and returns VFUEL.
