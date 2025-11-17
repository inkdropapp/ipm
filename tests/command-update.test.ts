import { readFile } from 'fs/promises'
import { jest } from '@jest/globals'
import { CommandUpdate } from '../src/commands/update'
import { Environment } from '../src/environment'
import { logger } from '../src/logger'
import { IPMRegistry } from '../src/registry'
import { PackageInfo } from '../src/types'

jest.mock('fs/promises')
jest.mock('../src/logger')
jest.mock('../src/registry')

const mockedReadFile = readFile as jest.MockedFunction<typeof readFile>
const mockedLogger = logger as jest.Mocked<typeof logger>

// Mock package data for testing
const mockPackageInfo: PackageInfo = {
  name: 'test-package',
  created_at: 1477372283896,
  updated_at: 1742973710964,
  repository: 'test/test-package',
  downloads: 1000,
  releases: {
    latest: '2.0.0'
  },
  readme: 'Test package',
  metadata: {
    name: 'test-package',
    main: './lib/index',
    version: '2.0.0',
    description: 'Test package for testing',
    repository: 'test/test-package'
  },
  versions: {
    '1.0.0': {
      name: 'test-package',
      main: './lib/index',
      version: '1.0.0',
      description: 'Test package for testing',
      repository: 'test/test-package',
      engines: {
        inkdrop: '^5.0.0'
      },
      dist: {
        tarball:
          'https://registry.test.com/test-package/-/test-package-1.0.0.tgz'
      }
    },
    '1.5.0': {
      name: 'test-package',
      main: './lib/index',
      version: '1.5.0',
      description: 'Test package for testing',
      repository: 'test/test-package',
      engines: {
        inkdrop: '^5.0.0'
      },
      dist: {
        tarball:
          'https://registry.test.com/test-package/-/test-package-1.5.0.tgz'
      }
    },
    '2.0.0': {
      name: 'test-package',
      main: './lib/index',
      version: '2.0.0',
      description: 'Test package for testing',
      repository: 'test/test-package',
      engines: {
        inkdrop: '^5.0.0'
      },
      dist: {
        tarball:
          'https://registry.test.com/test-package/-/test-package-2.0.0.tgz'
      }
    }
  }
}

describe('CommandUpdate', () => {
  let command: CommandUpdate
  let mockEnvironment: Environment
  let mockRegistry: jest.Mocked<IPMRegistry>
  let parentRunSpy: any
  let requestPackageSpy: any

  const testInkdropVersion = '5.0.0'
  const testInkdropDir = '/test/inkdrop'
  const testPackageName = 'test-package'

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Create mock environment
    mockEnvironment = new Environment({ appVersion: testInkdropVersion })
    jest
      .spyOn(mockEnvironment, 'getInkdropDirectory')
      .mockReturnValue(testInkdropDir)
    jest
      .spyOn(mockEnvironment, 'getCacheDirectory')
      .mockReturnValue('/test/cache')

    // Create mock registry
    mockRegistry = new IPMRegistry('test-url') as jest.Mocked<IPMRegistry>

    // Create command instance
    command = new CommandUpdate(
      testInkdropVersion,
      mockEnvironment,
      mockRegistry
    )

    // Mock parent class methods
    parentRunSpy = jest
      .spyOn(Object.getPrototypeOf(CommandUpdate.prototype), 'run')
      .mockResolvedValue(undefined)
    requestPackageSpy = jest
      .spyOn(command as any, 'requestPackage')
      .mockResolvedValue(mockPackageInfo)
  })

  describe('run', () => {
    describe('package not installed', () => {
      beforeEach(() => {
        // Mock package.json doesn't exist
        mockedReadFile.mockRejectedValue(new Error('ENOENT'))
      })

      it('should install package when not installed', async () => {
        await command.run(testPackageName)

        expect(mockedLogger.info).toHaveBeenCalledWith(
          `Package ${testPackageName} is not installed, installing...`
        )
        expect(parentRunSpy).toHaveBeenCalledWith(testPackageName, undefined)
      })

      it('should install specific version when package not installed', async () => {
        await command.run(testPackageName, '1.5.0')

        expect(mockedLogger.info).toHaveBeenCalledWith(
          `Package ${testPackageName} is not installed, installing...`
        )
        expect(parentRunSpy).toHaveBeenCalledWith(testPackageName, '1.5.0')
      })
    })

    describe('package already installed', () => {
      it('should skip update when already at latest version', async () => {
        // Mock package is already at latest version
        const currentPackageJson = { name: testPackageName, version: '2.0.0' }
        mockedReadFile.mockResolvedValue(JSON.stringify(currentPackageJson))

        await command.run(testPackageName)

        expect(mockedLogger.info).toHaveBeenCalledWith(
          `Package ${testPackageName}@2.0.0 is already up to date`
        )
        expect(requestPackageSpy).toHaveBeenCalledWith(testPackageName)
        expect(parentRunSpy).not.toHaveBeenCalled()
      })

      it('should update when newer version available', async () => {
        // Mock package is at older version
        const currentPackageJson = { name: testPackageName, version: '1.0.0' }
        mockedReadFile.mockResolvedValue(JSON.stringify(currentPackageJson))

        await command.run(testPackageName)

        expect(mockedLogger.info).toHaveBeenCalledWith(
          `Updating ${testPackageName} from 1.0.0 to 2.0.0`
        )
        expect(requestPackageSpy).toHaveBeenCalledWith(testPackageName)
        expect(parentRunSpy).toHaveBeenCalledWith(testPackageName, undefined)
      })

      it('should update to specific version when specified', async () => {
        // Mock package is at older version
        const currentPackageJson = { name: testPackageName, version: '1.0.0' }
        mockedReadFile.mockResolvedValue(JSON.stringify(currentPackageJson))

        await command.run(testPackageName, '1.5.0')

        expect(mockedLogger.info).toHaveBeenCalledWith(
          `Updating ${testPackageName} from 1.0.0 to 1.5.0`
        )
        expect(parentRunSpy).toHaveBeenCalledWith(testPackageName, '1.5.0')
      })

      it('should handle downgrade scenario', async () => {
        // Mock package is at newer version, downgrading
        const currentPackageJson = { name: testPackageName, version: '2.0.0' }
        mockedReadFile.mockResolvedValue(JSON.stringify(currentPackageJson))

        await command.run(testPackageName, '1.0.0')

        expect(mockedLogger.info).toHaveBeenCalledWith(
          `Downgrading ${testPackageName} from 2.0.0 to 1.0.0`
        )
        expect(parentRunSpy).toHaveBeenCalledWith(testPackageName, '1.0.0')
      })

      it('should skip update when already at specified version', async () => {
        const currentPackageJson = { name: testPackageName, version: '1.0.0' }
        mockedReadFile.mockResolvedValue(JSON.stringify(currentPackageJson))

        await command.run(testPackageName, '1.0.0')

        expect(mockedLogger.info).toHaveBeenCalledWith(
          `Package ${testPackageName}@1.0.0 is already up to date`
        )
        expect(parentRunSpy).not.toHaveBeenCalled()
      })
    })

    describe('error handling', () => {
      it('should handle registry errors when fetching latest version', async () => {
        const currentPackageJson = { name: testPackageName, version: '1.0.0' }
        mockedReadFile.mockResolvedValue(JSON.stringify(currentPackageJson))

        const registryError = new Error('Registry unavailable')
        requestPackageSpy.mockRejectedValue(registryError)

        await expect(command.run(testPackageName)).rejects.toThrow(
          'Registry unavailable'
        )
        expect(requestPackageSpy).toHaveBeenCalledWith(testPackageName)
      })

      it('should handle no compatible version found', async () => {
        const currentPackageJson = { name: testPackageName, version: '1.0.0' }
        mockedReadFile.mockResolvedValue(JSON.stringify(currentPackageJson))

        // Mock package info with no compatible versions
        const incompatiblePackageInfo = {
          ...mockPackageInfo,
          versions: {
            '1.0.0': {
              name: 'test-package',
              main: './lib/index',
              version: '1.0.0',
              description: 'Test package for testing',
              repository: 'test/test-package',
              engines: { inkdrop: '^6.0.0' }, // Incompatible with test version 5.0.0
              dist: {
                tarball:
                  'https://registry.test.com/test-package/-/test-package-1.0.0.tgz'
              }
            }
          }
        }
        requestPackageSpy.mockResolvedValue(incompatiblePackageInfo)

        await expect(command.run(testPackageName)).rejects.toThrow(
          `No compatible version found for package \`${testPackageName}\` with Inkdrop v${testInkdropVersion}`
        )
      })

      it('should handle invalid package.json by treating as not installed', async () => {
        mockedReadFile.mockResolvedValue('invalid json')

        await command.run(testPackageName)

        expect(mockedLogger.info).toHaveBeenCalledWith(
          `Package ${testPackageName} is not installed, installing...`
        )
        expect(parentRunSpy).toHaveBeenCalledWith(testPackageName, undefined)
      })

      it('should handle installation errors', async () => {
        const currentPackageJson = { name: testPackageName, version: '1.0.0' }
        mockedReadFile.mockResolvedValue(JSON.stringify(currentPackageJson))

        const installError = new Error('Installation failed')
        parentRunSpy.mockRejectedValue(installError)

        await expect(command.run(testPackageName)).rejects.toThrow(
          'Installation failed'
        )
      })
    })

    describe('constructor', () => {
      it('should create instance with correct parameters', () => {
        expect(command).toBeDefined()
        expect(command.installedInkdropVersion).toBe(testInkdropVersion)
        expect(command.env).toBe(mockEnvironment)
        expect(command.registry).toBe(mockRegistry)
      })
    })

    describe('edge cases', () => {
      it('should handle scoped package names', async () => {
        const scopedPackageName = '@scope/test-package'
        const currentPackageJson = { name: scopedPackageName, version: '1.0.0' }
        mockedReadFile.mockResolvedValue(JSON.stringify(currentPackageJson))

        await command.run(scopedPackageName)

        expect(requestPackageSpy).toHaveBeenCalledWith(scopedPackageName)
      })

      it('should handle package names with special characters', async () => {
        const specialPackageName = 'test-package_with-special.chars'
        const currentPackageJson = {
          name: specialPackageName,
          version: '1.0.0'
        }
        mockedReadFile.mockResolvedValue(JSON.stringify(currentPackageJson))

        await command.run(specialPackageName)

        expect(requestPackageSpy).toHaveBeenCalledWith(specialPackageName)
      })
    })
  })
})
