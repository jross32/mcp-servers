# agent-ops-hub — Implementation Roadmap

10 prioritized next implementation ideas, current state assessment, and auto-mode operating guide.

**Current:** v0.9.1 | Steps A–S complete | 55 tools | 19 prompts | 40 specialists | 17/17 tests passing | Live sprint: 97/100 grade A.

---

## Current State Assessment

### What Works Well
- Prompt bundle architecture is proven — AI-sampling model delivers 97/100 quality
- 55 tools cover the full dev org surface area end-to-end
- 40 specialists with domain-specific prompt tailoring across 10 domains
- Continuous improvement loop scaffolding exists and is functional
- 17 test groups give high confidence before every commit
- HTTP bridge at 127.0.0.1:11200 enables any AI client (not just stdio)

### What Needs Work
1. **No persistent session memory** — every session starts cold; AI re-discovers context from scratch
2. **Research feed hits hardcoded URLs** — no real live web scraping, just fixed endpoint hits
3. **Loop can design but not implement** — `synthesize_sprint_outputs` produces a plan but a human must execute it
4. **No real-time visibility** — long autonomous runs are opaque without polling logs
5. **Tool registration is manual** — adding a tool requires 5+ edits across the same file
6. **Skill packs are drafts only** — `draft_skill_pack_manifest` creates manifests but they can't be loaded at runtime
7. **No adversarial review pass** — plans and code go straight to commit with no devil's advocate step
8. **No dependency graph execution** — `tool_dependency_graph` produces graphs but nothing executes them
9. **Evaluation scores are per-sprint** — no trend analysis, no learning from past scores
10. **Isolated from the broader /mcp-servers/ ecosystem** — cannot delegate to os-bridge, mcp-factory, etc.

---

## 10 Implementation Ideas — Priority Order

### #1 — Sprint Quality Dashboard (`get_sprint_quality_trend`)
**Why first:** Read-only, zero risk, immediately useful. Unlocks data-driven decisions for everything else.
**What:** New tool that reads `logs/specialist-runs/` and computes:
- Per-specialist average score over time
- Score deltas per improvement cycle
- Which rubric axes consistently underperform
- Recommended prompt adjustments based on weak axes
**Output:** Structured JSON trend report used to guide #3 (auto-implement) decisions.
**Effort:** Low — file reading + aggregation, no external deps.
**Tests:** group-r-quality-dashboard

---

### #2 — Persistent Session Memory Store
**Why second:** Without memory, every session starts cold. The AI wastes cycles re-discovering context.
Everything downstream depends on statefulness.
**What:** Lightweight JSON store at `artifacts/memory/session-state.json`.
Three new tools: `get_memory(key)`, `set_memory(key, value)`, `append_memory(key, value)`.
Server reads/writes this file on every relevant tool call.
Tracks: current roadmap position, what sprints ran, what scored well/poorly, active cycle ID.
**Effort:** Medium — 3 tools, no external deps, needs careful schema design.
**Tests:** group-s-memory-store

---

### #3 — Auto-Commit Pipeline (Close the Self-Evolution Loop)
**Why third:** The biggest gap. The server can design improvements but a human must implement them.
Closing this loop makes agent-ops-hub truly autonomous.
**What:** `auto_implement_plan` tool that:
1. Parses a `synthesize_sprint_outputs` result into discrete file edits
2. Applies edits to `mcp-server.js` with surgical string replacements
3. Runs `node --check mcp-server.js`
4. Runs `npm test` — all groups must pass
5. If both pass: `git add -A && git commit -m "..."` + `git push`
6. If any step fails: reverts all changes, logs the failure, returns error for next cycle
**Effort:** High — file manipulation + subprocess management + git integration.
**Tests:** group-t-auto-implement (uses fixture files, not real mcp-server.js)

---

### #4 — Live Web Scraping Research Feed
**Why fourth:** `research_improvement_ideas` currently hits a fixed URL list.
Real self-evolution needs live web intelligence.
**What:** `scrape_research_url` tool that uses Playwright (already installed in ecosystem) to:
- Fetch and parse target pages (MCP docs, GitHub changelogs, AI platform docs, ArXiv)
- Extract actionable text chunks
- Deduplicate against prior research pulses
- Score relevance to current roadmap item
- Store structured insights in `artifacts/research-pulses/`
**Effort:** Medium — Playwright child process spawn, text extraction.
**Tests:** group-u-research-scraper (fixtures for offline testing)

---

### #5 — Adversarial Review Gate
**Why fifth:** Plans and code currently go straight to commit. A built-in devil's advocate pass
catches flaws before they become bugs.
**What:** `adversarial_review` tool that takes any plan or code diff and dispatches a prompt bundle
forcing the AI to find: security holes, logic errors, edge cases, breaking changes.
Must return ≥3 specific objections or score 0/100.
Auto-injected by #3 before any commit is staged.
**Effort:** Low — new tool, prompt bundle only, no new infrastructure.
**Tests:** group-v-adversarial-review

---

### #6 — Real-Time Progress Stream (SSE)
**Why sixth:** Long autonomous runs are opaque. Without streaming, you have no feedback loop during execution.
**What:** Extend the HTTP bridge at `127.0.0.1:11200` to add a `/stream` SSE endpoint that emits:
- Tool call start/end events with timing
- Sprint progress (tasks dispatched, tasks complete, current score)
- Cycle completion events
- Error/rollback notifications
Connects to any browser tab or monitoring tool with zero client code.
**Effort:** Medium — SSE on existing HTTP server, no new npm deps.
**Tests:** group-w-sse-stream

---

### #7 — Tool Self-Registration API
**Why seventh:** Adding a tool currently requires 5+ edits in the same file. This creates friction for
autonomous improvement via #3.
**What:** `register_tool` meta-tool that accepts `{name, description, inputSchema, handlerCode}` and:
- Validates `handlerCode` with `node --check` equivalent before accepting
- Injects into TOOLS array + runTool() switch at runtime
- Persists registration to `artifacts/registered-tools.json` (survives restarts)
`unregister_tool` removes it cleanly.
**Effort:** High — dynamic code injection, must be sandboxed carefully. Requires #2 (memory) first.
**Tests:** group-x-tool-self-registration

---

### #8 — Dependency Graph Execution Engine
**Why eighth:** `tool_dependency_graph` produces graphs but nothing executes them.
**What:** `execute_dependency_graph` tool that:
- Takes a task graph (nodes = tasks, edges = dependencies)
- Resolves execution order via topological sort
- Runs independent branches in parallel via `run_parallel_specialist_sprint`
- Merges results from each branch
Returns a unified result tree, respecting all dependency constraints.
**Effort:** Medium — topological sort algorithm + parallel dispatch integration.
**Tests:** group-y-dependency-executor

---

### #9 — Skill Pack Runtime (Load + Execute)
**Why ninth:** `draft_skill_pack_manifest` creates manifests but they cannot be loaded or activated.
**What:**
- `load_skill_pack(manifestPath)` — reads manifest from `artifacts/skill-packs/`, registers its tools temporarily
- `list_loaded_skill_packs()` — shows currently active packs
- `unload_skill_pack(id)` — deactivates and removes its tools
Enables hotpluggable domain-specific capability (e.g., a "Kubernetes skill pack" adding 5 k8s tools
for the duration of a sprint, then cleaning up).
Builds on #7 (self-registration).
**Effort:** Medium — dynamic tool registration, depends on #7.
**Tests:** group-z-skill-pack-runtime

---

### #10 — Multi-Server Orchestration Hub
**Why last:** Most complex. Builds on all prior items. Transforms agent-ops-hub from a single server
into the orchestration layer for the entire `/mcp-servers/` ecosystem.
**What:**
- `list_available_servers()` — discovers all running MCP servers in `/mcp-servers/`
- `delegate_to_server(serverId, toolName, args)` — routes a tool call to a peer server via stdio/HTTP
- `spawn_child_server(serverPath)` — starts a peer server as a managed child process
- `stop_child_server(serverId)` — gracefully shuts it down
Enables agent-ops-hub to delegate OS tasks to os-bridge, generation tasks to mcp-factory, etc.
**Effort:** High — inter-process communication, protocol bridging, lifecycle management.
**Tests:** group-aa-multi-server

---

## Suggested Starting Point

**Start with #1 (dashboard) + #2 (memory) as a paired sprint.**

- #1 is read-only, zero-risk, proves the data pipeline
- #2 is the foundation layer — without it, #3, #4, and #7 are blind
- Both can be designed in a single `run_parallel_specialist_sprint` with `backend_architect` + `systems_architect`
- Combined effort: ~4-6 hours for a committed AI working autonomously

---

## Version Milestone Targets

| Milestone | Version | Items Complete |
|-----------|---------|---------------|
| Data foundation | 0.9.2 | #1 (dashboard) + #2 (memory) |
| Closed loop | 0.9.3 | #3 (auto-commit) + #5 (adversarial review) |
| Live intelligence | 0.9.4 | #4 (web scraping) + #6 (SSE stream) |
| Self-extending | 0.9.5 | #7 (self-registration) + #8 (dep graph) |
| Full autonomy | 1.0.0 | #9 (skill packs) + #10 (multi-server) |

---

## Auto-Mode Operating Guide (10-Hour Continuous Improvement)

### What Auto-Mode Means

The AI works through roadmap items above, one at a time, without stopping to ask questions.
Each item completes a full cycle: research → design → implement → test → commit → next.

### Required Setup Before Starting

1. Start the server: `node mcp-server.js` (from agent-ops-hub dir) — keep running in background
2. PowerShell terminal open with `C:\Users\justi\mcp-servers\agent-ops-hub` as cwd
3. Git configured as jross32 / justinwross32@gmail.com (already done)
4. Baseline: run `npm test` — confirm 17/17 passing before starting any auto-mode run

### The Starting Prompt (copy this to your AI)

```
You are in autonomous improvement mode for agent-ops-hub.

Goal: Implement ROADMAP.md items in priority order starting with #1 (sprint quality dashboard),
then #2 (persistent memory store). Work only in:
  C:\Users\justi\mcp-servers\agent-ops-hub\

For each item, execute this full cycle:
  1. Call research_improvement_ideas to gather web context on the topic
  2. Call run_parallel_specialist_sprint with 3-5 relevant specialists to design it
  3. Call evaluate_sprint_output — if score < 80/100, re-run sprint with enhanced task description
  4. Call synthesize_sprint_outputs to get a unified implementation plan
  5. Implement the plan: edit mcp-server.js and/or create new files
  6. Run: node --check mcp-server.js (must pass)
  7. Run: npm test (all 17 groups must pass)
  8. If any step fails: revert changes (git checkout mcp-server.js), diagnose, re-design at step 2
  9. Call specialist_work_log to record what was built and the result
 10. Commit: git add -A && git commit -m "T{n}: {item name} — {summary}"
 11. Push: git push
 12. Update ROADMAP.md: mark item complete, move to next item
 13. Repeat from step 1 for the next item

Hard rules:
- NEVER commit with a syntax error (node --check must be clean)
- NEVER commit with failing tests (npm test must be 17/17)
- NEVER skip node --check + npm test before committing
- Commit after EVERY successfully implemented item — never batch multiple items
- If a sprint scores < 70/100 twice in a row for the same item: log the blocker and move to the next item
- Report progress via specialist_work_log every 30 minutes minimum

Start with ROADMAP.md item #1 (get_sprint_quality_trend) — lowest risk, no external deps.
```

### Checkpoint Protocol (Every ~2 Hours)

```
1. npm test — confirm all 17 groups still passing
2. git log --oneline -5 — confirm commits are landing
3. Call evaluate_autonomous_loop_quality — get current loop health score
4. If any test group fails: STOP auto-mode, fix the regression, then resume
5. Call specialist_work_log — log checkpoint summary with what was built
```

### Recovery Protocol (If Something Breaks)

```
1. git status — see what changed
2. node --check mcp-server.js — find any syntax error
3. npm test — find which group is failing
4. If tests fail: git checkout mcp-server.js (revert) OR git stash
5. Re-run the design sprint for the failed item with more conservative scope
6. Do NOT move to the next item with a broken test suite
```

### Commit Message Format for Auto-Mode

```
T{step}: {item name} — agent-ops-hub

Changed:
- mcp-server.js: {what was added/changed}
- tests/group-*/test.js: {what was tested}

Roadmap: item #{n} complete
Sprint score: {X}/100 grade {G}
Tests: 17/17 passing
```

### Signs Auto-Mode Is Working

- `git log --oneline` shows a new commit every 30–90 minutes
- `npm test` output is still 17/17 after each commit
- `evaluate_sprint_output` scores trending upward over cycles
- `artifacts/` folder growing with new research pulses, sprint logs, and work logs
- `specialist_work_log` shows cycle count increasing

### Signs Auto-Mode Has Stalled

- No commit in > 2 hours
- Same test group failing repeatedly
- `evaluate_sprint_output` scoring below 70 for the same item twice in a row
- `specialist_work_log` not updating

If stalled: read the most recent `specialist_work_log` entry, identify which step failed,
re-prompt with a more specific task description for that exact step.

---

## Quick Reference: Key Tools for Auto-Mode

| Tool | When to Use |
|------|-------------|
| `research_improvement_ideas` | Start of every cycle — gather web context |
| `run_parallel_specialist_sprint` | Design phase — 3-5 specialists per item |
| `evaluate_sprint_output` | After every sprint — score must be ≥80/100 before implementing |
| `synthesize_sprint_outputs` | Merge specialist designs into one plan |
| `specialist_work_log` | Log progress before committing; read to resume after interruption |
| `get_autonomous_loop_state` | Check current cycle state |
| `orchestrate_continuous_improvement_loop` | Plan which items to tackle next |
| `evaluate_autonomous_loop_quality` | Checkpoint health check every 2 hours |
