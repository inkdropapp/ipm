import { createPackFilter } from '../src/pack-filter'

describe('createPackFilter', () => {
  describe('without a `files` allowlist', () => {
    const include = createPackFilter({})

    it('should include the tarball root', () => {
      expect(include('.', true)).toBe(true)
    })

    it('should include any source file', () => {
      expect(include('./src/index.ts', false)).toBe(true)
      expect(include('./styles/ui.css', false)).toBe(true)
    })

    it('should still exclude the built-in denylist', () => {
      expect(include('./node_modules', true)).toBe(false)
      expect(include('./node_modules/foo/index.js', false)).toBe(false)
      expect(include('./.git', true)).toBe(false)
      expect(include('./.env', false)).toBe(false)
      expect(include('./coverage/lcov.info', false)).toBe(false)
      expect(include('./debug.log', false)).toBe(false)
    })
  })

  describe('with a `files` allowlist', () => {
    const include = createPackFilter({ files: ['lib', 'styles'] })

    it('should include listed directories and their contents recursively', () => {
      expect(include('./lib', true)).toBe(true)
      expect(include('./lib/index.js', false)).toBe(true)
      expect(include('./lib/nested/deep.js', false)).toBe(true)
      expect(include('./styles/ui.css', false)).toBe(true)
    })

    it('should exclude entries that are not listed', () => {
      expect(include('./src', true)).toBe(false)
      expect(include('./src/index.ts', false)).toBe(false)
      expect(include('./tsconfig.json', false)).toBe(false)
    })

    it('should keep the tarball root so tar can descend', () => {
      expect(include('.', true)).toBe(true)
    })
  })

  describe('ancestor directories', () => {
    it('should include ancestors of a listed file so tar descends into them', () => {
      const include = createPackFilter({ files: ['lib/index.js'] })

      expect(include('./lib', true)).toBe(true)
      expect(include('./lib/index.js', false)).toBe(true)
      expect(include('./lib/other.js', false)).toBe(false)
    })

    it('should not include unrelated directories', () => {
      const include = createPackFilter({ files: ['lib/index.js'] })

      expect(include('./src', true)).toBe(false)
    })

    it('should include ancestors of a glob pattern', () => {
      const include = createPackFilter({ files: ['dist/**/*.js'] })

      expect(include('./dist', true)).toBe(true)
      expect(include('./dist/nested', true)).toBe(true)
      expect(include('./dist/nested/a.js', false)).toBe(true)
      expect(include('./dist/nested/a.css', false)).toBe(false)
    })
  })

  describe('glob patterns', () => {
    it('should support a trailing globstar', () => {
      const include = createPackFilter({ files: ['dist/**'] })

      expect(include('./dist', true)).toBe(true)
      expect(include('./dist/a.js', false)).toBe(true)
      expect(include('./src/a.js', false)).toBe(false)
    })

    it('should support wildcards', () => {
      const include = createPackFilter({ files: ['*.css'] })

      expect(include('./theme.css', false)).toBe(true)
      expect(include('./theme.js', false)).toBe(false)
    })

    it('should normalize `./` prefixes and trailing slashes', () => {
      const include = createPackFilter({ files: ['./lib/'] })

      expect(include('./lib/index.js', false)).toBe(true)
    })

    it('should pack dotfiles under an allowlisted directory', () => {
      const include = createPackFilter({ files: ['lib'] })

      expect(include('./lib/.keep', false)).toBe(true)
    })

    it('should require an explicit pattern for dotfiles at the root', () => {
      // Standard glob semantics, matching `.gitignore` and `path.matchesGlob`:
      // a leading `*` does not cross a leading dot.
      expect(createPackFilter({ files: ['*'] })('./.babelrc', false)).toBe(false)
      expect(createPackFilter({ files: ['.babelrc'] })('./.babelrc', false)).toBe(true)
    })
  })

  describe('negation', () => {
    it('should exclude entries re-negated after a broader pattern', () => {
      const include = createPackFilter({ files: ['lib', '!lib/private'] })

      expect(include('./lib/index.js', false)).toBe(true)
      expect(include('./lib/private', true)).toBe(false)
      expect(include('./lib/private/secret.js', false)).toBe(false)
    })

    it('should let a later positive pattern win over an earlier negation', () => {
      const include = createPackFilter({ files: ['lib', '!lib/private', 'lib/private/ok.js'] })

      expect(include('./lib/private', true)).toBe(true)
      expect(include('./lib/private/ok.js', false)).toBe(true)
      expect(include('./lib/private/secret.js', false)).toBe(false)
    })
  })

  describe('always-included entries', () => {
    const include = createPackFilter({ files: ['lib'], main: './lib/index' })

    it('should include the manifest regardless of the allowlist', () => {
      expect(include('./package.json', false)).toBe(true)
    })

    it('should include readme and license files regardless of the allowlist', () => {
      expect(include('./README.md', false)).toBe(true)
      expect(include('./readme', false)).toBe(true)
      expect(include('./LICENSE', false)).toBe(true)
      expect(include('./LICENCE.txt', false)).toBe(true)
    })

    it('should not treat nested files with those names as always-included', () => {
      expect(include('./src/README.md', false)).toBe(false)
    })

    it('should include the extensionless `main` entry point', () => {
      const onlyStyles = createPackFilter({ files: ['styles'], main: './lib/index' })

      expect(onlyStyles('./lib/index.js', false)).toBe(true)
      expect(onlyStyles('./lib/other.js', false)).toBe(false)
    })

    it('should include a `main` entry point written with its extension', () => {
      const onlyStyles = createPackFilter({ files: ['styles'], main: 'build/main.js' })

      expect(onlyStyles('./build/main.js', false)).toBe(true)
    })
  })

  describe('denylist precedence', () => {
    it('should exclude denylisted entries inside an allowlisted directory', () => {
      const include = createPackFilter({ files: ['lib'] })

      expect(include('./lib/debug.log', false)).toBe(false)
      expect(include('./lib/build.tgz', false)).toBe(false)
    })

    it('should exclude denylisted roots that the allowlist tries to opt back in', () => {
      const include = createPackFilter({ files: ['lib', 'node_modules'] })

      expect(include('./node_modules', true)).toBe(false)
      expect(include('./node_modules/foo/index.js', false)).toBe(false)
    })
  })

  describe('malformed `files` values', () => {
    it('should fall back to including everything when `files` is empty', () => {
      const include = createPackFilter({ files: [] })

      expect(include('./src/index.ts', false)).toBe(true)
    })

    it('should fall back to including everything when `files` is not an array', () => {
      const include = createPackFilter({ files: 'lib' as any })

      expect(include('./src/index.ts', false)).toBe(true)
    })

    it('should ignore blank entries', () => {
      const include = createPackFilter({ files: ['lib', '', '   '] })

      expect(include('./lib/index.js', false)).toBe(true)
      expect(include('./src/index.ts', false)).toBe(false)
    })
  })
})
