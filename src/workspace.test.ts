import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { hasWorkspaceMarkers } from './workspace.js'

let tmpDir: string

beforeEach(() => {
  tmpDir = join(tmpdir(), `workspace-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(tmpDir, { recursive: true })
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('hasWorkspaceMarkers', () => {
  it('returns true when package.json exists', () => {
    writeFileSync(join(tmpDir, 'package.json'), '{}')
    expect(hasWorkspaceMarkers(tmpDir)).toBe(true)
  })

  it('returns true when lighthouse-audit.config.js exists', () => {
    writeFileSync(join(tmpDir, 'lighthouse-audit.config.js'), '')
    expect(hasWorkspaceMarkers(tmpDir)).toBe(true)
  })

  it('returns true when unlighthouse.config.ts exists', () => {
    writeFileSync(join(tmpDir, 'unlighthouse.config.ts'), '')
    expect(hasWorkspaceMarkers(tmpDir)).toBe(true)
  })

  it('returns true when reports/ directory exists', () => {
    mkdirSync(join(tmpDir, 'reports'))
    expect(hasWorkspaceMarkers(tmpDir)).toBe(true)
  })

  it('returns true when .unlighthouse/ directory exists', () => {
    mkdirSync(join(tmpDir, '.unlighthouse'))
    expect(hasWorkspaceMarkers(tmpDir)).toBe(true)
  })

  it('returns false when no markers exist', () => {
    expect(hasWorkspaceMarkers(tmpDir)).toBe(false)
  })

  it('returns false for a non-existent directory', () => {
    expect(hasWorkspaceMarkers('/nonexistent/path')).toBe(false)
  })

  it('detects multiple markers and still returns true', () => {
    writeFileSync(join(tmpDir, 'package.json'), '{}')
    mkdirSync(join(tmpDir, 'reports'))
    expect(hasWorkspaceMarkers(tmpDir)).toBe(true)
  })
})
