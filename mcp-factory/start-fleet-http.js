'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const fleet = JSON.parse(fs.readFileSync(path.join(__dirname, 'generated-fleet.json'), 'utf8'));
const args = process.argv.slice(2);
const startAll = args.includes('--all');
const requested = new Set(args.filter((arg) => !arg.startsWith('--')));

const selected = startAll || requested.size === 0
  ? fleet
  : fleet.filter((entry) => requested.has(entry.name));

if (selected.length === 0) {
  process.stderr.write('No generated servers matched the requested names.\n');
  process.exit(1);
}

const children = [];
for (const entry of selected) {
  const proc = spawn('node', [path.join(entry.dir, 'mcp-server.js')], {
    stdio: 'ignore',
    detached: true,
    windowsHide: true,
    env: { ...process.env, MCP_HTTP_ONLY: '1' },
  });
  proc.unref();
  children.push({ name: entry.name, port: entry.port, pid: proc.pid });
}

process.stdout.write(JSON.stringify({ started: children.length, servers: children }, null, 2));
