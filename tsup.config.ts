import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    dts: false,
    clean: false,
    banner: { js: '#!/usr/bin/env node' },
  },
  {
    entry: ['src/run.ts', 'src/types.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
  },
])
