'use strict';

const fs = require('fs');
const path = require('path');
const net = require('net');

const ROOT = 'C:/Users/justi/mcp-servers';
const FACTORY = path.join(ROOT, 'mcp-factory');
const START_PORT = 11001;
const MAX_SERVERS = 100;
const GENERATED_VERSION = '0.2.0';

const domains = [
  'text', 'json', 'csv', 'markdown', 'html', 'xml', 'regex', 'hashing', 'encoding', 'uuid',
  'time', 'checklist', 'prompt', 'workflow', 'planning', 'quality', 'diff', 'template', 'notes', 'summary',
];
const modes = ['studio', 'forge', 'ops', 'lab', 'hub'];
const qualitySets = [
  ['clarity', 'structure', 'reuse'],
  ['reliability', 'consistency', 'observability'],
  ['speed', 'repeatability', 'safety'],
  ['quality', 'coverage', 'precision'],
  ['planning', 'traceability', 'composability'],
];

function canListen(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.listen(port, '127.0.0.1', () => srv.close(() => resolve(true)));
  });
}

async function nextFreePorts(count) {
  const ports = [];
  let port = START_PORT;
  while (ports.length < count) {
    /* eslint-disable no-await-in-loop */
    if (await canListen(port)) ports.push(port);
    port += 1;
  }
  return ports;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

async function main() {
  const names = [];
  for (const domain of domains) {
    for (const mode of modes) {
      names.push({ domain, mode, name: `${domain}-${mode}` });
    }
  }

  if (names.length !== MAX_SERVERS) {
    throw new Error(`Expected ${MAX_SERVERS} generated names, got ${names.length}`);
  }

  const ports = await nextFreePorts(MAX_SERVERS);
  const generated = [];

  names.forEach((entry, idx) => {
    const dir = path.join(ROOT, entry.name);
    ensureDir(dir);
    const cfg = {
      name: entry.name,
      version: GENERATED_VERSION,
      port: ports[idx],
      domainLabel: `${entry.domain} ${entry.mode}`,
      qualityPoints: qualitySets[idx % qualitySets.length],
    };

    writeFile(path.join(dir, 'server-config.json'), JSON.stringify(cfg, null, 2) + '\n');
    writeFile(path.join(dir, 'mcp-server.js'), `'use strict';\nconst config = require('./server-config.json');\nconst { runGeneratedServer } = require('../mcp-factory/runtime');\nrunGeneratedServer(config);\n`);
    writeFile(path.join(dir, 'package.json'), JSON.stringify({
      name: entry.name,
      version: cfg.version,
      private: true,
      main: 'mcp-server.js',
      scripts: {
        start: 'node mcp-server.js',
        'start:http': 'set MCP_HTTP_ONLY=1&& node mcp-server.js',
      },
    }, null, 2) + '\n');
    writeFile(path.join(dir, 'README.md'), `# ${entry.name}\n\nGenerated MCP server for ${cfg.domainLabel}.\n\n- Version: ${cfg.version}\n- Port: ${cfg.port}\n- HTTP health: http://127.0.0.1:${cfg.port}/health\n- HTTP meta: http://127.0.0.1:${cfg.port}/meta\n- HTTP tools: http://127.0.0.1:${cfg.port}/tools\n- HTTP prompts: http://127.0.0.1:${cfg.port}/prompts\n- HTTP RPC: http://127.0.0.1:${cfg.port}/mcp\n- Tools: expanded specialized runtime surface with domain workflows, review tools, and prompt packs\n`);
    generated.push({ ...cfg, dir });
  });

  writeFile(path.join(FACTORY, 'generated-fleet.json'), JSON.stringify(generated, null, 2) + '\n');
  process.stdout.write(`Generated ${generated.length} MCP servers.\n`);
}

main().catch((err) => {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
});
