'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const fleet = JSON.parse(fs.readFileSync(path.join(__dirname, 'generated-fleet.json'), 'utf8'));

function httpJson(method, url, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(url, { method, headers: payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {} }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk.toString('utf8'); });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch (err) { reject(err); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function startServer(entry) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [path.join(entry.dir, 'mcp-server.js')], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let buffer = '';
    proc.stdout.on('data', (chunk) => { buffer += chunk.toString('utf8'); });
    proc.stderr.on('data', () => {});
    setTimeout(() => resolve({ proc, bufferRef: () => buffer }), 50);
    proc.on('error', reject);
  });
}

async function waitForHealth(entry, attempts = 20) {
  for (let i = 0; i < attempts; i++) {
    try {
      const health = await httpJson('GET', `http://127.0.0.1:${entry.port}/health`);
      if (health && health.ok) return health;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`HTTP health timeout for ${entry.name} on port ${entry.port}`);
}

function rpc(proc, id, method, params) {
  return new Promise((resolve, reject) => {
    let buffer = '';
    const onData = (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        const msg = JSON.parse(line);
        if (msg.id === id) {
          proc.stdout.off('data', onData);
          resolve(msg);
          return;
        }
      }
    };
    proc.stdout.on('data', onData);
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n', (err) => {
      if (err) {
        proc.stdout.off('data', onData);
        reject(err);
      }
    });
    setTimeout(() => {
      proc.stdout.off('data', onData);
      reject(new Error(`RPC timeout: ${method}`));
    }, 5000);
  });
}

async function verifyEntry(entry) {
  const started = await startServer(entry);
  const proc = started.proc;
  try {
    const health = await waitForHealth(entry);
    const meta = await httpJson('GET', `http://127.0.0.1:${entry.port}/meta`);
    const httpToolCatalog = await httpJson('GET', `http://127.0.0.1:${entry.port}/tools`);
    const httpPromptCatalog = await httpJson('GET', `http://127.0.0.1:${entry.port}/prompts`);
    const httpInit = await httpJson('POST', `http://127.0.0.1:${entry.port}/mcp`, { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    const httpTools = await httpJson('POST', `http://127.0.0.1:${entry.port}/mcp`, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
    const httpCall = await httpJson('POST', `http://127.0.0.1:${entry.port}/mcp`, { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'server_summary', arguments: {} } });
    const httpProfile = await httpJson('POST', `http://127.0.0.1:${entry.port}/mcp`, { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'domain_profile', arguments: {} } });

    const stdioInit = await rpc(proc, 11, 'initialize', {});
    const stdioTools = await rpc(proc, 12, 'tools/list', {});
    const stdioCall = await rpc(proc, 13, 'tools/call', { name: 'domain_brief', arguments: {} });

    const promptList = await rpc(proc, 14, 'prompts/list', {});
    const promptGet = await rpc(proc, 15, 'prompts/get', { name: 'domain_workflow', arguments: { goal: 'verify server readiness' } });
    const capabilityCall = await rpc(proc, 16, 'tools/call', { name: 'list_capability_clusters', arguments: {} });
    const specializedPrompt = await rpc(proc, 17, 'prompts/get', { name: 'specialized_prompt_pack', arguments: { goal: 'verify specialization' } });
    const workflowBlueprint = await rpc(proc, 18, 'tools/call', { name: 'workflow_blueprint', arguments: { goal: 'verify blueprint' } });

    return {
      name: entry.name,
      ok: Boolean(
        health.ok &&
        meta && meta.version === entry.version &&
        httpToolCatalog && Array.isArray(httpToolCatalog.tools) && httpToolCatalog.tools.length >= 25 &&
        httpPromptCatalog && Array.isArray(httpPromptCatalog.prompts) && httpPromptCatalog.prompts.length >= 5 &&
        httpInit.result &&
        httpTools.result && Array.isArray(httpTools.result.tools) && httpTools.result.tools.length >= 25 &&
        httpCall.result &&
        httpProfile.result &&
        stdioInit.result &&
        stdioTools.result && Array.isArray(stdioTools.result.tools) && stdioTools.result.tools.length >= 25 &&
        stdioCall.result &&
        promptList.result && Array.isArray(promptList.result.prompts) && promptList.result.prompts.length >= 5 &&
        promptGet.result && Array.isArray(promptGet.result.messages) && promptGet.result.messages.length > 0 &&
        capabilityCall.result &&
        specializedPrompt.result && Array.isArray(specializedPrompt.result.messages) && specializedPrompt.result.messages.length > 0 &&
        workflowBlueprint.result
      ),
    };
  } finally {
    try { proc.kill(); } catch {}
  }
}

async function main() {
  const results = [];
  for (const entry of fleet) {
    /* eslint-disable no-await-in-loop */
    results.push(await verifyEntry(entry));
  }
  const failed = results.filter((r) => !r.ok);
  process.stdout.write(JSON.stringify({ total: results.length, passed: results.length - failed.length, failed: failed.length, failures: failed }, null, 2));
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  process.stderr.write(`${err.stack || err.message}\n`);
  process.exit(1);
});
