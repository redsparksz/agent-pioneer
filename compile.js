const fs = require('fs');
const path = require('path');
const solc = require('solc');

function findImports(p) {
  return { error: 'no imports allowed: ' + p };
}

function compile() {
  const dir = path.join(__dirname, 'contracts');
  const sources = {};
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.sol')) {
      sources[f] = { content: fs.readFileSync(path.join(dir, f), 'utf8') };
    }
  }
  const input = {
    language: 'Solidity',
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'] } },
    },
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
  if (out.errors) {
    const fatal = out.errors.filter((e) => e.severity === 'error');
    for (const e of out.errors) console.log(e.severity + ': ' + e.formattedMessage);
    if (fatal.length) process.exit(1);
  }
  const buildDir = path.join(__dirname, 'build');
  fs.mkdirSync(buildDir, { recursive: true });
  for (const file of Object.keys(out.contracts)) {
    for (const name of Object.keys(out.contracts[file])) {
      const c = out.contracts[file][name];
      fs.writeFileSync(
        path.join(buildDir, name + '.json'),
        JSON.stringify({ abi: c.abi, bytecode: '0x' + c.evm.bytecode.object, deployedBytecode: '0x' + c.evm.deployedBytecode.object }, null, 2)
      );
      console.log(name, 'bytecode bytes:', c.evm.bytecode.object.length / 2);
    }
  }
}

compile();
