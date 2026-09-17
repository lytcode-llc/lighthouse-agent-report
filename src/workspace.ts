import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve, join } from 'path'
import { homedir } from 'os'
import * as p from '@clack/prompts'

const MARKERS = [
  'package.json',
  'lighthouse-audit.config.js',
  'unlighthouse.config.ts',
  'reports',
  '.unlighthouse',
]

const WORKSPACE_STORE = join(
  process.env.XDG_CONFIG_HOME || join(homedir(), '.config'),
  'lighthouse-agent-report',
  'workspaces.json',
)

const MAX_RECENTS = 10

// ────────────────────────────────────────────────────────────────────────────
// Marker detection
// ────────────────────────────────────────────────────────────────────────────

export function hasWorkspaceMarkers(dir: string): boolean {
  return MARKERS.some((m) => existsSync(join(dir, m)))
}

// ────────────────────────────────────────────────────────────────────────────
// Recents store
// ────────────────────────────────────────────────────────────────────────────

interface RecentsFile {
  dirs: string[]
}

function loadRecents(): string[] {
  try {
    const data: RecentsFile = JSON.parse(readFileSync(WORKSPACE_STORE, 'utf8'))
    return Array.isArray(data.dirs) ? data.dirs : []
  } catch {
    return []
  }
}

function writeRecents(dirs: string[]): void {
  mkdirSync(join(homedir(), '.config', 'lighthouse-agent-report'), { recursive: true })
  writeFileSync(WORKSPACE_STORE, JSON.stringify({ dirs }, null, 2), 'utf8')
}

export function saveRecentDir(dir: string): void {
  const recents = loadRecents().filter((d) => d !== dir)
  recents.unshift(dir)
  writeRecents(recents.slice(0, MAX_RECENTS))
}

// ────────────────────────────────────────────────────────────────────────────
// Interactive prompt
// ────────────────────────────────────────────────────────────────────────────

export async function promptWorkspace(): Promise<string | null> {
  if (!process.stdout.isTTY) {
    console.error(
      '\nNon-interactive session — cd into a project directory or pass --cwd <dir>.\n'
    )
    process.exit(1)
  }

  const recents = loadRecents().filter((d) => existsSync(d))

  const choices: Array<{ value: string; label: string; hint?: string }> = []

  if (recents.length > 0) {
    for (const dir of recents.slice(0, 5)) {
      choices.push({ value: dir, label: dir, hint: 'recent' })
    }
  }

  choices.push({ value: '__create__', label: 'Create a new project…' })
  choices.push({ value: '__current__', label: `Use current directory (${process.cwd()})` })

  const action = await p.select({
    message: 'No workspace detected. Where would you like to run the audit?',
    options: choices,
  })

  if (p.isCancel(action)) {
    p.cancel('Aborted.')
    process.exit(0)
  }

  if (action === '__current__') {
    return process.cwd()
  }

  if (action === '__create__') {
    const newDir = await p.text({
      message: 'Project directory path:',
      placeholder: '/path/to/project',
      validate: (val) => {
        if (!val?.trim()) return 'Please enter a path'
        return undefined
      },
    })

    if (p.isCancel(newDir)) {
      p.cancel('Aborted.')
      process.exit(0)
    }

    const absDir = resolve(newDir)
    if (!existsSync(absDir)) {
      const shouldCreate = await p.confirm({
        message: `${absDir} does not exist. Create it?`,
      })
      if (p.isCancel(shouldCreate) || !shouldCreate) {
        p.cancel('Aborted.')
        process.exit(0)
      }
      mkdirSync(absDir, { recursive: true })
    }

    return absDir
  }

  // Recents entry
  if (action && typeof action === 'string' && existsSync(action)) {
    return action
  }

  return null
}
