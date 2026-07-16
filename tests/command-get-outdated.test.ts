import { readdir, readFile } from 'fs/promises'
import path from 'path'

import { vi, type Mocked, type MockedFunction } from 'vitest'

import { CommandGetOutdated } from '../src/commands/get-outdated'
import { Environment } from '../src/environment'
import { logger } from '../src/logger'
import { IPMRegistry } from '../src/registry'
import { PackageInfo, PackageMetadata } from '../src/types'

vi.mock('fs/promises')
vi.mock('../src/logger')
vi.mock('../src/registry')

const mockedReaddir = readdir as MockedFunction<typeof readdir>
const mockedReadFile = readFile as MockedFunction<typeof readFile>
const mockedLogger = logger as Mocked<typeof logger>

// Mock data for testing
const mockInstalledPackage1: PackageMetadata = {
  name: 'test-package-1',
  version: '1.0.0',
  main: './lib/index',
  description: 'Test package 1',
  repository: 'https://github.com/test/package1'
}

const mockInstalledPackage2: PackageMetadata = {
  name: 'test-package-2',
  version: '2.0.0',
  main: './lib/index',
  description: 'Test package 2',
  repository: 'https://github.com/test/package2'
}

const mockRegistryPackage1: PackageInfo = {
  name: 'test-package-1',
  created_at: 1477372283896,
  updated_at: 1742973710964,
  repository: 'https://github.com/test/package1',
  downloads: 1000,
  releases: {
    latest: '1.5.0'
  },
  readme: 'Test package 1',
  metadata: {
    name: 'test-package-1',
    main: './lib/index',
    version: '1.5.0',
    description: 'Test package 1',
    repository: 'https://github.com/test/package1'
  },
  versions: {
    '1.0.0': {
      name: 'test-package-1',
      main: './lib/index',
      version: '1.0.0',
      description: 'Test package 1',
      repository: 'https://github.com/test/package1',
      engines: {
        inkdrop: '>=5.0.0'
      },
      dist: {
        tarball: 'https://api.inkdrop.app/packages/test-package-1/-/test-package-1-1.0.0.tgz'
      }
    },
    '1.5.0': {
      name: 'test-package-1',
      main: './lib/index',
      version: '1.5.0',
      description: 'Test package 1',
      repository: 'https://github.com/test/package1',
      engines: {
        inkdrop: '>=5.0.0'
      },
      dist: {
        tarball: 'https://api.inkdrop.app/packages/test-package-1/-/test-package-1-1.5.0.tgz'
      }
    }
  }
}

const mockRegistryPackage2: PackageInfo = {
  name: 'test-package-2',
  created_at: 1477372283896,
  updated_at: 1742973710964,
  repository: 'https://github.com/test/package2',
  downloads: 500,
  releases: {
    latest: '2.0.0'
  },
  readme: 'Test package 2',
  metadata: {
    name: 'test-package-2',
    main: './lib/index',
    version: '2.0.0',
    description: 'Test package 2',
    repository: 'https://github.com/test/package2'
  },
  versions: {
    '2.0.0': {
      name: 'test-package-2',
      main: './lib/index',
      version: '2.0.0',
      description: 'Test package 2',
      repository: 'https://github.com/test/package2',
      engines: {
        inkdrop: '>=5.0.0'
      },
      dist: {
        tarball: 'https://api.inkdrop.app/packages/test-package-2/-/test-package-2-2.0.0.tgz'
      }
    }
  }
}

describe('CommandGetOutdated', () => {
  let command: CommandGetOutdated
  let mockEnvironment: Environment
  let mockRegistry: Mocked<IPMRegistry>
  const testInkdropVersion = '5.0.0'
  const testInkdropDir = '/test/inkdrop'
  const testPackagesDir = path.join(testInkdropDir, 'packages')

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Create mock environment
    mockEnvironment = new Environment({ appVersion: testInkdropVersion })
    vi.spyOn(mockEnvironment, 'getInkdropDirectory').mockReturnValue(testInkdropDir)

    // Create mock registry
    mockRegistry = new IPMRegistry(
      testInkdropVersion,
      'http://test-api.inkdrop.app'
    ) as Mocked<IPMRegistry>

    // Reset registry mock methods
    mockRegistry.getPackageInfo = vi.fn()

    // Create command instance
    command = new CommandGetOutdated(testInkdropVersion, mockEnvironment, mockRegistry)

    // Default mock behaviors
    mockedReaddir.mockResolvedValue([])
    mockedReadFile.mockRejectedValue(new Error('ENOENT'))
  })

  describe('run', () => {
    describe('with no packages installed', () => {
      beforeEach(() => {
        // Mock empty packages directory
        mockedReaddir.mockResolvedValue([])
      })

      it('should return empty array when no packages are installed', async () => {
        const result = await command.run()

        expect(result).toEqual([])
        expect(mockedReaddir).toHaveBeenCalledWith(testPackagesDir)
        expect(mockRegistry.getPackageInfo).not.toHaveBeenCalled()
      })
    })

    describe('with packages directory not existing', () => {
      beforeEach(() => {
        // Mock packages directory doesn't exist
        const error = new Error('ENOENT') as NodeJS.ErrnoException
        error.code = 'ENOENT'
        mockedReaddir.mockRejectedValue(error)
      })

      it('should return empty array when packages directory does not exist', async () => {
        const result = await command.run()

        expect(result).toEqual([])
        expect(mockedReaddir).toHaveBeenCalledWith(testPackagesDir)
        expect(mockRegistry.getPackageInfo).not.toHaveBeenCalled()
      })
    })

    describe('with outdated packages', () => {
      beforeEach(() => {
        // Mock installed packages
        mockedReaddir.mockResolvedValue(['test-package-1', 'test-package-2'] as any)

        // Mock package.json files
        mockedReadFile
          .mockResolvedValueOnce(JSON.stringify(mockInstalledPackage1))
          .mockResolvedValueOnce(JSON.stringify(mockInstalledPackage2))

        // Mock registry responses
        mockRegistry.getPackageInfo
          .mockResolvedValueOnce(mockRegistryPackage1) // test-package-1 has update available
          .mockResolvedValueOnce(mockRegistryPackage2) // test-package-2 is up to date
      })

      it('should return outdated packages with version information', async () => {
        const result = await command.run()

        expect(result).toHaveLength(1)
        expect(result[0]).toEqual({
          name: 'test-package-1',
          version: '1.0.0',
          latestVersion: '1.5.0'
        })

        expect(mockedReaddir).toHaveBeenCalledWith(testPackagesDir)
        expect(mockedReadFile).toHaveBeenCalledWith(
          path.join(testPackagesDir, 'test-package-1', 'package.json'),
          'utf8'
        )
        expect(mockedReadFile).toHaveBeenCalledWith(
          path.join(testPackagesDir, 'test-package-2', 'package.json'),
          'utf8'
        )
        expect(mockRegistry.getPackageInfo).toHaveBeenCalledWith('test-package-1')
        expect(mockRegistry.getPackageInfo).toHaveBeenCalledWith('test-package-2')
      })
    })

    describe('with all packages up to date', () => {
      beforeEach(() => {
        // Mock installed packages
        mockedReaddir.mockResolvedValue(['test-package-2'] as any)

        // Mock package.json file
        mockedReadFile.mockResolvedValueOnce(JSON.stringify(mockInstalledPackage2))

        // Mock registry response - same version as installed
        mockRegistry.getPackageInfo.mockResolvedValueOnce(mockRegistryPackage2)
      })

      it('should return empty array when all packages are up to date', async () => {
        const result = await command.run()

        expect(result).toEqual([])
        expect(mockRegistry.getPackageInfo).toHaveBeenCalledWith('test-package-2')
      })
    })

    describe('error handling', () => {
      beforeEach(() => {
        // Clear all previous mocks for error handling tests
        vi.clearAllMocks()
        mockRegistry.getPackageInfo = vi.fn()
      })

      it('should handle registry errors gracefully and continue with other packages', async () => {
        mockedReaddir.mockResolvedValue(['test-package-1'] as any)
        mockedReadFile.mockResolvedValueOnce(JSON.stringify(mockInstalledPackage1))

        // Mock registry error for first package
        mockRegistry.getPackageInfo.mockRejectedValueOnce(new Error('Registry error'))

        const result = await command.run()

        expect(result).toEqual([])
        expect(mockRegistry.getPackageInfo).toHaveBeenCalledWith('test-package-1')
        expect(mockedLogger.warn).toHaveBeenCalledWith(
          'Warning: Could not check updates for test-package-1:',
          expect.any(Error)
        )
      })

      it('should handle invalid package.json files gracefully', async () => {
        // Reset registry mock for this test
        mockRegistry.getPackageInfo.mockReset()

        mockedReaddir.mockResolvedValue(['invalid-package'] as any)
        mockedReadFile.mockResolvedValueOnce('invalid json')

        const result = await command.run()

        expect(result).toEqual([])
        expect(mockedLogger.warn).toHaveBeenCalledWith(
          'Warning: Could not read package.json for invalid-package:',
          expect.any(Error)
        )
        // Should not attempt to call registry for invalid package
        expect(mockRegistry.getPackageInfo).not.toHaveBeenCalled()
      })

      it('should handle missing package.json files gracefully', async () => {
        // Reset registry mock for this test
        mockRegistry.getPackageInfo.mockReset()

        mockedReaddir.mockResolvedValue(['missing-package'] as any)
        const error = new Error('ENOENT') as NodeJS.ErrnoException
        error.code = 'ENOENT'
        mockedReadFile.mockRejectedValueOnce(error)

        const result = await command.run()

        expect(result).toEqual([])
        expect(mockedLogger.warn).toHaveBeenCalledWith(
          'Warning: Could not read package.json for missing-package:',
          expect.any(Error)
        )
        // Should not attempt to call registry for missing package
        expect(mockRegistry.getPackageInfo).not.toHaveBeenCalled()
      })

      it('should throw error when readdir fails with non-ENOENT error', async () => {
        const error = new Error('Permission denied') as NodeJS.ErrnoException
        error.code = 'EACCES'
        mockedReaddir.mockRejectedValue(error)

        await expect(command.run()).rejects.toThrow('Permission denied')
        expect(mockedLogger.error).toHaveBeenCalledWith(
          'Failed to get outdated packages:',
          expect.any(Error)
        )
      })
    })

    describe('with obsolete theme packages', () => {
      const mockObsoleteUiTheme: PackageMetadata = {
        ...mockInstalledPackage1,
        name: 'obsolete-ui-theme',
        theme: 'ui'
      }
      const mockObsoleteSyntaxTheme: PackageMetadata = {
        ...mockInstalledPackage1,
        name: 'obsolete-syntax-theme',
        theme: 'syntax'
      }
      const mockObsoletePreviewTheme: PackageMetadata = {
        ...mockInstalledPackage1,
        name: 'obsolete-preview-theme',
        theme: 'preview'
      }
      const mockUnifiedTheme: PackageMetadata = {
        ...mockInstalledPackage2,
        name: 'unified-theme',
        theme: true
      }

      beforeEach(() => {
        mockedReaddir.mockResolvedValue([
          'obsolete-ui-theme',
          'obsolete-syntax-theme',
          'obsolete-preview-theme',
          'unified-theme'
        ] as any)

        mockedReadFile
          .mockResolvedValueOnce(JSON.stringify(mockObsoleteUiTheme))
          .mockResolvedValueOnce(JSON.stringify(mockObsoleteSyntaxTheme))
          .mockResolvedValueOnce(JSON.stringify(mockObsoletePreviewTheme))
          .mockResolvedValueOnce(JSON.stringify(mockUnifiedTheme))

        mockRegistry.getPackageInfo.mockResolvedValueOnce({
          ...mockRegistryPackage2,
          name: 'unified-theme'
        })
      })

      it('should skip the outdated check for obsolete ui/syntax/preview theme types', async () => {
        await command.run()

        expect(mockRegistry.getPackageInfo).not.toHaveBeenCalledWith('obsolete-ui-theme')
        expect(mockRegistry.getPackageInfo).not.toHaveBeenCalledWith('obsolete-syntax-theme')
        expect(mockRegistry.getPackageInfo).not.toHaveBeenCalledWith('obsolete-preview-theme')
        expect(mockRegistry.getPackageInfo).toHaveBeenCalledWith('unified-theme')
        expect(mockRegistry.getPackageInfo).toHaveBeenCalledTimes(1)
      })
    })

    describe('with incompatible packages', () => {
      const mockIncompatiblePackage: PackageInfo = {
        ...mockRegistryPackage1,
        versions: {
          '1.0.0': {
            ...mockRegistryPackage1.versions!['1.0.0'],
            engines: {
              inkdrop: '>=6.0.0' // Incompatible with test version 5.0.0
            }
          },
          '2.0.0': {
            ...mockRegistryPackage1.versions!['1.0.0'],
            version: '2.0.0',
            engines: {
              inkdrop: '>=6.0.0' // Also incompatible
            }
          }
        }
      }

      beforeEach(() => {
        mockedReaddir.mockResolvedValue(['test-package-1'] as any)
        mockedReadFile.mockResolvedValueOnce(JSON.stringify(mockInstalledPackage1))
        mockRegistry.getPackageInfo.mockResolvedValueOnce(mockIncompatiblePackage)
      })

      it('should not include packages with no compatible versions', async () => {
        const result = await command.run()

        expect(result).toEqual([])
        expect(mockRegistry.getPackageInfo).toHaveBeenCalledWith('test-package-1')
      })
    })
  })

  describe('constructor', () => {
    it('should create instance with correct dependencies', () => {
      expect(command.installedInkdropVersion).toBe(testInkdropVersion)
      expect(command.env).toBe(mockEnvironment)
      expect(command.registry).toBe(mockRegistry)
    })
  })
})
