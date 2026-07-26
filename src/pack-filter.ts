import path from 'path'

import { logger } from './logger'

/**
 * Entries that never ship, whether or not a `files` allowlist asks for them.
 * Kept as a denylist applied after the allowlist so a stray `node_modules` or
 * `.env` inside an allowlisted directory still cannot leak into the registry.
 */
const ALWAYS_EXCLUDED_PATTERNS = [
  'node_modules',
  '.git',
  '.github',
  '.vscode',
  '.DS_Store',
  '*.log',
  '.npm',
  '.eslint*',
  '.env',
  '.env.local',
  '.env.*.local',
  'coverage',
  '.nyc_output',
  'tmp',
  'temp',
  '*.tgz',
  '*.tar.gz'
]

/**
 * Root entries npm always packs even when a `files` allowlist omits them —
 * without the manifest the package cannot be installed, and dropping the
 * readme/license silently strips a plugin's documentation and attribution.
 */
const ALWAYS_INCLUDED_ROOT_ENTRIES = [
  /^package\.json$/i,
  /^readme(\.[^/]*)?$/i,
  /^licen[cs]e(\.[^/]*)?$/i
]

/**
 * Inkdrop plugins conventionally point `main` at an extensionless path
 * (`./lib/index`), so the entry point is resolved against these candidates.
 */
const MAIN_EXTENSION_CANDIDATES = ['', '.js', '.mjs', '.cjs', '.json']

type FilesPattern = {
  readonly glob: string
  readonly negated: boolean
}

type PackageManifest = {
  files?: unknown
  main?: unknown
}

/**
 * Predicate deciding whether a single tarball entry should be packed.
 *
 * @param entryPath - Path as reported by `tar`, relative to the package root
 *   (e.g. `.`, `./lib`, `./lib/index.js`)
 * @param isDirectory - Whether the entry is a directory. Excluding a directory
 *   also stops `tar` from descending into it.
 */
export type PackFilter = (entryPath: string, isDirectory: boolean) => boolean

/**
 * Strip the `./` prefix, trailing slashes and Windows separators so entry
 * paths and `files` patterns can be compared in one canonical form.
 */
function normalizePath(rawPath: string): string {
  return rawPath.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '')
}

function matchesAlwaysExcluded(normalizedPath: string): boolean {
  return ALWAYS_EXCLUDED_PATTERNS.some((pattern) => {
    if (pattern.includes('*')) {
      return new RegExp('^' + pattern.replace(/\*/g, '.*') + '$').test(normalizedPath)
    }
    return normalizedPath === pattern || normalizedPath.startsWith(`${pattern}/`)
  })
}

function parseFilesPatterns(files: readonly unknown[]): FilesPattern[] {
  return files
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => {
      const trimmed = entry.trim()
      const negated = trimmed.startsWith('!')
      return {
        glob: normalizePath(negated ? trimmed.slice(1) : trimmed),
        negated
      }
    })
    .filter(({ glob }) => glob !== '')
}

/**
 * Resolve the paths that `main` may refer to, so the entry point survives an
 * allowlist that forgot to mention it.
 */
function resolveMainPaths(main: unknown): string[] {
  if (typeof main !== 'string' || main.trim() === '') {
    return []
  }
  const normalizedMain = normalizePath(main.trim())
  return normalizedMain === ''
    ? []
    : MAIN_EXTENSION_CANDIDATES.map((extension) => `${normalizedMain}${extension}`)
}

function matchesPattern(normalizedPath: string, glob: string): boolean {
  return (
    normalizedPath === glob ||
    normalizedPath.startsWith(`${glob}/`) ||
    path.matchesGlob(normalizedPath, glob) ||
    path.matchesGlob(normalizedPath, `${glob}/**`)
  )
}

/**
 * Whether some path *below* `dirSegments` could still match `globSegments` —
 * the "partial match" that `path.matchesGlob` does not expose, and that decides
 * whether `tar` is allowed to descend into a directory.
 */
function couldMatchBelow(dirSegments: readonly string[], globSegments: readonly string[]): boolean {
  if (globSegments.length === 0) {
    return false
  }
  if (dirSegments.length === 0) {
    return true
  }

  const [globHead, ...globRest] = globSegments
  const [dirHead, ...dirRest] = dirSegments

  // `**` absorbs any number of segments, so try consuming it and skipping it.
  if (globHead === '**') {
    return couldMatchBelow(dirSegments, globRest) || couldMatchBelow(dirRest, globSegments)
  }

  return path.matchesGlob(dirHead, globHead) && couldMatchBelow(dirRest, globRest)
}

/**
 * Apply the patterns in order and let the last match win, mirroring the
 * `.gitignore` precedence npm uses for `files`. Returns `null` when no
 * pattern has an opinion about this path.
 *
 * Directories additionally count a *partial* match, because a directory has to
 * be packed whenever a later pattern could still match something beneath it —
 * otherwise `tar` never descends and the listed files are lost. That is also
 * what lets `['lib', '!lib/private', 'lib/private/ok.js']` re-include a file
 * under an excluded directory, which npm supports but `.gitignore` does not.
 */
function resolveAllowlistVerdict(
  normalizedPath: string,
  patterns: readonly FilesPattern[],
  isDirectory: boolean
): boolean | null {
  let verdict: boolean | null = null
  for (const { glob, negated } of patterns) {
    const matched =
      matchesPattern(normalizedPath, glob) ||
      (isDirectory && couldMatchBelow(normalizedPath.split('/'), glob.split('/')))
    if (matched) {
      verdict = !negated
    }
  }
  return verdict
}

/**
 * Build the `tar` entry filter used when publishing a package.
 *
 * When `package.json` declares a `files` array it is honoured as an npm-style
 * allowlist: listed directories are packed recursively, glob patterns and `!`
 * negations are supported, and the last matching pattern wins. `package.json`,
 * the readme, the license and the `main` entry point are always packed.
 *
 * A missing, empty or non-array `files` value keeps the previous behaviour of
 * packing everything. An empty allowlist is treated as "unset" rather than
 * "pack almost nothing", because publishing an empty plugin would break every
 * user who installs it — a mistake that is far more costly here than the
 * deviation from npm, which packs only the always-included files in that case.
 */
export function createPackFilter(pkg: PackageManifest): PackFilter {
  const patterns = Array.isArray(pkg.files) ? parseFilesPatterns(pkg.files) : []

  if (Array.isArray(pkg.files) && patterns.length === 0) {
    logger.warn(
      'Warning: package.json has an empty "files" field. Packing all files instead of an empty package.'
    )
  }

  const mainPaths = resolveMainPaths(pkg.main)

  return (entryPath, isDirectory) => {
    const normalizedPath = normalizePath(entryPath)

    if (normalizedPath === '' || normalizedPath === '.') {
      return true
    }

    if (matchesAlwaysExcluded(normalizedPath)) {
      return false
    }

    if (patterns.length === 0) {
      return true
    }

    const isMainAncestor =
      isDirectory && mainPaths.some((mainPath) => mainPath.startsWith(`${normalizedPath}/`))

    if (
      ALWAYS_INCLUDED_ROOT_ENTRIES.some((entry) => entry.test(normalizedPath)) ||
      mainPaths.includes(normalizedPath) ||
      isMainAncestor
    ) {
      return true
    }

    return resolveAllowlistVerdict(normalizedPath, patterns, isDirectory) ?? false
  }
}
