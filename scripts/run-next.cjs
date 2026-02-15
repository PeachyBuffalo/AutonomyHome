#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function exists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function detectNodeArch(nodePath) {
  try {
    const result = spawnSync(nodePath, ['-p', 'process.arch'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    if (result.status === 0) {
      return (result.stdout || '').trim() || null;
    }
  } catch {
    // Ignore and return null.
  }
  return null;
}

function gatherNodeCandidates() {
  const candidates = [process.execPath];

  try {
    const whichOutput = execSync('which -a node', { encoding: 'utf8' });
    for (const line of whichOutput.split(/\r?\n/)) {
      if (line.trim()) candidates.push(line.trim());
    }
  } catch {
    // Ignore.
  }

  const herdRoot = path.join(
    os.homedir(),
    'Library',
    'Application Support',
    'Herd',
    'config',
    'nvm',
    'versions',
    'node'
  );

  try {
    const versions = fs.readdirSync(herdRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .reverse();

    for (const version of versions) {
      candidates.push(path.join(herdRoot, version, 'bin', 'node'));
    }
  } catch {
    // Ignore missing Herd paths.
  }

  const nvmRoot = path.join(os.homedir(), '.nvm', 'versions', 'node');
  try {
    const versions = fs.readdirSync(nvmRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .reverse();

    for (const version of versions) {
      candidates.push(path.join(nvmRoot, version, 'bin', 'node'));
    }
  } catch {
    // Ignore missing nvm paths.
  }

  candidates.push('/opt/homebrew/bin/node');

  return unique(candidates).filter(exists);
}

function resolveRequiredArch() {
  if (process.platform !== 'darwin') {
    return null;
  }

  const nextDir = path.join(process.cwd(), 'node_modules', '@next');
  const hasArm = fs.existsSync(path.join(nextDir, 'swc-darwin-arm64'));
  const hasX64 = fs.existsSync(path.join(nextDir, 'swc-darwin-x64'));

  if (hasArm && !hasX64) return 'arm64';
  if (hasX64 && !hasArm) return 'x64';
  return null;
}

function selectNodeBinary() {
  const requiredArch = resolveRequiredArch();
  if (!requiredArch || process.arch === requiredArch) {
    return process.execPath;
  }

  for (const candidate of gatherNodeCandidates()) {
    const candidateArch = detectNodeArch(candidate);
    if (candidateArch === requiredArch) {
      return candidate;
    }
  }

  return null;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/run-next.cjs <next-subcommand> [...args]');
  process.exit(1);
}

const selectedNode = selectNodeBinary();
if (!selectedNode) {
  console.error(
    'Could not find a Node binary matching required architecture for installed Next SWC package.'
  );
  console.error(
    'Install matching SWC optional dependency or run with a compatible Node architecture.'
  );
  process.exit(1);
}

const nextBin = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'bin', 'next');
if (!fs.existsSync(nextBin)) {
  console.error(`Next CLI binary not found: ${nextBin}`);
  process.exit(1);
}

const result = spawnSync(selectedNode, [nextBin, ...args], {
  stdio: 'inherit',
  env: process.env,
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}
process.exit(1);
