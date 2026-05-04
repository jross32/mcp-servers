# mcp-servers

A monorepo of all MCP (Model Context Protocol) servers built for AI agent workflows.

## Structure

| Directory | Purpose | Status |
|-----------|---------|--------|
| [`agent-ops-hub/`](agent-ops-hub/) | Orchestration, validation, roadmap tracking, artifact analysis — 24 tools, 3 prompts | v0.1.0 |
| [`os-bridge/`](os-bridge/) | Windows OS control — clipboard, processes, windows, shell — 30 tools | v0.1.0 |
| [`mcp-factory/`](mcp-factory/) | Fleet generation, iteration runner — generates and upgrades the 100 domain servers | stable |
| [`git-tools/`](git-tools/) | Git operations MCP server | early |
| [`window-manager/`](window-manager/) | Window layout management | early |
| `{domain}-{tier}/` | 100 generated domain servers (json, csv, markdown, text, uuid, hashing, encoding, html, xml, regex, diff, notes, template, summary, planning, workflow, checklist, quality, prompt, time × forge/hub/lab/ops/studio tiers) | v0.1.x |

## Domain Fleet (100 servers)

Each domain has 5 tiers:
- **forge** — core transformation tools
- **hub** — cross-domain integration  
- **lab** — experimental / research tools
- **ops** — operational / monitoring tools
- **studio** — high-level creative/composition tools

Domains: `json` · `csv` · `markdown` · `text` · `uuid` · `hashing` · `encoding` · `html` · `xml` · `regex` · `diff` · `notes` · `template` · `summary` · `planning` · `workflow` · `checklist` · `quality` · `prompt` · `time`

## Key Servers

### agent-ops-hub — [docs](agent-ops-hub/DOCS.md)
The primary orchestration and intelligence hub. Use this to:
- Plan and decompose tasks (`agent_task_planner`)
- Run validation gates (`run_validation_gate`, `benchmark_validation_gate`)
- Compare tools across servers (`compare_mcp_server_tools`, `server_capability_matrix`)
- Track roadmap progress (`roadmap_tracker`)
- Scan and analyze test coverage (`scan_tool_coverage`, `find_missing_tests`)
- Validate JSON schemas (`validate_json_schema`)
- Generate changelogs and release notes (`generate_changelog_entry`, `write_release_notes`)
- Run code quality gates (`code_quality_gate`)
- Research agent patterns (`research_agent_patterns`)

### os-bridge — [docs](os-bridge/DOCS.md)
Full Windows OS automation. Use this to:
- Control clipboard (read/write)
- Manage running processes (list, kill, launch)
- Control windows (focus, move, resize, minimize, maximize, close)
- Run shell commands, inspect system info
- Monitor file system changes

### mcp-factory
Generator and fleet runner. Use this to:
- Generate new MCP servers from templates
- Run bulk improvement iterations across the fleet
- Verify fleet health at scale

## Protocol
All servers implement **MCP 2024-11-05** over **stdio** (JSON-RPC 2.0).  
`agent-ops-hub` also exposes HTTP on **port 11200** (`/health`, `/mcp`).  
Fleet servers run on ports **11001–11100**.

## Development

```bash
# Install deps for a specific server
cd agent-ops-hub && npm install

# Run tests
node tests/run-all.js

# Syntax check
node --check mcp-server.js

# Commit a new version
git add -A
git commit -m "v{N}: description"
git push
```

## Commit Convention
Every version bump commit includes:
1. Subject: `v{version}: short description`
2. Changed files bullet list
3. Bugs fixed (if any)
4. Version bump: `x.x.x -> y.y.y`

## Owner
[jross32](https://github.com/jross32)
