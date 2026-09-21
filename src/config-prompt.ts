import { existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import * as p from '@clack/prompts'

const CONFIG_TEMPLATE = `export default {
  // Scanner settings
  scanner: {
    // Number of Lighthouse samples per page (default: 1).
    // Higher = more accurate results, slower run time.
    // samples: 1,

    // Dynamic sampling: audit more popular pages multiple times.
    // Uses search engine indexing data to rank page importance.
    // Set to 0 to disable.
    // dynamicSampling: 10,

    // Custom sampling: audit specific pages more times.
    // Map of URL path → number of extra samples.
    // customSampling: {},
  },

  // CI settings (used by lighthouse-agent-report)
  ci: {
    // Cache previous results (default: true).
    // Set to false to run fresh audits every time.
    // cache: false,
  },

  // Route filtering
  // Uncomment to only audit specific pages:
  // routes: {
  //   include: ['/blog/**', '/docs/**'],
  //   exclude: ['/api/**', '/admin/**'],
  // },

  // Device to audit (default: desktop)
  // device: 'mobile',
}
`

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
    return { type: 'defaults', cache: true }
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
    return { type: 'defaults', cache: true }
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

  // defaults or custom — write a config with the chosen values
  const settings: string[] = []

  if (action.type === 'custom') {
    const scannerParts: string[] = []
    if (action.samples !== 1) scannerParts.push(`    samples: ${action.samples},`)
    if (action.dynamicSampling !== 10) scannerParts.push(`    dynamicSampling: ${action.dynamicSampling},`)
    if (scannerParts.length > 0) {
      settings.push(`  scanner: {\n${scannerParts.join('\n')}\n  },`)
    }
    if (action.cache) {
      settings.push(`  ci: { cache: true },`)
    }
  }

  // defaults: only ci.cache
  if (action.type === 'defaults') {
    settings.push(`  ci: { cache: true },`)
  }

  const config = `export default {
${settings.join('\n')}
}
`

  writeFileSync(configPath, config, 'utf8')
}
