'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const fleet = JSON.parse(fs.readFileSync(path.join(__dirname, 'generated-fleet.json'), 'utf8'));
const TOTAL_ITERATIONS = parseInt(process.env.FLEET_TOTAL_ITERATIONS || '1000', 10);
const FULL_VERIFY_INTERVAL = parseInt(process.env.FLEET_FULL_VERIFY_INTERVAL || '100', 10);
const LOG_EVERY = parseInt(process.env.FLEET_LOG_EVERY || '1', 10);
const REQUEST_TIMEOUT_MS = parseInt(process.env.FLEET_REQUEST_TIMEOUT_MS || '8000', 10);
const ITERATION_TIMEOUT_MS = parseInt(process.env.FLEET_ITERATION_TIMEOUT_MS || '30000', 10);
const VERIFY_TIMEOUT_MS = parseInt(process.env.FLEET_VERIFY_TIMEOUT_MS || '120000', 10);
const HEARTBEAT_MS = parseInt(process.env.FLEET_HEARTBEAT_MS || '10000', 10);
const LOG_PATH = path.join(__dirname, 'iteration-log.json');
const STATE_PATH = path.join(__dirname, 'iteration-state.json');

function httpJson(method, url, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      url,
      {
        method,
        headers: payload
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            }
          : {},
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk.toString('utf8');
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`HTTP timeout after ${REQUEST_TIMEOUT_MS}ms: ${url}`));
    });
    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso() {
  return new Date().toISOString();
}

function logLine(message) {
  process.stdout.write(`[${nowIso()}] ${message}\n`);
}

function safeReadJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function saveJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function withTimeout(promiseFactory, timeoutMs, label, onTimeout) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      try {
        if (onTimeout) {
          onTimeout();
        }
      } catch {}
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    Promise.resolve()
      .then(promiseFactory)
      .then((value) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        reject(err);
      });
  });
}

function stopProcess(proc) {
  if (!proc || proc.killed) {
    return;
  }
  try {
    proc.kill();
  } catch {}
}

function startServer(entry) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [path.join(entry.dir, 'mcp-server.js')], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let resolved = false;
    let stderr = '';

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (!resolved) {
        reject(new Error(`Server ${entry.name} exited early with code ${code}: ${stderr}`));
      }
    });

    setTimeout(() => {
      resolved = true;
      resolve(proc);
    }, 75);
  });
}

async function waitForHealth(entry, attempts = 20) {
  for (let i = 0; i < attempts; i++) {
    try {
      const health = await httpJson('GET', `http://127.0.0.1:${entry.port}/health`);
      if (health && health.ok) {
        return health;
      }
    } catch {}
    await wait(150);
  }
  throw new Error(`Health timeout for ${entry.name}`);
}

async function callTool(entry, name, args) {
  const response = await httpJson('POST', `http://127.0.0.1:${entry.port}/mcp`, {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name, arguments: args || {} },
  });
  if (!response.result || response.result.isError) {
    throw new Error(`Tool call failed: ${entry.name}:${name}`);
  }
  return response.result.structuredContent.data;
}

async function getPrompt(entry, name, args) {
  const response = await httpJson('POST', `http://127.0.0.1:${entry.port}/mcp`, {
    jsonrpc: '2.0',
    id: 2,
    method: 'prompts/get',
    params: { name, arguments: args || {} },
  });
  if (!response.result || !Array.isArray(response.result.messages) || response.result.messages.length === 0) {
    throw new Error(`Prompt fetch failed: ${entry.name}:${name}`);
  }
  return response.result;
}

function buildArtifactText(entry, iteration) {
  return [
    `server ${entry.name}`,
    `iteration ${iteration}`,
    'goal improve specialized prompts and workflows',
    `${entry.domainLabel}`,
    ...entry.qualityPoints,
  ].join(' ');
}

async function runSingleIteration(entry, iteration, progress) {
  let proc = null;
  const stage = { current: 'starting' };

  const heartbeat = setInterval(() => {
    progress.currentStage = stage.current;
    progress.lastHeartbeatAt = nowIso();
    saveJson(STATE_PATH, progress);
    logLine(`heartbeat iteration=${iteration}/${TOTAL_ITERATIONS} server=${entry.name} stage=${stage.current}`);
  }, HEARTBEAT_MS);

  try {
    return await withTimeout(
      async () => {
        stage.current = 'spawn_server';
        proc = await startServer(entry);

        stage.current = 'wait_health';
        await waitForHealth(entry);

        const goal = `upgrade ${entry.domainLabel} workflows for iteration ${iteration}`;
        const artifact = buildArtifactText(entry, iteration);

        stage.current = 'domain_profile';
        const profile = await callTool(entry, 'domain_profile', {});
        stage.current = 'mode_strategy';
        const strategy = await callTool(entry, 'mode_strategy', {});
        stage.current = 'workflow_blueprint';
        const blueprint = await callTool(entry, 'workflow_blueprint', { goal });
        stage.current = 'workflow_run';
        const run = await callTool(entry, 'workflow_run', { goal, inputText: artifact });
        stage.current = 'workflow_review';
        const review = await callTool(entry, 'workflow_review', { text: artifact });
        stage.current = 'improvement_backlog';
        const backlog = await callTool(entry, 'improvement_backlog', { goal, text: artifact });
        stage.current = 'iteration_checkpoint';
        const checkpoint = await callTool(entry, 'iteration_checkpoint', { iteration, goal, text: artifact });
        stage.current = 'specialized_prompt_pack';
        const promptPack = await getPrompt(entry, 'specialized_prompt_pack', { goal });
        stage.current = 'workflow_diagnostics';
        const diagnostics = await getPrompt(entry, 'workflow_diagnostics', { artifact });

        return {
          iteration,
          server: entry.name,
          ok: true,
          profileFocus: profile.focus,
          modeStyle: strategy.style,
          workflowSteps: blueprint.steps.length,
          backlogItems: backlog.backlog.length,
          checkpointFocus: checkpoint.nextFocus,
          promptCount: promptPack.messages.length + diagnostics.messages.length,
          reviewSignals: (review.heuristics || []).length,
          completedSteps: run.completedSteps,
          durationMs: Date.now() - progress.iterationStartedAtMs,
        };
      },
      ITERATION_TIMEOUT_MS,
      `iteration ${iteration}`,
      () => stopProcess(proc)
    );
  } finally {
    clearInterval(heartbeat);
    stopProcess(proc);
  }
}

function runFullVerify(iteration) {
  return withTimeout(
    () =>
      new Promise((resolve, reject) => {
        const proc = spawn('node', [path.join(__dirname, 'verify-server-fleet.js')], {
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        });
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', (chunk) => {
          stdout += chunk.toString('utf8');
        });
        proc.stderr.on('data', (chunk) => {
          stderr += chunk.toString('utf8');
        });
        proc.on('error', reject);
        proc.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(stderr || stdout || `verify exit ${code}`));
            return;
          }
          resolve(JSON.parse(stdout));
        });
      }),
    VERIFY_TIMEOUT_MS,
    `full verify at iteration ${iteration}`
  );
}

function createInitialLog() {
  return {
    startedAt: nowIso(),
    totalIterations: TOTAL_ITERATIONS,
    cycles: [],
    fullVerifications: [],
  };
}

function loadProgress() {
  const log = safeReadJson(LOG_PATH, null) || createInitialLog();
  log.totalIterations = TOTAL_ITERATIONS;
  const completedCycles = Array.isArray(log.cycles) ? log.cycles.length : 0;
  return {
    log,
    nextIteration: completedCycles + 1,
  };
}

function persist(log, progress) {
  saveJson(LOG_PATH, log);
  saveJson(STATE_PATH, progress);
}

async function main() {
  const { log, nextIteration } = loadProgress();
  const progress = {
    startedAt: log.startedAt,
    totalIterations: TOTAL_ITERATIONS,
    nextIteration,
    currentIteration: null,
    currentServer: null,
    currentStage: 'idle',
    completedCycles: Array.isArray(log.cycles) ? log.cycles.length : 0,
    fullVerifications: Array.isArray(log.fullVerifications) ? log.fullVerifications.length : 0,
    lastHeartbeatAt: nowIso(),
  };

  if (nextIteration > TOTAL_ITERATIONS) {
    progress.currentStage = 'done';
    persist(log, progress);
    logLine(`fleet iterations already complete at ${log.cycles.length} of ${TOTAL_ITERATIONS}`);
    process.stdout.write(
      JSON.stringify(
        {
          totalIterations: log.totalIterations,
          completedCycles: log.cycles.length,
          fullVerifications: log.fullVerifications.length,
          lastCycle: log.cycles[log.cycles.length - 1],
        },
        null,
        2
      )
    );
    return;
  }

  persist(log, progress);
  logLine(`starting fleet iterations from ${nextIteration} of ${TOTAL_ITERATIONS}`);

  for (let iteration = nextIteration; iteration <= TOTAL_ITERATIONS; iteration++) {
    const entry = fleet[(iteration - 1) % fleet.length];
    progress.nextIteration = iteration;
    progress.currentIteration = iteration;
    progress.currentServer = entry.name;
    progress.currentStage = 'begin_iteration';
    progress.iterationStartedAtMs = Date.now();
    persist(log, progress);
    logLine(`begin iteration=${iteration}/${TOTAL_ITERATIONS} server=${entry.name}`);

    const result = await runSingleIteration(entry, iteration, progress);
    log.cycles.push(result);
    progress.completedCycles = log.cycles.length;
    progress.currentStage = 'iteration_complete';
    progress.lastIteration = result;
    if (iteration % LOG_EVERY === 0 || iteration === TOTAL_ITERATIONS) {
      persist(log, progress);
    }
    logLine(`complete iteration=${iteration}/${TOTAL_ITERATIONS} server=${entry.name} durationMs=${result.durationMs}`);

    if (iteration % FULL_VERIFY_INTERVAL === 0) {
      progress.currentStage = 'full_verify';
      persist(log, progress);
      logLine(`full verify start iteration=${iteration}`);
      const verify = await runFullVerify(iteration);
      log.fullVerifications.push({ iteration, verify, verifiedAt: nowIso() });
      progress.fullVerifications = log.fullVerifications.length;
      persist(log, progress);
      logLine(`full verify complete iteration=${iteration} passed=${verify.passed} failed=${verify.failed}`);
    }
  }

  log.completedAt = nowIso();
  progress.currentIteration = null;
  progress.currentServer = null;
  progress.currentStage = 'done';
  progress.completedCycles = log.cycles.length;
  progress.fullVerifications = log.fullVerifications.length;
  persist(log, progress);

  process.stdout.write(
    JSON.stringify(
      {
        totalIterations: log.totalIterations,
        completedCycles: log.cycles.length,
        fullVerifications: log.fullVerifications.length,
        lastCycle: log.cycles[log.cycles.length - 1],
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  const progress = safeReadJson(STATE_PATH, {});
  progress.currentStage = 'failed';
  progress.failedAt = nowIso();
  progress.error = err.stack || err.message;
  saveJson(STATE_PATH, progress);
  process.stderr.write(`${err.stack || err.message}\n`);
  process.exit(1);
});
