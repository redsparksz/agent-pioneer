# Deploy recipe — Agent Pioneer (BSC 56)

> STATUS: NOT YET DEPLOYED. This document is the exact, rehearsed recipe.
> Deployment itself needs a fresh `baw` preview + explicit user approval (standing rule).
> Nothing here broadcasts a transaction.

## 0. Preconditions

- `baw` 1.12.0 installed (`npm install -g @binance/agentic-wallet@1.12.0`).
- Deployer wallet: arjuna `0x23c1D6815BAFfB1C78eFB65d9E460e075a7E6Bf3` (Agent ID `arjuna.ai`), session CONNECTED, devMode enabled.
- Balance at last check (18 Nov 2026): **0.0008574 BNB**. Deploy needs ~0.0000611 BNB @ 0.05 gwei (max tested 0.00037 BNB @ 0.3 gwei) — fits with wide margin.
- Contract compiled: `node compile.js` → `build/AgentPioneer.json` (creation bytecode 5,421 bytes).

## 1. Build the init code (programmatic — never hand-pad hex)

```bash
cd ~/workspace/agent-id-hackathon/agent-pioneer
python3 - << 'EOF'
import json
from Crypto.Hash import keccak
def k(b):
    h = keccak.new(digest_bits=256); h.update(b); return h.digest()
build = json.load(open('build/AgentPioneer.json'))
REGISTRY = '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F'
init_code = bytes.fromhex(build['bytecode'][2:]) + bytes.fromhex(REGISTRY[2:].rjust(64, '0'))
open('init_code.hex', 'w').write('0x' + init_code.hex())
print('init code bytes:', len(init_code), 'keccak:', '0x' + k(init_code).hex())
EOF
```

## 2. Build the CreateX calldata (programmatic)

```bash
python3 - << 'EOF'
from Crypto.Hash import keccak
def k(b):
    h = keccak.new(digest_bits=256); h.update(b); return h.digest()
ARJUNA = '0x23c1D6815BAFfB1C78eFB65d9E460e075a7E6Bf3'
init_code = bytes.fromhex(open('init_code.hex').read()[2:])
entropy = k(b'agent-pioneer-v1')[:11]
salt = bytes.fromhex(ARJUNA[2:]) + b'\x01' + entropy
guarded = k(bytes.fromhex(ARJUNA[2:].rjust(64, '0')) + (56).to_bytes(32, 'big') + salt)
sel = k(b'deployCreate2(bytes32,bytes)')[:4]
body = salt + (0x40).to_bytes(32, 'big') + len(init_code).to_bytes(32, 'big') + init_code
body += b'\x00' * ((32 - len(init_code) % 32) % 32)
open('deploy_calldata.hex', 'w').write('0x' + (sel + body).hex())
predicted = '0x' + k(b'\xff' + bytes.fromhex('ba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed') + guarded + k(init_code))[12:].hex()
print('salt:        0x' + salt.hex())
print('guardedSalt: 0x' + guarded.hex())
print('predicted:   ' + predicted)
EOF
```

Expected predicted address (verified on-chain via `CreateX.computeCreate2Address` on 18 Nov 2026):
**`0x32cf34bbb7e01f75db33d55da850bf26ba056f50`**

## 3. Dry-run the deploy (read-only)

```bash
# eth_estimateGas via public RPC — no tx is sent
python3 estimate_deploy.py
```

Expected (18 Nov 2026): direct creation 1,205,265 gas; via CreateX 1,222,040 gas.

## 4. Preview with baw (read-only, needs devMode)

```bash
export HOME=/home/hatch/dua-wallet-homes/arjuna
baw wallet settings --json   # confirm devMode.enabled == true
baw contract-call preview --binanceChainId 56 \
  --from 0x23c1D6815BAFfB1C78eFB65d9E460e075a7E6Bf3 \
  --to 0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed \
  --value 0 --inputData $(cat deploy_calldata.hex) --json
```

Check the preview: `parsedTx` must show a call to CreateX, simulation OK, no risk flags.
Show the preview to the user and get explicit approval.

## 5. Execute (only after user approval)

```bash
baw contract-call execute --requestId <requestId-dari-preview> --json
```

Then verify on-chain (read-only):
- Receipt status 1; `ContractCreation` event from CreateX; deployed address == predicted `0x32cf34bbb7e01f75db33d55da850bf26ba056f50`.
- `agentIdRegistry()` on the new contract == `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F`.
- `eth_getCode` at the deployed address is non-empty.

## 6. Verify source

1. **Sourcify** (works from this VM):
   ```bash
   curl -X POST https://sourcify.dev/server/v2/verify -F "chainId=56" -F "address=<deployed>" -F "files=@contracts/AgentPioneer.sol" ...
   ```
   (Exact v2 multipart fields: `chainId`, `address`, `chosenContract`, `files` — confirm against https://sourcify.dev/server/api-docs before submitting.)
   Target: `exact_match`.
2. **BscScan**: needs a free BscScan API key (Etherscan account — create via browser) because `api.bscscan.com` is Cloudflare-blocked from this VM and Etherscan API v2 rejects chain 56 without a plan/key. After the key exists:
   `https://api.etherscan.io/v2/api?chainid=56&module=contract&action=verifysourcecode&...` with `apikey=<key>`.
   Alternative: BscScan web UI verification (browser task).

## 7. After deploy

- Update `frontend/app.js` CONFIG: `contractAddress` (confirmed), `deployBlock` (deploy block number).
- Update `docs/SUBMISSION.md` with the real address + tx hash.
- Push to GitHub; GitHub Pages serves `frontend/`.
- Announce: X post + Binance Square post (user posts; draft in `docs/SUBMISSION.md`).
