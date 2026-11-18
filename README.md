# Agent Pioneer

**Soulbound attendance badge for Binance Agent ID holders** — built for the [Binance Agent ID Hackathon](https://www.binance.com/en/support/announcement/detail/95f5dbe0ea674a48a739b59e046648bf) (18 Nov – 9 Dec 2026).

Your Agent ID (`name.ai`) is your identity. Agent Pioneer turns it into proof: mint a free soulbound badge, check in once a day, grow a streak — all on-chain, all verifiable.

## How it works

1. **Hold a Binance Agent ID** — the contract reads the SPACE ID Agent ID registry (`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`). `balanceOf(you) > 0` is the only gate.
2. **Mint your badge — free** (you only pay gas, ~$0.005). One badge per wallet, non-transferable.
3. **Check in daily** — one check-in per UTC day. Consecutive days grow your streak; a missed day resets it to 1.
4. **Leaderboard** — streaks are public on-chain data; the frontend reads them straight from the contract.

## Contract

- `contracts/AgentPioneer.sol` — single file, no imports, Solidity 0.8.19.
- ERC-721 soulbound: `transferFrom` / `safeTransferFrom` / `approve` / `setApprovalForAll` all revert. `getApproved` returns `address(0)`.
- On-chain metadata: `tokenURI` returns a `data:application/json;base64` document with an inline SVG badge (streak rendered in the image).
- **Permissions: NONE.** No owner, no admin, no pause, no upgrade, no privileged roles. The contract is immutable after deployment. This is deliberate — there is nothing to document as an owner permission because there is none.

### Functions

| Function | Who | Cost |
|---|---|---|
| `mint()` | Agent ID holder, once | ~141k gas |
| `checkIn()` | Badge holder, 1x / UTC day | ~115k gas |
| `streakOf / checkInsOf / tokenOf / hasBadge / totalMinted / totalCheckIns` | anyone (view) | free |

## Deployment (BSC 56)

- Deployer: Binance Agentic Wallet (`baw`) — the deployer wallet cannot sign a raw contract-creation tx directly, so deployment goes through the audited **CreateX** factory (`0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed`) via `deployCreate2(bytes32,bytes)`.
- Salt = deployer address + `0x01` (cross-chain redeploy protection) + fixed entropy → guarded salt hashed by CreateX. Predicted address is verified on-chain via `CreateX.computeCreate2Address` before broadcast.
- Deploy cost estimate (live `eth_estimateGas`, 18 Nov 2026): **1,222,040 gas ≈ 0.0000611 BNB @ 0.05 gwei** (0.00015 BNB @ 0.123 gwei).
- Predicted contract address: `0x32cf34bbb7e01f75db33d55da850bf26ba056f50` (to be confirmed on receipt after deploy).
- Full recipe: [`docs/DEPLOY.md`](docs/DEPLOY.md).

## Verification

- Sourcify: `sourcify.dev/server/v2/contract/56/<address>` (API reachable; exact-match target).
- BscScan: source verification via BscScan API (needs a free BscScan API key) or the BscScan web UI.
- Tests: `node test/test.js` — 36 checks (Ganache + ethers v6): gates, soulbound reverts, streak math incl. gap reset, tokenURI JSON/SVG. All pass.

## Frontend

`frontend/` — static site, no server, no tracking. Connect with an injected wallet (MetaMask / Binance Wallet in-app browser). No QR login, no session storage, no credentials. Every transaction is confirmed by the user in their own wallet.

Live site: GitHub Pages (this repo → `frontend/`).

## Hackathon compliance (red lines)

- No web QR login for Agentic Wallet; no stored user sessions.
- No bypass of user transaction confirmation — every action is a normal wallet-confirmed tx.
- No unauthorized transfers, no approvals (approvals are impossible by design).
- Contract open-source (this repo) with permissions documented above (none).
- No Binance/BNB brand impersonation in name, token, or domain.
- No collection of seed phrases, private keys, API secrets, or pairing codes.
- No promised returns. No token. Not a trading product.
- Agent ID is used as access control / identity — not as a wallet-lookup tool.

## License

MIT.
