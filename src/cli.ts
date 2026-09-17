import { parseArgs } from 'util'
import { resolve } from 'path'
import { run } from './run.js'

const { values } = parseArgs({
  options: {
    site:    { type: 'string' },
    config:  { type: 'string' },
    out:     { type: 'string' },
    cwd:     { type: 'string' },
    'psi-key': { type: 'string' },
    'psi-concurrency': { type: 'string' },
    help:    { type: 'boolean', short: 'h' },
  },
  allowPositionals: false,
})

if (values.help) {
  console.log(`
lighthouse-agent-report — Lighthouse audit with agent-readable output

Usage:
  lighthouse-agent-report [--site <url>] [options]

Options:
  --site      URL to audit (defaults to "site" in lighthouse-audit.config.js)
  --config    Path to config file (default: lighthouse-audit.config.js)
  --out       Output directory (default: reports/lighthouse)
  --cwd       Working directory (default: prompts if no workspace markers detected)
  --psi-key   PageSpeed Insights API key for real-user field data
              (can also be set via PSI_API_KEY env var)
  --psi-concurrency  Number of concurrent PSI requests (default: 3, max: 16)
              Free tier safe: sliding window limits to 2 req/sec
  --help      Show this help

Examples:
  lighthouse-agent-report --site http://localhost:3000
  lighthouse-agent-report                              # uses site from config
  lighthouse-agent-report --cwd /path/to/project       # explicit working directory
  lighthouse-agent-report --psi-key YOUR_KEY           # uses site from config
  PSI_API_KEY=YOUR_KEY lighthouse-agent-report --site https://example.com
  `)
  process.exit(0)
}

// Resolve relative paths against invocation cwd (before any chdir)
const invocationCwd = process.cwd()
const absCwd = values.cwd ? resolve(invocationCwd, values.cwd) : undefined
const absConfig = values.config ? resolve(invocationCwd, values.config) : undefined
const absOut = values.out ? resolve(invocationCwd, values.out) : undefined

run({
  site: values.site,
  config: absConfig,
  out: absOut,
  cwd: absCwd,
  psiKey: values['psi-key'],
  psiConcurrency: values['psi-concurrency'] ? parseInt(values['psi-concurrency'], 10) : undefined,
}).catch((err: Error) => {
  console.error(`\nError: ${err.message}`)
  process.exit(1)
})
