import './env'
import { readFile, rm, writeFile } from 'fs/promises'
import path from 'path'

import * as tar from 'tar'

import { CommandPublish } from '../src/commands/publish'
import { Environment } from '../src/environment'
import { IPMRegistry } from '../src/registry'

/** Collect the file paths inside a tarball, normalized to package-relative form. */
async function listTarballEntries(tarballPath: string): Promise<string[]> {
  const entries: string[] = []
  await tar.list({
    file: tarballPath,
    onReadEntry: (entry) => {
      if (entry.type === 'File') {
        entries.push(entry.path.replace(/^\.\//, ''))
      }
    }
  })
  return entries
}

describe('CommandPublish', () => {
  let command: CommandPublish
  let environment: Environment
  let registry: IPMRegistry
  const fixtureDir = path.join(__dirname, 'fixtures', 'plugin-valid')

  beforeEach(() => {
    environment = new Environment({
      appVersion: '6.0.0'
    })
    registry = new IPMRegistry('6.0.0', environment.getInkdropApiUrl())
    command = new CommandPublish(environment, registry)
  })

  describe('validation', () => {
    let originalCwd: string

    beforeAll(() => {
      originalCwd = process.cwd()
    })

    beforeEach(() => {
      // Change to fixture directory for testing
      process.chdir(fixtureDir)
    })

    afterEach(() => {
      // Restore original cwd
      if (originalCwd) {
        process.chdir(originalCwd)
      }
    })

    describe('getRepositoryId', () => {
      it('should extract repository ID from valid repository URL', () => {
        const pkg = {
          repository: 'https://github.com/inkdropapp/test-plugin.git'
        }
        const repoId = command.getRepositoryId(pkg)

        expect(repoId).toBe('inkdropapp/test-plugin')
      })

      it('should extract repository ID from repository object', () => {
        const pkg = {
          repository: {
            type: 'git',
            url: 'git+https://github.com/inkdropapp/test-plugin.git'
          }
        }
        const repoId = command.getRepositoryId(pkg)

        expect(repoId).toBe('inkdropapp/test-plugin')
      })

      it('should handle repository URL without .git extension', () => {
        const pkg = {
          repository: 'https://github.com/inkdropapp/test-plugin'
        }
        const repoId = command.getRepositoryId(pkg)

        expect(repoId).toBe('inkdropapp/test-plugin')
      })

      it('should return null for missing repository', () => {
        const pkg = { name: 'test', version: '1.0.0' }
        const repoId = command.getRepositoryId(pkg)

        expect(repoId).toBeNull()
      })

      it('should return null for invalid repository format', () => {
        const pkg = { repository: 'not-a-valid-url' }
        const repoId = command.getRepositoryId(pkg)

        expect(repoId).toBeNull()
      })
    })

    describe('validatePackageContents', () => {
      it('should pass validation for valid package', async () => {
        const pkg = {
          name: 'test-package',
          version: '1.0.0',
          repository: 'https://github.com/test/test.git'
        }
        await command.validatePackageContents(pkg, fixtureDir)
      })

      it('should warn if engines.inkdrop is not specified', async () => {
        const pkg = {
          name: 'test-package',
          version: '1.0.0',
          repository: 'https://github.com/test/test.git'
        }
        await command.validatePackageContents(pkg, fixtureDir)
      })

      it('should throw if package name is missing', async () => {
        const pkg = {
          version: '1.0.0',
          repository: 'https://github.com/test/test.git'
        }

        await expect(command.validatePackageContents(pkg, fixtureDir)).rejects.toThrow(
          'package.json must have a valid "name" field'
        )
      })

      it('should throw if package version is missing', async () => {
        const pkg = {
          name: 'test-package',
          repository: 'https://github.com/test/test.git'
        }

        await expect(command.validatePackageContents(pkg, fixtureDir)).rejects.toThrow(
          'package.json must have a valid "version" field'
        )
      })
    })
  })

  describe('tarball creation', () => {
    let originalCwd: string

    beforeAll(() => {
      originalCwd = process.cwd()
    })

    beforeEach(() => {
      process.chdir(fixtureDir)
    })

    afterEach(() => {
      if (originalCwd) {
        process.chdir(originalCwd)
      }
    })

    it('should create tarball and log size', async () => {
      const pkg = { name: 'plugin-valid', version: '1.0.0' }
      const result = await command.createTarball(pkg, fixtureDir)

      expect(result.filePath).toContain('plugin-valid-1.0.0.tar.gz')

      await rm(result.filePath)
    })

    it('should pack only the entries allowed by the "files" field', async () => {
      const filesFixtureDir = path.join(__dirname, 'fixtures', 'plugin-with-files')
      const pkg = JSON.parse(await readFile(path.join(filesFixtureDir, 'package.json'), 'utf-8'))

      // Written at runtime rather than committed: a developer's global gitignore
      // very likely drops `*.log`, which would make the denylist assertion vacuous.
      const denylistedPath = path.join(filesFixtureDir, 'lib', 'debug.log')
      await writeFile(denylistedPath, 'debug output')

      try {
        const result = await command.createTarball(pkg, filesFixtureDir)
        const packed = await listTarballEntries(result.filePath)

        expect(packed).toEqual(
          expect.arrayContaining([
            'lib/index.js',
            'lib/nested/deep.js',
            'styles/ui.css',
            'package.json',
            'README.md',
            'LICENSE'
          ])
        )
        expect(packed).not.toContain('src/index.ts')
        expect(packed).not.toContain('tsconfig.json')
        expect(packed).not.toContain('lib/debug.log')

        await rm(result.filePath)
      } finally {
        await rm(denylistedPath, { force: true })
      }
    })
  })

  describe('publishing', () => {
    beforeEach(() => {
      process.chdir(fixtureDir)
    })

    it('should publish package in dry run mode', async () => {
      // Use plugin-valid fixture

      const result = await command.run({ dryrun: true })
      expect(result).toBe(true)
    })
  })

  //
  // describe('cleanup', () => {
  //   it('should define cleanup in the run method flow', () => {
  //     // Verify that the run method includes cleanup step
  //     const runMethod = command.run.toString()
  //
  //     expect(runMethod).toContain('rm')
  //     expect(runMethod).toContain('Cleaned up temporary tarball')
  //   })
  // })
})
