import { pathToFileURL } from 'url'
import { existsSync } from 'fs'
import { resolve } from 'path'
import type { AuditConfig } from './types.js'

const CONFIG_NAMES = [
  'lighthouse-audit.config.ts',
  'lighthouse-audit.config.mjs',
  'lighthouse-audit.config.js',
]

export async function loadConfig(configPath?: string): Promise<AuditConfig> {
  let filePath: string | undefined

  if (configPath) {
    filePath = resolve(process.cwd(), configPath)
    if (!existsSync(filePath)) {
      throw new Error(`Config file not found: ${filePath}`)
    }
  } else {
    for (const name of CONFIG_NAMES) {
      const candidate = resolve(process.cwd(), name)
      if (existsSync(candidate)) {
        filePath = candidate
        break
      }
    }
  }

  if (!filePath) {
    return { output: 'reports/lighthouse' }
  }

  const mod = await import(pathToFileURL(filePath).href)
  const config: AuditConfig = mod.default ?? mod

  return {
    output: config.output ?? 'reports/lighthouse',
  }
}
