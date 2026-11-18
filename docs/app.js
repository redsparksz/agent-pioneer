// Agent Pioneer frontend — static, no server, no tracking.
// Users connect with their own injected wallet (MetaMask / Binance Wallet in-app browser).
// No QR login, no session storage, no credentials. Every tx is confirmed by the user in their wallet.
const CONFIG = {
  chainId: 56, // BSC
  contractAddress: '0x32cf34bbb7e01f75db33d55da850bf26ba056f50', // deployed 18 Nov 2026, tx 0x9eb845b823b291c839c8af62ecc39e846e1c90adbbe3a392ce2c26440dbe7e59
  deployBlock: 134313835, // deploy block (leaderboard scan start)
  agentIdRegistry: '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F',
  bscscan: 'https://bscscan.com/address/',
};

const ABI = [
  'function mint() external',
  'function checkIn() external',
  'function tokenOf(address) view returns (uint256)',
  'function hasBadge(address) view returns (bool)',
  'function streakOf(address) view returns (uint256)',
  'function lastCheckInDay(address) view returns (uint256)',
  'function checkInsOf(address) view returns (uint256)',
  'function totalMinted() view returns (uint256)',
  'function totalCheckIns() view returns (uint256)',
  'function currentDay() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function agentIdRegistry() view returns (address)',
  'event BadgeMinted(address indexed holder, uint256 indexed tokenId)',
  'event CheckedIn(address indexed holder, uint256 indexed tokenId, uint256 streak, uint256 day)',
];

const REGISTRY_ABI = ['function balanceOf(address) view returns (uint256)'];

let provider, signer, contract, account;

const $ = (id) => document.getElementById(id);
function setStatus(html) { $('status').innerHTML = html; }
function short(a) { return a ? a.slice(0, 6) + '…' + a.slice(-4) : '—'; }

async function refresh() {
  try {
    const net = await provider.getNetwork();
    $('net').textContent = net.chainId === 56n ? 'BNB Smart Chain (56)' : 'Wrong network (' + net.chainId + ') — switch to BSC';
    $('contractAddr').textContent = CONFIG.contractAddress;
    $('totalminted').textContent = (await contract.totalMinted()).toString();
    $('totalcheckins').textContent = (await contract.totalCheckIns()).toString();
    if (!account) return;
    const registry = new ethers.Contract(CONFIG.agentIdRegistry, REGISTRY_ABI, provider);
    const hasId = (await registry.balanceOf(account)) > 0n;
    $('agentid').innerHTML = hasId ? '<span class="ok">Yes — holder</span>' : '<span class="bad">No Agent ID</span>';
    const hasBadge = await contract.hasBadge(account);
    const tokenId = await contract.tokenOf(account);
    $('badge').innerHTML = hasBadge ? '<span class="ok">Badge #' + tokenId + '</span>' : 'not minted';
    $('streak').textContent = (await contract.streakOf(account)).toString() + ' day(s)';
    $('mycheckins').textContent = (await contract.checkInsOf(account)).toString();
    const lastDay = await contract.lastCheckInDay(account);
    const today = await contract.currentDay();
    $('mintBtn').disabled = !(hasId && !hasBadge);
    $('mintBtn').textContent = hasBadge ? 'Badge already minted' : hasId ? 'Mint free badge' : 'Need an Agent ID to mint';
    $('checkinBtn').disabled = !(hasBadge && lastDay !== today);
    $('checkinBtn').textContent = !hasBadge ? 'Mint a badge first' : lastDay === today ? 'Checked in today ✓' : 'Check in today';
  } catch (e) {
    setStatus('Read error: ' + (e.shortMessage || e.message));
  }
}

async function loadBoard() {
  try {
    const fromBlock = CONFIG.deployBlock || 0;
    const mints = await contract.queryFilter(contract.filters.BadgeMinted, fromBlock);
    const holders = [...new Set(mints.map((e) => e.args.holder))];
    const rows = [];
    for (const h of holders.slice(0, 100)) {
      const streak = await contract.streakOf(h);
      const total = await contract.checkInsOf(h);
      rows.push({ h, streak: Number(streak), total: Number(total) });
    }
    rows.sort((a, b) => b.streak - a.streak || b.total - a.total);
    if (!rows.length) { $('board').innerHTML = '<p style="color:var(--muted);margin-top:8px;">No badges minted yet — be the first.</p>'; return; }
    $('board').innerHTML = '<table><tr><th>#</th><th>Holder</th><th style="text-align:right">Streak</th><th style="text-align:right">Check-ins</th></tr>' +
      rows.slice(0, 20).map((r, i) =>
        '<tr><td>' + (i + 1) + '</td><td class="mono">' + short(r.h) + '</td><td class="num">' + r.streak + '</td><td class="num">' + r.total + '</td></tr>'
      ).join('') + '</table>';
  } catch (e) {
    $('board').innerHTML = '<p style="color:var(--muted);margin-top:8px;">Leaderboard unavailable: ' + (e.shortMessage || e.message) + '</p>';
  }
}

async function connect() {
  if (!window.ethereum) { setStatus('No wallet detected. Open this page in MetaMask or the Binance Wallet in-app browser.'); return; }
  provider = new ethers.BrowserProvider(window.ethereum);
  const net = await provider.getNetwork();
  if (net.chainId !== 56n) {
    try { await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x38' }] }); }
    catch (e) { setStatus('Please switch your wallet to BNB Smart Chain (56).'); return; }
  }
  await provider.send('eth_requestAccounts', []);
  signer = await provider.getSigner();
  account = await signer.getAddress();
  contract = new ethers.Contract(CONFIG.contractAddress, ABI, provider);
  $('wallet').textContent = short(account);
  $('connectBtn').textContent = 'Connected ✓';
  $('connectBtn').disabled = true;
  setStatus('Connected as ' + account);
  await refresh();
  await loadBoard();
  window.ethereum.on('accountsChanged', () => location.reload());
}

async function doTx(label, fn) {
  try {
    setStatus(label + ' — confirm in your wallet…');
    const tx = await fn();
    setStatus(label + ' sent: <a target="_blank" rel="noopener" href="https://bscscan.com/tx/' + tx.hash + '">' + tx.hash.slice(0, 18) + '…</a> — waiting for confirmation…');
    await tx.wait();
    setStatus(label + ' confirmed ✓ — <a target="_blank" rel="noopener" href="https://bscscan.com/tx/' + tx.hash + '">view on BscScan</a>');
    await refresh();
    await loadBoard();
  } catch (e) {
    setStatus(label + ' failed/cancelled: ' + (e.shortMessage || e.message));
  }
}

$('connectBtn').addEventListener('click', connect);
$('mintBtn').addEventListener('click', () => {
  const c = contract.connect(signer);
  doTx('Mint', () => c.mint());
});
$('checkinBtn').addEventListener('click', () => {
  const c = contract.connect(signer);
  doTx('Check-in', () => c.checkIn());
});

// Public read-only view without connecting.
(async () => {
  if (window.ethereum) {
    provider = new ethers.BrowserProvider(window.ethereum);
  } else {
    provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
  }
  contract = new ethers.Contract(CONFIG.contractAddress, ABI, provider);
  $('contractAddr').textContent = CONFIG.contractAddress;
  try { await refresh(); } catch (e) { /* contract not deployed yet — expected before deploy */ }
  try { await loadBoard(); } catch (e) { /* same */ }
})();
