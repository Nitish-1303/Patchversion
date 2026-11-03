#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * TryPatchBay — Developer Command Line Interface (CLI)
 * Automated breaking dependency migration engine with empirical proof.
 */

const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const engineDist = path.join(rootDir, 'packages', 'engine', 'dist');

function printBanner() {
  console.log('\x1b[34m%s\x1b[0m', '╔═══════════════════════════════════════════════════════════════════╗');
  console.log('\x1b[34m%s\x1b[0m', '║               trypatchbay · Migration Engine CLI                  ║');
  console.log('\x1b[34m%s\x1b[0m', '║       Automated breaking dependency migration with AST proof      ║');
  console.log('\x1b[34m%s\x1b[0m', '╚═══════════════════════════════════════════════════════════════════╝');
}

function printHelp() {
  printBanner();
  console.log('\x1b[1mUsage:\x1b[0m');
  console.log('  trypatchbay <command> [options]\n');
  console.log('\x1b[1mCommands:\x1b[0m');
  console.log('  \x1b[36mrules\x1b[0m             List all active enterprise AST migration rules');
  console.log('  \x1b[36mprove [fixture]\x1b[0m   Run the empirical Red-to-Green proof verification loop');
  console.log('  \x1b[36mscan <dir>\x1b[0m        Scan a repository or package manifest for breaking changes');
  console.log('  \x1b[36mversion\x1b[0m           Display engine version, sandbox status, and environment\n');
  console.log('\x1b[1mExamples:\x1b[0m');
  console.log('  npx trypatchbay rules');
  console.log('  npx trypatchbay prove');
  console.log('  npx trypatchbay scan .\n');
}

async function handleRules() {
  printBanner();
  console.log('\x1b[1mActive Enterprise Migration Rules:\x1b[0m\n');

  try {
    const { defaultMigrationRegistry } = require(path.join(engineDist, 'migration'));
    const rules = defaultMigrationRegistry.getAllRules();

    rules.forEach((rule, idx) => {
      console.log(`\x1b[32m[${idx + 1}]\x1b[0m \x1b[1m${rule.id}\x1b[0m`);
      console.log(`    \x1b[90mPackage:\x1b[0m     \x1b[33m${rule.packageName}\x1b[0m (${rule.fromVersionRange} → ${rule.toVersionRange})`);
      console.log(`    \x1b[90mDescription:\x1b[0m ${rule.description}`);
      console.log(`    \x1b[90mStatus:\x1b[0m      \x1b[32mActive (AST Verified)\x1b[0m\n`);
    });

    console.log(`Total rules loaded: \x1b[1m${rules.length}\x1b[0m`);
  } catch (err) {
    console.error('\x1b[31mFailed to load rules from engine:\x1b[0m', err.message);
    process.exit(1);
  }
}

async function handleScan(targetDir) {
  printBanner();
  const target = path.resolve(process.cwd(), targetDir || '.');
  console.log(`Scanning target directory: \x1b[36m${target}\x1b[0m\n`);

  const pkgJsonPath = path.join(target, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) {
    console.log('\x1b[31mError:\x1b[0m No package.json found in target directory.');
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  console.log(`Found \x1b[1m${Object.keys(deps).length}\x1b[0m declared dependencies.`);
  console.log('\x1b[90mChecking against registered migration rules...\x1b[0m\n');

  const { defaultMigrationRegistry } = require(path.join(engineDist, 'migration'));
  const rules = defaultMigrationRegistry.getAllRules();

  let matched = 0;
  for (const rule of rules) {
    if (deps[rule.packageName]) {
      matched++;
      console.log(`\x1b[33m⚡ Potential Migration Target:\x1b[0m \x1b[1m${rule.packageName}\x1b[0m (Current: ${deps[rule.packageName]})`);
      console.log(`   Rule: ${rule.id}`);
      console.log(`   Migration available to: ${rule.toVersionRange}`);
      console.log(`   Transform: ${rule.description}\n`);
    }
  }

  if (matched === 0) {
    console.log('\x1b[32m✓ Clean:\x1b[0m No breaking dependency migrations currently required for declared packages.');
  } else {
    console.log(`\x1b[1mSummary:\x1b[0m \x1b[33m${matched}\x1b[0m package(s) eligible for automated TryPatchBay proof loop.`);
  }
}

async function handleProve(fixture) {
  printBanner();
  console.log('\x1b[1mStarting Empirical Proof Loop...\x1b[0m\n');

  const provePath = path.join(engineDist, 'prove.js');
  if (!fs.existsSync(provePath)) {
    console.error('\x1b[31mEngine build artifact missing. Run npm run build first.\x1b[0m');
    process.exit(1);
  }

  const { spawn } = require('child_process');
  const args = fixture === 'real'
    ? [
        path.join('fixtures', 'lodash-repo'),
        path.join('fixtures', 'real-migration', 'lodash-change-record.json'),
        path.join('runs', 'lodash-4-migration'),
        'acme/membership'
      ]
    : [];

  const child = spawn(process.execPath, [provePath, ...args], {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => {
    if (code === 0) {
      console.log('\n\x1b[32m✓ Proof verified successfully (Exit 0)\x1b[0m');
    } else {
      console.log(`\n\x1b[31m✗ Proof failed with exit code ${code}\x1b[0m`);
    }
    process.exit(code);
  });
}

function handleVersion() {
  const pkg = require(path.join(rootDir, 'package.json'));
  console.log(`TryPatchBay CLI v${pkg.version}`);
  console.log(`Engine: @patchversion/engine@${pkg.version}`);
  console.log('Execution: Deterministic AST with Fail-Closed Test Sandbox');
}

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  switch (command) {
    case 'rules':
      await handleRules();
      break;
    case 'scan':
      await handleScan(arg);
      break;
    case 'prove':
      await handleProve(arg);
      break;
    case '-v':
    case '--version':
    case 'version':
      handleVersion();
      break;
    case '-h':
    case '--help':
    case 'help':
    default:
      if (!command) {
        printHelp();
      } else {
        console.error(`Unknown command: ${command}\n`);
        printHelp();
        process.exit(1);
      }
      break;
  }
}

main().catch((err) => {
  console.error('\x1b[31mCLI Error:\x1b[0m', err);
  process.exit(1);
});
