import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { loadConfig } from './config.js'

function scaffold(root: string, name: string, content: string) {
  writeFileSync(join(root, name), content, 'utf8')
}

describe('loadConfig', () => {
  let root: string
  let originalCwd: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'lar-config-test-'))
    originalCwd = process.cwd()
    process.chdir(root)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(root, { recursive: true })
  })

  it('returns defaults when no config file exists', async () => {
    const config = await loadConfig()
    expect(config).toEqual({ output: 'reports/lighthouse' })
  })

  it('loads lighthouse-audit.config.mjs', async () => {
    scaffold(root, 'lighthouse-audit.config.mjs', `export default { site: 'https://example.com', output: 'out/lh' }`)
    const config = await loadConfig()
    expect(config.site).toBe('https://example.com')
    expect(config.output).toBe('out/lh')
  })

  it('loads lighthouse-audit.config.js', async () => {
    scaffold(root, 'lighthouse-audit.config.js', `export default { site: 'https://test.com' }`)
    const config = await loadConfig()
    expect(config.site).toBe('https://test.com')
    expect(config.output).toBe('reports/lighthouse')
  })

  it('uses default output when config omits it', async () => {
    scaffold(root, 'lighthouse-audit.config.mjs', `export default { site: 'https://example.com' }`)
    const config = await loadConfig()
    expect(config.output).toBe('reports/lighthouse')
  })

  it('throws when explicit config path does not exist', async () => {
    await expect(loadConfig('nonexistent.config.mjs')).rejects.toThrow('Config file not found')
  })

  it('loads config from explicit path', async () => {
    mkdirSync(join(root, 'custom'), { recursive: true })
    scaffold(root, 'custom/my.config.mjs', `export default { site: 'https://custom.com', output: 'custom/out' }`)
    const config = await loadConfig('custom/my.config.mjs')
    expect(config.site).toBe('https://custom.com')
    expect(config.output).toBe('custom/out')
  })

  it('prefers .ts over .mjs over .js when multiple exist', async () => {
    // Only .mjs and .js present — should pick .mjs (first in CONFIG_NAMES after .ts)
    scaffold(root, 'lighthouse-audit.config.mjs', `export default { site: 'https://mjs.com' }`)
    scaffold(root, 'lighthouse-audit.config.js', `export default { site: 'https://js.com' }`)
    const config = await loadConfig()
    expect(config.site).toBe('https://mjs.com')
  })
})
