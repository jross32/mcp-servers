'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

const DOMAIN_PROFILES = {
  text: {
    focus: 'editorial transformation and drafting',
    inputKinds: ['raw text', 'outline', 'notes'],
    outputs: ['draft', 'rewrite', 'summary'],
    workflowStages: ['ingest', 'structure', 'rewrite', 'review'],
    heuristics: ['preserve intent', 'improve readability', 'remove redundancy'],
  },
  json: {
    focus: 'schema-aware JSON shaping and validation',
    inputKinds: ['json string', 'api response', 'config object'],
    outputs: ['normalized json', 'schema hints', 'path queries'],
    workflowStages: ['parse', 'inspect', 'reshape', 'validate'],
    heuristics: ['preserve structure', 'minimize surprises', 'surface invalid data'],
  },
  csv: {
    focus: 'tabular cleanup and conversion',
    inputKinds: ['csv text', 'export rows', 'spreadsheet copy'],
    outputs: ['normalized rows', 'csv export', 'column summary'],
    workflowStages: ['ingest', 'column map', 'normalize', 'emit'],
    heuristics: ['stable columns', 'header integrity', 'row consistency'],
  },
  markdown: {
    focus: 'markdown authoring and structural cleanup',
    inputKinds: ['notes', 'rough docs', 'release draft'],
    outputs: ['markdown doc', 'outline', 'checklist'],
    workflowStages: ['outline', 'sectioning', 'polish', 'review'],
    heuristics: ['consistent headings', 'scanability', 'actionable bullets'],
  },
  html: {
    focus: 'HTML snippet cleanup and content extraction planning',
    inputKinds: ['html snippet', 'rendered fragment', 'page source'],
    outputs: ['clean html', 'text summary', 'attribute map'],
    workflowStages: ['inspect', 'extract', 'normalize', 'review'],
    heuristics: ['preserve semantics', 'avoid brittle assumptions', 'surface key elements'],
  },
  xml: {
    focus: 'XML structure inspection and transformation planning',
    inputKinds: ['xml text', 'feed payload', 'config xml'],
    outputs: ['formatted xml', 'node map', 'value extraction'],
    workflowStages: ['parse', 'map', 'transform', 'validate'],
    heuristics: ['tag integrity', 'attribute fidelity', 'path clarity'],
  },
  regex: {
    focus: 'pattern design and replacement strategies',
    inputKinds: ['sample text', 'pattern', 'replacement goal'],
    outputs: ['match set', 'replacement result', 'pattern guidance'],
    workflowStages: ['sample', 'pattern', 'test', 'refine'],
    heuristics: ['avoid overmatching', 'prefer explicit groups', 'test edge cases'],
  },
  hashing: {
    focus: 'content fingerprinting and integrity checks',
    inputKinds: ['text', 'record id', 'artifact summary'],
    outputs: ['hash digest', 'integrity note', 'comparison signature'],
    workflowStages: ['identify', 'hash', 'compare', 'report'],
    heuristics: ['stable input', 'explicit algorithm', 'repeatable outputs'],
  },
  encoding: {
    focus: 'transport-safe encoding and decoding',
    inputKinds: ['utf8 text', 'payload', 'binary-like content'],
    outputs: ['base64 text', 'decoded text', 'transport note'],
    workflowStages: ['prepare', 'encode', 'decode', 'verify'],
    heuristics: ['round-trip safety', 'clear encoding boundaries', 'detect invalid payloads'],
  },
  uuid: {
    focus: 'identifier generation and tracking',
    inputKinds: ['count', 'entity list', 'tracking context'],
    outputs: ['uuid set', 'mapping table', 'tracking batch'],
    workflowStages: ['scope', 'generate', 'assign', 'verify'],
    heuristics: ['uniqueness', 'traceability', 'batch clarity'],
  },
  time: {
    focus: 'timestamp planning and schedule calculations',
    inputKinds: ['iso timestamp', 'offset plan', 'cadence'],
    outputs: ['adjusted timestamp', 'timeline', 'schedule note'],
    workflowStages: ['capture', 'adjust', 'sequence', 'review'],
    heuristics: ['timezone clarity', 'explicit offsets', 'readable timeline'],
  },
  checklist: {
    focus: 'step sequencing and completion guidance',
    inputKinds: ['goal', 'constraints', 'target outcome'],
    outputs: ['checklist', 'gate review', 'completion template'],
    workflowStages: ['goal', 'decompose', 'gate', 'close'],
    heuristics: ['action verbs', 'clear completion criteria', 'logical order'],
  },
  prompt: {
    focus: 'prompt design and instruction packaging',
    inputKinds: ['goal', 'context', 'constraints'],
    outputs: ['prompt draft', 'system prompt', 'task prompt'],
    workflowStages: ['frame', 'constrain', 'compose', 'review'],
    heuristics: ['clear intent', 'explicit outputs', 'minimal ambiguity'],
  },
  workflow: {
    focus: 'workflow decomposition and execution planning',
    inputKinds: ['objective', 'steps', 'validation rules'],
    outputs: ['workflow map', 'runbook', 'validation checklist'],
    workflowStages: ['scope', 'sequence', 'validate', 'iterate'],
    heuristics: ['small steps', 'observable checkpoints', 'deterministic validation'],
  },
  planning: {
    focus: 'plan drafting and milestone design',
    inputKinds: ['goal', 'timeline', 'dependencies'],
    outputs: ['plan', 'milestones', 'risk list'],
    workflowStages: ['scope', 'milestones', 'risks', 'handoff'],
    heuristics: ['falsifiable steps', 'tight scope', 'clear blockers'],
  },
  quality: {
    focus: 'quality gates and review scoring',
    inputKinds: ['artifact', 'quality rules', 'review notes'],
    outputs: ['scorecard', 'quality report', 'fix list'],
    workflowStages: ['criteria', 'score', 'gap analysis', 'recommend'],
    heuristics: ['explicit criteria', 'measurable outcomes', 'actionable fixes'],
  },
  diff: {
    focus: 'before/after comparison and delta reporting',
    inputKinds: ['old text', 'new text', 'change goal'],
    outputs: ['delta summary', 'change list', 'risk note'],
    workflowStages: ['baseline', 'compare', 'summarize', 'review'],
    heuristics: ['preserve facts', 'highlight behavior changes', 'separate noise from signal'],
  },
  template: {
    focus: 'template authoring and reusable skeletons',
    inputKinds: ['goal', 'sections', 'constraints'],
    outputs: ['template', 'boilerplate', 'starter structure'],
    workflowStages: ['shape', 'sections', 'fillers', 'examples'],
    heuristics: ['minimal friction', 'clear placeholders', 'reuse-ready'],
  },
  notes: {
    focus: 'note capture and structured condensation',
    inputKinds: ['meeting notes', 'research dump', 'task notes'],
    outputs: ['condensed notes', 'action items', 'topic clusters'],
    workflowStages: ['capture', 'cluster', 'condense', 'action'],
    heuristics: ['signal over noise', 'preserve decisions', 'extract actions'],
  },
  summary: {
    focus: 'summaries, briefings, and executive condensation',
    inputKinds: ['long text', 'status update', 'research output'],
    outputs: ['brief summary', 'executive brief', 'highlights'],
    workflowStages: ['ingest', 'rank', 'condense', 'deliver'],
    heuristics: ['retain essentials', 'compress safely', 'prioritize decisions'],
  },
};

const MODE_PROFILES = {
  studio: {
    emphasis: 'creative drafting',
    style: 'iterative and exploratory',
    qualityBias: ['clarity', 'presentation'],
  },
  forge: {
    emphasis: 'artifact production',
    style: 'structured and output-driven',
    qualityBias: ['completeness', 'reuse'],
  },
  ops: {
    emphasis: 'operational reliability',
    style: 'checklist-first and low-risk',
    qualityBias: ['stability', 'observability'],
  },
  lab: {
    emphasis: 'experimentation and analysis',
    style: 'hypothesis-driven',
    qualityBias: ['precision', 'evidence'],
  },
  hub: {
    emphasis: 'coordination and handoff',
    style: 'orchestration-oriented',
    qualityBias: ['traceability', 'communication'],
  },
};

function parseServerIdentity(config) {
  const name = String(config.name || 'generic-studio');
  const [domainKey = 'text', modeKey = 'studio'] = name.split('-');
  return { domainKey, modeKey };
}

function getDomainProfile(config) {
  const { domainKey, modeKey } = parseServerIdentity(config);
  const domainProfile = DOMAIN_PROFILES[domainKey] || DOMAIN_PROFILES.text;
  const modeProfile = MODE_PROFILES[modeKey] || MODE_PROFILES.studio;
  return {
    domainKey,
    modeKey,
    domainProfile,
    modeProfile,
    combinedQualityPoints: Array.from(new Set([...(config.qualityPoints || []), ...(modeProfile.qualityBias || [])])),
  };
}

function buildWorkflowSteps(config, goal) {
  const profile = getDomainProfile(config);
  return profile.domainProfile.workflowStages.map((stage, index) => ({
    step: index + 1,
    name: stage,
    action: `${toTitleCase(stage)} ${config.domainLabel} work for goal: ${goal}`,
    qualityFocus: profile.combinedQualityPoints[index % profile.combinedQualityPoints.length] || 'clarity',
  }));
}

function scoreTextAgainstSignals(text, signals) {
  const lower = String(text || '').toLowerCase();
  return signals.map((signal) => ({
    signal,
    score: lower.includes(String(signal).toLowerCase()) ? 1 : 0,
  }));
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function safeJsonParse(text) {
  try { return JSON.parse(text); } catch { return null; }
}

function validateArgs(schema, args, pathName = 'arguments', errors = []) {
  if (!schema || typeof schema !== 'object') return errors;
  if (schema.type === 'object') {
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      errors.push(`${pathName} must be an object`);
      return errors;
    }
    const props = schema.properties || {};
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      if (!Object.prototype.hasOwnProperty.call(args, key)) {
        errors.push(`${pathName}.${key} is required`);
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(args)) {
        if (!Object.prototype.hasOwnProperty.call(props, key)) {
          errors.push(`${pathName}.${key} is not allowed`);
        }
      }
    }
    for (const [key, childSchema] of Object.entries(props)) {
      if (Object.prototype.hasOwnProperty.call(args, key)) {
        validateArgs(childSchema, args[key], `${pathName}.${key}`, errors);
      }
    }
    return errors;
  }
  if (schema.type === 'string') {
    if (typeof args !== 'string') errors.push(`${pathName} must be a string`);
    if (Array.isArray(schema.enum) && !schema.enum.includes(args)) errors.push(`${pathName} must be one of: ${schema.enum.join(', ')}`);
    return errors;
  }
  if (schema.type === 'number') {
    if (typeof args !== 'number' || !Number.isFinite(args)) errors.push(`${pathName} must be a number`);
    if (schema.minimum != null && args < schema.minimum) errors.push(`${pathName} must be >= ${schema.minimum}`);
    if (schema.maximum != null && args > schema.maximum) errors.push(`${pathName} must be <= ${schema.maximum}`);
    return errors;
  }
  if (schema.type === 'boolean') {
    if (typeof args !== 'boolean') errors.push(`${pathName} must be a boolean`);
    return errors;
  }
  if (schema.type === 'array') {
    if (!Array.isArray(args)) errors.push(`${pathName} must be an array`);
    return errors;
  }
  return errors;
}

function buildError(message, extras = {}) {
  return {
    ok: false,
    error: {
      code: extras.code || 'server_error',
      category: extras.category || 'internal',
      message,
      retryable: Boolean(extras.retryable),
      suggestedAction: extras.suggestedAction || '',
      details: extras.details || null,
    },
  };
}

function toTitleCase(text) {
  return String(text || '').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
}

function slugify(text) {
  return String(text || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function csvSplitLine(line) {
  const out = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

function jsonPathLookup(input, queryPath) {
  const parts = String(queryPath || '').split('.').filter(Boolean);
  let cur = input;
  for (const part of parts) {
    if (cur == null) return null;
    if (Array.isArray(cur)) {
      const idx = parseInt(part, 10);
      if (!Number.isInteger(idx)) return null;
      cur = cur[idx];
    } else {
      cur = cur[part];
    }
  }
  return cur;
}

function buildCommonTools(config) {
  const domainTitle = toTitleCase(config.domainLabel || config.name);
  const profile = getDomainProfile(config);
  const qualityPoints = profile.combinedQualityPoints.length > 0 ? profile.combinedQualityPoints : ['clarity', 'reliability', 'observability'];
  const domainSignals = [...profile.domainProfile.heuristics, ...qualityPoints];

  return [
    {
      name: 'server_summary',
      description: 'Return server identity, domain, port, and capability summary.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      handler: async () => ({
        server: config.name,
        version: config.version,
        domain: config.domainLabel,
        port: config.port,
        toolCount: (config.tools || []).length,
        promptCount: (config.prompts || []).length,
        domainKey: profile.domainKey,
        modeKey: profile.modeKey,
        qualityPoints,
      }),
    },
    {
      name: 'health_snapshot',
      description: 'Return a health and readiness snapshot for this server.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      handler: async () => ({
        status: 'ok',
        server: config.name,
        version: config.version,
        startedAt: config.startedAt,
        uptimeMs: Date.now() - config.startedAtMs,
        pid: process.pid,
      }),
    },
    {
      name: 'list_capability_clusters',
      description: 'List tool clusters grouped for AI planning.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      handler: async () => ({
        domain: config.domainLabel,
        clusters: [
          { name: 'identity', tools: ['server_summary', 'health_snapshot', 'domain_brief'] },
          { name: 'text', tools: ['echo_text', 'summarize_text', 'count_words', 'tokenize_text', 'normalize_whitespace', 'change_case', 'slugify_text'] },
          { name: 'pattern', tools: ['regex_find', 'regex_replace'] },
          { name: 'data', tools: ['parse_json', 'format_json', 'query_json_path', 'csv_to_json', 'json_to_csv'] },
          { name: 'utility', tools: ['hash_text', 'encode_base64', 'decode_base64', 'date_now', 'date_add', 'uuid_generate', 'random_pick'] },
          { name: 'domain', tools: ['domain_profile', 'domain_brief', 'domain_checklist', 'domain_template', 'domain_quality_gate', 'mode_strategy'] },
          { name: 'workflow', tools: ['workflow_blueprint', 'workflow_run', 'workflow_review', 'improvement_backlog', 'iteration_checkpoint'] },
        ],
      }),
    },
    {
      name: 'domain_profile',
      description: 'Return the specialization profile for this server domain and mode.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      handler: async () => ({
        domainKey: profile.domainKey,
        modeKey: profile.modeKey,
        domainLabel: config.domainLabel,
        focus: profile.domainProfile.focus,
        inputKinds: profile.domainProfile.inputKinds,
        outputs: profile.domainProfile.outputs,
        workflowStages: profile.domainProfile.workflowStages,
        heuristics: profile.domainProfile.heuristics,
        mode: profile.modeProfile,
      }),
    },
    {
      name: 'echo_text',
      description: 'Echo text and basic metadata.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => ({ text: args.text, length: args.text.length }),
    },
    {
      name: 'summarize_text',
      description: 'Produce a compact summary preview of text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, maxChars: { type: 'number', minimum: 20, maximum: 1000 } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const maxChars = args.maxChars || 180;
        const clean = String(args.text).replace(/\s+/g, ' ').trim();
        return {
          summary: clean.length > maxChars ? `${clean.slice(0, maxChars - 3)}...` : clean,
          originalLength: clean.length,
        };
      },
    },
    {
      name: 'count_words',
      description: 'Count words, lines, and characters.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const text = String(args.text);
        return {
          words: text.trim() ? text.trim().split(/\s+/).length : 0,
          lines: text === '' ? 0 : text.split(/\r?\n/).length,
          chars: text.length,
        };
      },
    },
    {
      name: 'tokenize_text',
      description: 'Split text into tokens.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => ({ tokens: String(args.text).trim() ? String(args.text).trim().split(/\s+/) : [] }),
    },
    {
      name: 'normalize_whitespace',
      description: 'Collapse repeated whitespace.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => ({ text: String(args.text).replace(/\s+/g, ' ').trim() }),
    },
    {
      name: 'change_case',
      description: 'Transform text casing.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, mode: { type: 'string', enum: ['upper', 'lower', 'title'] } }, required: ['text', 'mode'], additionalProperties: false },
      handler: async (args) => ({ text: args.mode === 'upper' ? String(args.text).toUpperCase() : args.mode === 'lower' ? String(args.text).toLowerCase() : toTitleCase(args.text) }),
    },
    {
      name: 'slugify_text',
      description: 'Convert text into a slug.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => ({ slug: slugify(args.text) }),
    },
    {
      name: 'regex_find',
      description: 'Find regex matches in text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, pattern: { type: 'string' }, ignoreCase: { type: 'boolean' } }, required: ['text', 'pattern'], additionalProperties: false },
      handler: async (args) => {
        const re = new RegExp(args.pattern, args.ignoreCase ? 'gi' : 'g');
        return { matches: Array.from(String(args.text).matchAll(re)).map((m) => m[0]) };
      },
    },
    {
      name: 'regex_replace',
      description: 'Apply regex replacement to text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, pattern: { type: 'string' }, replacement: { type: 'string' }, ignoreCase: { type: 'boolean' } }, required: ['text', 'pattern', 'replacement'], additionalProperties: false },
      handler: async (args) => {
        const flags = args.ignoreCase ? 'gi' : 'g';
        return { text: String(args.text).replace(new RegExp(args.pattern, flags), String(args.replacement)) };
      },
    },
    {
      name: 'parse_json',
      description: 'Parse a JSON string.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => ({ value: JSON.parse(String(args.text)) }),
    },
    {
      name: 'format_json',
      description: 'Pretty-format a JSON value or JSON string.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => ({ text: JSON.stringify(JSON.parse(String(args.text)), null, 2) }),
    },
    {
      name: 'query_json_path',
      description: 'Read a dotted path from JSON text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, path: { type: 'string' } }, required: ['text', 'path'], additionalProperties: false },
      handler: async (args) => {
        const value = JSON.parse(String(args.text));
        return { value: jsonPathLookup(value, args.path) };
      },
    },
    {
      name: 'csv_to_json',
      description: 'Convert CSV text into JSON rows.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const lines = String(args.text).trim().split(/\r?\n/).filter(Boolean);
        if (lines.length === 0) return { rows: [] };
        const headers = csvSplitLine(lines[0]);
        const rows = lines.slice(1).map((line) => {
          const cols = csvSplitLine(line);
          const obj = {};
          headers.forEach((h, i) => { obj[h] = cols[i] ?? ''; });
          return obj;
        });
        return { rows };
      },
    },
    {
      name: 'json_to_csv',
      description: 'Convert a JSON array into CSV text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const rows = JSON.parse(String(args.text));
        if (!Array.isArray(rows) || rows.length === 0) return { text: '' };
        const headers = Object.keys(rows[0]);
        const lines = [headers.join(',')];
        for (const row of rows) {
          lines.push(headers.map((h) => JSON.stringify(row[h] ?? '')).join(','));
        }
        return { text: lines.join('\n') };
      },
    },
    {
      name: 'hash_text',
      description: 'Hash text content.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, algorithm: { type: 'string', enum: ['md5', 'sha1', 'sha256', 'sha512'] } }, required: ['text'], additionalProperties: false },
      handler: async (args) => ({ algorithm: args.algorithm || 'sha256', hash: crypto.createHash(args.algorithm || 'sha256').update(String(args.text)).digest('hex') }),
    },
    {
      name: 'encode_base64',
      description: 'Encode text as base64.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => ({ text: Buffer.from(String(args.text), 'utf8').toString('base64') }),
    },
    {
      name: 'decode_base64',
      description: 'Decode base64 text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => ({ text: Buffer.from(String(args.text), 'base64').toString('utf8') }),
    },
    {
      name: 'date_now',
      description: 'Return current date/time metadata.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      handler: async () => ({ iso: new Date().toISOString(), epochMs: Date.now() }),
    },
    {
      name: 'date_add',
      description: 'Add days/hours/minutes to an ISO timestamp.',
      inputSchema: { type: 'object', properties: { iso: { type: 'string' }, days: { type: 'number' }, hours: { type: 'number' }, minutes: { type: 'number' } }, required: ['iso'], additionalProperties: false },
      handler: async (args) => {
        const d = new Date(String(args.iso));
        d.setUTCDate(d.getUTCDate() + (args.days || 0));
        d.setUTCHours(d.getUTCHours() + (args.hours || 0));
        d.setUTCMinutes(d.getUTCMinutes() + (args.minutes || 0));
        return { iso: d.toISOString() };
      },
    },
    {
      name: 'uuid_generate',
      description: 'Generate UUID values.',
      inputSchema: { type: 'object', properties: { count: { type: 'number', minimum: 1, maximum: 50 } }, additionalProperties: false },
      handler: async (args) => ({ uuids: Array.from({ length: args.count || 1 }, () => crypto.randomUUID()) }),
    },
    {
      name: 'random_pick',
      description: 'Pick one or more random items from a list.',
      inputSchema: { type: 'object', properties: { items: { type: 'array' }, count: { type: 'number', minimum: 1, maximum: 20 } }, required: ['items'], additionalProperties: false },
      handler: async (args) => {
        const items = Array.from(args.items || []);
        const count = Math.min(args.count || 1, items.length);
        const pool = [...items];
        const picked = [];
        for (let i = 0; i < count; i++) {
          const idx = Math.floor(Math.random() * pool.length);
          picked.push(pool.splice(idx, 1)[0]);
        }
        return { picked };
      },
    },
    {
      name: 'domain_brief',
      description: 'Return the domain-specific mission of this server.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      handler: async () => ({
        domain: config.domainLabel,
        mission: `${domainTitle} server optimized for ${profile.domainProfile.focus} with a ${profile.modeProfile.style} operating mode.`,
        server: config.name,
        outputs: profile.domainProfile.outputs,
      }),
    },
    {
      name: 'mode_strategy',
      description: 'Return mode-specific operating strategy for this server.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      handler: async () => ({
        modeKey: profile.modeKey,
        emphasis: profile.modeProfile.emphasis,
        style: profile.modeProfile.style,
        qualityBias: profile.modeProfile.qualityBias,
      }),
    },
    {
      name: 'domain_checklist',
      description: 'Generate a domain-specific checklist for a goal.',
      inputSchema: { type: 'object', properties: { goal: { type: 'string' } }, required: ['goal'], additionalProperties: false },
      handler: async (args) => ({
        domain: config.domainLabel,
        checklist: [
          `Clarify ${config.domainLabel} objective: ${args.goal}`,
          `Collect domain inputs relevant to ${config.domainLabel}: ${profile.domainProfile.inputKinds.join(', ')}`,
          `Run domain transforms for ${profile.domainProfile.focus}`,
          `Review quality gates: ${qualityPoints.join(', ')}`,
          `Produce final ${config.domainLabel} artifact or recommendation`,
        ],
      }),
    },
    {
      name: 'domain_template',
      description: 'Return a reusable domain-specific template.',
      inputSchema: { type: 'object', properties: { goal: { type: 'string' } }, required: ['goal'], additionalProperties: false },
      handler: async (args) => ({
        title: `${domainTitle} Template`,
        template: [
          `Goal: ${args.goal}`,
          `Domain: ${config.domainLabel}`,
          `Mode: ${profile.modeKey}`,
          `Focus: ${profile.domainProfile.focus}`,
          'Inputs:',
          ...profile.domainProfile.inputKinds.map((kind) => `- ${kind}`),
          'Checks:',
          `- ${qualityPoints.join('\n- ')}`,
          'Output:',
          ...profile.domainProfile.outputs.map((output) => `- ${output}`),
        ].join('\n'),
      }),
    },
    {
      name: 'domain_quality_gate',
      description: 'Score text against the server domain quality points.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const scores = scoreTextAgainstSignals(args.text, qualityPoints);
        return {
          domain: config.domainLabel,
          passed: scores.filter((s) => s.score === 1).length,
          total: scores.length,
          scores,
        };
      },
    },
    {
      name: 'workflow_blueprint',
      description: 'Return a structured workflow blueprint for a goal.',
      inputSchema: { type: 'object', properties: { goal: { type: 'string' } }, required: ['goal'], additionalProperties: false },
      handler: async (args) => ({
        domain: config.domainLabel,
        mode: profile.modeKey,
        steps: buildWorkflowSteps(config, args.goal),
      }),
    },
    {
      name: 'workflow_run',
      description: 'Simulate a structured workflow execution for a goal.',
      inputSchema: { type: 'object', properties: { goal: { type: 'string' }, inputText: { type: 'string' } }, required: ['goal'], additionalProperties: false },
      handler: async (args) => {
        const steps = buildWorkflowSteps(config, args.goal).map((step) => ({
          ...step,
          status: 'completed',
          note: `${config.name} applied ${step.name} using ${profile.modeProfile.style} execution.`,
        }));
        const review = scoreTextAgainstSignals(args.inputText || args.goal, domainSignals);
        return {
          goal: args.goal,
          completedSteps: steps.length,
          steps,
          review,
        };
      },
    },
    {
      name: 'workflow_review',
      description: 'Review a workflow artifact against domain heuristics.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => ({
        domain: config.domainLabel,
        heuristics: scoreTextAgainstSignals(args.text, profile.domainProfile.heuristics),
        modeBias: scoreTextAgainstSignals(args.text, profile.modeProfile.qualityBias),
      }),
    },
    {
      name: 'improvement_backlog',
      description: 'Generate a prioritized improvement backlog for a goal or artifact.',
      inputSchema: { type: 'object', properties: { goal: { type: 'string' }, text: { type: 'string' } }, required: ['goal'], additionalProperties: false },
      handler: async (args) => {
        const scores = scoreTextAgainstSignals(args.text || '', domainSignals);
        return {
          domain: config.domainLabel,
          backlog: scores.filter((entry) => entry.score === 0).map((entry, index) => ({
            priority: index + 1,
            item: `Strengthen ${entry.signal} for ${args.goal}`,
          })),
        };
      },
    },
    {
      name: 'iteration_checkpoint',
      description: 'Create a checkpoint summary for iterative refinement work.',
      inputSchema: { type: 'object', properties: { iteration: { type: 'number', minimum: 1 }, goal: { type: 'string' }, text: { type: 'string' } }, required: ['iteration', 'goal'], additionalProperties: false },
      handler: async (args) => ({
        iteration: args.iteration,
        goal: args.goal,
        domain: config.domainLabel,
        mode: profile.modeKey,
        nextFocus: scoreTextAgainstSignals(args.text || '', domainSignals).filter((entry) => entry.score === 0).slice(0, 3).map((entry) => entry.signal),
      }),
    },
  ];
}

function buildPrompts(config) {
  const profile = getDomainProfile(config);
  return [
    {
      name: 'domain_workflow',
      description: `Guided workflow for the ${config.domainLabel} domain.`,
      arguments: [{ name: 'goal', description: 'Goal to accomplish', required: true }],
    },
    {
      name: 'continuous_improvement',
      description: `Continuous improvement loop for ${config.name}.`,
      arguments: [{ name: 'cycles', description: 'How many refinement cycles to run', required: false }],
    },
    {
      name: 'specialized_prompt_pack',
      description: `Specialized prompt pack for ${profile.domainKey}/${profile.modeKey}.`,
      arguments: [{ name: 'goal', description: 'Goal to optimize for', required: true }],
    },
    {
      name: 'workflow_diagnostics',
      description: `Workflow diagnostics prompt for ${config.name}.`,
      arguments: [{ name: 'artifact', description: 'Artifact text to review', required: true }],
    },
    {
      name: 'fleet_upgrade_cycle',
      description: `One fleet upgrade cycle for ${config.name}.`,
      arguments: [{ name: 'iteration', description: 'Iteration number', required: true }, { name: 'goal', description: 'Upgrade goal', required: true }],
    },
  ];
}

function getPromptMessages(config, prompts, name, args) {
  const profile = getDomainProfile(config);
  switch (name) {
    case 'domain_workflow':
      return [{ role: 'user', content: { type: 'text', text: `Use ${config.name} to complete this ${config.domainLabel} goal: ${args.goal}\n\nStart with domain_profile and mode_strategy, build a workflow_blueprint, run workflow_run, then review with workflow_review and domain_quality_gate.` } }];
    case 'continuous_improvement': {
      const cycles = Math.max(1, Math.min(10, parseInt((args && args.cycles) || '3', 10) || 3));
      return [{ role: 'user', content: { type: 'text', text: `Run ${cycles} improvement cycle(s) for ${config.name}. In each cycle: inspect server_summary, collect domain_profile, build a workflow_blueprint, run workflow_run, generate an improvement_backlog, and checkpoint with iteration_checkpoint.` } }];
    }
    case 'specialized_prompt_pack':
      return [{ role: 'user', content: { type: 'text', text: `You are using ${config.name}, a ${profile.domainKey}/${profile.modeKey} server focused on ${profile.domainProfile.focus}. Goal: ${args.goal}.\n\nUse these constraints:\n- Mode style: ${profile.modeProfile.style}\n- Preferred outputs: ${profile.domainProfile.outputs.join(', ')}\n- Heuristics: ${profile.domainProfile.heuristics.join(', ')}\n- Quality bias: ${profile.modeProfile.qualityBias.join(', ')}` } }];
    case 'workflow_diagnostics':
      return [{ role: 'user', content: { type: 'text', text: `Review this artifact for ${config.domainLabel}. Score it against heuristics with workflow_review, identify missing signals, and turn the gaps into an improvement_backlog.\n\nArtifact:\n${args.artifact}` } }];
    case 'fleet_upgrade_cycle':
      return [{ role: 'user', content: { type: 'text', text: `Run fleet upgrade iteration ${args.iteration} for ${config.name}. Goal: ${args.goal}.\n\nSequence: server_summary -> domain_profile -> workflow_blueprint -> workflow_run -> workflow_review -> improvement_backlog -> iteration_checkpoint.` } }];
    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
}

function makeToolResult(data) {
  return {
    content: [{ type: 'text', text: JSON.stringify({ ok: true, data }, null, 2) }],
    structuredContent: { ok: true, data },
    isError: false,
  };
}

function makeErrorResult(message, code = 'server_error', details = null) {
  return {
    content: [{ type: 'text', text: message }],
    structuredContent: buildError(message, { code, details }),
    isError: true,
  };
}

async function executeRpc(config, tools, prompts, request) {
  const { method, params } = request;
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: '2024-11-05',
        capabilities: { tools: { listChanged: false }, prompts: { listChanged: false }, http: { enabled: true, port: config.port } },
        serverInfo: { name: config.name, version: config.version },
      };
    case 'tools/list':
      return { tools: tools.map(({ handler, ...tool }) => tool) };
    case 'prompts/list':
      return { prompts };
    case 'prompts/get': {
      const promptName = params && params.name;
      return { description: (prompts.find((p) => p.name === promptName) || {}).description || '', messages: getPromptMessages(config, prompts, promptName, (params && params.arguments) || {}) };
    }
    case 'tools/call': {
      const toolName = params && params.name;
      const toolArgs = (params && params.arguments) || {};
      const tool = tools.find((t) => t.name === toolName);
      if (!tool) return makeErrorResult(`Unknown tool: ${toolName}`, 'tool_not_found');
      const errors = validateArgs(tool.inputSchema || { type: 'object', properties: {} }, toolArgs);
      if (errors.length > 0) return makeErrorResult(`Invalid arguments for ${toolName}`, 'invalid_arguments', { errors });
      try {
        const data = await tool.handler(toolArgs);
        return makeToolResult(data);
      } catch (err) {
        return makeErrorResult(String((err && err.message) || err), 'tool_error');
      }
    }
    case 'ping':
      return {};
    default:
      throw new Error(`Method not found: ${method}`);
  }
}

function createHttpServer(config, tools, prompts) {
  return http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      return sendJson(res, 200, { ok: true, server: config.name, version: config.version, port: config.port });
    }
    if (req.method === 'GET' && req.url === '/meta') {
      return sendJson(res, 200, { server: config.name, version: config.version, domain: config.domainLabel, toolCount: tools.length, promptCount: prompts.length, port: config.port });
    }
    if (req.method === 'GET' && req.url === '/tools') {
      return sendJson(res, 200, { tools: tools.map(({ handler, ...tool }) => tool) });
    }
    if (req.method === 'GET' && req.url === '/prompts') {
      return sendJson(res, 200, { prompts });
    }
    if (req.method === 'POST' && req.url === '/mcp') {
      let raw = '';
      req.on('data', (chunk) => { raw += chunk.toString('utf8'); });
      req.on('end', async () => {
        const msg = safeJsonParse(raw);
        if (!msg) return sendJson(res, 400, { error: 'Invalid JSON body' });
        try {
          const result = await executeRpc(config, tools, prompts, msg);
          sendJson(res, 200, { jsonrpc: '2.0', id: msg.id ?? null, result });
        } catch (err) {
          sendJson(res, 500, { jsonrpc: '2.0', id: msg.id ?? null, error: { code: -32603, message: String((err && err.message) || err) } });
        }
      });
      return;
    }
    sendJson(res, 404, { error: 'Not found' });
  });
}

function startStdio(config, tools, prompts) {
  process.stdin.setEncoding('utf8');
  let buffer = '';
  process.stdin.on('data', async (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const msg = safeJsonParse(trimmed);
      if (!msg) continue;
      if (msg.id == null) continue;
      try {
        const result = await executeRpc(config, tools, prompts, msg);
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }) + '\n');
      } catch (err) {
        process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: String((err && err.message) || err) } }) + '\n');
      }
    }
  });
}

function runGeneratedServer(config) {
  const runtimeConfig = {
    ...config,
    startedAtMs: Date.now(),
    startedAt: new Date().toISOString(),
  };
  const prompts = buildPrompts(runtimeConfig);
  const tools = buildCommonTools(runtimeConfig);
  runtimeConfig.tools = tools;
  runtimeConfig.prompts = prompts;

  const httpServer = createHttpServer(runtimeConfig, tools, prompts);
  httpServer.listen(runtimeConfig.port, '127.0.0.1');

  if (process.env.MCP_HTTP_ONLY !== '1') {
    startStdio(runtimeConfig, tools, prompts);
  }

  process.on('SIGINT', () => httpServer.close(() => process.exit(0)));
  process.on('SIGTERM', () => httpServer.close(() => process.exit(0)));
}

module.exports = {
  runGeneratedServer,
};
