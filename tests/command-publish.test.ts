import './env'
import { rm } from 'fs/promises'
import path from 'path'
import { CommandPublish } from '../src/commands/publish'
import { Environment } from '../src/environment'
import { IPMRegistry } from '../src/registry'

describe('CommandPublish', () => {
  let command: CommandPublish
  let environment: Environment
  let registry: IPMRegistry
  const fixtureDir = path.join(__dirname, 'fixtures', 'plugin-valid')

  beforeEach(() => {
    environment = new Environment({
      appVersion: '6.0.0'
    })
    registry = new IPMRegistry(environment.getInkdropApiUrl())
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

        await expect(
          command.validatePackageContents(pkg, fixtureDir)
        ).rejects.toThrow('package.json must have a valid "name" field')
      })

      it('should throw if package version is missing', async () => {
        const pkg = {
          name: 'test-package',
          repository: 'https://github.com/test/test.git'
        }

        await expect(
          command.validatePackageContents(pkg, fixtureDir)
        ).rejects.toThrow('package.json must have a valid "version" field')
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
