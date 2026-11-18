# Submission materials — Agent Pioneer (Binance Agent ID Hackathon)

> STATUS: DEPLOYED 18 Nov 2026 — do NOT submit to the hackathon until the official project portal URL appears and the user approves the submit.
> Submit window: 18 Nov – 9 Dec 2026 08:00 UTC.

## Project

- **Name:** Agent Pioneer
- **Tagline:** Soulbound attendance badge for Binance Agent ID holders.
- **Repo:** https://github.com/redsparksz/agent-pioneer
- **Website:** https://redsparksz.github.io/agent-pioneer/ (GitHub Pages, `docs/`)
- **Contract (BSC 56):** `0x32cf34bbb7e01f75db33d55da850bf26ba056f50` — deployed 18 Nov 2026, block 134313835, tx `0x9eb845b823b291c839c8af62ecc39e846e1c90adbbe3a392ce2c26440dbe7e59` (via CreateX, deployer arjuna)
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

- Deploy via CreateX: gasUsed 1,200,646 @ 0.4313 gwei = **0.0005178 BNB** (~$0.31). NOTE: estimate was 0.0000611 BNB @ 0.05 gwei (RPC gas price) — baw submitted at 0.4313 gwei, ~8.5x the estimate. Still fit the balance, but the margin is gone.
- Deployer balance: arjuna 0.0008574 BNB before → **0.0003396 BNB after** (~$0.20). Bitkep untouched at 0.0008766 BNB.
- User mint: ~141k gas (~$0.004); check-in: ~115k gas (~$0.003).

## Announcement draft (X — user posts)

> I built Agent Pioneer for the Binance Agent ID Hackathon: a free soulbound badge for Agent ID holders. Mint it (gas only), check in daily, grow your streak — your .ai name, proven on-chain.
>
> [link] #BinanceWalletHackathon #AgenticWallet
