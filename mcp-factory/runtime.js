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

// v1.0.1+ helpers
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = [];
  for (let i = 0; i <= m; i++) { dp[i] = [i]; for (let j = 1; j <= n; j++) dp[i][j] = i === 0 ? j : 0; }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function sentenceSplit(text) {
  const parts = String(text).match(/[^.!?]+[.!?]+/g) || [text];
  return parts.map((s) => s.trim()).filter(Boolean);
}

function paragraphSplit(text) {
  return String(text).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 1;
  const matches = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, matches ? matches.length : 1);
}

function fleschKincaid(text) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const sentences = Math.max(1, (text.match(/[.!?]+/g) || []).length);
  const syllables = words.reduce((acc, w) => acc + countSyllables(w), 0);
  const score = 206.835 - 1.015 * (words.length / sentences) - 84.6 * (syllables / words.length);
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}

function stripHtml(html) {
  return String(html)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

function renderTemplate(template, vars) {
  return String(template).replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] != null ? String(vars[key]) : ''));
}

function flattenJson(obj, prefix, out) {
  if (prefix === undefined) prefix = '';
  if (out === undefined) out = {};
  if (obj === null || typeof obj !== 'object') { if (prefix) out[prefix] = obj; return out; }
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => flattenJson(item, prefix ? `${prefix}.${i}` : String(i), out));
  } else {
    for (const [key, val] of Object.entries(obj)) {
      flattenJson(val, prefix ? `${prefix}.${key}` : key, out);
    }
  }
  return out;
}

function wordFrequency(text, topN) {
  const words = String(text).toLowerCase().match(/[a-zA-Z']+/g) || [];
  const freq = {};
  for (const w of words) { freq[w] = (freq[w] || 0) + 1; }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN || 20)
    .map(([word, count]) => ({ word, count }));
}

function extractNgrams(words, n) {
  const result = [];
  for (let i = 0; i <= words.length - n; i++) {
    result.push(words.slice(i, i + n).join(' '));
  }
  return result;
}

function wordWrap(text, width) {
  const w = Math.max(10, width || 80);
  const lines = [];
  for (const rawLine of String(text).split(/\r?\n/)) {
    const words = rawLine.split(' ');
    let current = '';
    for (const word of words) {
      if (current.length === 0) { current = word; }
      else if (current.length + 1 + word.length <= w) { current += ' ' + word; }
      else { lines.push(current); current = word; }
    }
    lines.push(current);
  }
  return lines.join('\n');
}

function csvToArray(text) {
  const lines = String(text).trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = csvSplitLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cols = csvSplitLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cols[i] ?? ''; });
    return obj;
  });
  return { headers, rows };
}

function jsonToAsciiTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const colWidths = headers.map((h) => Math.max(h.length, ...rows.map((r) => String(r[h] ?? '').length)));
  const sep = '+' + colWidths.map((w) => '-'.repeat(w + 2)).join('+') + '+';
  const headerRow = '| ' + headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ') + ' |';
  const dataRows = rows.map((row) => '| ' + headers.map((h, i) => String(row[h] ?? '').padEnd(colWidths[i])).join(' | ') + ' |');
  return [sep, headerRow, sep, ...dataRows, sep].join('\n');
}

function jsonToMarkdownTable(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const headerRow = '| ' + headers.join(' | ') + ' |';
  const sepRow = '| ' + headers.map(() => '---').join(' | ') + ' |';
  const dataRows = rows.map((row) => '| ' + headers.map((h) => String(row[h] ?? '').replace(/\|/g, '\\|')).join(' | ') + ' |');
  return [headerRow, sepRow, ...dataRows].join('\n');
}

// In-memory request metrics
const _metrics = {
  requestCount: 0,
  toolCallCount: 0,
  batchCount: 0,
  startedAt: Date.now(),
  toolStats: {},
};
function _trackTool(name) {
  _metrics.toolCallCount++;
  _metrics.toolStats[name] = (_metrics.toolStats[name] || 0) + 1;
}

// Simple diff (line-level)
function lineDiff(oldText, newText) {
  const oldLines = String(oldText).split(/\r?\n/);
  const newLines = String(newText).split(/\r?\n/);
  const added = newLines.filter((l) => !oldLines.includes(l));
  const removed = oldLines.filter((l) => !newLines.includes(l));
  return { added, removed, unchanged: oldLines.filter((l) => newLines.includes(l)).length };
}

// v1.5.0+ helpers
function computeStats(numbers) {
  if (!numbers.length) return { count: 0, sum: 0, min: null, max: null, mean: null, median: null, variance: null, stdDev: null };
  const sorted = [...numbers].sort((a, b) => a - b);
  const count = numbers.length;
  const sum = numbers.reduce((a, b) => a + b, 0);
  const mean = sum / count;
  const median = count % 2 === 0 ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2 : sorted[Math.floor(count / 2)];
  const variance = numbers.reduce((acc, v) => acc + (v - mean) ** 2, 0) / count;
  return { count, sum: Math.round(sum * 1e6) / 1e6, min: sorted[0], max: sorted[count - 1], mean: Math.round(mean * 1e6) / 1e6, median, variance: Math.round(variance * 1e6) / 1e6, stdDev: Math.round(Math.sqrt(variance) * 1e6) / 1e6 };
}

function simpleTokenize(text) {
  return String(text).toLowerCase().match(/[a-z0-9]+/g) || [];
}

function tfidfScore(docText, docsTexts) {
  const docTokens = simpleTokenize(docText);
  const termFreq = {};
  for (const t of docTokens) { termFreq[t] = (termFreq[t] || 0) + 1; }
  const totalDocs = docsTexts.length + 1;
  const results = Object.entries(termFreq)
    .map(([term, tf]) => {
      const docsWithTerm = docsTexts.filter((d) => simpleTokenize(d).includes(term)).length + 1;
      const idf = Math.log(totalDocs / docsWithTerm) + 1;
      return { term, tf, idf: Math.round(idf * 100) / 100, tfidf: Math.round(tf * idf * 100) / 100 };
    })
    .sort((a, b) => b.tfidf - a.tfidf);
  return results.slice(0, 20);
}

function buildTreeFromPaths(paths) {
  const root = {};
  for (const p of paths) {
    const parts = String(p).split('/').filter(Boolean);
    let node = root;
    for (const part of parts) {
      if (!node[part]) node[part] = {};
      node = node[part];
    }
  }
  return root;
}

function csvPivot(rows, rowKey, colKey, valKey) {
  const colVals = [...new Set(rows.map((r) => String(r[colKey] ?? '')))].sort();
  const groups = {};
  for (const row of rows) {
    const rk = String(row[rowKey] ?? '');
    if (!groups[rk]) groups[rk] = {};
    groups[rk][String(row[colKey] ?? '')] = row[valKey] ?? '';
  }
  return { colVals, pivoted: Object.entries(groups).map(([key, vals]) => ({ [rowKey]: key, ...Object.fromEntries(colVals.map((c) => [c, vals[c] ?? ''])) })) };
}

function detectJsonSchema(value, maxDepth, depth) {
  if (maxDepth === undefined) maxDepth = 4;
  if (depth === undefined) depth = 0;
  if (value === null) return { type: 'null' };
  if (Array.isArray(value)) {
    if (value.length === 0) return { type: 'array', items: {} };
    return depth < maxDepth ? { type: 'array', items: detectJsonSchema(value[0], maxDepth, depth + 1) } : { type: 'array' };
  }
  if (typeof value === 'object') {
    if (depth >= maxDepth) return { type: 'object' };
    const properties = {};
    for (const [k, v] of Object.entries(value)) { properties[k] = detectJsonSchema(v, maxDepth, depth + 1); }
    return { type: 'object', properties, required: Object.keys(value) };
  }
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return { type: 'string', format: 'date-time' };
    if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) return { type: 'string', format: 'uuid' };
    return { type: 'string' };
  }
  if (typeof value === 'number') return { type: Number.isInteger(value) ? 'integer' : 'number' };
  if (typeof value === 'boolean') return { type: 'boolean' };
  return {};
}

function validateJsonSchema(value, schema) {
  const errors = [];
  function check(val, sch, path) {
    if (!sch || typeof sch !== 'object') return;
    if (sch.type === 'null' && val !== null) { errors.push(`${path}: expected null`); return; }
    if (sch.type === 'boolean' && typeof val !== 'boolean') { errors.push(`${path}: expected boolean, got ${typeof val}`); return; }
    if (sch.type === 'integer' && (!Number.isFinite(val) || !Number.isInteger(val))) { errors.push(`${path}: expected integer`); return; }
    if (sch.type === 'number' && !Number.isFinite(val)) { errors.push(`${path}: expected number`); return; }
    if (sch.type === 'string' && typeof val !== 'string') { errors.push(`${path}: expected string`); return; }
    if (sch.type === 'array') {
      if (!Array.isArray(val)) { errors.push(`${path}: expected array`); return; }
      if (sch.items) val.forEach((item, i) => check(item, sch.items, `${path}[${i}]`));
    }
    if (sch.type === 'object') {
      if (!val || typeof val !== 'object' || Array.isArray(val)) { errors.push(`${path}: expected object`); return; }
      if (Array.isArray(sch.required)) { for (const k of sch.required) { if (!Object.prototype.hasOwnProperty.call(val, k)) errors.push(`${path}.${k}: required`); } }
      if (sch.properties) { for (const [k, childSch] of Object.entries(sch.properties)) { if (Object.prototype.hasOwnProperty.call(val, k)) check(val[k], childSch, `${path}.${k}`); } }
    }
    if (Array.isArray(sch.enum) && !sch.enum.includes(val)) errors.push(`${path}: must be one of [${sch.enum.join(', ')}]`);
    if (typeof sch.minimum === 'number' && val < sch.minimum) errors.push(`${path}: must be >= ${sch.minimum}`);
    if (typeof sch.maximum === 'number' && val > sch.maximum) errors.push(`${path}: must be <= ${sch.maximum}`);
    if (typeof sch.minLength === 'number' && typeof val === 'string' && val.length < sch.minLength) errors.push(`${path}: minLength ${sch.minLength}`);
    if (typeof sch.maxLength === 'number' && typeof val === 'string' && val.length > sch.maxLength) errors.push(`${path}: maxLength ${sch.maxLength}`);
  }
  check(value, schema, '$');
  return errors;
}

function buildMarkdownDoc(sections) {
  const lines = [];
  for (const sec of sections) {
    if (sec.heading) lines.push(`${'#'.repeat(sec.level || 2)} ${sec.heading}`, '');
    if (sec.body) lines.push(sec.body, '');
    if (Array.isArray(sec.items)) { sec.items.forEach((item) => lines.push(`- ${item}`)); lines.push(''); }
    if (sec.code) { lines.push('```' + (sec.lang || ''), sec.code, '```', ''); }
    if (sec.table && Array.isArray(sec.table)) { lines.push(jsonToMarkdownTable(sec.table), ''); }
  }
  return lines.join('\n');
}

function anagramsOf(word) {
  const sorted = word.toLowerCase().split('').sort().join('');
  return { word, sortedLetters: sorted, length: word.length };
}

function colorCode(score, thresholds) {
  const low = thresholds && thresholds.low != null ? thresholds.low : 40;
  const mid = thresholds && thresholds.mid != null ? thresholds.mid : 70;
  if (score >= mid) return 'green';
  if (score >= low) return 'yellow';
  return 'red';
}

function compressRatio(original, compressed) {
  if (!original) return 0;
  return Math.round((1 - compressed / original) * 10000) / 100;
}

function summarizeByGroups(rows, groupKey, valueKey) {
  const groups = {};
  for (const row of rows) {
    const gk = String(row[groupKey] ?? '');
    if (!groups[gk]) groups[gk] = [];
    const v = Number(row[valueKey]);
    if (Number.isFinite(v)) groups[gk].push(v);
  }
  return Object.entries(groups).map(([group, vals]) => ({ group, ...computeStats(vals) }));
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
    // --- v1.0.1: diff_text ---
    {
      name: 'diff_text',
      description: 'Show line-level additions and removals between two texts.',
      inputSchema: { type: 'object', properties: { oldText: { type: 'string' }, newText: { type: 'string' } }, required: ['oldText', 'newText'], additionalProperties: false },
      handler: async (args) => lineDiff(args.oldText, args.newText),
    },
    // --- v1.0.2: truncate_text ---
    {
      name: 'truncate_text',
      description: 'Truncate text to a max length at a word boundary.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, maxLength: { type: 'number', minimum: 10, maximum: 10000 }, ellipsis: { type: 'string' } }, required: ['text', 'maxLength'], additionalProperties: false },
      handler: async (args) => {
        const ellipsis = args.ellipsis != null ? String(args.ellipsis) : '...';
        const text = String(args.text);
        if (text.length <= args.maxLength) return { text, truncated: false };
        const cut = text.slice(0, args.maxLength - ellipsis.length);
        const lastSpace = cut.lastIndexOf(' ');
        return { text: (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + ellipsis, truncated: true };
      },
    },
    // --- v1.0.3: pad_text ---
    {
      name: 'pad_text',
      description: 'Pad or trim text to an exact width.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, width: { type: 'number', minimum: 1, maximum: 1000 }, align: { type: 'string', enum: ['left', 'right', 'center'] }, fill: { type: 'string' } }, required: ['text', 'width'], additionalProperties: false },
      handler: async (args) => {
        const text = String(args.text);
        const width = args.width;
        const fill = String(args.fill || ' ')[0] || ' ';
        const align = args.align || 'left';
        if (text.length >= width) return { text: text.slice(0, width) };
        const pad = fill.repeat(width - text.length);
        if (align === 'right') return { text: pad + text };
        if (align === 'center') { const l = Math.floor(pad.length / 2); return { text: pad.slice(0, l) + text + pad.slice(l) }; }
        return { text: text + pad };
      },
    },
    // --- v1.0.4: extract_emails ---
    {
      name: 'extract_emails',
      description: 'Extract all email addresses found in text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const emails = [...new Set(String(args.text).match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [])];
        return { emails, count: emails.length };
      },
    },
    // --- v1.0.5: extract_urls ---
    {
      name: 'extract_urls',
      description: 'Extract all URLs found in text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const urls = [...new Set(String(args.text).match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/g) || [])];
        return { urls, count: urls.length };
      },
    },
    // --- v1.0.6: deduplicate_lines ---
    {
      name: 'deduplicate_lines',
      description: 'Remove duplicate lines, preserving first occurrence.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, ignoreCase: { type: 'boolean' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const lines = String(args.text).split(/\r?\n/);
        const seen = new Set();
        const unique = lines.filter((l) => {
          const key = args.ignoreCase ? l.toLowerCase() : l;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return { text: unique.join('\n'), removed: lines.length - unique.length };
      },
    },
    // --- v1.0.7: sort_lines ---
    {
      name: 'sort_lines',
      description: 'Sort lines alphabetically or in reverse.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, reverse: { type: 'boolean' }, ignoreCase: { type: 'boolean' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const lines = String(args.text).split(/\r?\n/);
        const sorted = [...lines].sort((a, b) => {
          const x = args.ignoreCase ? a.toLowerCase() : a;
          const y = args.ignoreCase ? b.toLowerCase() : b;
          return x < y ? -1 : x > y ? 1 : 0;
        });
        if (args.reverse) sorted.reverse();
        return { text: sorted.join('\n') };
      },
    },
    // --- v1.0.8: filter_lines ---
    {
      name: 'filter_lines',
      description: 'Keep only lines matching (or not matching) a regex pattern.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, pattern: { type: 'string' }, invert: { type: 'boolean' }, ignoreCase: { type: 'boolean' } }, required: ['text', 'pattern'], additionalProperties: false },
      handler: async (args) => {
        const re = new RegExp(args.pattern, args.ignoreCase ? 'i' : '');
        const lines = String(args.text).split(/\r?\n/);
        const filtered = lines.filter((l) => (re.test(l) ? !args.invert : !!args.invert));
        return { text: filtered.join('\n'), kept: filtered.length, removed: lines.length - filtered.length };
      },
    },
    // --- v1.0.9: word_wrap ---
    {
      name: 'word_wrap',
      description: 'Wrap text at a column width.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, width: { type: 'number', minimum: 20, maximum: 500 } }, required: ['text'], additionalProperties: false },
      handler: async (args) => ({ text: wordWrap(args.text, args.width || 80) }),
    },
    // --- v1.1.0: split_text ---
    {
      name: 'split_text',
      description: 'Split text by a delimiter into an array of parts.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, delimiter: { type: 'string' }, trim: { type: 'boolean' } }, required: ['text', 'delimiter'], additionalProperties: false },
      handler: async (args) => {
        const parts = String(args.text).split(args.delimiter);
        return { parts: args.trim ? parts.map((p) => p.trim()) : parts, count: parts.length };
      },
    },
    // --- v1.1.1: join_text ---
    {
      name: 'join_text',
      description: 'Join an array of strings with a separator.',
      inputSchema: { type: 'object', properties: { parts: { type: 'array' }, separator: { type: 'string' } }, required: ['parts'], additionalProperties: false },
      handler: async (args) => ({ text: (args.parts || []).map(String).join(args.separator != null ? args.separator : ' ') }),
    },
    // --- v1.1.2: strip_html ---
    {
      name: 'strip_html',
      description: 'Remove HTML tags and decode HTML entities from text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => ({ text: stripHtml(args.text) }),
    },
    // --- v1.1.3: extract_numbers ---
    {
      name: 'extract_numbers',
      description: 'Extract all numeric values from text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const matches = String(args.text).match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) || [];
        const numbers = matches.map(Number).filter(Number.isFinite);
        return { numbers, count: numbers.length, sum: numbers.reduce((a, b) => a + b, 0), min: numbers.length ? Math.min(...numbers) : null, max: numbers.length ? Math.max(...numbers) : null };
      },
    },
    // --- v1.1.4: sentence_split ---
    {
      name: 'sentence_split',
      description: 'Split text into individual sentences.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const sentences = sentenceSplit(args.text);
        return { sentences, count: sentences.length };
      },
    },
    // --- v1.1.5: paragraph_split ---
    {
      name: 'paragraph_split',
      description: 'Split text into paragraphs (separated by blank lines).',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const paragraphs = paragraphSplit(args.text);
        return { paragraphs, count: paragraphs.length };
      },
    },
    // --- v1.1.6: readability_score ---
    {
      name: 'readability_score',
      description: 'Estimate readability using Flesch-Kincaid scoring (0=difficult, 100=easy).',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const score = fleschKincaid(args.text);
        const level = score >= 70 ? 'easy' : score >= 50 ? 'standard' : score >= 30 ? 'difficult' : 'very difficult';
        return { score, level, interpretation: `Score ${score}: ${level} to read` };
      },
    },
    // --- v1.1.7: word_frequency ---
    {
      name: 'word_frequency',
      description: 'Return a ranked word frequency list from text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, topN: { type: 'number', minimum: 1, maximum: 200 } }, required: ['text'], additionalProperties: false },
      handler: async (args) => ({ frequencies: wordFrequency(args.text, args.topN || 20) }),
    },
    // --- v1.1.8: ngrams ---
    {
      name: 'ngrams',
      description: 'Extract n-grams (sequences of N words) from text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, n: { type: 'number', minimum: 1, maximum: 10 } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const words = String(args.text).trim().split(/\s+/).filter(Boolean);
        const grams = extractNgrams(words, args.n || 2);
        return { ngrams: grams, count: grams.length };
      },
    },
    // --- v1.1.9: levenshtein_distance ---
    {
      name: 'levenshtein_distance',
      description: 'Compute the edit distance (Levenshtein) between two strings.',
      inputSchema: { type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } }, required: ['a', 'b'], additionalProperties: false },
      handler: async (args) => {
        const dist = levenshtein(String(args.a), String(args.b));
        const maxLen = Math.max(args.a.length, args.b.length);
        return { distance: dist, similarity: maxLen > 0 ? Math.round((1 - dist / maxLen) * 1000) / 1000 : 1 };
      },
    },
    // --- v1.2.0: text_stats ---
    {
      name: 'text_stats',
      description: 'Comprehensive statistics for a block of text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const text = String(args.text);
        const words = text.trim() ? text.trim().split(/\s+/) : [];
        const sentences = sentenceSplit(text);
        const paragraphs = paragraphSplit(text);
        const avgWordLen = words.length ? Math.round(words.reduce((a, w) => a + w.length, 0) / words.length * 10) / 10 : 0;
        return {
          chars: text.length,
          words: words.length,
          sentences: sentences.length,
          paragraphs: paragraphs.length,
          lines: text ? text.split(/\r?\n/).length : 0,
          avgWordLength: avgWordLen,
          readabilityScore: fleschKincaid(text),
          uniqueWords: new Set(words.map((w) => w.toLowerCase().replace(/[^a-z]/g, ''))).size,
        };
      },
    },
    // --- v1.2.1: keyword_density ---
    {
      name: 'keyword_density',
      description: 'Find keyword density (percentage per word) in text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, topN: { type: 'number', minimum: 1, maximum: 50 } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const words = String(args.text).toLowerCase().match(/[a-zA-Z']+/g) || [];
        const freq = {};
        for (const w of words) { freq[w] = (freq[w] || 0) + 1; }
        const total = words.length;
        const results = Object.entries(freq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, args.topN || 10)
          .map(([word, count]) => ({ word, count, density: total > 0 ? Math.round(count / total * 10000) / 100 : 0 }));
        return { keywords: results, totalWords: total };
      },
    },
    // --- v1.2.2: char_frequency ---
    {
      name: 'char_frequency',
      description: 'Return character frequency map for text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, lettersOnly: { type: 'boolean' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const text = args.lettersOnly ? String(args.text).replace(/[^a-zA-Z]/g, '') : String(args.text);
        const freq = {};
        for (const ch of text) { freq[ch] = (freq[ch] || 0) + 1; }
        const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([char, count]) => ({ char, count }));
        return { frequencies: sorted, uniqueChars: sorted.length };
      },
    },
    // --- v1.2.3: json_merge ---
    {
      name: 'json_merge',
      description: 'Deep merge two or more JSON objects (shallow merge at top level).',
      inputSchema: { type: 'object', properties: { objects: { type: 'array' } }, required: ['objects'], additionalProperties: false },
      handler: async (args) => {
        const merged = {};
        for (const item of (args.objects || [])) {
          const obj = typeof item === 'string' ? JSON.parse(item) : item;
          if (obj && typeof obj === 'object' && !Array.isArray(obj)) Object.assign(merged, obj);
        }
        return { merged };
      },
    },
    // --- v1.2.4: json_keys ---
    {
      name: 'json_keys',
      description: 'List all keys (including nested dot-paths) of a JSON object.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, nested: { type: 'boolean' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const obj = JSON.parse(String(args.text));
        const keys = args.nested ? Object.keys(flattenJson(obj)) : Object.keys(typeof obj === 'object' && obj !== null ? obj : {});
        return { keys, count: keys.length };
      },
    },
    // --- v1.2.5: json_flatten ---
    {
      name: 'json_flatten',
      description: 'Flatten a nested JSON object to dot-notation keys.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const obj = JSON.parse(String(args.text));
        return { flattened: flattenJson(obj) };
      },
    },
    // --- v1.2.6: json_pick ---
    {
      name: 'json_pick',
      description: 'Pick specific top-level keys from a JSON object.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, keys: { type: 'array' } }, required: ['text', 'keys'], additionalProperties: false },
      handler: async (args) => {
        const obj = JSON.parse(String(args.text));
        const result = {};
        for (const k of (args.keys || [])) { if (Object.prototype.hasOwnProperty.call(obj, k)) result[k] = obj[k]; }
        return { value: result };
      },
    },
    // --- v1.2.7: json_omit ---
    {
      name: 'json_omit',
      description: 'Omit specific top-level keys from a JSON object.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, keys: { type: 'array' } }, required: ['text', 'keys'], additionalProperties: false },
      handler: async (args) => {
        const obj = JSON.parse(String(args.text));
        const omitSet = new Set(args.keys || []);
        const result = {};
        for (const [k, v] of Object.entries(obj)) { if (!omitSet.has(k)) result[k] = v; }
        return { value: result };
      },
    },
    // --- v1.2.8: csv_filter_rows ---
    {
      name: 'csv_filter_rows',
      description: 'Filter CSV rows where a column matches a value or pattern.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, column: { type: 'string' }, pattern: { type: 'string' }, ignoreCase: { type: 'boolean' } }, required: ['text', 'column', 'pattern'], additionalProperties: false },
      handler: async (args) => {
        const { headers, rows } = csvToArray(args.text);
        const re = new RegExp(args.pattern, args.ignoreCase ? 'i' : '');
        const filtered = rows.filter((r) => re.test(String(r[args.column] || '')));
        const csvLines = [headers.join(','), ...filtered.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','))];
        return { text: csvLines.join('\n'), kept: filtered.length, removed: rows.length - filtered.length };
      },
    },
    // --- v1.2.9: csv_column_summary ---
    {
      name: 'csv_column_summary',
      description: 'Summarize each column in a CSV: count, unique values, sample.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const { headers, rows } = csvToArray(args.text);
        const summary = headers.map((h) => {
          const vals = rows.map((r) => String(r[h] ?? ''));
          const unique = [...new Set(vals)];
          const numeric = vals.map(Number).filter(Number.isFinite);
          return {
            column: h,
            count: vals.length,
            uniqueCount: unique.length,
            sample: unique.slice(0, 5),
            numericMin: numeric.length ? Math.min(...numeric) : null,
            numericMax: numeric.length ? Math.max(...numeric) : null,
            numericAvg: numeric.length ? Math.round(numeric.reduce((a, b) => a + b, 0) / numeric.length * 100) / 100 : null,
          };
        });
        return { columns: summary, rowCount: rows.length };
      },
    },
    // --- v1.3.0: csv_sort_rows ---
    {
      name: 'csv_sort_rows',
      description: 'Sort CSV rows by a specific column (ascending or descending).',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, column: { type: 'string' }, reverse: { type: 'boolean' }, numeric: { type: 'boolean' } }, required: ['text', 'column'], additionalProperties: false },
      handler: async (args) => {
        const { headers, rows } = csvToArray(args.text);
        const sorted = [...rows].sort((a, b) => {
          const av = a[args.column] ?? '', bv = b[args.column] ?? '';
          if (args.numeric) { const d = Number(av) - Number(bv); return args.reverse ? -d : d; }
          return args.reverse ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
        });
        const csvLines = [headers.join(','), ...sorted.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','))];
        return { text: csvLines.join('\n') };
      },
    },
    // --- v1.3.1: template_render ---
    {
      name: 'template_render',
      description: 'Render a Mustache-style {{variable}} template with provided values.',
      inputSchema: { type: 'object', properties: { template: { type: 'string' }, vars: { type: 'object' } }, required: ['template', 'vars'], additionalProperties: false },
      handler: async (args) => ({ text: renderTemplate(args.template, args.vars || {}) }),
    },
    // --- v1.3.2: json_to_table ---
    {
      name: 'json_to_table',
      description: 'Render a JSON array as an ASCII table.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const rows = JSON.parse(String(args.text));
        return { table: jsonToAsciiTable(rows) };
      },
    },
    // --- v1.3.3: json_to_markdown_table ---
    {
      name: 'json_to_markdown_table',
      description: 'Render a JSON array as a Markdown table.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const rows = JSON.parse(String(args.text));
        return { table: jsonToMarkdownTable(rows) };
      },
    },
    // --- v1.3.4: key_value_parse ---
    {
      name: 'key_value_parse',
      description: 'Parse key=value lines into a JSON object.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, separator: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const sep = args.separator || '=';
        const result = {};
        for (const line of String(args.text).split(/\r?\n/)) {
          const idx = line.indexOf(sep);
          if (idx > 0) { result[line.slice(0, idx).trim()] = line.slice(idx + sep.length).trim(); }
        }
        return { parsed: result, count: Object.keys(result).length };
      },
    },
    // --- v1.3.5: action_items_extract ---
    {
      name: 'action_items_extract',
      description: 'Extract action items and TODOs from text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const lines = String(args.text).split(/\r?\n/);
        const actionPatterns = /^\s*(?:[-*]\s*\[[ x]\]|TODO|ACTION|TASK|FOLLOWUP|FOLLOW[ -]?UP|DO:|NOTE:|->|=>|\d+\.)|\b(TODO|FIXME|HACK|XXX|ACTION ITEM|FOLLOW.?UP)\b/i;
        const items = lines.filter((l) => actionPatterns.test(l)).map((l) => l.trim()).filter(Boolean);
        return { items, count: items.length };
      },
    },
    // --- v1.3.6: risk_keywords ---
    {
      name: 'risk_keywords',
      description: 'Identify risk-signal keywords in text (blockers, uncertainties, issues).',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const riskWords = ['risk', 'blocker', 'blocked', 'issue', 'problem', 'concern', 'delay', 'unclear', 'unknown', 'uncertain', 'failed', 'failing', 'broken', 'critical', 'urgent', 'warning', 'danger', 'caution', 'missing', 'incomplete', 'overdue', 'dependency', 'bottleneck', 'escalate'];
        const text = String(args.text).toLowerCase();
        const found = riskWords.filter((w) => text.includes(w));
        const sentences = sentenceSplit(args.text).filter((s) => found.some((w) => s.toLowerCase().includes(w)));
        return { riskSignals: found, riskSentences: sentences, riskLevel: found.length === 0 ? 'low' : found.length < 3 ? 'medium' : 'high' };
      },
    },
    // --- v1.3.7: compare_artifacts ---
    {
      name: 'compare_artifacts',
      description: 'Compare two artifacts and return a summary of similarities and differences.',
      inputSchema: { type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' }, label_a: { type: 'string' }, label_b: { type: 'string' } }, required: ['a', 'b'], additionalProperties: false },
      handler: async (args) => {
        const diff = lineDiff(args.a, args.b);
        const statsA = { words: (args.a.trim().match(/\S+/g) || []).length, chars: args.a.length };
        const statsB = { words: (args.b.trim().match(/\S+/g) || []).length, chars: args.b.length };
        return {
          labelA: args.label_a || 'A',
          labelB: args.label_b || 'B',
          statsA,
          statsB,
          diff,
          similar: diff.unchanged > 0,
          wordDelta: statsB.words - statsA.words,
          charDelta: statsB.chars - statsA.chars,
        };
      },
    },
    // --- v1.3.8: priority_rank ---
    {
      name: 'priority_rank',
      description: 'Rank a list of items by keyword frequency relative to priority signals.',
      inputSchema: { type: 'object', properties: { items: { type: 'array' }, signals: { type: 'array' } }, required: ['items'], additionalProperties: false },
      handler: async (args) => {
        const signals = (args.signals || ['critical', 'urgent', 'important', 'high', 'asap', 'block', 'required', 'must']);
        const scored = (args.items || []).map((item) => {
          const text = String(item).toLowerCase();
          const score = signals.filter((s) => text.includes(String(s).toLowerCase())).length;
          return { item, score };
        });
        return { ranked: scored.sort((a, b) => b.score - a.score) };
      },
    },
    // --- v1.3.9: decision_matrix ---
    {
      name: 'decision_matrix',
      description: 'Score options against criteria and return a ranked decision matrix.',
      inputSchema: {
        type: 'object',
        properties: {
          options: { type: 'array', description: 'List of option strings to evaluate' },
          criteria: { type: 'array', description: 'List of criteria strings to score against' },
        },
        required: ['options', 'criteria'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const options = (args.options || []).map(String);
        const criteria = (args.criteria || []).map(String);
        const matrix = options.map((opt) => {
          const scores = criteria.map((crit) => {
            const overlap = crit.toLowerCase().split(/\s+/).filter((w) => opt.toLowerCase().includes(w)).length;
            return { criterion: crit, score: overlap };
          });
          return { option: opt, scores, total: scores.reduce((a, s) => a + s.score, 0) };
        });
        return { matrix: matrix.sort((a, b) => b.total - a.total) };
      },
    },
    // --- v1.4.0: date_parse ---
    {
      name: 'date_parse',
      description: 'Parse an ISO or common date string and return structured date info.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const d = new Date(String(args.text));
        if (isNaN(d.getTime())) throw new Error(`Cannot parse date: ${args.text}`);
        return {
          iso: d.toISOString(),
          epochMs: d.getTime(),
          year: d.getUTCFullYear(),
          month: d.getUTCMonth() + 1,
          day: d.getUTCDate(),
          hour: d.getUTCHours(),
          minute: d.getUTCMinutes(),
          weekday: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getUTCDay()],
        };
      },
    },
    // --- v1.4.1: date_diff ---
    {
      name: 'date_diff',
      description: 'Calculate the difference between two ISO dates.',
      inputSchema: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } }, required: ['from', 'to'], additionalProperties: false },
      handler: async (args) => {
        const a = new Date(args.from), b = new Date(args.to);
        if (isNaN(a.getTime()) || isNaN(b.getTime())) throw new Error('Invalid date');
        const ms = b - a;
        return {
          ms,
          seconds: Math.round(ms / 1000),
          minutes: Math.round(ms / 60000),
          hours: Math.round(ms / 3600000 * 10) / 10,
          days: Math.round(ms / 86400000 * 10) / 10,
          weeks: Math.round(ms / 604800000 * 10) / 10,
          isPast: ms < 0,
        };
      },
    },
    // --- v1.4.2: array_ops ---
    {
      name: 'array_ops',
      description: 'Perform operations on arrays: sort, unique, flatten, reverse, chunk, shuffle.',
      inputSchema: { type: 'object', properties: { items: { type: 'array' }, op: { type: 'string', enum: ['sort', 'unique', 'flatten', 'reverse', 'shuffle', 'chunk'] }, chunkSize: { type: 'number', minimum: 1 } }, required: ['items', 'op'], additionalProperties: false },
      handler: async (args) => {
        let items = Array.from(args.items || []);
        switch (args.op) {
          case 'sort': return { items: [...items].sort() };
          case 'unique': return { items: [...new Set(items.map((x) => JSON.stringify(x)))].map((x) => JSON.parse(x)) };
          case 'flatten': return { items: items.flat(Infinity) };
          case 'reverse': return { items: [...items].reverse() };
          case 'shuffle': {
            const a = [...items];
            for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
            return { items: a };
          }
          case 'chunk': {
            const size = args.chunkSize || 10;
            const chunks = [];
            for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
            return { items: chunks };
          }
          default: return { items };
        }
      },
    },
    // --- v1.4.3: object_transform ---
    {
      name: 'object_transform',
      description: 'Transform a JSON object: rename keys, map values, or filter entries.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'JSON object string' },
          op: { type: 'string', enum: ['rename', 'lowercase_keys', 'uppercase_keys', 'filter_nulls', 'sort_keys'] },
          keyMap: { type: 'object', description: 'For rename: {oldKey: newKey}' },
        },
        required: ['text', 'op'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const obj = JSON.parse(String(args.text));
        switch (args.op) {
          case 'rename': {
            const km = args.keyMap || {};
            const result = {};
            for (const [k, v] of Object.entries(obj)) { result[km[k] || k] = v; }
            return { value: result };
          }
          case 'lowercase_keys': return { value: Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v])) };
          case 'uppercase_keys': return { value: Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.toUpperCase(), v])) };
          case 'filter_nulls': return { value: Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null)) };
          case 'sort_keys': return { value: Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b))) };
          default: return { value: obj };
        }
      },
    },
    // --- v1.4.4: content_classifier ---
    {
      name: 'content_classifier',
      description: 'Classify text content by detecting domain signals and content type.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const text = String(args.text).toLowerCase();
        const domainSignalMap = {
          code: ['function', 'const ', 'var ', 'import ', 'class ', 'return ', '{', '}', '=>', '==='],
          markdown: ['##', '**', '* ', '- ', '```', '> ', '[', ']('],
          json: ['{', '":', '}', '[', ']'],
          csv: [',', '\n'],
          email: ['@', 'subject:', 'from:', 'to:', 'dear ', 'regards'],
          technical: ['api', 'endpoint', 'parameter', 'schema', 'payload', 'request', 'response'],
          narrative: ['the ', 'and ', 'but ', 'however', 'therefore', 'thus', 'because'],
          task: ['todo', 'action', 'complete', 'done', 'next step', 'deadline', 'assign'],
        };
        const scores = Object.entries(domainSignalMap).map(([type, signals]) => ({
          type,
          score: signals.filter((s) => text.includes(s)).length,
        }));
        const best = scores.sort((a, b) => b.score - a.score).slice(0, 3);
        return { classification: best[0]?.type || 'unknown', scores: best, confidence: best[0]?.score > 0 ? 'medium' : 'low' };
      },
    },
    // --- v1.4.5: extract_dates ---
    {
      name: 'extract_dates',
      description: 'Extract date-like strings from text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const patterns = [
          /\d{4}-\d{2}-\d{2}(?:T[\d:.Z+\-]+)?/g,
          /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}/gi,
          /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
          /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}/gi,
        ];
        const all = new Set();
        for (const re of patterns) { for (const m of String(args.text).matchAll(re)) all.add(m[0]); }
        const dates = [...all];
        return { dates, count: dates.length };
      },
    },
    // --- v1.4.6: text_excerpt ---
    {
      name: 'text_excerpt',
      description: 'Extract a contextual excerpt around a search term in text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, term: { type: 'string' }, contextChars: { type: 'number', minimum: 20, maximum: 500 } }, required: ['text', 'term'], additionalProperties: false },
      handler: async (args) => {
        const text = String(args.text);
        const ctx = args.contextChars || 150;
        const idx = text.toLowerCase().indexOf(String(args.term).toLowerCase());
        if (idx === -1) return { excerpt: null, found: false };
        const start = Math.max(0, idx - ctx);
        const end = Math.min(text.length, idx + args.term.length + ctx);
        const excerpt = (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
        return { excerpt, found: true, position: idx };
      },
    },
    // --- v1.4.7: find_replace_multi ---
    {
      name: 'find_replace_multi',
      description: 'Apply multiple find-replace pairs to text in one pass.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          replacements: { type: 'array', description: 'Array of {find, replace} objects' },
          useRegex: { type: 'boolean' },
        },
        required: ['text', 'replacements'],
        additionalProperties: false,
      },
      handler: async (args) => {
        let text = String(args.text);
        let count = 0;
        for (const pair of (args.replacements || [])) {
          const find = String(pair.find || '');
          const replace = String(pair.replace || '');
          if (!find) continue;
          const re = new RegExp(args.useRegex ? find : find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
          const before = text;
          text = text.replace(re, replace);
          if (text !== before) count++;
        }
        return { text, replacementsApplied: count };
      },
    },
    // --- v1.4.8: markdown_to_bullets ---
    {
      name: 'markdown_to_bullets',
      description: 'Convert a list of lines/items into a Markdown bullet list.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, bulletChar: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const bullet = String(args.bulletChar || '-');
        const lines = String(args.text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const already = /^[-*+]\s+/;
        const bullets = lines.map((l) => already.test(l) ? l : `${bullet} ${l}`);
        return { text: bullets.join('\n'), count: bullets.length };
      },
    },
    // --- v1.4.9: strip_punctuation ---
    {
      name: 'strip_punctuation',
      description: 'Remove or replace punctuation from text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, replacement: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const rep = args.replacement != null ? String(args.replacement) : '';
        return { text: String(args.text).replace(/[^\w\s]/g, rep).replace(/  +/g, ' ').trim() };
      },
    },
    // --- v1.5.0: statistics ---
    {
      name: 'statistics',
      description: 'Compute descriptive statistics (mean, median, stddev, min, max) for a list of numbers.',
      inputSchema: { type: 'object', properties: { numbers: { type: 'array' } }, required: ['numbers'], additionalProperties: false },
      handler: async (args) => {
        const nums = (args.numbers || []).map(Number).filter(Number.isFinite);
        return computeStats(nums);
      },
    },
    // --- v1.5.1: percentile ---
    {
      name: 'percentile',
      description: 'Compute a percentile value from a list of numbers.',
      inputSchema: { type: 'object', properties: { numbers: { type: 'array' }, p: { type: 'number', minimum: 0, maximum: 100 } }, required: ['numbers', 'p'], additionalProperties: false },
      handler: async (args) => {
        const nums = (args.numbers || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
        if (!nums.length) return { percentile: null };
        const idx = (args.p / 100) * (nums.length - 1);
        const lo = Math.floor(idx), hi = Math.ceil(idx);
        const val = nums[lo] + (nums[hi] - nums[lo]) * (idx - lo);
        return { p: args.p, percentile: Math.round(val * 1e6) / 1e6 };
      },
    },
    // --- v1.5.2: json_schema_infer ---
    {
      name: 'json_schema_infer',
      description: 'Infer a JSON Schema from a JSON value.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const value = JSON.parse(String(args.text));
        return { schema: detectJsonSchema(value) };
      },
    },
    // --- v1.5.3: json_schema_validate ---
    {
      name: 'json_schema_validate',
      description: 'Validate a JSON value against a JSON Schema.',
      inputSchema: { type: 'object', properties: { text: { type: 'string', description: 'JSON value to validate' }, schema: { type: 'object', description: 'JSON Schema object' } }, required: ['text', 'schema'], additionalProperties: false },
      handler: async (args) => {
        const value = JSON.parse(String(args.text));
        const errors = validateJsonSchema(value, args.schema);
        return { valid: errors.length === 0, errors };
      },
    },
    // --- v1.5.4: csv_pivot ---
    {
      name: 'csv_pivot',
      description: 'Pivot a CSV table by row key, column key, and value column.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, rowKey: { type: 'string' }, colKey: { type: 'string' }, valKey: { type: 'string' } }, required: ['text', 'rowKey', 'colKey', 'valKey'], additionalProperties: false },
      handler: async (args) => {
        const { rows } = csvToArray(args.text);
        const { colVals, pivoted } = csvPivot(rows, args.rowKey, args.colKey, args.valKey);
        return { colVals, pivoted };
      },
    },
    // --- v1.5.5: csv_group_stats ---
    {
      name: 'csv_group_stats',
      description: 'Aggregate statistics for a CSV grouped by one column\'s values.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, groupBy: { type: 'string' }, valueCol: { type: 'string' } }, required: ['text', 'groupBy', 'valueCol'], additionalProperties: false },
      handler: async (args) => {
        const { rows } = csvToArray(args.text);
        return { groups: summarizeByGroups(rows, args.groupBy, args.valueCol) };
      },
    },
    // --- v1.5.6: json_array_stats ---
    {
      name: 'json_array_stats',
      description: 'Compute stats on a numeric field across a JSON array.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, field: { type: 'string' } }, required: ['text', 'field'], additionalProperties: false },
      handler: async (args) => {
        const arr = JSON.parse(String(args.text));
        const nums = (Array.isArray(arr) ? arr : []).map((r) => Number(r[args.field])).filter(Number.isFinite);
        return computeStats(nums);
      },
    },
    // --- v1.5.7: tfidf_keywords ---
    {
      name: 'tfidf_keywords',
      description: 'Extract TF-IDF weighted keywords from a document against optional context documents.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, contextDocs: { type: 'array' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const terms = tfidfScore(args.text, (args.contextDocs || []).map(String));
        return { keywords: terms };
      },
    },
    // --- v1.5.8: path_tree ---
    {
      name: 'path_tree',
      description: 'Build a tree structure from a list of slash-delimited paths.',
      inputSchema: { type: 'object', properties: { paths: { type: 'array' } }, required: ['paths'], additionalProperties: false },
      handler: async (args) => ({ tree: buildTreeFromPaths((args.paths || []).map(String)) }),
    },
    // --- v1.5.9: markdown_doc_builder ---
    {
      name: 'markdown_doc_builder',
      description: 'Build a structured Markdown document from sections (heading, body, items, code, table).',
      inputSchema: { type: 'object', properties: { sections: { type: 'array' } }, required: ['sections'], additionalProperties: false },
      handler: async (args) => ({ markdown: buildMarkdownDoc(args.sections || []) }),
    },
    // --- v1.6.0: text_compress_ratio ---
    {
      name: 'text_compress_ratio',
      description: 'Estimate compression ratio of text vs its deduplicated/whitespace-collapsed version.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const text = String(args.text);
        const collapsed = text.replace(/\s+/g, ' ').trim();
        const seen = new Set(text.split(/\s+/).map((w) => w.toLowerCase()));
        return {
          originalLength: text.length,
          collapsedLength: collapsed.length,
          uniqueTokens: seen.size,
          collapseRatio: compressRatio(text.length, collapsed.length),
          repetitionRate: text.length > 0 ? Math.round((1 - seen.size / text.trim().split(/\s+/).length) * 100) : 0,
        };
      },
    },
    // --- v1.6.1: semantic_similarity ---
    {
      name: 'semantic_similarity',
      description: 'Estimate similarity between two texts using token overlap (Jaccard similarity).',
      inputSchema: { type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } }, required: ['a', 'b'], additionalProperties: false },
      handler: async (args) => {
        const setA = new Set(simpleTokenize(args.a));
        const setB = new Set(simpleTokenize(args.b));
        const intersection = [...setA].filter((t) => setB.has(t)).length;
        const union = new Set([...setA, ...setB]).size;
        const jaccard = union === 0 ? 0 : Math.round(intersection / union * 1000) / 1000;
        return { jaccardSimilarity: jaccard, tokensA: setA.size, tokensB: setB.size, sharedTokens: intersection };
      },
    },
    // --- v1.6.2: batch_hash ---
    {
      name: 'batch_hash',
      description: 'Hash multiple texts at once, returning a map of text->hash.',
      inputSchema: { type: 'object', properties: { items: { type: 'array' }, algorithm: { type: 'string', enum: ['md5', 'sha1', 'sha256', 'sha512'] } }, required: ['items'], additionalProperties: false },
      handler: async (args) => {
        const algo = args.algorithm || 'sha256';
        const results = (args.items || []).map((item) => ({
          input: String(item),
          hash: crypto.createHash(algo).update(String(item)).digest('hex'),
        }));
        return { algorithm: algo, results };
      },
    },
    // --- v1.6.3: encode_url ---
    {
      name: 'encode_url',
      description: 'URL-encode or decode a string.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, mode: { type: 'string', enum: ['encode', 'decode'] } }, required: ['text', 'mode'], additionalProperties: false },
      handler: async (args) => ({
        text: args.mode === 'encode' ? encodeURIComponent(String(args.text)) : decodeURIComponent(String(args.text)),
      }),
    },
    // --- v1.6.4: text_diff_chars ---
    {
      name: 'text_diff_chars',
      description: 'Character-level diff showing insertions and deletions between two strings.',
      inputSchema: { type: 'object', properties: { oldText: { type: 'string' }, newText: { type: 'string' } }, required: ['oldText', 'newText'], additionalProperties: false },
      handler: async (args) => {
        const a = String(args.oldText), b = String(args.newText);
        const dist = levenshtein(a, b);
        const similarity = a.length + b.length > 0 ? 1 - dist / Math.max(a.length, b.length) : 1;
        return {
          editDistance: dist,
          similarity: Math.round(similarity * 1000) / 1000,
          insertions: Math.max(0, b.length - a.length + Math.round((dist - Math.abs(b.length - a.length)) / 2)),
          deletions: Math.max(0, a.length - b.length + Math.round((dist - Math.abs(b.length - a.length)) / 2)),
        };
      },
    },
    // --- v1.6.5: json_diff ---
    {
      name: 'json_diff',
      description: 'Compare two JSON objects and report added, removed, and changed keys.',
      inputSchema: { type: 'object', properties: { oldText: { type: 'string' }, newText: { type: 'string' } }, required: ['oldText', 'newText'], additionalProperties: false },
      handler: async (args) => {
        const a = JSON.parse(String(args.oldText)), b = JSON.parse(String(args.newText));
        const fa = flattenJson(a), fb = flattenJson(b);
        const allKeys = new Set([...Object.keys(fa), ...Object.keys(fb)]);
        const added = [], removed = [], changed = [], unchanged = [];
        for (const k of allKeys) {
          if (!(k in fa)) added.push(k);
          else if (!(k in fb)) removed.push(k);
          else if (JSON.stringify(fa[k]) !== JSON.stringify(fb[k])) changed.push({ key: k, old: fa[k], new: fb[k] });
          else unchanged.push(k);
        }
        return { added, removed, changed, unchangedCount: unchanged.length };
      },
    },
    // --- v1.6.6: csv_add_column ---
    {
      name: 'csv_add_column',
      description: 'Add a computed column to a CSV using a template expression ({{col1}} syntax).',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, columnName: { type: 'string' }, template: { type: 'string' } }, required: ['text', 'columnName', 'template'], additionalProperties: false },
      handler: async (args) => {
        const { headers, rows } = csvToArray(args.text);
        const newHeaders = [...headers, args.columnName];
        const newRows = rows.map((r) => ({ ...r, [args.columnName]: renderTemplate(args.template, r) }));
        const csvLines = [newHeaders.join(','), ...newRows.map((r) => newHeaders.map((h) => JSON.stringify(r[h] ?? '')).join(','))];
        return { text: csvLines.join('\n') };
      },
    },
    // --- v1.6.7: intent_classifier ---
    {
      name: 'intent_classifier',
      description: 'Classify the likely intent of a text input (question, command, statement, feedback, request).',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const text = String(args.text).trim().toLowerCase();
        const scores = {
          question: (text.match(/\?|^(what|how|why|when|where|who|is|are|can|could|should|would|will|does|do)\b/i) || []).length,
          command: (text.match(/^(please|do|run|execute|create|make|build|generate|list|show|get|set|update|delete|remove|add|find|search|send|start|stop)\b/i) || []).length,
          feedback: (text.match(/\b(good|bad|wrong|correct|thanks|thank you|great|poor|issue|error|bug|works|broken|fixed|nice|helpful|improve)\b/gi) || []).length,
          request: (text.match(/\b(need|want|would like|could you|can you|please|help me|assist)\b/gi) || []).length,
          statement: text.length > 0 ? 1 : 0,
        };
        const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
        return { intent: best[0], confidence: best[1] > 1 ? 'high' : 'medium', scores };
      },
    },
    // --- v1.6.8: schedule_slots ---
    {
      name: 'schedule_slots',
      description: 'Generate evenly-spaced time slots from a start date for N occurrences.',
      inputSchema: { type: 'object', properties: { start: { type: 'string' }, count: { type: 'number', minimum: 1, maximum: 100 }, intervalHours: { type: 'number', minimum: 0.25, maximum: 8760 } }, required: ['start', 'count', 'intervalHours'], additionalProperties: false },
      handler: async (args) => {
        const d = new Date(args.start);
        if (isNaN(d.getTime())) throw new Error('Invalid start date');
        const slots = [];
        for (let i = 0; i < args.count; i++) {
          slots.push(new Date(d.getTime() + i * args.intervalHours * 3600000).toISOString());
        }
        return { slots, count: slots.length, intervalHours: args.intervalHours };
      },
    },
    // --- v1.6.9: count_tokens_estimate ---
    {
      name: 'count_tokens_estimate',
      description: 'Estimate token count for text (OpenAI-style ~4 chars/token heuristic).',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const text = String(args.text);
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        const charsHeuristic = Math.round(text.length / 4);
        const wordHeuristic = Math.round(words * 1.3);
        return { estimatedTokens: Math.max(charsHeuristic, wordHeuristic), chars: text.length, words, method: 'heuristic' };
      },
    },
    // --- v1.7.0: pipeline_chain ---
    {
      name: 'pipeline_chain',
      description: 'Chain multiple text transforms in sequence: normalize_whitespace, change_case, slugify, strip_html, truncate.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          steps: { type: 'array', description: 'Array of {op, args} objects. ops: normalize, lower, upper, title, slug, strip_html, truncate' },
        },
        required: ['text', 'steps'],
        additionalProperties: false,
      },
      handler: async (args) => {
        let text = String(args.text);
        const log = [];
        for (const step of (args.steps || [])) {
          const op = String(step.op || '');
          const prev = text;
          switch (op) {
            case 'normalize': text = text.replace(/\s+/g, ' ').trim(); break;
            case 'lower': text = text.toLowerCase(); break;
            case 'upper': text = text.toUpperCase(); break;
            case 'title': text = toTitleCase(text); break;
            case 'slug': text = slugify(text); break;
            case 'strip_html': text = stripHtml(text); break;
            case 'truncate': { const ml = step.maxLength || 100; text = text.length > ml ? text.slice(0, ml - 3) + '...' : text; break; }
            case 'trim': text = text.trim(); break;
            default: break;
          }
          log.push({ op, changed: prev !== text });
        }
        return { text, log };
      },
    },
    // --- v1.7.1: structured_report ---
    {
      name: 'structured_report',
      description: 'Generate a structured text report with title, summary, details, and recommendations.',
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          summary: { type: 'string' },
          details: { type: 'array' },
          recommendations: { type: 'array' },
          score: { type: 'number' },
        },
        required: ['title'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const sections = [
          { heading: args.title, level: 1 },
          ...(args.summary ? [{ heading: 'Summary', level: 2, body: args.summary }] : []),
          ...(args.score != null ? [{ heading: 'Score', level: 2, body: `**${args.score}/100** — ${colorCode(args.score, {})} status` }] : []),
          ...(args.details && args.details.length ? [{ heading: 'Details', level: 2, items: args.details.map(String) }] : []),
          ...(args.recommendations && args.recommendations.length ? [{ heading: 'Recommendations', level: 2, items: args.recommendations.map(String) }] : []),
        ];
        return { report: buildMarkdownDoc(sections), generatedAt: new Date().toISOString() };
      },
    },
    // --- v1.7.2: json_aggregate ---
    {
      name: 'json_aggregate',
      description: 'Aggregate a JSON array by grouping on a key and computing counts/values.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, groupBy: { type: 'string' }, countOnly: { type: 'boolean' } }, required: ['text', 'groupBy'], additionalProperties: false },
      handler: async (args) => {
        const arr = JSON.parse(String(args.text));
        if (!Array.isArray(arr)) throw new Error('Expected JSON array');
        const groups = {};
        for (const item of arr) {
          const key = String(item[args.groupBy] ?? '__undefined__');
          if (!groups[key]) groups[key] = { count: 0, items: [] };
          groups[key].count++;
          if (!args.countOnly) groups[key].items.push(item);
        }
        return { groups: Object.entries(groups).map(([key, val]) => ({ key, count: val.count, ...(args.countOnly ? {} : { items: val.items }) })).sort((a, b) => b.count - a.count) };
      },
    },
    // --- v1.7.3: text_outline ---
    {
      name: 'text_outline',
      description: 'Extract a structural outline (headings, bullets) from text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const lines = String(args.text).split(/\r?\n/);
        const outline = lines
          .map((l) => {
            const mdH = l.match(/^(#{1,6})\s+(.+)/);
            if (mdH) return { type: 'heading', level: mdH[1].length, text: mdH[2].trim() };
            const bullet = l.match(/^\s*[-*+•]\s+(.+)/);
            if (bullet) return { type: 'bullet', text: bullet[1].trim() };
            const numbered = l.match(/^\s*\d+[.)]\s+(.+)/);
            if (numbered) return { type: 'numbered', text: numbered[1].trim() };
            return null;
          })
          .filter(Boolean);
        return { outline, count: outline.length };
      },
    },
    // --- v1.7.4: phone_numbers_extract ---
    {
      name: 'phone_numbers_extract',
      description: 'Extract phone number patterns from text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const phones = [...new Set(String(args.text).match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || [])];
        return { phones, count: phones.length };
      },
    },
    // --- v1.7.5: sentiment_heuristic ---
    {
      name: 'sentiment_heuristic',
      description: 'Estimate text sentiment as positive, negative, or neutral using keyword heuristics.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const positive = ['good', 'great', 'excellent', 'amazing', 'awesome', 'fantastic', 'perfect', 'happy', 'love', 'best', 'wonderful', 'nice', 'success', 'win', 'positive', 'helpful', 'effective', 'clear', 'fast', 'easy', 'improve', 'resolved', 'fixed', 'done'];
        const negative = ['bad', 'terrible', 'awful', 'broken', 'fail', 'error', 'wrong', 'issue', 'problem', 'slow', 'confusing', 'hard', 'difficult', 'missing', 'lost', 'hate', 'worst', 'poor', 'ugly', 'blocked', 'crash', 'bug', 'not', 'never', 'cannot', 'cant'];
        const text = String(args.text).toLowerCase();
        const pos = positive.filter((w) => text.includes(w)).length;
        const neg = negative.filter((w) => text.includes(w)).length;
        const score = pos - neg;
        return {
          sentiment: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral',
          score,
          positiveSignals: pos,
          negativeSignals: neg,
        };
      },
    },
    // --- v1.7.6: abbreviations_expand ---
    {
      name: 'abbreviations_expand',
      description: 'Replace common abbreviations in text with their full forms.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, custom: { type: 'object' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const builtIn = { 'API': 'Application Programming Interface', 'URL': 'Uniform Resource Locator', 'HTTP': 'Hypertext Transfer Protocol', 'JSON': 'JavaScript Object Notation', 'CSV': 'Comma-Separated Values', 'XML': 'eXtensible Markup Language', 'UUID': 'Universally Unique Identifier', 'SQL': 'Structured Query Language', 'CLI': 'Command Line Interface', 'GUI': 'Graphical User Interface', 'MCP': 'Model Context Protocol', 'AI': 'Artificial Intelligence', 'LLM': 'Large Language Model', 'ETL': 'Extract Transform Load', 'KPI': 'Key Performance Indicator', 'SLA': 'Service Level Agreement', 'TBD': 'To Be Determined', 'TBD': 'To Be Determined', 'N/A': 'Not Applicable', 'ETA': 'Estimated Time of Arrival' };
        const expanded = Object.assign({}, builtIn, args.custom || {});
        let text = String(args.text);
        const found = [];
        for (const [abbr, full] of Object.entries(expanded)) {
          const re = new RegExp(`\\b${abbr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
          if (re.test(text)) { found.push({ abbr, full }); text = text.replace(re, `${abbr} (${full})`); }
        }
        return { text, expandedCount: found.length, expanded: found };
      },
    },
    // --- v1.7.7: table_transpose ---
    {
      name: 'table_transpose',
      description: 'Transpose a JSON array of objects (swap rows and columns).',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const rows = JSON.parse(String(args.text));
        if (!Array.isArray(rows) || !rows.length) return { transposed: [] };
        const headers = Object.keys(rows[0]);
        const transposed = headers.map((h) => {
          const result = { field: h };
          rows.forEach((r, i) => { result[`row_${i}`] = r[h]; });
          return result;
        });
        return { transposed };
      },
    },
    // --- v1.7.8: named_entity_extract ---
    {
      name: 'named_entity_extract',
      description: 'Heuristically extract potential named entities (capitalized multi-word phrases) from text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const matches = String(args.text).match(/\b[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]+){0,3}/g) || [];
        const stopwords = new Set(['The', 'A', 'An', 'This', 'That', 'These', 'Those', 'In', 'At', 'On', 'For', 'With', 'By', 'From', 'To', 'Of', 'And', 'Or', 'But', 'I', 'We', 'It', 'He', 'She', 'They']);
        const entities = [...new Set(matches.filter((m) => !stopwords.has(m) && m.length > 2))];
        return { entities, count: entities.length };
      },
    },
    // --- v1.7.9: data_anomalies ---
    {
      name: 'data_anomalies',
      description: 'Detect outliers in a list of numbers using IQR method.',
      inputSchema: { type: 'object', properties: { numbers: { type: 'array' }, multiplier: { type: 'number' } }, required: ['numbers'], additionalProperties: false },
      handler: async (args) => {
        const nums = (args.numbers || []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
        if (nums.length < 4) return { outliers: [], method: 'IQR', note: 'Need at least 4 values' };
        const q1 = nums[Math.floor(nums.length * 0.25)];
        const q3 = nums[Math.floor(nums.length * 0.75)];
        const iqr = q3 - q1;
        const k = args.multiplier || 1.5;
        const lo = q1 - k * iqr, hi = q3 + k * iqr;
        const outliers = nums.filter((v) => v < lo || v > hi);
        return { outliers, q1, q3, iqr, lowerFence: lo, upperFence: hi, method: `IQR x${k}` };
      },
    },
    // --- v1.8.0: number_format ---
    {
      name: 'number_format',
      description: 'Format a number with thousands separators, decimal places, and optional prefix/suffix.',
      inputSchema: { type: 'object', properties: { value: { type: 'number' }, decimals: { type: 'number', minimum: 0, maximum: 10 }, prefix: { type: 'string' }, suffix: { type: 'string' }, locale: { type: 'string' } }, required: ['value'], additionalProperties: false },
      handler: async (args) => {
        const decimals = args.decimals != null ? args.decimals : 2;
        const formatted = (args.value || 0).toLocaleString(args.locale || 'en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        return { formatted: `${args.prefix || ''}${formatted}${args.suffix || ''}` };
      },
    },
    // --- v1.8.1: hex_rgb ---
    {
      name: 'hex_rgb',
      description: 'Convert between hex color codes and RGB values.',
      inputSchema: { type: 'object', properties: { input: { type: 'string' }, mode: { type: 'string', enum: ['hex_to_rgb', 'rgb_to_hex'] } }, required: ['input', 'mode'], additionalProperties: false },
      handler: async (args) => {
        if (args.mode === 'hex_to_rgb') {
          const hex = String(args.input).replace('#', '');
          const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
          return { r, g, b, rgb: `rgb(${r},${g},${b})` };
        } else {
          const parts = String(args.input).match(/\d+/g) || [];
          const [r, g, b] = parts.map((v) => Math.max(0, Math.min(255, parseInt(v, 10))));
          return { hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}` };
        }
      },
    },
    // --- v1.8.2: roman_numerals ---
    {
      name: 'roman_numerals',
      description: 'Convert between integers and Roman numerals.',
      inputSchema: { type: 'object', properties: { value: { type: 'string' }, mode: { type: 'string', enum: ['to_roman', 'from_roman'] } }, required: ['value', 'mode'], additionalProperties: false },
      handler: async (args) => {
        const MAP = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
        if (args.mode === 'to_roman') {
          let n = parseInt(args.value, 10), result = '';
          if (!n || n < 1 || n > 3999) throw new Error('Value must be 1-3999');
          for (const [v, s] of MAP) { while (n >= v) { result += s; n -= v; } }
          return { roman: result };
        } else {
          const rom = String(args.value).toUpperCase();
          const VALS = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
          let total = 0;
          for (let i = 0; i < rom.length; i++) {
            const cur = VALS[rom[i]] || 0, nxt = VALS[rom[i + 1]] || 0;
            total += cur < nxt ? -cur : cur;
          }
          return { number: total };
        }
      },
    },
    // --- v1.8.3: unit_convert ---
    {
      name: 'unit_convert',
      description: 'Convert between common units: length, weight, temperature, data size.',
      inputSchema: { type: 'object', properties: { value: { type: 'number' }, from: { type: 'string' }, to: { type: 'string' } }, required: ['value', 'from', 'to'], additionalProperties: false },
      handler: async (args) => {
        const toBase = { m: 1, km: 1000, cm: 0.01, mm: 0.001, ft: 0.3048, in: 0.0254, mi: 1609.344, yd: 0.9144, kg: 1, g: 0.001, lb: 0.4536, oz: 0.02835, t: 1000, bytes: 1, kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776 };
        const fromL = args.from.toLowerCase(), toL = args.to.toLowerCase();
        // Temperature special case
        if (['c','f','k'].includes(fromL) && ['c','f','k'].includes(toL)) {
          let celsius = fromL === 'c' ? args.value : fromL === 'f' ? (args.value - 32) * 5 / 9 : args.value - 273.15;
          const result = toL === 'c' ? celsius : toL === 'f' ? celsius * 9 / 5 + 32 : celsius + 273.15;
          return { value: Math.round(result * 10000) / 10000, from: args.from, to: args.to };
        }
        if (!toBase[fromL] || !toBase[toL]) throw new Error(`Unknown unit: ${args.from} or ${args.to}`);
        const base = args.value * toBase[fromL];
        return { value: Math.round(base / toBase[toL] * 1e8) / 1e8, from: args.from, to: args.to };
      },
    },
    // --- v1.8.4: anagram_info ---
    {
      name: 'anagram_info',
      description: 'Return anagram signature and letter composition for a word.',
      inputSchema: { type: 'object', properties: { word: { type: 'string' } }, required: ['word'], additionalProperties: false },
      handler: async (args) => {
        const info = anagramsOf(args.word);
        const freq = {};
        for (const c of info.sortedLetters) { freq[c] = (freq[c] || 0) + 1; }
        return { ...info, letterFrequency: freq };
      },
    },
    // --- v1.8.5: csv_rename_columns ---
    {
      name: 'csv_rename_columns',
      description: 'Rename CSV columns using a mapping object.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, columnMap: { type: 'object' } }, required: ['text', 'columnMap'], additionalProperties: false },
      handler: async (args) => {
        const { headers, rows } = csvToArray(args.text);
        const newHeaders = headers.map((h) => (args.columnMap && args.columnMap[h]) ? String(args.columnMap[h]) : h);
        const newRows = rows.map((r) => {
          const nr = {};
          headers.forEach((h, i) => { nr[newHeaders[i]] = r[h]; });
          return nr;
        });
        const csvLines = [newHeaders.join(','), ...newRows.map((r) => newHeaders.map((h) => JSON.stringify(r[h] ?? '')).join(','))];
        return { text: csvLines.join('\n') };
      },
    },
    // --- v1.8.6: json_array_filter ---
    {
      name: 'json_array_filter',
      description: 'Filter a JSON array keeping items where a field matches a value or pattern.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, field: { type: 'string' }, pattern: { type: 'string' }, ignoreCase: { type: 'boolean' } }, required: ['text', 'field', 'pattern'], additionalProperties: false },
      handler: async (args) => {
        const arr = JSON.parse(String(args.text));
        if (!Array.isArray(arr)) throw new Error('Expected JSON array');
        const re = new RegExp(args.pattern, args.ignoreCase ? 'i' : '');
        const filtered = arr.filter((item) => re.test(String(item[args.field] ?? '')));
        return { items: filtered, count: filtered.length, removed: arr.length - filtered.length };
      },
    },
    // --- v1.8.7: json_array_sort ---
    {
      name: 'json_array_sort',
      description: 'Sort a JSON array of objects by a field.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, field: { type: 'string' }, reverse: { type: 'boolean' }, numeric: { type: 'boolean' } }, required: ['text', 'field'], additionalProperties: false },
      handler: async (args) => {
        const arr = JSON.parse(String(args.text));
        if (!Array.isArray(arr)) throw new Error('Expected JSON array');
        const sorted = [...arr].sort((a, b) => {
          const av = a[args.field] ?? '', bv = b[args.field] ?? '';
          const cmp = args.numeric ? Number(av) - Number(bv) : String(av).localeCompare(String(bv));
          return args.reverse ? -cmp : cmp;
        });
        return { items: sorted };
      },
    },
    // --- v1.8.8: markdown_toc ---
    {
      name: 'markdown_toc',
      description: 'Generate a table of contents from Markdown headings.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, maxLevel: { type: 'number', minimum: 1, maximum: 6 } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const maxLevel = args.maxLevel || 3;
        const lines = String(args.text).split(/\r?\n/);
        const toc = [];
        for (const line of lines) {
          const m = line.match(/^(#{1,6})\s+(.+)/);
          if (m && m[1].length <= maxLevel) {
            const level = m[1].length;
            const text = m[2].trim();
            const anchor = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            toc.push({ level, text, anchor, indent: '  '.repeat(level - 1) });
          }
        }
        const markdown = toc.map((item) => `${item.indent}- [${item.text}](#${item.anchor})`).join('\n');
        return { toc, markdown };
      },
    },
    // --- v1.8.9: changelog_entry ---
    {
      name: 'changelog_entry',
      description: 'Generate a formatted changelog entry for a version.',
      inputSchema: { type: 'object', properties: { version: { type: 'string' }, date: { type: 'string' }, added: { type: 'array' }, changed: { type: 'array' }, fixed: { type: 'array' }, removed: { type: 'array' } }, required: ['version'], additionalProperties: false },
      handler: async (args) => {
        const date = args.date || new Date().toISOString().slice(0, 10);
        const lines = [`## [${args.version}] - ${date}`, ''];
        if (args.added && args.added.length) { lines.push('### Added', ...(args.added || []).map((l) => `- ${l}`), ''); }
        if (args.changed && args.changed.length) { lines.push('### Changed', ...(args.changed || []).map((l) => `- ${l}`), ''); }
        if (args.fixed && args.fixed.length) { lines.push('### Fixed', ...(args.fixed || []).map((l) => `- ${l}`), ''); }
        if (args.removed && args.removed.length) { lines.push('### Removed', ...(args.removed || []).map((l) => `- ${l}`), ''); }
        return { entry: lines.join('\n') };
      },
    },
    // --- v1.9.0: code_extract ---
    {
      name: 'code_extract',
      description: 'Extract code blocks from Markdown text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, lang: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const re = /```([a-z0-9]*)\n([\s\S]*?)```/gi;
        const blocks = [];
        for (const m of String(args.text).matchAll(re)) {
          if (!args.lang || m[1].toLowerCase() === args.lang.toLowerCase() || m[1] === '') {
            blocks.push({ lang: m[1] || 'plain', code: m[2].trim() });
          }
        }
        return { blocks, count: blocks.length };
      },
    },
    // --- v1.9.1: table_stats ---
    {
      name: 'table_stats',
      description: 'Produce row/column statistics for a JSON array (count, null rate per field).',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const arr = JSON.parse(String(args.text));
        if (!Array.isArray(arr) || !arr.length) return { rowCount: 0, fields: [] };
        const fields = Object.keys(arr[0]).map((f) => {
          const nulls = arr.filter((r) => r[f] == null || r[f] === '').length;
          const vals = arr.map((r) => r[f]).filter((v) => v != null && v !== '');
          const nums = vals.map(Number).filter(Number.isFinite);
          return { field: f, rowCount: arr.length, nullCount: nulls, nullRate: Math.round(nulls / arr.length * 100), uniqueValues: new Set(vals.map(String)).size, ...(nums.length ? { numericMin: Math.min(...nums), numericMax: Math.max(...nums), numericMean: Math.round(nums.reduce((a, b) => a + b, 0) / nums.length * 100) / 100 } : {}) };
        });
        return { rowCount: arr.length, fieldCount: fields.length, fields };
      },
    },
    // --- v1.9.2: query_language ---
    {
      name: 'query_language',
      description: 'Run a simple filter/select query on a JSON array. Supports field selection and comparison filters.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'JSON array' },
          select: { type: 'array', description: 'Fields to include (empty = all)' },
          where: { type: 'object', description: '{field: value} exact match filters' },
          limit: { type: 'number', minimum: 1 },
        },
        required: ['text'],
        additionalProperties: false,
      },
      handler: async (args) => {
        let arr = JSON.parse(String(args.text));
        if (!Array.isArray(arr)) throw new Error('Expected JSON array');
        if (args.where && typeof args.where === 'object') {
          for (const [k, v] of Object.entries(args.where)) {
            arr = arr.filter((item) => String(item[k] ?? '') === String(v));
          }
        }
        if (args.select && args.select.length) {
          arr = arr.map((item) => Object.fromEntries((args.select || []).map((k) => [k, item[k]])));
        }
        if (args.limit) arr = arr.slice(0, args.limit);
        return { items: arr, count: arr.length };
      },
    },
    // --- v1.9.3: fuzzy_match ---
    {
      name: 'fuzzy_match',
      description: 'Fuzzy-match a query against a list of candidates, ranked by similarity.',
      inputSchema: { type: 'object', properties: { query: { type: 'string' }, candidates: { type: 'array' }, topN: { type: 'number', minimum: 1, maximum: 50 } }, required: ['query', 'candidates'], additionalProperties: false },
      handler: async (args) => {
        const q = String(args.query);
        const results = (args.candidates || []).map((c) => {
          const s = String(c);
          const dist = levenshtein(q.toLowerCase(), s.toLowerCase());
          const sim = Math.max(q.length, s.length) > 0 ? Math.round((1 - dist / Math.max(q.length, s.length)) * 1000) / 1000 : 1;
          return { candidate: s, similarity: sim, distance: dist };
        }).sort((a, b) => b.similarity - a.similarity).slice(0, args.topN || 10);
        return { query: q, matches: results };
      },
    },
    // --- v1.9.4: json_path_set ---
    {
      name: 'json_path_set',
      description: 'Set a value at a dotted path in a JSON object.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, path: { type: 'string' }, value: {} }, required: ['text', 'path', 'value'], additionalProperties: false },
      handler: async (args) => {
        const obj = JSON.parse(String(args.text));
        const parts = String(args.path).split('.').filter(Boolean);
        let cur = obj;
        for (let i = 0; i < parts.length - 1; i++) {
          if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object') cur[parts[i]] = {};
          cur = cur[parts[i]];
        }
        if (parts.length) cur[parts[parts.length - 1]] = args.value;
        return { value: obj };
      },
    },
    // --- v1.9.5: text_redact ---
    {
      name: 'text_redact',
      description: 'Redact sensitive patterns (emails, phones, IPs, SSNs, credit cards) from text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, replacement: { type: 'string' }, patterns: { type: 'array', description: 'Optional custom regex patterns to redact' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        let text = String(args.text);
        const rep = String(args.replacement || '[REDACTED]');
        const builtIn = [
          /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
          /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
          /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
          /\b\d{3}-\d{2}-\d{4}\b/g,
          /\b(?:\d[ -]?){13,16}\b/g,
        ];
        let redacted = 0;
        for (const re of builtIn) {
          const count = (text.match(re) || []).length;
          text = text.replace(re, rep);
          redacted += count;
        }
        for (const pattern of (args.patterns || [])) {
          const re = new RegExp(String(pattern), 'g');
          const count = (text.match(re) || []).length;
          text = text.replace(re, rep);
          redacted += count;
        }
        return { text, redactedCount: redacted };
      },
    },
    // --- v1.9.6: batch_uuid ---
    {
      name: 'batch_uuid',
      description: 'Generate a labelled batch of UUIDs for entity assignment.',
      inputSchema: { type: 'object', properties: { labels: { type: 'array' } }, required: ['labels'], additionalProperties: false },
      handler: async (args) => {
        const assignments = (args.labels || []).map((label) => ({ label: String(label), uuid: crypto.randomUUID() }));
        return { assignments, count: assignments.length };
      },
    },
    // --- v1.9.7: task_list_parse ---
    {
      name: 'task_list_parse',
      description: 'Parse a Markdown-style task list (- [ ] / - [x]) into structured tasks.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const lines = String(args.text).split(/\r?\n/);
        const tasks = lines.map((l, i) => {
          const m = l.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.+)/);
          if (!m) return null;
          return { index: i, done: m[1].toLowerCase() === 'x', text: m[2].trim() };
        }).filter(Boolean);
        return { tasks, total: tasks.length, done: tasks.filter((t) => t.done).length, pending: tasks.filter((t) => !t.done).length };
      },
    },
    // --- v1.9.8: structured_log_parse ---
    {
      name: 'structured_log_parse',
      description: 'Parse common log line formats (ISO timestamp, level, message) into structured entries.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, limit: { type: 'number', minimum: 1, maximum: 1000 } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const lines = String(args.text).split(/\r?\n/).filter(Boolean);
        const levelRe = /\b(DEBUG|INFO|WARN|WARNING|ERROR|FATAL|CRITICAL|TRACE)\b/i;
        const tsRe = /\d{4}-\d{2}-\d{2}T?\d{2}:\d{2}:\d{2}/;
        const entries = lines.slice(0, args.limit || 200).map((line) => {
          const ts = line.match(tsRe);
          const level = line.match(levelRe);
          const msg = line.replace(tsRe, '').replace(levelRe, '').replace(/[\[\]]/g, '').replace(/\s+/g, ' ').trim();
          return { timestamp: ts ? ts[0] : null, level: level ? level[0].toUpperCase() : null, message: msg, raw: line };
        });
        const levelCounts = {};
        for (const e of entries) { if (e.level) levelCounts[e.level] = (levelCounts[e.level] || 0) + 1; }
        return { entries, count: entries.length, levelCounts };
      },
    },
    // --- v1.9.9: emoji_strip ---
    {
      name: 'emoji_strip',
      description: 'Remove emoji and Unicode symbols from text.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const stripped = String(args.text).replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F1E0}-\u{1F1FF}]/gu, '').replace(/\s+/g, ' ').trim();
        return { text: stripped, changed: stripped !== args.text };
      },
    },
    // --- v2.0.0: pattern_library ---
    {
      name: 'pattern_library',
      description: 'Apply named regex patterns from a built-in library (email, url, phone, ip, uuid, date, credit_card, hashtag, mention).',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, patterns: { type: 'array', description: 'Array of pattern names to extract' } }, required: ['text', 'patterns'], additionalProperties: false },
      handler: async (args) => {
        const LIB = {
          email: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
          url: /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g,
          phone: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
          ip: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
          uuid: /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi,
          date: /\d{4}-\d{2}-\d{2}/g,
          credit_card: /\b(?:\d[ -]?){13,16}\b/g,
          hashtag: /#[a-zA-Z0-9_]+/g,
          mention: /@[a-zA-Z0-9_]+/g,
          integer: /\b-?\d+\b/g,
          float: /-?\d+\.\d+/g,
        };
        const results = {};
        for (const name of (args.patterns || [])) {
          const re = LIB[name.toLowerCase()];
          if (!re) { results[name] = { error: 'unknown pattern' }; continue; }
          re.lastIndex = 0;
          results[name] = [...new Set(String(args.text).match(re) || [])];
        }
        return { results };
      },
    },
    // --- v2.0.1: knowledge_graph_extract ---
    {
      name: 'knowledge_graph_extract',
      description: 'Extract simple subject-verb-object triples from text sentences.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const sentences = sentenceSplit(args.text);
        const triples = [];
        const verbPatterns = /\b(is|are|was|were|has|have|had|does|do|did|can|will|should|must|may|might|contains|includes|provides|requires|supports|creates|returns|handles|processes|manages|generates|validates|converts|transforms|parses)\b/i;
        for (const sent of sentences) {
          const words = sent.trim().split(/\s+/);
          const verbIdx = words.findIndex((w) => verbPatterns.test(w));
          if (verbIdx > 0 && verbIdx < words.length - 1) {
            triples.push({
              subject: words.slice(0, verbIdx).join(' '),
              verb: words[verbIdx],
              object: words.slice(verbIdx + 1).join(' ').replace(/[.!?]+$/, ''),
            });
          }
        }
        return { triples, count: triples.length };
      },
    },
    // --- v2.0.2: scoring_rubric ---
    {
      name: 'scoring_rubric',
      description: 'Score an artifact against a custom rubric (criteria with weights).',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          rubric: { type: 'array', description: 'Array of {name, signal, weight} criteria' },
        },
        required: ['text', 'rubric'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const text = String(args.text).toLowerCase();
        let totalWeight = 0, earnedWeight = 0;
        const scores = (args.rubric || []).map((crit) => {
          const w = Number(crit.weight || 1);
          const hit = text.includes(String(crit.signal || crit.name || '').toLowerCase());
          totalWeight += w;
          if (hit) earnedWeight += w;
          return { criterion: crit.name, signal: crit.signal, weight: w, hit, weightEarned: hit ? w : 0 };
        });
        const score = totalWeight > 0 ? Math.round(earnedWeight / totalWeight * 100) : 0;
        return { score, maxScore: 100, scores, status: colorCode(score, {}) };
      },
    },
    // --- v2.0.3: markdown_lint ---
    {
      name: 'markdown_lint',
      description: 'Lint a Markdown document for common structural issues.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const lines = String(args.text).split(/\r?\n/);
        const issues = [];
        let lastHeadingLevel = 0;
        for (let i = 0; i < lines.length; i++) {
          const l = lines[i], ln = i + 1;
          const hm = l.match(/^(#{1,6})\s/);
          if (hm) {
            const lvl = hm[1].length;
            if (lastHeadingLevel > 0 && lvl > lastHeadingLevel + 1) issues.push({ line: ln, type: 'heading-skip', message: `Heading level skipped from H${lastHeadingLevel} to H${lvl}` });
            lastHeadingLevel = lvl;
          }
          if (l.length > 120) issues.push({ line: ln, type: 'long-line', message: `Line ${ln} is ${l.length} chars (>120)` });
          if (/\t/.test(l)) issues.push({ line: ln, type: 'tab', message: `Line ${ln} contains a tab character` });
          if (/\s+$/.test(l) && l.trim().length > 0) issues.push({ line: ln, type: 'trailing-space', message: `Line ${ln} has trailing whitespace` });
        }
        return { issues, count: issues.length, passed: issues.length === 0 };
      },
    },
    // --- v2.0.4: csv_deduplicate ---
    {
      name: 'csv_deduplicate',
      description: 'Remove duplicate rows from a CSV based on one or more key columns.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, keyColumns: { type: 'array' } }, required: ['text', 'keyColumns'], additionalProperties: false },
      handler: async (args) => {
        const { headers, rows } = csvToArray(args.text);
        const keys = new Set();
        const unique = rows.filter((r) => {
          const k = (args.keyColumns || headers).map((col) => String(r[col] ?? '')).join('|||');
          if (keys.has(k)) return false;
          keys.add(k);
          return true;
        });
        const csvLines = [headers.join(','), ...unique.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(','))];
        return { text: csvLines.join('\n'), kept: unique.length, removed: rows.length - unique.length };
      },
    },
    // --- v2.0.5: prompt_evaluate ---
    {
      name: 'prompt_evaluate',
      description: 'Evaluate a prompt\'s quality: clarity, specificity, context, output format guidance.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const text = String(args.text).toLowerCase();
        const criteria = {
          hasGoal: /\b(create|generate|write|explain|analyze|summarize|list|describe|compare|find|help|build|make)\b/.test(text),
          hasContext: text.length > 80,
          hasOutputFormat: /\b(json|markdown|list|table|paragraph|bullet|summary|report|csv|format)\b/.test(text),
          hasConstraints: /\b(only|must|should|avoid|without|limit|max|minimum|exactly|specific)\b/.test(text),
          hasExamples: /\b(for example|such as|like|e\.g\.|example:|sample|instance)\b/.test(text),
          notTooShort: text.length >= 30,
          notTooVague: !/^(help|do|make|fix|run|try|get)[\s.?!]*$/.test(text.trim()),
        };
        const score = Math.round(Object.values(criteria).filter(Boolean).length / Object.keys(criteria).length * 100);
        const suggestions = Object.entries(criteria).filter(([, v]) => !v).map(([k]) => ({
          hasGoal: 'Add a clear action verb (create, analyze, explain...)',
          hasContext: 'Add more context or background information',
          hasOutputFormat: 'Specify the desired output format (JSON, Markdown, list...)',
          hasConstraints: 'Add constraints or requirements (must, avoid, limit...)',
          hasExamples: 'Include an example to clarify intent',
          notTooShort: 'Expand the prompt with more detail',
          notTooVague: 'Be more specific about what you need',
        }[k] || k));
        return { score, criteria, suggestions };
      },
    },
    // --- v2.1.0: timeline_build ---
    {
      name: 'timeline_build',
      description: 'Build a sorted timeline from a list of {date, event} objects.',
      inputSchema: { type: 'object', properties: { events: { type: 'array' } }, required: ['events'], additionalProperties: false },
      handler: async (args) => {
        const sorted = (args.events || [])
          .map((e) => ({ date: String(e.date || ''), event: String(e.event || ''), epochMs: new Date(e.date || '').getTime() || 0 }))
          .sort((a, b) => a.epochMs - b.epochMs);
        return { timeline: sorted, count: sorted.length, span: sorted.length > 1 ? { from: sorted[0].date, to: sorted[sorted.length - 1].date } : null };
      },
    },
    // --- v2.1.1: csv_calculate_column ---
    {
      name: 'csv_calculate_column',
      description: 'Compute sum, average, min, max, count for a numeric CSV column.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, column: { type: 'string' } }, required: ['text', 'column'], additionalProperties: false },
      handler: async (args) => {
        const { rows } = csvToArray(args.text);
        const nums = rows.map((r) => Number(r[args.column])).filter(Number.isFinite);
        return { column: args.column, ...computeStats(nums) };
      },
    },
    // --- v2.1.2: text_compress_words ---
    {
      name: 'text_compress_words',
      description: 'Reduce text verbosity by removing filler words.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const fillers = /\b(very|really|quite|just|so|basically|literally|actually|honestly|clearly|obviously|simply|merely|totally|absolutely|definitely|certainly|generally|essentially|approximately|basically|you know|i mean|as a matter of fact|at the end of the day|in terms of|the fact that)\b/gi;
        const original = String(args.text);
        const compressed = original.replace(fillers, '').replace(/\s{2,}/g, ' ').trim();
        return { text: compressed, originalWords: original.trim().split(/\s+/).length, compressedWords: compressed.trim().split(/\s+/).length, reductionPct: compressRatio(original.trim().split(/\s+/).length, compressed.trim().split(/\s+/).length) };
      },
    },
    // --- v2.1.3: smart_bullet_points ---
    {
      name: 'smart_bullet_points',
      description: 'Convert a block of text into concise bullet points (sentence-based).',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, maxBullets: { type: 'number', minimum: 1, maximum: 50 }, minWords: { type: 'number' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const sentences = sentenceSplit(args.text);
        const minW = args.minWords || 5;
        const bullets = sentences
          .filter((s) => s.trim().split(/\s+/).length >= minW)
          .slice(0, args.maxBullets || 10)
          .map((s) => `- ${s.trim()}`);
        return { bullets: bullets.join('\n'), count: bullets.length };
      },
    },
    // --- v2.1.4: word_cloud_data ---
    {
      name: 'word_cloud_data',
      description: 'Generate word cloud data (word, count, size) from text, excluding stopwords.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, topN: { type: 'number', minimum: 5, maximum: 100 } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const stopwords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','have','has','had','do','does','did','will','would','could','should','may','might','it','its','this','that','these','those','i','we','you','he','she','they','my','our','your','his','her','their','not','no','so','as','if','than','then','when','where','which','who','what','how','all','any','each','more','most','other','some','such','up','out','about','into','after','before','can']);
        const words = String(args.text).toLowerCase().match(/[a-z]{3,}/g) || [];
        const freq = {};
        for (const w of words) { if (!stopwords.has(w)) freq[w] = (freq[w] || 0) + 1; }
        const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, args.topN || 30);
        const maxCount = sorted[0]?.[1] || 1;
        const cloud = sorted.map(([word, count]) => ({ word, count, size: Math.round(12 + (count / maxCount) * 48) }));
        return { cloud, totalWords: words.length, uniqueWords: Object.keys(freq).length };
      },
    },
    // --- v2.1.5: json_validate_required ---
    {
      name: 'json_validate_required',
      description: 'Validate that all required fields are present and non-empty in a JSON object.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, required: { type: 'array' } }, required: ['text', 'required'], additionalProperties: false },
      handler: async (args) => {
        const obj = JSON.parse(String(args.text));
        const missing = [], empty = [];
        for (const k of (args.required || [])) {
          if (!Object.prototype.hasOwnProperty.call(obj, k)) missing.push(k);
          else if (obj[k] == null || obj[k] === '') empty.push(k);
        }
        return { valid: missing.length === 0 && empty.length === 0, missing, empty, present: (args.required || []).filter((k) => !missing.includes(k) && !empty.includes(k)) };
      },
    },
    // --- v2.1.6: version_compare ---
    {
      name: 'version_compare',
      description: 'Compare two semver version strings and return which is higher.',
      inputSchema: { type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } }, required: ['a', 'b'], additionalProperties: false },
      handler: async (args) => {
        const parse = (v) => String(v).replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0);
        const [a1, a2, a3] = parse(args.a), [b1, b2, b3] = parse(args.b);
        const cmp = a1 !== b1 ? a1 - b1 : a2 !== b2 ? a2 - b2 : a3 - b3;
        return { a: args.a, b: args.b, result: cmp < 0 ? 'b_newer' : cmp > 0 ? 'a_newer' : 'equal', comparison: cmp };
      },
    },
    // --- v2.1.7: xml_extract ---
    {
      name: 'xml_extract',
      description: 'Extract text content from XML/HTML tags.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, tag: { type: 'string' } }, required: ['text', 'tag'], additionalProperties: false },
      handler: async (args) => {
        const re = new RegExp(`<${args.tag}[^>]*>([\\s\\S]*?)<\\/${args.tag}>`, 'gi');
        const matches = [];
        for (const m of String(args.text).matchAll(re)) { matches.push(m[1].trim()); }
        return { values: matches, count: matches.length, tag: args.tag };
      },
    },
    // --- v2.1.8: number_sequence ---
    {
      name: 'number_sequence',
      description: 'Generate arithmetic or geometric number sequences.',
      inputSchema: { type: 'object', properties: { start: { type: 'number' }, end: { type: 'number' }, step: { type: 'number' }, type: { type: 'string', enum: ['arithmetic', 'geometric', 'fibonacci'] }, count: { type: 'number', minimum: 1, maximum: 200 } }, required: ['start'], additionalProperties: false },
      handler: async (args) => {
        const type = args.type || 'arithmetic';
        const count = args.count || (args.end != null ? Math.ceil((args.end - args.start) / (args.step || 1)) + 1 : 10);
        const maxCount = Math.min(count, 200);
        const seq = [];
        if (type === 'fibonacci') {
          let a = 0, b = 1;
          for (let i = 0; i < maxCount; i++) { seq.push(a); [a, b] = [b, a + b]; }
        } else if (type === 'geometric') {
          const r = args.step || 2;
          let v = args.start;
          for (let i = 0; i < maxCount; i++) { seq.push(Math.round(v * 1e8) / 1e8); v *= r; }
        } else {
          const step = args.step || 1;
          for (let i = 0; i < maxCount; i++) { seq.push(args.start + i * step); }
        }
        return { sequence: seq, count: seq.length, type };
      },
    },
    // --- v2.1.9: annotation_build ---
    {
      name: 'annotation_build',
      description: 'Add inline annotations to text at specified character positions.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          annotations: { type: 'array', description: 'Array of {start, end, label} objects' },
        },
        required: ['text', 'annotations'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const text = String(args.text);
        const sorted = [...(args.annotations || [])].sort((a, b) => (b.start || 0) - (a.start || 0));
        let annotated = text;
        for (const ann of sorted) {
          const s = ann.start || 0, e = ann.end || s + 1;
          annotated = annotated.slice(0, s) + `[${annotated.slice(s, e)}](${ann.label || ''})` + annotated.slice(e);
        }
        return { annotated, annotationCount: sorted.length };
      },
    },
    // --- v2.2.0: insight_generator ---
    {
      name: 'insight_generator',
      description: 'Generate actionable insights from data by detecting patterns, counts, and key signals.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, domain: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const text = String(args.text);
        const stats = { chars: text.length, words: text.trim().split(/\s+/).length, sentences: sentenceSplit(text).length };
        const topWords = wordFrequency(text, 5);
        const risks = (text.toLowerCase().match(/\b(risk|blocker|issue|fail|error|problem|concern|delay|broken|critical|urgent)\b/gi) || []).length;
        const actions = (text.match(/\b(TODO|ACTION|MUST|SHOULD|WILL|DO|FIX|RESOLVE)\b/gi) || []).length;
        const dates = (text.match(/\d{4}-\d{2}-\d{2}/g) || []).length;
        const insights = [];
        if (risks > 0) insights.push(`${risks} risk signal(s) detected — review for blockers`);
        if (actions > 0) insights.push(`${actions} action item(s) found — consider creating tasks`);
        if (dates > 0) insights.push(`${dates} date reference(s) found — timeline may be relevant`);
        if (stats.words > 500) insights.push('Long text — consider summarizing or chunking');
        if (stats.sentences > 0 && stats.words / stats.sentences < 8) insights.push('Short sentences detected — may be a list or notes format');
        if (topWords.length) insights.push(`Top keyword: "${topWords[0].word}" (${topWords[0].count}x) — may indicate primary topic`);
        return { insights, stats, topWords, riskSignals: risks, actionItems: actions };
      },
    },
    // --- v2.2.1: csv_cross_join ---
    {
      name: 'csv_cross_join',
      description: 'Join two CSV datasets on a shared key column.',
      inputSchema: { type: 'object', properties: { leftCsv: { type: 'string' }, rightCsv: { type: 'string' }, key: { type: 'string' }, joinType: { type: 'string', enum: ['inner', 'left'] } }, required: ['leftCsv', 'rightCsv', 'key'], additionalProperties: false },
      handler: async (args) => {
        const { headers: lh, rows: lr } = csvToArray(args.leftCsv);
        const { headers: rh, rows: rr } = csvToArray(args.rightCsv);
        const rightMap = {};
        for (const r of rr) { rightMap[String(r[args.key] ?? '')] = r; }
        const extraCols = rh.filter((h) => h !== args.key && !lh.includes(h));
        const allHeaders = [...lh, ...extraCols];
        const joined = [];
        for (const l of lr) {
          const k = String(l[args.key] ?? '');
          const r = rightMap[k];
          if (r) { joined.push({ ...l, ...Object.fromEntries(extraCols.map((c) => [c, r[c] ?? ''])) }); }
          else if (args.joinType === 'left') { joined.push({ ...l, ...Object.fromEntries(extraCols.map((c) => [c, ''])) }); }
        }
        const csvLines = [allHeaders.join(','), ...joined.map((row) => allHeaders.map((h) => JSON.stringify(row[h] ?? '')).join(','))];
        return { text: csvLines.join('\n'), rowCount: joined.length };
      },
    },
    // --- v2.2.2: heatmap_data ---
    {
      name: 'heatmap_data',
      description: 'Generate heatmap-style frequency data from a CSV with row/col/value fields.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, rowKey: { type: 'string' }, colKey: { type: 'string' }, valueKey: { type: 'string' } }, required: ['text', 'rowKey', 'colKey'], additionalProperties: false },
      handler: async (args) => {
        const { rows } = csvToArray(args.text);
        const rowVals = [...new Set(rows.map((r) => String(r[args.rowKey] ?? '')))].sort();
        const colVals = [...new Set(rows.map((r) => String(r[args.colKey] ?? '')))].sort();
        const grid = {};
        for (const r of rows) {
          const rk = String(r[args.rowKey] ?? ''), ck = String(r[args.colKey] ?? '');
          const v = args.valueKey ? Number(r[args.valueKey] || 1) : 1;
          grid[`${rk}||${ck}`] = (grid[`${rk}||${ck}`] || 0) + (Number.isFinite(v) ? v : 1);
        }
        const heatmap = rowVals.map((row) => ({ row, cols: colVals.map((col) => ({ col, value: grid[`${row}||${col}`] || 0 })) }));
        return { heatmap, rows: rowVals, cols: colVals };
      },
    },
    // --- v2.2.3: spell_check_heuristic ---
    {
      name: 'spell_check_heuristic',
      description: 'Flag potentially misspelled words using common patterns (repeated chars, unusual sequences).',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const words = String(args.text).match(/[a-zA-Z]{3,}/g) || [];
        const suspects = words.filter((w) => {
          const lower = w.toLowerCase();
          if (/(.)\1{2,}/.test(lower)) return true;
          if (/[^aeiou]{5,}/i.test(lower)) return true;
          if (lower.length > 20) return true;
          return false;
        });
        return { suspects: [...new Set(suspects)], count: suspects.length, totalWords: words.length };
      },
    },
    // --- v2.2.4: flow_diagram_dsl ---
    {
      name: 'flow_diagram_dsl',
      description: 'Generate a Mermaid flowchart DSL from a list of step transitions.',
      inputSchema: { type: 'object', properties: { steps: { type: 'array', description: 'Array of {from, to, label} transitions' }, direction: { type: 'string', enum: ['LR', 'TD', 'RL', 'BT'] } }, required: ['steps'], additionalProperties: false },
      handler: async (args) => {
        const dir = args.direction || 'LR';
        const lines = [`flowchart ${dir}`];
        for (const s of (args.steps || [])) {
          const from = slugify(String(s.from || 'start')).replace(/-/g, '_');
          const to = slugify(String(s.to || 'end')).replace(/-/g, '_');
          const lbl = s.label ? `|${s.label}|` : '';
          lines.push(`  ${from}["${s.from}"] -->${lbl} ${to}["${s.to}"]`);
        }
        return { mermaid: lines.join('\n') };
      },
    },
    // --- v2.2.5: query_builder ---
    {
      name: 'query_builder',
      description: 'Build a SQL SELECT query string from structured parameters.',
      inputSchema: {
        type: 'object',
        properties: {
          table: { type: 'string' },
          fields: { type: 'array' },
          where: { type: 'object' },
          orderBy: { type: 'string' },
          limit: { type: 'number', minimum: 1 },
        },
        required: ['table'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const fields = (args.fields && args.fields.length) ? args.fields.join(', ') : '*';
        const conditions = args.where ? Object.entries(args.where).map(([k, v]) => `${k} = '${String(v).replace(/'/g, "''")}'`) : [];
        let query = `SELECT ${fields} FROM ${args.table}`;
        if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;
        if (args.orderBy) query += ` ORDER BY ${args.orderBy}`;
        if (args.limit) query += ` LIMIT ${args.limit}`;
        return { query: query + ';' };
      },
    },
    // --- v2.3.0: gap_analysis ---
    {
      name: 'gap_analysis',
      description: 'Identify gaps between a required set and an actual set of items.',
      inputSchema: { type: 'object', properties: { required: { type: 'array' }, actual: { type: 'array' }, ignoreCase: { type: 'boolean' } }, required: ['required', 'actual'], additionalProperties: false },
      handler: async (args) => {
        const normalize = (s) => args.ignoreCase ? String(s).toLowerCase() : String(s);
        const actualSet = new Set((args.actual || []).map(normalize));
        const missing = (args.required || []).filter((r) => !actualSet.has(normalize(r)));
        const extra = (args.actual || []).filter((a) => !(args.required || []).map(normalize).includes(normalize(a)));
        return { missing, extra, coverage: Math.round(((args.required || []).length - missing.length) / Math.max(1, (args.required || []).length) * 100) };
      },
    },
    // --- v2.3.1: feature_flags ---
    {
      name: 'feature_flags',
      description: 'Evaluate feature flag conditions against a context object.',
      inputSchema: {
        type: 'object',
        properties: {
          flags: { type: 'array', description: 'Array of {name, condition: {field, op, value}} flag definitions' },
          context: { type: 'object', description: 'Context object with field values' },
        },
        required: ['flags', 'context'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const results = (args.flags || []).map((flag) => {
          const cond = flag.condition || {};
          const actual = (args.context || {})[cond.field];
          let enabled = false;
          switch (String(cond.op || 'eq')) {
            case 'eq': enabled = String(actual) === String(cond.value); break;
            case 'neq': enabled = String(actual) !== String(cond.value); break;
            case 'gt': enabled = Number(actual) > Number(cond.value); break;
            case 'lt': enabled = Number(actual) < Number(cond.value); break;
            case 'contains': enabled = String(actual || '').includes(String(cond.value)); break;
            case 'exists': enabled = actual != null; break;
            default: enabled = false;
          }
          return { flag: flag.name, enabled, reason: `${cond.field} ${cond.op} ${cond.value}` };
        });
        return { flags: results, enabledCount: results.filter((r) => r.enabled).length };
      },
    },
    // --- v2.3.2: metric_dashboard ---
    {
      name: 'metric_dashboard',
      description: 'Build a metric dashboard summary from key-value metric data.',
      inputSchema: { type: 'object', properties: { metrics: { type: 'object' }, thresholds: { type: 'object' }, title: { type: 'string' } }, required: ['metrics'], additionalProperties: false },
      handler: async (args) => {
        const thresholds = args.thresholds || {};
        const items = Object.entries(args.metrics || {}).map(([key, value]) => {
          const th = thresholds[key];
          let status = 'ok';
          if (th) {
            if (th.max != null && Number(value) > th.max) status = 'warning';
            if (th.critical != null && Number(value) > th.critical) status = 'critical';
            if (th.min != null && Number(value) < th.min) status = 'warning';
          }
          return { key, value, status };
        });
        const lines = [`# ${args.title || 'Dashboard'}`, '', ...items.map((i) => `- **${i.key}**: ${i.value} [${i.status}]`)];
        return { items, markdown: lines.join('\n'), critical: items.filter((i) => i.status === 'critical').length, warnings: items.filter((i) => i.status === 'warning').length };
      },
    },
    // --- v2.3.3: dependency_sort ---
    {
      name: 'dependency_sort',
      description: 'Topologically sort tasks that have dependencies.',
      inputSchema: { type: 'object', properties: { tasks: { type: 'array', description: 'Array of {id, deps: [id]} task objects' } }, required: ['tasks'], additionalProperties: false },
      handler: async (args) => {
        const tasks = args.tasks || [];
        const depMap = {};
        const allIds = new Set(tasks.map((t) => String(t.id)));
        for (const t of tasks) { depMap[String(t.id)] = (t.deps || []).map(String).filter((d) => allIds.has(d)); }
        const result = [], visited = new Set(), temp = new Set();
        function visit(id) {
          if (temp.has(id)) throw new Error(`Circular dependency at ${id}`);
          if (!visited.has(id)) {
            temp.add(id);
            for (const dep of (depMap[id] || [])) visit(dep);
            temp.delete(id);
            visited.add(id);
            result.push(id);
          }
        }
        for (const id of allIds) visit(id);
        return { sorted: result, count: result.length };
      },
    },
    // --- v2.3.4: audit_log_format ---
    {
      name: 'audit_log_format',
      description: 'Format an audit log entry with actor, action, resource, and timestamp.',
      inputSchema: { type: 'object', properties: { actor: { type: 'string' }, action: { type: 'string' }, resource: { type: 'string' }, metadata: { type: 'object' } }, required: ['actor', 'action', 'resource'], additionalProperties: false },
      handler: async (args) => {
        const entry = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          actor: args.actor,
          action: args.action,
          resource: args.resource,
          metadata: args.metadata || {},
        };
        return { entry, formatted: `[${entry.timestamp}] ${entry.actor} ${entry.action} ${entry.resource} (id:${entry.id})` };
      },
    },
    // --- v2.3.5: text_highlight ---
    {
      name: 'text_highlight',
      description: 'Highlight matching terms in text by wrapping them in a marker pattern.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, terms: { type: 'array' }, marker: { type: 'string' } }, required: ['text', 'terms'], additionalProperties: false },
      handler: async (args) => {
        const marker = String(args.marker || '**$1**');
        let text = String(args.text);
        let count = 0;
        for (const term of (args.terms || [])) {
          const re = new RegExp(`(${String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
          const before = text;
          text = text.replace(re, marker);
          if (text !== before) count++;
        }
        return { text, matchedTerms: count };
      },
    },
    // --- v2.3.6: batch_validate ---
    {
      name: 'batch_validate',
      description: 'Validate a JSON array of objects against a shared JSON Schema.',
      inputSchema: { type: 'object', properties: { text: { type: 'string', description: 'JSON array' }, schema: { type: 'object' } }, required: ['text', 'schema'], additionalProperties: false },
      handler: async (args) => {
        const arr = JSON.parse(String(args.text));
        if (!Array.isArray(arr)) throw new Error('Expected JSON array');
        const results = arr.map((item, i) => {
          const errors = validateJsonSchema(item, args.schema);
          return { index: i, valid: errors.length === 0, errors };
        });
        return { total: results.length, valid: results.filter((r) => r.valid).length, invalid: results.filter((r) => !r.valid).length, results };
      },
    },
    // --- v2.3.7: spell_normalize ---
    {
      name: 'spell_normalize',
      description: 'Normalize common spelling variants and typos using a replacement map.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, corrections: { type: 'object' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const builtIn = { 'teh': 'the', 'recieve': 'receive', 'occured': 'occurred', 'seperate': 'separate', 'definately': 'definitely', 'calender': 'calendar', 'goverment': 'government', 'arguement': 'argument', 'occurance': 'occurrence', 'accomodate': 'accommodate', 'maintainance': 'maintenance', 'commited': 'committed', 'bussiness': 'business', 'sucessful': 'successful', 'preformance': 'performance', 'completetion': 'completion', 'availible': 'available', 'suppport': 'support', 'implementaion': 'implementation' };
        const corrections = Object.assign({}, builtIn, args.corrections || {});
        let text = String(args.text);
        const fixed = [];
        for (const [typo, correct] of Object.entries(corrections)) {
          const re = new RegExp(`\\b${typo}\\b`, 'gi');
          if (re.test(text)) { fixed.push({ typo, correct }); text = text.replace(re, correct); }
        }
        return { text, corrections: fixed, count: fixed.length };
      },
    },
    // --- v2.3.8: network_graph_build ---
    {
      name: 'network_graph_build',
      description: 'Build a simple network graph (nodes, edges) from a list of {source, target, weight} relationships.',
      inputSchema: { type: 'object', properties: { relationships: { type: 'array' } }, required: ['relationships'], additionalProperties: false },
      handler: async (args) => {
        const nodeSet = new Set();
        const edges = (args.relationships || []).map((r) => {
          nodeSet.add(String(r.source || ''));
          nodeSet.add(String(r.target || ''));
          return { source: String(r.source || ''), target: String(r.target || ''), weight: Number(r.weight || 1) };
        });
        const nodes = [...nodeSet].map((id) => ({
          id,
          degree: edges.filter((e) => e.source === id || e.target === id).length,
        })).sort((a, b) => b.degree - a.degree);
        return { nodes, edges, nodeCount: nodes.length, edgeCount: edges.length };
      },
    },
    // --- v2.3.9: prompt_template_pack ---
    {
      name: 'prompt_template_pack',
      description: 'Generate a pack of domain-specific prompt templates for common tasks.',
      inputSchema: { type: 'object', properties: { domain: { type: 'string' }, goal: { type: 'string' } }, required: ['domain', 'goal'], additionalProperties: false },
      handler: async (args) => {
        const d = String(args.domain || config.domainLabel), g = String(args.goal || 'accomplish the task');
        return {
          templates: [
            { name: 'analysis', prompt: `Analyze the following ${d} content and identify key patterns, issues, and opportunities related to: ${g}` },
            { name: 'transformation', prompt: `Transform the provided ${d} content to achieve: ${g}. Preserve meaning and apply best practices.` },
            { name: 'review', prompt: `Review this ${d} artifact for quality, completeness, and alignment with: ${g}. Provide specific actionable feedback.` },
            { name: 'generation', prompt: `Generate a high-quality ${d} artifact that fulfills: ${g}. Include all required sections and follow conventions.` },
            { name: 'debugging', prompt: `Diagnose and fix issues in the provided ${d} content. Goal: ${g}. List each issue and correction.` },
          ],
        };
      },
    },
    // --- v2.4.0: correlation_matrix ---
    {
      name: 'correlation_matrix',
      description: 'Compute a simple correlation matrix between numeric columns in a CSV.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, columns: { type: 'array' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const { headers, rows } = csvToArray(args.text);
        const cols = (args.columns && args.columns.length) ? args.columns : headers;
        const numericCols = cols.filter((c) => rows.some((r) => Number.isFinite(Number(r[c]))));
        const data = Object.fromEntries(numericCols.map((c) => [c, rows.map((r) => Number(r[c])).filter(Number.isFinite)]));
        function pearson(xs, ys) {
          const n = Math.min(xs.length, ys.length);
          if (n < 2) return 0;
          const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
          const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
          const num = xs.slice(0, n).reduce((acc, x, i) => acc + (x - mx) * (ys[i] - my), 0);
          const dx = Math.sqrt(xs.slice(0, n).reduce((acc, x) => acc + (x - mx) ** 2, 0));
          const dy = Math.sqrt(ys.slice(0, n).reduce((acc, y) => acc + (y - my) ** 2, 0));
          return dx && dy ? Math.round(num / (dx * dy) * 1000) / 1000 : 0;
        }
        const matrix = numericCols.map((r) => ({ column: r, correlations: Object.fromEntries(numericCols.map((c) => [c, pearson(data[r], data[c])])) }));
        return { matrix, columns: numericCols };
      },
    },
    // --- v2.4.1: adaptive_chunker ---
    {
      name: 'adaptive_chunker',
      description: 'Split text into semantically coherent chunks suitable for LLM processing (sentence-aware, token-aware).',
      inputSchema: { type: 'object', properties: { text: { type: 'string' }, maxTokens: { type: 'number', minimum: 50, maximum: 4000 }, overlap: { type: 'number', minimum: 0, maximum: 200 } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const maxT = args.maxTokens || 500;
        const overlap = args.overlap || 0;
        const sentences = sentenceSplit(String(args.text));
        const chunks = [];
        let current = [], currentLen = 0;
        for (const sent of sentences) {
          const est = Math.ceil(sent.length / 4);
          if (currentLen + est > maxT && current.length > 0) {
            chunks.push(current.join(' '));
            if (overlap > 0) {
              const overlapWords = current.join(' ').split(' ').slice(-overlap);
              current = [overlapWords.join(' ')];
              currentLen = Math.ceil(overlapWords.join(' ').length / 4);
            } else {
              current = [];
              currentLen = 0;
            }
          }
          current.push(sent);
          currentLen += est;
        }
        if (current.length) chunks.push(current.join(' '));
        return { chunks, count: chunks.length, estimatedTokensPerChunk: chunks.map((c) => Math.ceil(c.length / 4)) };
      },
    },
    // --- v2.4.2: regex_tester ---
    {
      name: 'regex_tester',
      description: 'Comprehensive regex testing: matches, groups, named groups, and match positions.',
      inputSchema: { type: 'object', properties: { pattern: { type: 'string' }, text: { type: 'string' }, flags: { type: 'string' } }, required: ['pattern', 'text'], additionalProperties: false },
      handler: async (args) => {
        const flagStr = (args.flags || 'g').replace(/[^gimsuy]/g, '');
        const re = new RegExp(args.pattern, flagStr.includes('g') ? flagStr : flagStr + 'g');
        const matches = [];
        for (const m of String(args.text).matchAll(re)) {
          matches.push({ match: m[0], index: m.index, groups: m.slice(1), namedGroups: m.groups || {} });
        }
        return { matches, count: matches.length, pattern: args.pattern, flags: flagStr };
      },
    },
    // --- v2.4.3: document_classifier ---
    {
      name: 'document_classifier',
      description: 'Classify a document into categories: technical, narrative, operational, analytical, or creative.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const text = String(args.text).toLowerCase();
        const categories = {
          technical: ['function', 'class', 'api', 'config', 'schema', 'endpoint', 'parameter', 'code', 'deploy', 'database', 'server', 'module', 'library', 'version', 'install'],
          narrative: ['story', 'said', 'felt', 'walked', 'thought', 'then', 'suddenly', 'however', 'meanwhile', 'described', 'explained'],
          operational: ['process', 'step', 'run', 'execute', 'checklist', 'procedure', 'workflow', 'task', 'complete', 'status', 'deploy', 'monitor'],
          analytical: ['analysis', 'data', 'result', 'finding', 'metric', 'measure', 'compare', 'trend', 'statistic', 'rate', 'percentage', 'score', 'distribution'],
          creative: ['imagine', 'create', 'idea', 'concept', 'design', 'vision', 'innovative', 'brainstorm', 'explore', 'concept', 'unique'],
        };
        const scores = Object.entries(categories).map(([cat, signals]) => ({
          category: cat,
          score: signals.filter((s) => text.includes(s)).length,
        })).sort((a, b) => b.score - a.score);
        return { primary: scores[0].category, secondary: scores[1].category, scores };
      },
    },
    // --- v2.4.4: improvement_plan ---
    {
      name: 'improvement_plan',
      description: 'Generate a structured improvement plan from assessment criteria and current scores.',
      inputSchema: {
        type: 'object',
        properties: {
          current: { type: 'object', description: '{criterion: score} current state scores (0-100)' },
          target: { type: 'number', description: 'Target score for all criteria', minimum: 0, maximum: 100 },
          domain: { type: 'string' },
        },
        required: ['current'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const target = args.target || 80;
        const gaps = Object.entries(args.current || {})
          .filter(([, v]) => Number(v) < target)
          .map(([k, v]) => ({ criterion: k, current: Number(v), target, gap: target - Number(v), priority: target - Number(v) > 30 ? 'high' : 'medium' }))
          .sort((a, b) => b.gap - a.gap);
        const plan = gaps.map((g, i) => ({
          step: i + 1,
          criterion: g.criterion,
          action: `Improve ${g.criterion} from ${g.current} to ${g.target} (gap: ${g.gap})`,
          priority: g.priority,
        }));
        return { plan, totalGaps: gaps.length, highPriority: gaps.filter((g) => g.priority === 'high').length };
      },
    },
    // --- v2.4.5: signal_strength ---
    {
      name: 'signal_strength',
      description: 'Measure how strongly a text signals alignment with a domain and mode.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const text = String(args.text).toLowerCase();
        const domainHits = profile.domainProfile.heuristics.filter((h) => text.includes(h.toLowerCase())).length;
        const modeHits = profile.modeProfile.qualityBias.filter((b) => text.includes(b.toLowerCase())).length;
        const qualityHits = qualityPoints.filter((qp) => text.includes(qp.toLowerCase())).length;
        const total = profile.domainProfile.heuristics.length + profile.modeProfile.qualityBias.length + qualityPoints.length;
        const score = total > 0 ? Math.round((domainHits + modeHits + qualityHits) / total * 100) : 0;
        return {
          score,
          domain: { hits: domainHits, total: profile.domainProfile.heuristics.length },
          mode: { hits: modeHits, total: profile.modeProfile.qualityBias.length },
          quality: { hits: qualityHits, total: qualityPoints.length },
          strength: score >= 70 ? 'strong' : score >= 40 ? 'moderate' : 'weak',
        };
      },
    },
    // --- v2.4.6: learning_path ---
    {
      name: 'learning_path',
      description: 'Generate a structured learning path for a topic with phases and milestones.',
      inputSchema: { type: 'object', properties: { topic: { type: 'string' }, levels: { type: 'number', minimum: 2, maximum: 6 } }, required: ['topic'], additionalProperties: false },
      handler: async (args) => {
        const phases = ['Foundation', 'Core Concepts', 'Hands-On Practice', 'Advanced Patterns', 'Mastery & Application', 'Expert & Teach'];
        const count = Math.min(args.levels || 4, phases.length);
        const path = phases.slice(0, count).map((phase, i) => ({
          phase: i + 1,
          name: phase,
          goal: `${phase}: ${args.topic}`,
          milestones: [
            `Understand core ${args.topic} ${phase.toLowerCase()} principles`,
            `Complete a ${phase.toLowerCase()} exercise for ${args.topic}`,
            `Demonstrate ${phase.toLowerCase()}-level ${args.topic} competency`,
          ],
          estimatedHours: [5, 10, 20, 40, 60, 100][i] || 20,
        }));
        return { topic: args.topic, path, totalPhases: count, totalEstimatedHours: path.reduce((a, p) => a + p.estimatedHours, 0) };
      },
    },
    // --- v2.4.7: code_complexity_estimate ---
    {
      name: 'code_complexity_estimate',
      description: 'Estimate cyclomatic complexity of code by counting control flow branches.',
      inputSchema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'], additionalProperties: false },
      handler: async (args) => {
        const code = String(args.code);
        const branchKeywords = /\b(if|else|elif|for|while|do|switch|case|catch|finally|&&|\|\||ternary|\?[^:])/g;
        const branches = (code.match(branchKeywords) || []).length;
        const functions = (code.match(/\b(function|def|fn|func|method|=>|async)\b/g) || []).length;
        const lines = code.split(/\n/).filter((l) => l.trim() && !l.trim().startsWith('//')).length;
        const complexity = 1 + branches;
        return {
          cyclomaticComplexity: complexity,
          branches,
          estimatedFunctions: functions,
          codeLines: lines,
          riskLevel: complexity <= 5 ? 'low' : complexity <= 10 ? 'medium' : complexity <= 20 ? 'high' : 'very high',
        };
      },
    },
    // --- v2.4.8: multi_language_translate_meta ---
    {
      name: 'multi_language_translate_meta',
      description: 'Detect the likely language of text and return metadata for translation planning.',
      inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
      handler: async (args) => {
        const text = String(args.text);
        const charFreq = {};
        for (const c of text) { const cp = c.codePointAt(0); if (cp > 127) charFreq[cp] = (charFreq[cp] || 0) + 1; }
        const nonAscii = Object.values(charFreq).reduce((a, b) => a + b, 0);
        const totalChars = text.replace(/\s/g, '').length;
        const nonAsciiRatio = totalChars > 0 ? nonAscii / totalChars : 0;
        const words = text.trim().split(/\s+/);
        const avgWordLen = words.length ? words.reduce((a, w) => a + w.length, 0) / words.length : 0;
        const likelyLang = nonAsciiRatio > 0.3 ? 'non-latin (CJK/Arabic/Cyrillic/etc)' : avgWordLen > 7 ? 'german/dutch/scandinavian' : avgWordLen < 4 ? 'possible CJK' : 'english/latin';
        return { likelyLanguage: likelyLang, nonAsciiRatio: Math.round(nonAsciiRatio * 1000) / 1000, estimatedWordCount: words.length, estimatedTranslationTime: `${Math.ceil(words.length / 300)} minute(s)`, translationNotes: nonAsciiRatio > 0 ? 'Contains non-ASCII chars — may need specialized translation' : 'ASCII-only text' };
      },
    },
    // --- v2.4.9: test_case_generator ---
    {
      name: 'test_case_generator',
      description: 'Generate test case scaffolding for a function signature.',
      inputSchema: {
        type: 'object',
        properties: {
          functionName: { type: 'string' },
          params: { type: 'array', description: 'Array of {name, type, example} parameter descriptions' },
          language: { type: 'string', enum: ['javascript', 'python', 'typescript'] },
        },
        required: ['functionName'],
        additionalProperties: false,
      },
      handler: async (args) => {
        const fn = args.functionName, lang = args.language || 'javascript';
        const params = args.params || [];
        const exampleArgs = params.map((p) => p.example != null ? JSON.stringify(p.example) : '"test"').join(', ');
        let code = '';
        if (lang === 'python') {
          code = `def test_${fn}_basic():\n    result = ${fn}(${exampleArgs})\n    assert result is not None\n\ndef test_${fn}_edge_cases():\n    # Test with empty/null inputs\n    pass\n\ndef test_${fn}_invalid_input():\n    import pytest\n    with pytest.raises(Exception):\n        ${fn}(None)`;
        } else {
          code = `describe('${fn}', () => {\n  it('should return a value for valid input', () => {\n    const result = ${fn}(${exampleArgs});\n    expect(result).toBeDefined();\n  });\n\n  it('should handle edge cases', () => {\n    // TODO: add edge case tests\n  });\n\n  it('should throw on invalid input', () => {\n    expect(() => ${fn}(null)).toThrow();\n  });\n});`;
        }
        return { code, language: lang, functionName: fn, testCount: 3 };
      },
    },
    // --- v2.5.0: meta_tool_discovery ---
    {
      name: 'meta_tool_discovery',
      description: 'Discover tools by capability category, input type, or output type for AI agent planning.',
      inputSchema: { type: 'object', properties: { category: { type: 'string' }, inputType: { type: 'string' }, outputType: { type: 'string' } }, additionalProperties: false },
      handler: async (args) => {
        const catalog = {
          text: ['echo_text','summarize_text','count_words','tokenize_text','normalize_whitespace','change_case','slugify_text','truncate_text','pad_text','deduplicate_lines','sort_lines','filter_lines','word_wrap','split_text','join_text','strip_html','sentence_split','paragraph_split','readability_score','word_frequency','ngrams','levenshtein_distance','text_stats','keyword_density','char_frequency','action_items_extract','risk_keywords','compare_artifacts','text_excerpt','find_replace_multi','markdown_to_bullets','strip_punctuation','text_compress_ratio','pipeline_chain','text_compress_words','smart_bullet_points','spell_check_heuristic','spell_normalize','text_redact','text_highlight','emoji_strip'],
          extraction: ['extract_emails','extract_urls','extract_numbers','extract_dates','phone_numbers_extract','named_entity_extract','code_extract','task_list_parse','pattern_library'],
          json: ['parse_json','format_json','query_json_path','json_merge','json_keys','json_flatten','json_pick','json_omit','json_schema_infer','json_schema_validate','json_diff','json_path_set','json_aggregate','json_array_filter','json_array_sort','json_validate_required','query_language','batch_validate'],
          csv: ['csv_to_json','json_to_csv','csv_filter_rows','csv_column_summary','csv_sort_rows','csv_pivot','csv_group_stats','csv_add_column','csv_rename_columns','csv_deduplicate','csv_cross_join','csv_calculate_column'],
          data: ['statistics','percentile','json_array_stats','tfidf_keywords','data_anomalies','number_format','correlation_matrix','word_cloud_data','heatmap_data','table_stats'],
          analytics: ['sentiment_heuristic','intent_classifier','content_classifier','document_classifier','signal_strength','scoring_rubric','prompt_evaluate','code_complexity_estimate','multi_language_translate_meta'],
          transform: ['hash_text','encode_base64','decode_base64','encode_url','regex_find','regex_replace','template_render','batch_hash','hex_rgb','roman_numerals','unit_convert','object_transform','array_ops','abbrevations_expand'],
          generation: ['uuid_generate','date_now','date_add','random_pick','schedule_slots','number_sequence','batch_uuid','batch_uuid'],
          workflow: ['workflow_blueprint','workflow_run','workflow_review','improvement_backlog','iteration_checkpoint','priority_rank','decision_matrix','gap_analysis','dependency_sort','improvement_plan','feature_flags','learning_path','timeline_build'],
          reporting: ['structured_report','markdown_doc_builder','json_to_table','json_to_markdown_table','markdown_toc','changelog_entry','metric_dashboard','audit_log_format','flow_diagram_dsl','query_builder','structured_log_parse'],
          nlp: ['semantic_similarity','fuzzy_match','knowledge_graph_extract','abbreviations_expand','annotation_build','ngrams','word_frequency','tfidf_keywords','named_entity_extract'],
          domain: ['domain_profile','domain_brief','domain_checklist','domain_template','domain_quality_gate','mode_strategy','server_summary','health_snapshot','list_capability_clusters','prompt_template_pack'],
          meta: ['meta_tool_discovery','insight_generator','signal_strength'],
          code: ['code_extract','code_complexity_estimate','test_case_generator','regex_tester'],
        };
        const q = String(args.category || args.inputType || args.outputType || '').toLowerCase();
        if (!q) return { categories: Object.keys(catalog), hint: 'Specify category, inputType, or outputType to find tools' };
        const match = Object.entries(catalog).find(([cat]) => cat.includes(q) || q.includes(cat));
        if (match) return { category: match[0], tools: match[1], count: match[1].length };
        const fuzzy = Object.entries(catalog).filter(([cat]) => q.split(' ').some((w) => cat.includes(w)));
        if (fuzzy.length) return { matches: fuzzy.map(([cat, tools]) => ({ category: cat, toolCount: tools.length, tools })) };
        return { categories: Object.keys(catalog), note: `No match for "${q}"` };
      },
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
  function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Request-Id');
    res.setHeader('Vary', 'Origin');
  }
  return http.createServer(async (req, res) => {
    _metrics.requestCount++;
    const reqId = crypto.randomUUID();
    const reqStart = Date.now();
    setCors(res);
    res.setHeader('X-Request-Id', reqId);
    res.setHeader('X-Server', config.name);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    if (req.method === 'GET' && req.url === '/health') {
      res.setHeader('X-Duration-Ms', Date.now() - reqStart);
      return sendJson(res, 200, {
        ok: true,
        server: config.name,
        version: config.version,
        port: config.port,
        uptimeMs: Date.now() - config.startedAtMs,
        pid: process.pid,
        toolCount: tools.length,
        memoryMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 10) / 10,
      });
    }
    if (req.method === 'GET' && req.url === '/ping') {
      res.setHeader('X-Duration-Ms', Date.now() - reqStart);
      return sendJson(res, 200, { pong: true, ts: Date.now() });
    }
    if (req.method === 'GET' && req.url === '/meta') {
      res.setHeader('X-Duration-Ms', Date.now() - reqStart);
      const profile = getDomainProfile(config);
      return sendJson(res, 200, {
        server: config.name,
        version: config.version,
        domain: config.domainLabel,
        domainKey: profile.domainKey,
        modeKey: profile.modeKey,
        toolCount: tools.length,
        promptCount: prompts.length,
        port: config.port,
        startedAt: config.startedAt,
        capabilities: ['tools', 'prompts', 'batch', 'metrics', 'search'],
      });
    }
    if (req.method === 'GET' && req.url === '/tools') {
      res.setHeader('X-Duration-Ms', Date.now() - reqStart);
      return sendJson(res, 200, { tools: tools.map(({ handler, ...tool }) => tool) });
    }
    if (req.method === 'GET' && req.url === '/prompts') {
      res.setHeader('X-Duration-Ms', Date.now() - reqStart);
      return sendJson(res, 200, { prompts });
    }
    if (req.method === 'GET' && req.url === '/metrics') {
      res.setHeader('X-Duration-Ms', Date.now() - reqStart);
      return sendJson(res, 200, {
        server: config.name,
        requestCount: _metrics.requestCount,
        toolCallCount: _metrics.toolCallCount,
        batchCount: _metrics.batchCount,
        uptimeMs: Date.now() - _metrics.startedAt,
        topTools: Object.entries(_metrics.toolStats)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, count]) => ({ name, count })),
      });
    }
    if (req.method === 'GET' && req.url && req.url.startsWith('/search')) {
      const urlObj = new URL(req.url, `http://localhost`);
      const q = (urlObj.searchParams.get('q') || '').toLowerCase().trim();
      const matched = q
        ? tools.filter((t) => t.name.includes(q) || (t.description || '').toLowerCase().includes(q))
        : tools;
      res.setHeader('X-Duration-Ms', Date.now() - reqStart);
      return sendJson(res, 200, { query: q, tools: matched.map(({ handler, ...t }) => t), count: matched.length });
    }
    if (req.method === 'POST' && req.url === '/batch') {
      _metrics.batchCount++;
      let raw = '';
      req.on('data', (chunk) => { raw += chunk.toString('utf8'); });
      req.on('end', async () => {
        const body = safeJsonParse(raw);
        if (!body || !Array.isArray(body.calls)) {
          res.setHeader('X-Duration-Ms', Date.now() - reqStart);
          return sendJson(res, 400, { error: 'body must be {calls: [...]}' });
        }
        const results = [];
        for (const call of body.calls) {
          const msg = { method: 'tools/call', params: call, id: call.id ?? null };
          try {
            _trackTool(call.name);
            const result = await executeRpc(config, tools, prompts, msg);
            results.push({ name: call.name, ok: true, result });
          } catch (err) {
            results.push({ name: call.name, ok: false, error: String(err.message || err) });
          }
        }
        res.setHeader('X-Duration-Ms', Date.now() - reqStart);
        sendJson(res, 200, { results, count: results.length });
      });
      return;
    }
    if (req.method === 'POST' && req.url === '/mcp') {
      let raw = '';
      req.on('data', (chunk) => { raw += chunk.toString('utf8'); });
      req.on('end', async () => {
        const msg = safeJsonParse(raw);
        if (!msg) {
          res.setHeader('X-Duration-Ms', Date.now() - reqStart);
          return sendJson(res, 400, { error: 'Invalid JSON body' });
        }
        if (msg.method === 'tools/call' && msg.params && msg.params.name) {
          _trackTool(msg.params.name);
        }
        try {
          const result = await executeRpc(config, tools, prompts, msg);
          res.setHeader('X-Duration-Ms', Date.now() - reqStart);
          sendJson(res, 200, { jsonrpc: '2.0', id: msg.id ?? null, result });
        } catch (err) {
          res.setHeader('X-Duration-Ms', Date.now() - reqStart);
          sendJson(res, 500, { jsonrpc: '2.0', id: msg.id ?? null, error: { code: -32603, message: String((err && err.message) || err) } });
        }
      });
      return;
    }
    res.setHeader('X-Duration-Ms', Date.now() - reqStart);
    sendJson(res, 404, { error: 'Not found', availableEndpoints: ['/health', '/ping', '/meta', '/tools', '/prompts', '/metrics', '/search?q=', '/mcp', '/batch'] });
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
