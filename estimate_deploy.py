"""Estimasi gas deploy AgentPioneer di BSC mainnet — TANPA kirim tx (eth_estimateGas saja)."""
import json, urllib.request
from Crypto.Hash import keccak

RPCS = ['https://bsc-dataseed2.binance.org/', 'https://bsc-dataseed.binance.org/', 'https://bsc-dataseed1.binance.org/']
ARJUNA = '0x23c1D6815BAFfB1C78eFB65d9E460e075a7E6Bf3'
REGISTRY = '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F'
CREATEX = '0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed'
BALANCE_ARJUNA = 0.000857400502719152

def k(b: bytes) -> bytes:
    h = keccak.new(digest_bits=256); h.update(b); return h.digest()

def call(method, params):
    last = None
    for rpc in RPCS:
        for attempt in range(2):
            try:
                req = urllib.request.Request(rpc, data=json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': method, 'params': params}).encode(),
                                             headers={'Content-Type': 'application/json'})
                return json.load(urllib.request.urlopen(req, timeout=30))
            except Exception as e:
                last = e
    raise last

build = json.load(open('/home/hatch/workspace/agent-id-hackathon/agent-pioneer/build/AgentPioneer.json'))
creation = bytes.fromhex(build['bytecode'][2:])
# constructor arg: registry address (32-byte word)
init_code = creation + bytes.fromhex(REGISTRY[2:].rjust(64, '0'))
print('init code bytes:', len(init_code))
print('keccak(initCode):', '0x' + k(init_code).hex())

# --- 1. direct creation ---
r = call('eth_estimateGas', [{'from': ARJUNA, 'data': '0x' + init_code.hex()}])
print('direct creation estimate:', r)
direct_gas = int(r['result'], 16) if 'result' in r else None

# --- 2. CreateX deployCreate2 ---
# salt = arjuna (20B) + 0x01 (cross-chain protection) + 11B entropy deterministik
entropy = k(b'agent-pioneer-v1')[:11]
salt = bytes.fromhex(ARJUNA[2:]) + b'\x01' + entropy
print('salt:', '0x' + salt.hex())
# guardedSalt = keccak256(abi.encode(msg.sender, chainid, salt))
abi_encoded = bytes.fromhex(ARJUNA[2:].rjust(64, '0')) + (56).to_bytes(32, 'big') + salt
guarded = k(abi_encoded)
print('guardedSalt:', '0x' + guarded.hex())
# selector deployCreate2(bytes32,bytes)
sel = k(b'deployCreate2(bytes32,bytes)')[:4]
print('selector:', '0x' + sel.hex())
# calldata: selector + salt + offset(0x40) + len + initCode padded
body = salt + (0x40).to_bytes(32, 'big') + len(init_code).to_bytes(32, 'big') + init_code
body += b'\x00' * ((32 - len(init_code) % 32) % 32)
calldata = sel + body
print('calldata bytes:', len(calldata))
r2 = call('eth_estimateGas', [{'from': ARJUNA, 'to': CREATEX, 'data': '0x' + calldata.hex()}])
print('CreateX estimate:', r2)
createx_gas = int(r2['result'], 16) if 'result' in r2 else None

# --- 3. prediksi alamat via CREATE2 ---
addr_bytes = k(b'\xff' + bytes.fromhex(CREATEX[2:]) + guarded + k(init_code))[12:]
predicted = '0x' + addr_bytes.hex()
print('predicted deployed address:', predicted)
# verifikasi via CreateX.computeCreate2Address(bytes32,bytes32) — eth_call
# selector computeCreate2Address(bytes32,bytes32)
sel2 = k(b'computeCreate2Address(bytes32,bytes32)')[:4]
data2 = '0x' + sel2.hex() + guarded.hex() + k(init_code).hex()
r3 = call('eth_call', [{'to': CREATEX, 'data': data2}, 'latest'])
print('CreateX.computeCreate2Address ->', r3)
if 'result' in r3:
    onchain = '0x' + r3['result'][-40:]
    print('on-chain computed address:', onchain, '| MATCH' if onchain.lower() == predicted.lower() else '| MISMATCH!')

# --- 4. biaya ---
gas_price = int(call('eth_gasPrice', [])['result'], 16)
print('gasPrice RPC (wei):', gas_price, '=', gas_price / 1e9, 'gwei')
for label, gas in [('direct creation', direct_gas), ('via CreateX', createx_gas)]:
    if gas is None:
        print(label, ': ESTIMATE GAGAL'); continue
    for gp_gwei in [0.05, 0.0666, 0.123, 0.30]:
        cost = gas * gp_gwei * 1e9 / 1e18
        print(f'{label}: gas={gas} @ {gp_gwei} gwei -> {cost:.7f} BNB', '(MUAT)' if cost < BALANCE_ARJUNA else '(TIDAK MUAT!)')
print('saldo arjuna:', BALANCE_ARJUNA, 'BNB')
# biaya interaksi user (dari test lokal)
for label, gas in [('mint', 141139), ('checkIn', 114854)]:
    print(f'{label} (test lokal {gas} gas) @ 0.05 gwei -> {gas*0.05e9/1e18:.7f} BNB (~${gas*0.05e9/1e18*589.83:.4f})')
