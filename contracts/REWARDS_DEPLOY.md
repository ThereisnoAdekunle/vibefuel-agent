# VibeFuelRewards deployment

Deploy `VibeFuelRewards.sol` on Robinhood Chain Testnet (`46630`, hex `0xb626`).

Constructor arguments:

1. Stake token: `0x5B575A0E3d09c3D6d27B475e2eabB45d13bBd91B`
2. Reward token array, in this exact order:
   - `0x62f550c1290Be5F05d3784C1b95D71f6FD6D0F5C`
   - `0x7517639eca815dAA9234B00DdE19beb324D71A08`
   - `0xFcECeBeFDDF79ecC7bb37dD399EB7f72Dbc6bf7A`
   - `0x247d87DE6f7018a124969375DFCA8CACb82e5Ee9`
   - `0xE2D63d0a321399073295076d1b367bE49672eAFc`

The default reward pool is `1,000` whole tokens of each reward token per completed 7-day period. Because these tokens use 18 decimals, the contract stores this as `1000000000000000000000`. The minimum stake is `100,000 VFUEL` (18 decimals). Each eligible wallet receives a proportional share: `user stake / total eligible stake * period pool`. Missed periods accrue and can be claimed with `claimRewards()`.

Before users can claim, the owner must approve this contract to spend each reward token and call `fundRewards(amounts)`. To fund one full period pool, approve and fund `[1000000000000000000000, 1000000000000000000000, 1000000000000000000000, 1000000000000000000000, 1000000000000000000000]` base units.

Owner-only `setRewardTerms` can change the reward amounts at any time; the current amounts are used when a claim is made, including periods that accrued since the previous claim. It cannot withdraw user stakes. The contract has no reward minting and no owner withdrawal function. Never put a private key or seed phrase in the repository or frontend.

Important: this proportional-rewards version must be deployed as a new contract. Existing stakes in the old `VibeFuelStaking` or previous `VibeFuelRewards` contracts do not count here. Users must stake into this rewards contract after it is deployed.
