import { existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import * as p from '@clack/prompts'

function buildConfigTemplate(opts: { samples?: number; dynamicSampling?: number; cache?: boolean } = {}): string {
  const parts: string[] = []

  // scanner block
  const scannerLines: string[] = []
  scannerLines.push(`    // Number of Lighthouse samples per page (default: 1).`)
  scannerLines.push(`    // Higher = more accurate results, slower run time.`)
  scannerLines.push(`    // samples: 1,`)
  scannerLines.push(``)
  scannerLines.push(`    // Dynamic sampling: audit more popular pages multiple times.`)
  scannerLines.push(`    // Uses search engine indexing data to rank page importance.`)
  scannerLines.push(`    // Set to 0 to disable.`)
  scannerLines.push(`    // dynamicSampling: 10,`)
  scannerLines.push(``)
  scannerLines.push(`    // Custom sampling: audit specific pages more times.`)
  scannerLines.push(`    // Map of URL path → number of extra samples.`)
  scannerLines.push(`    // customSampling: {},`)

  if (opts.samples !== undefined) {
    scannerLines.push(`    samples: ${opts.samples},`)
  }
  if (opts.dynamicSampling !== undefined) {
    scannerLines.push(`    dynamicSampling: ${opts.dynamicSampling},`)
  }

  parts.push(`  scanner: {`)
  parts.push(scannerLines.join('\n'))
  parts.push(`  },`)

  // ci block
  const cacheVal = opts.cache ?? false
  parts.push(``)
  parts.push(`  // CI settings (used by lighthouse-agent-report)`)
  parts.push(`  ci: {`)
  parts.push(`    // Cache previous results (default: true).`)
  parts.push(`    // Set to false to run fresh audits every time.`)
  parts.push(`    cache: ${cacheVal},`)
  parts.push(`  },`)

  // routes block
  parts.push(``)
  parts.push(`  // Route filtering`)
  parts.push(`  // Uncomment to only audit specific pages:`)
  parts.push(`  // routes: {`)
  parts.push(`  //   include: ['/blog/**', '/docs/**'],`)
  parts.push(`  //   exclude: ['/api/**', '/admin/**'],`)
  parts.push(`  // },`)

  // device
  parts.push(``)
  parts.push(`  // Device to audit (default: desktop)`)
  parts.push(`  // device: 'mobile',`)

  return `export default {\n${parts.join('\n')}\n}\n`
}

const CONFIG_TEMPLATE = buildConfigTemplate()

// ────────────────────────────────────────────────────────────────────────────
// Config file detection
// ────────────────────────────────────────────────────────────────────────────

export function hasUnlighthouseConfig(dir: string): boolean {
  return existsSync(join(dir, 'unlighthouse.config.ts'))
}

// ────────────────────────────────────────────────────────────────────────────
// Config onboarding prompt
// ────────────────────────────────────────────────────────────────────────────

export type ScanConfigAction =
  | { type: 'defaults'; cache: boolean }
  | { type: 'custom'; dynamicSampling: number; samples: number; cache: boolean }
  | { type: 'advanced'; exit: true }

export async function promptScanConfig(): Promise<ScanConfigAction> {
  if (!process.stdout.isTTY) {
    // Non-TTY: create with defaults, no prompt
    return { type: 'defaults', cache: false }
  }

  const choice = await p.select({
    message: 'No unlighthouse.config.ts found. Set up scan config?',
    options: [
      {
        value: 'defaults',
        label: 'Use recommended defaults',
        hint: '1 sample per page, no caching',
      },
      {
        value: 'custom',
        label: 'Custom settings',
        hint: 'Set samples, dynamic sampling, cache',
      },
      {
        value: 'advanced',
        label: 'Create config to edit',
        hint: 'Write template and exit for manual editing',
      },
    ],
  })

  if (p.isCancel(choice)) {
    p.cancel('Aborted.')
    process.exit(0)
  }

  if (choice === 'advanced') {
    return { type: 'advanced', exit: true }
  }

  if (choice === 'defaults') {
    return { type: 'defaults', cache: false }
  }

  // Custom settings
  const samplesStr = await p.text({
    message: 'Samples per page:',
    defaultValue: '1',
    validate: (val) => {
      const n = Number(val)
      if (isNaN(n) || n < 1 || n > 10) return 'Enter a number between 1 and 10'
      return undefined
    },
  })

  if (p.isCancel(samplesStr)) {
    p.cancel('Aborted.')
    process.exit(0)
  }

  const samples = Number(samplesStr ?? 1)

  const dynamicSamplingStr = await p.text({
    message: 'Dynamic sampling (0 = off, 1–100):',
    defaultValue: '10',
    validate: (val) => {
      const n = Number(val)
      if (isNaN(n) || n < 0 || n > 100) return 'Enter a number between 0 and 100'
      return undefined
    },
  })

  if (p.isCancel(dynamicSamplingStr)) {
    p.cancel('Aborted.')
    process.exit(0)
  }

  const dynamicSampling = Number(dynamicSamplingStr ?? 10)

  const cache = await p.confirm({
    message: 'Enable caching between runs?',
    initialValue: false,
  })

  if (p.isCancel(cache)) {
    p.cancel('Aborted.')
    process.exit(0)
  }

  return {
    type: 'custom',
    dynamicSampling: dynamicSampling ?? 10,
    samples: samples ?? 1,
    cache: cache ?? false,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Config file writer
// ────────────────────────────────────────────────────────────────────────────

export function writeUnlighthouseConfig(dir: string, action: ScanConfigAction): void {
  const configPath = join(dir, 'unlighthouse.config.ts')

  if (action.type === 'advanced') {
    writeFileSync(configPath, CONFIG_TEMPLATE, 'utf8')
    return
  }

  if (action.type === 'defaults') {
    writeFileSync(configPath, buildConfigTemplate({ cache: false }), 'utf8')
    return
  }

  // custom
  const scannerOpts: { samples?: number; dynamicSampling?: number } = {}
  if (action.samples !== 1) scannerOpts.samples = action.samples
  if (action.dynamicSampling !== 10) scannerOpts.dynamicSampling = action.dynamicSampling

  writeFileSync(configPath, buildConfigTemplate({ ...scannerOpts, cache: action.cache }), 'utf8')
}
