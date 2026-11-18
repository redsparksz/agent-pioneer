const fs = require('fs');
const path = require('path');
const Ganache = require('ganache');
const { ethers } = require('ethers');

const REGISTRY = '0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F';

function load(name) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build', name + '.json'), 'utf8'));
}

let pass = 0;
let fail = 0;
function check(name, ok, extra) {
  if (ok) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name, extra || ''); }
}

async function expectRevert(fn) {
  try {
    await fn();
    return false;
  } catch (e) {
    return true;
  }
}

(async () => {
  const ganacheProvider = Ganache.provider({ logging: { quiet: true }, chain: { chainId: 56 } });
  const provider = new ethers.BrowserProvider(ganacheProvider);
  const dSigner = await provider.getSigner(0);
  const aSigner = await provider.getSigner(1);
  const bSigner = await provider.getSigner(2);
  const alice = await aSigner.getAddress();
  const bob = await bSigner.getAddress();

  const mock = load('MockRegistry');
  const MockF = new ethers.ContractFactory(mock.abi, mock.bytecode, dSigner);
  const registry = await MockF.deploy();
  await registry.waitForDeployment();
  const regAddr = await registry.getAddress();

  const ap = load('AgentPioneer');
  const ApF = new ethers.ContractFactory(ap.abi, ap.bytecode, dSigner);
  const pioneer = await ApF.deploy(regAddr);
  await pioneer.waitForDeployment();
  const pioneerAddr = await pioneer.getAddress();
  console.log('deployed at', pioneerAddr);

  // metadata
  check('name', (await pioneer.name()) === 'Agent Pioneer Badge');
  check('symbol', (await pioneer.symbol()) === 'AGP');
  check('registry stored', (await pioneer.agentIdRegistry()).toLowerCase() === regAddr.toLowerCase());
  check('supportsInterface ERC721', await pioneer.supportsInterface('0x80ac58cd'));
  check('supportsInterface ERC721Metadata', await pioneer.supportsInterface('0x5b5e139f'));
  check('supportsInterface ERC165', await pioneer.supportsInterface('0x01ffc9a7'));
  check('supportsInterface random false', !(await pioneer.supportsInterface('0xffffffff')));

  // mint without Agent ID reverts
  check('mint without Agent ID reverts', await expectRevert(() => pioneer.connect(aSigner).mint.staticCall()));
  check('checkIn without badge reverts', await expectRevert(() => pioneer.connect(aSigner).checkIn.staticCall()));

  // grant Agent ID to alice + bob
  await (await registry.set(alice, 1)).wait();
  await (await registry.set(bob, 1)).wait();

  // alice mints
  const tx1 = await pioneer.connect(aSigner).mint();
  const rc1 = await tx1.wait();
  check('mint tx ok', rc1.status === 1);
  console.log('  mint gas used:', rc1.gasUsed.toString());
  check('alice tokenOf == 1', (await pioneer.tokenOf(alice)).toString() === '1');
  check('alice balanceOf == 1', (await pioneer.balanceOf(alice)).toString() === '1');
  check('ownerOf(1) == alice', (await pioneer.ownerOf(1)).toLowerCase() === alice.toLowerCase());
  check('hasBadge alice', await pioneer.hasBadge(alice));
  check('totalMinted == 1', (await pioneer.totalMinted()).toString() === '1');

  // double mint reverts
  check('second mint reverts', await expectRevert(() => pioneer.connect(aSigner).mint.staticCall()));

  // bob mints -> token 2
  await (await pioneer.connect(bSigner).mint()).wait();
  check('bob tokenOf == 2', (await pioneer.tokenOf(bob)).toString() === '2');

  // soulbound: transfers + approvals revert
  check('transferFrom reverts', await expectRevert(() => pioneer.connect(aSigner).transferFrom.staticCall(alice, bob, 1)));
  check('safeTransferFrom reverts', await expectRevert(() => pioneer.connect(aSigner)['safeTransferFrom(address,address,uint256)'].staticCall(alice, bob, 1)));
  check('approve reverts', await expectRevert(() => pioneer.connect(aSigner).approve.staticCall(bob, 1)));
  check('setApprovalForAll reverts', await expectRevert(() => pioneer.connect(aSigner).setApprovalForAll.staticCall(bob, true)));
  check('getApproved == 0', (await pioneer.getApproved(1)) === ethers.ZeroAddress);
  check('isApprovedForAll == false', !(await pioneer.isApprovedForAll(alice, bob)));

  // check-in day 1
  const c1 = await pioneer.connect(aSigner).checkIn();
  const crc1 = await c1.wait();
  console.log('  checkIn gas used:', crc1.gasUsed.toString());
  check('streak after day1 == 1', (await pioneer.streakOf(alice)).toString() === '1');
  check('checkInsOf == 1', (await pioneer.checkInsOf(alice)).toString() === '1');
  check('totalCheckIns == 1', (await pioneer.totalCheckIns()).toString() === '1');
  check('same-day checkIn reverts', await expectRevert(() => pioneer.connect(aSigner).checkIn.staticCall()));

  // advance 1 day -> streak 2
  await provider.send('evm_increaseTime', [86400]);
  await provider.send('evm_mine', []);
  await (await pioneer.connect(aSigner).checkIn()).wait();
  check('streak consecutive day == 2', (await pioneer.streakOf(alice)).toString() === '2');

  // advance 2 days (skip one) -> streak resets to 1
  await provider.send('evm_increaseTime', [2 * 86400]);
  await provider.send('evm_mine', []);
  await (await pioneer.connect(aSigner).checkIn()).wait();
  check('streak resets after gap == 1', (await pioneer.streakOf(alice)).toString() === '1');
  check('checkInsOf == 3', (await pioneer.checkInsOf(alice)).toString() === '3');

  // tokenURI: valid data URI JSON with streak
  const uri = await pioneer.tokenURI(1);
  check('tokenURI prefix', uri.startsWith('data:application/json;base64,'));
  const json = JSON.parse(Buffer.from(uri.slice('data:application/json;base64,'.length), 'base64').toString('utf8'));
  check('tokenURI name', json.name === 'Agent Pioneer Badge #1');
  check('tokenURI streak attr', json.attributes.find((a) => a.trait_type === 'Streak (days)').value === 1);
  check('tokenURI image svg', json.image.startsWith('data:image/svg+xml;base64,'));
  const svg = Buffer.from(json.image.slice('data:image/svg+xml;base64,'.length), 'base64').toString('utf8');
  check('svg contains #1 + STREAK 1', svg.includes('#1') && svg.includes('STREAK 1 DAYS'));
  check('tokenURI nonexistent reverts', await expectRevert(() => pioneer.tokenURI.staticCall(99)));

  console.log(`\nRESULT: ${pass} pass, ${fail} fail`);
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error('HARNESS ERROR', e);
  process.exit(2);
});
