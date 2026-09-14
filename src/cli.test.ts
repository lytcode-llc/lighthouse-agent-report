import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./run.js', () => ({ run: vi.fn().mockResolvedValue(undefined) }))

describe('CLI --psi-concurrency', () => {
  const originalArgv = [...process.argv]

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.argv = originalArgv
  })

  it('parses --psi-concurrency and passes it as a number to run', async () => {
    process.argv = [
      'node',
      'src/cli.ts',
      '--site',
      'https://example.com',
      '--psi-concurrency',
      '5',
    ]

    await import('./cli.js')
    const { run } = await import('./run.js')

    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        site: 'https://example.com',
        psiConcurrency: 5,
      })
    )
  })

  it('omits psiConcurrency when the flag is not provided', async () => {
    process.argv = ['node', 'src/cli.ts', '--site', 'https://example.com']

    await import('./cli.js')
    const { run } = await import('./run.js')

    expect(run).toHaveBeenCalledWith(
      expect.objectContaining({
        site: 'https://example.com',
        psiConcurrency: undefined,
      })
    )
  })
})
