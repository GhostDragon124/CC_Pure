import { readdir, readFile, writeFile, cp } from 'fs/promises'
import { join } from 'path'
import { getMacroDefines } from './scripts/defines.ts'
import { DEFAULT_BUILD_FEATURES } from './scripts/defines.ts'

const outdir = 'dist'

// Step 1: Clean output directory
const { rmSync } = await import('fs')
rmSync(outdir, { recursive: true, force: true })

// Collect FEATURE_* env vars → Bun.build features
const envFeatures = Object.keys(process.env)
  .filter(k => k.startsWith('FEATURE_'))
  .map(k => k.replace('FEATURE_', ''))
const features = [...new Set([...DEFAULT_BUILD_FEATURES, ...envFeatures])]

// Step 2: Bundle with splitting
const result = await Bun.build({
  entrypoints: ['src/entrypoints/cli.tsx'],
  outdir,
  target: 'bun',
  splitting: true,
  define: getMacroDefines(),
  features,
})

if (!result.success) {
  console.error('Build failed:')
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

// Step 3: Post-process — replace Bun-only `import.meta.require` with Node.js compatible version
const files = await readdir(outdir)
const IMPORT_META_REQUIRE = 'var __require = import.meta.require;'
const COMPAT_REQUIRE = `var __require = typeof import.meta.require === "function" ? import.meta.require : (await import("module")).createRequire(import.meta.url);`

let patched = 0
for (const file of files) {
  if (!file.endsWith('.js')) continue
  const filePath = join(outdir, file)
  const content = await readFile(filePath, 'utf-8')
  if (content.includes(IMPORT_META_REQUIRE)) {
    await writeFile(
      filePath,
      content.replace(IMPORT_META_REQUIRE, COMPAT_REQUIRE),
    )
    patched++
  }
}

console.log(
  `Bundled ${result.outputs.length} files to ${outdir}/ (patched ${patched} for Node.js compat)`,
)

// Step 4: Copy native .node addon files (audio-capture)
const vendorDir = join(outdir, 'vendor', 'audio-capture')
await cp('vendor/audio-capture', vendorDir, { recursive: true })
console.log(`Copied vendor/audio-capture/ → ${vendorDir}/`)

// Step 5: Bundle download-ripgrep script as standalone JS for postinstall
const rgScript = await Bun.build({
  entrypoints: ['scripts/download-ripgrep.ts'],
  outdir,
  target: 'node',
})
if (!rgScript.success) {
  console.error('Failed to bundle download-ripgrep script:')
  for (const log of rgScript.logs) {
    console.error(log)
  }
  // Non-fatal — postinstall fallback to bun run scripts/download-ripgrep.ts
} else {
  console.log(`Bundled download-ripgrep script to ${outdir}/`)
}

// Step 6: Build no-split single-file bundle for `ccb` CLI
// Code-split build hangs on chunk lazy-loading with Bun 1.3.11,
// so we provide a no-split alternative for the `ccb` launcher.
const noSplitDir = 'dist-nosplit'
rmSync(noSplitDir, { recursive: true, force: true })
const noSplitResult = await Bun.build({
  entrypoints: ['src/entrypoints/cli.tsx'],
  outdir: noSplitDir,
  target: 'bun',
  splitting: false,
  define: getMacroDefines(),
  features,
})
if (!noSplitResult.success) {
  console.error('No-split build failed:')
  for (const log of noSplitResult.logs) console.error(log)
} else {
  console.log(`No-split bundle: ${noSplitResult.outputs.length} file → ${noSplitDir}/`)
}
