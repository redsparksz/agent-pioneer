# Submission materials — Agent Pioneer (Binance Agent ID Hackathon)

> STATUS: DRAFT — do NOT submit until the contract is deployed and the user approves.
> Submit window: 18 Nov – 9 Dec 2026 08:00 UTC.

## Project

- **Name:** Agent Pioneer
- **Tagline:** Soulbound attendance badge for Binance Agent ID holders.
- **Repo:** https://github.com/redsparksz/agent-pioneer
- **Website:** https://redsparksz.github.io/agent-pioneer/ (GitHub Pages, `frontend/`)
- **Contract (BSC 56):** `TBD — predicted 0x32cf34bbb7e01f75db33d55da850bf26ba056f50` (confirm after deploy; tx hash TBD)
- **Team:** solo — Scorpio (agent) + bos (arjuna.ai / bitkep.ai, Agent ID holders)
- **Reward receiving address (if we win):** arjuna `0x23c1D6815BAFfB1C78eFB65d9E460e075a7E6Bf3` (to be confirmed by user before submit)

## How Agent ID is used (description for the form)

Agent ID is the access control of the whole product — not a label, the gate:

1. **Mint gate:** `AgentPioneer.mint()` calls `balanceOf(msg.sender)` on the SPACE ID Agent ID registry (`0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`). No Agent ID → revert `NotAgentIdHolder()`. One badge per wallet.
2. **Identity:** the badge is soulbound (ERC-721, transfers/approvals fully disabled) and bound to the wallet that holds the Agent ID. The badge IS the on-chain proof that this Agent ID showed up.
3. **Attendance / reputation:** `checkIn()` once per UTC day grows a public streak stored on-chain. The leaderboard reads streaks straight from the contract — a verifiable reputation for an agent identity, not a claim.
4. **Real-world value:** agent operators prove consistent on-chain presence; anyone can verify a badge + streak without trusting a profile page.

## Innovation Award scoring (self-assessment)

- **Agent ID depth (30%):** core gating + identity binding + streak reputation. Strong.
- **Feasibility (25%):** live, minimal, tested (36 unit tests), gas ~$0.005/user action. Strong.
- **Completion (25%):** contract + tests + frontend + docs + verification. Strong after deploy.
- **Innovation (20%):** attendance-as-reputation for agent identities. Medium-strong.

## Pioneer Award metrics (how we get 30+ Agent ID addresses)

- Free mint (gas only) = lowest-friction interaction in the ecosystem.
- Acquisition: X post (#BinanceWalletHackathon + #AgenticWallet) + Binance Square post + hackathon public review listing.
- Every mint = 1 unique Agent ID address; every check-in = +1 tx. Both metrics count.

## Deploy cost (actuals, 18 Nov 2026)

- Deploy via CreateX: 1,222,040 gas ≈ **0.0000611 BNB @ 0.05 gwei** (~$0.036).
- Deployer balance at deploy time: TBD (arjuna 0.0008574 BNB at last check).
- User mint: ~141k gas (~$0.004); check-in: ~115k gas (~$0.003).

## Announcement draft (X — user posts)

> I built Agent Pioneer for the Binance Agent ID Hackathon: a free soulbound badge for Agent ID holders. Mint it (gas only), check in daily, grow your streak — your .ai name, proven on-chain.
>
> [link] #BinanceWalletHackathon #AgenticWallet
