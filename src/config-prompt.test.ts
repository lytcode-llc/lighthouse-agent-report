import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { hasUnlighthouseConfig, writeUnlighthouseConfig } from './config-prompt.js'
import type { ScanConfigAction } from './config-prompt.js'

let tmpDir: string

beforeEach(() => {
  tmpDir = join(tmpdir(), `config-prompt-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(tmpDir, { recursive: true })
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('hasUnlighthouseConfig', () => {
  it('returns true when unlighthouse.config.ts exists', () => {
    writeFileSync(join(tmpDir, 'unlighthouse.config.ts'), '')
    expect(hasUnlighthouseConfig(tmpDir)).toBe(true)
  })

  it('returns false when no config exists', () => {
    expect(hasUnlighthouseConfig(tmpDir)).toBe(false)
  })

  it('returns false for a non-existent directory', () => {
    expect(hasUnlighthouseConfig('/nonexistent/path')).toBe(false)
  })
})

describe('writeUnlighthouseConfig', () => {
  it('writes a template with defaults action', () => {
    const action: ScanConfigAction = { type: 'defaults', cache: false }
    writeUnlighthouseConfig(tmpDir, action)

    const configPath = join(tmpDir, 'unlighthouse.config.ts')
    expect(existsSync(configPath)).toBe(true)

    const content = readFileSync(configPath, 'utf8')
    expect(content).toContain('export default')
    expect(content).toContain('cache: false')
    expect(content).not.toContain('defineConfig')
    expect(content).not.toContain('unlighthouse/config')
    expect(content).not.toContain('  samples:')
    expect(content).not.toContain('  dynamicSampling:')
  })

  it('writes a template with custom settings', () => {
    const action: ScanConfigAction = {
      type: 'custom',
      dynamicSampling: 20,
      samples: 3,
      cache: false,
    }
    writeUnlighthouseConfig(tmpDir, action)

    const content = readFileSync(join(tmpDir, 'unlighthouse.config.ts'), 'utf8')
    expect(content).toContain('samples: 3,')
    expect(content).toContain('dynamicSampling: 20,')
    expect(content).toContain('cache: false')
  })

  it('writes a template with cache enabled in custom mode', () => {
    const action: ScanConfigAction = {
      type: 'custom',
      dynamicSampling: 10,
      samples: 1,
      cache: true,
    }
    writeUnlighthouseConfig(tmpDir, action)

    const content = readFileSync(join(tmpDir, 'unlighthouse.config.ts'), 'utf8')
    expect(content).toContain('cache: true')
  })

  it('writes the full commented template for advanced action', () => {
    const action: ScanConfigAction = { type: 'advanced', exit: true }
    writeUnlighthouseConfig(tmpDir, action)

    const content = readFileSync(join(tmpDir, 'unlighthouse.config.ts'), 'utf8')
    expect(content).toContain('export default')
    expect(content).not.toContain('defineConfig')
    expect(content).not.toContain('unlighthouse/config')
    expect(content).toContain('samples')
    expect(content).toContain('dynamicSampling')
    expect(content).toContain('customSampling')
    expect(content).toContain('cache')
    expect(content).toContain('routes')
    expect(content).toContain('include')
    expect(content).toContain('exclude')
    expect(content).toContain('device')
  })

  it('custom action with all defaults writes only cache line', () => {
    const action: ScanConfigAction = {
      type: 'custom',
      dynamicSampling: 10,  // default
      samples: 1,           // default
      cache: false,         // default
    }
    writeUnlighthouseConfig(tmpDir, action)

    const content = readFileSync(join(tmpDir, 'unlighthouse.config.ts'), 'utf8')
    expect(content).not.toContain('  samples:')
    expect(content).not.toContain('  dynamicSampling:')
    expect(content).toContain('cache: false')
  })
})
