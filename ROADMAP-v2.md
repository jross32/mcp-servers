# ROADMAP v2 — agent-ops-hub

_Baseline: v1.0.0 · 73 tools · 69/69 tests passing · 2026-05-04_

---

## Phase 1 — Quality Foundation (complete before v2.0.0)

### 1.1 Fix runbook naming (undefined- prefix bug)
- **Problem**: `create_execution_runbook` saves files as `undefined-<timestamp>.json` because `runbook.title` is not set before `filename` is computed
- **Fix**: Set `runbook.title = args.title || 'runbook'` before building the filename in `createExecutionRunbook()`
- **File**: `mcp-server.js` ~line of `createExecutionRunbook`
- **Test**: Add runbook naming assertion to test suite
- **Acceptance**: Files saved as `<sanitized-title>-<timestamp>.json`

### 1.2 Improve eval scoring baseline (currently 9/100 grade F)
- **Problem**: `evaluate_sprint_output` scores specialist outputs at 9/100 because outputs lack structured sections (actions, conflicts, score)
- **Fix**: Update `run_parallel_specialist_sprint` to produce structured output with `actions[]`, `conflicts[]`, `score` fields per specialist
- **File**: `mcp-server.js` `runParallelSpecialistSprint()`
- **Acceptance**: Default sprint outputs score ≥ 50/100 on `evaluate_sprint_output`

### 1.3 Add `list_memory_keys` tool
- **Problem**: No way to enumerate what keys exist in the memory store without knowing them
- **Fix**: Add `list_memory_keys(args)` that returns all top-level keys (or keys under a namespace prefix)
- **File**: `mcp-server.js` — new tool in Memory Store section
- **Acceptance**: Test: set 3 keys, call list_memory_keys, all 3 appear

### 1.4 Add `clear_memory` tool
- **Problem**: Memory store has no way to delete a key or reset a namespace
- **Fix**: Add `clear_memory({ key })` to delete a specific key or prefix
- **File**: `mcp-server.js`
- **Acceptance**: Test: set key, clear it, get_memory returns `found: false`

---

## Phase 2 — Orchestration Depth (v2.1)

### 2.1 Wave-aware parallel scheduling in `execute_dependency_graph`
- **Problem**: Dependency graph runs correctly but doesn't report wave timing or per-node latency breakdown
- **Fix**: Return `waves[].durationMs` and per-node `startedAt` / `endedAt` in result
- **File**: `mcp-server.js` `executeDependencyGraph()`
- **Acceptance**: Diamond-graph test confirms `results.a.startedAt` exists and wave durations sum correctly

### 2.2 `spawn_child_server` — wait-for-ready option
- **Problem**: After spawn, caller must poll manually before delegating — no built-in readiness probe
- **Fix**: Add `waitForReady: true` (default false) arg. If true, `spawnChildServer` polls `http://127.0.0.1:<port>/health` up to 5s before returning
- **File**: `mcp-server.js` `spawnChildServer()`
- **Acceptance**: Test: spawn with `waitForReady: true`, immediately delegate — no connection refused

### 2.3 `delegate_to_server` — timeout and retry args
- **Problem**: Delegation has no configurable timeout or retry count
- **Fix**: Add `timeoutMs` (default 10000) and `retries` (default 0) args
- **File**: `mcp-server.js` `delegateToServer()`
- **Acceptance**: Test: delegate to a slow server with `timeoutMs: 100` → error with timeout message

### 2.4 Specialist role routing by domain confidence
- **Problem**: `dispatch_specialist_task` assigns a specialist but doesn't record confidence or match score
- **Fix**: Add `confidence` (0-1) field to dispatch result, derived from keyword overlap between task description and specialist domain definition
- **File**: `mcp-server.js` `dispatchSpecialistTask()`
- **Acceptance**: "security audit of JWT tokens" → `security_engineer` with confidence ≥ 0.7

---

## Phase 3 — Observability (v2.2)

### 3.1 Per-tool latency histogram in `check_server_health`
- **Problem**: Health check shows total call count but no latency distribution
- **Fix**: Track p50/p95/p99 per tool using a rolling 100-sample buffer per tool name in `_toolMetrics`
- **File**: `mcp-server.js` — add `_toolMetrics` map, update `runTool()` wrapper to record timing
- **Acceptance**: `check_server_health` response includes `latency.p50`, `latency.p95` for top-5 called tools

### 3.2 Continuous eval loop — scheduled quality checks
- **Problem**: Quality is only checked manually via `get_sprint_quality_trend`
- **Fix**: Add `schedule_eval_loop({ intervalMinutes, sprintId })` tool that registers a recurring `run_validation_gate` and appends results to quality trend automatically
- **File**: `mcp-server.js`
- **Acceptance**: After registering, trend data auto-populates every N minutes

### 3.3 Dashboard: add test result panel
- **Problem**: Dashboard shows sprints and live events but no test run history
- **Fix**: Add a `TEST RESULTS` panel to the live dashboard showing last test run date, pass/fail count, and latest failures (if any) from `tests/logs/latest_ai.json`
- **File**: `mcp-server.js` (serve the data via REST), dashboard HTML/JS (render the panel)
- **Acceptance**: After running tests, dashboard shows "69 passed / 0 failed · just now"

---

## Phase 4 — Security & Hardening (v2.3)

### 4.1 Input validation on `auto_implement_plan`
- **Problem**: `auto_implement_plan` accepts `filePath` without checking it stays within the project root — path traversal possible
- **Fix**: Resolve `filePath` to absolute, check it starts with `process.cwd()` or a configured root list
- **File**: `mcp-server.js` `autoImplementPlan()`
- **Acceptance**: `filePath: "../../etc/passwd"` → error "Path outside allowed root"

### 4.2 Rate-limit `spawn_child_server`
- **Problem**: No limit on how many child servers can be spawned — potential resource exhaustion
- **Fix**: Enforce `MAX_CHILD_SERVERS = 5` (configurable via env). Reject spawn if at limit.
- **File**: `mcp-server.js`
- **Acceptance**: Test: spawn 5 → ok, spawn 6th → error "Child server limit reached (5)"

### 4.3 Sanitize `register_tool` body field
- **Problem**: `register_tool` evals arbitrary JS — already sandboxed via `new Function()` but no time limit
- **Fix**: Wrap eval in a 500ms timeout using `vm.runInContext` with a context timeout
- **File**: `mcp-server.js` `registerTool()`
- **Acceptance**: Infinite loop body `while(true){}` → error within 600ms

---

## Phase 5 — Developer Experience (v2.4)

### 5.1 `explain_tool` — inline tool documentation
- **Problem**: No way to get structured usage examples and schema explanation for a given tool
- **Fix**: Add `explain_tool({ name })` that returns the tool's inputSchema, description, category, examples, and typical output shape
- **File**: `mcp-server.js`
- **Acceptance**: `explain_tool({ name: 'execute_dependency_graph' })` returns schema + example graph JSON

### 5.2 `replay_last_sprint` — re-run with modified args
- **Problem**: No way to re-run a sprint with tweaked inputs without rebuilding the full call
- **Fix**: Add `replay_last_sprint({ sprintId, overrides: {} })` that loads the sprint from logs and re-executes with merged overrides
- **File**: `mcp-server.js`
- **Acceptance**: Run a sprint, call replay with an override, see new result with changed output

### 5.3 `export_tool_catalog` — machine-readable catalog export
- **Problem**: Tool catalog is only accessible via `server_info` or the docs page
- **Fix**: Add `export_tool_catalog({ format: 'json'|'markdown'|'openapi' })` that emits the full catalog in the requested format
- **File**: `mcp-server.js`
- **Acceptance**: JSON output matches `tools.length === 73+`, markdown output has a row per tool

---

## Execution Order

```
Phase 1 → Phase 2.1-2.2 → Phase 2.3-2.4 → Phase 3.1-3.2 → Phase 4 → Phase 3.3 + Phase 5
```

Start with Phase 1 items — they fix real bugs visible in test output right now.

---

## Version Targets

| Version | Phase | Gate |
|---------|-------|------|
| v2.0.0 | Phase 1 complete | All Phase 1 tests pass, eval score ≥50 |
| v2.1.0 | Phase 2 complete | All orchestration tests pass |
| v2.2.0 | Phase 3 complete | Dashboard shows test panel |
| v2.3.0 | Phase 4 complete | Security tests pass |
| v2.4.0 | Phase 5 complete | DX tools tested |
