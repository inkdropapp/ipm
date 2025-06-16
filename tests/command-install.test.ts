import { access, mkdir, readFile, rm, writeFile } from 'fs/promises'
import { jest } from '@jest/globals'
import { extract } from 'tar'
import { CommandInstall } from '../src/command-install'
import { Environment } from '../src/environment'
import { logger } from '../src/logger'
import { IPMRegistry } from '../src/registry'
import { PackageInfo, PackageVersionInfo } from '../src/types'

jest.mock('fs/promises')
jest.mock('tar')
jest.mock('../src/logger')

const mockedMkdir = mkdir as jest.MockedFunction<typeof mkdir>
const mockedReadFile = readFile as jest.MockedFunction<typeof readFile>
const mockedRm = rm as jest.MockedFunction<typeof rm>
const mockedWriteFile = writeFile as jest.MockedFunction<typeof writeFile>
const mockedAccess = access as jest.MockedFunction<typeof access>
const mockedExtract = extract as jest.MockedFunction<any>
const mockedLogger = logger as jest.Mocked<typeof logger>

describe('CommandInstall', () => {
  let commandInstall: CommandInstall
  let mockEnvironment: Environment
  let mockRegistry: IPMRegistry
  const testInkdropVersion = '5.9.0'

  beforeEach(() => {
    // Create mock environment
    mockEnvironment = new Environment({ appVersion: testInkdropVersion })
    jest
      .spyOn(mockEnvironment, 'getInkdropDirectory')
      .mockReturnValue('/home/user/.inkdrop')
    jest
      .spyOn(mockEnvironment, 'getCacheDirectory')
      .mockReturnValue('/home/user/.inkdrop/.ipm')

    // Create real registry that will make actual API calls
    mockRegistry = new IPMRegistry('https://api.inkdrop.app')

    commandInstall = new CommandInstall(
      testInkdropVersion,
      mockEnvironment,
      mockRegistry
    )

    // Setup default mocks
    mockedMkdir.mockResolvedValue(undefined)
    mockedRm.mockResolvedValue(undefined)
    mockedWriteFile.mockResolvedValue(undefined)
    mockedExtract.mockResolvedValue(undefined)
    mockedAccess.mockRejectedValue(new Error('ENOENT') as any) // Default to file not existing
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('run', () => {
    it('should successfully install the math package from real API', async () => {
      // This test will make a real API call to get the math package info
      await commandInstall.run('math')

      // Verify that the registry API was called and file system operations were performed
      expect(mockedMkdir).toHaveBeenCalledWith('/home/user/.inkdrop/packages', {
        recursive: true
      })
      expect(mockedMkdir).toHaveBeenCalledWith('/home/user/.inkdrop/.ipm/tmp', {
        recursive: true
      })
      expect(mockedMkdir).toHaveBeenCalledWith(
        '/home/user/.inkdrop/packages/math',
        { recursive: true }
      )
      expect(mockedExtract).toHaveBeenCalled()
      expect(mockedLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/Installing math@/)
      )
      expect(mockedLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/Successfully installed math@/)
      )
    }, 30000) // 30 second timeout for real API call

    it('should install specific version when provided', async () => {
      await commandInstall.run('math', '1.6.0')

      expect(mockedLogger.info).toHaveBeenCalledWith('Installing math@1.6.0...')
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Successfully installed math@1.6.0'
      )
    }, 30000)

    it('should throw error for incompatible version', async () => {
      // Try to install a version that doesn't exist or is incompatible
      await expect(commandInstall.run('math', '999.0.0')).rejects.toThrow()
    }, 10000)

    it('should throw error for non-existent package', async () => {
      await expect(
        commandInstall.run('non-existent-package-12345')
      ).rejects.toThrow()
    }, 10000)
  })

  describe('getLatestCompatibleVersion', () => {
    it('should return compatible version for current Inkdrop version', async () => {
      const packageInfo = await mockRegistry.getPackageInfo('math')
      const latestVersion =
        commandInstall.getLatestCompatibleVersion(packageInfo)

      expect(latestVersion).toBeTruthy()
      expect(typeof latestVersion).toBe('string')
      // Should be a valid semver version
      expect(latestVersion).toMatch(/^\d+\.\d+\.\d+/)
    }, 10000)

    it('should handle package with no compatible versions', () => {
      const mockPackageInfo: PackageInfo = {
        name: 'test-package',
        created_at: 1234567890,
        updated_at: 1234567890,
        repository: 'test/repo',
        downloads: 100,
        releases: { latest: '1.0.0' },
        readme: 'Test README',
        metadata: {
          name: 'test-package',
          main: 'index.js',
          version: '1.0.0',
          description: 'Test package',
          repository: 'test/repo'
        },
        versions: {
          '1.0.0': {
            name: 'test-package',
            main: 'index.js',
            version: '1.0.0',
            description: 'Test package',
            repository: 'test/repo',
            engines: {
              inkdrop: '^1.0.0' // Incompatible with our test version 5.9.0
            },
            dist: {
              tarball: 'https://example.com/test-package-1.0.0.tgz'
            }
          }
        }
      }

      const result = commandInstall.getLatestCompatibleVersion(mockPackageInfo)
      expect(result).toBeNull()
    })
  })

  describe('install', () => {
    const mockPackageVersionInfo: PackageVersionInfo = {
      name: 'math',
      main: './lib/index',
      version: '1.6.1',
      description: 'Add math syntax support to the editor and the preview',
      repository: 'https://github.com/inkdropapp/inkdrop-math',
      engines: {
        inkdrop: '>=5.9.0 <7.0.0'
      },
      dependencies: {
        '@matejmazur/react-katex': '^3.1.3',
        katex: '^0.16.21'
      },
      dist: {
        tarball: 'https://api.inkdrop.app/v1/packages/math/versions/1.6.1/tarball'
      }
    }

    it('should create necessary directories and extract tarball', async () => {
      await commandInstall.install(mockPackageVersionInfo)

      expect(mockedMkdir).toHaveBeenCalledWith('/home/user/.inkdrop/packages', {
        recursive: true
      })
      expect(mockedMkdir).toHaveBeenCalledWith('/home/user/.inkdrop/.ipm/tmp', {
        recursive: true
      })
      expect(mockedMkdir).toHaveBeenCalledWith(
        '/home/user/.inkdrop/packages/math',
        { recursive: true }
      )
      expect(mockedExtract).toHaveBeenCalledWith({
        file: '/home/user/.inkdrop/.ipm/tmp/math-1.6.1.tgz',
        cwd: '/home/user/.inkdrop/packages/math',
        strip: 1
      })
    })

    it('should remove existing package directory before installing', async () => {
      // Mock that the directory exists
      mockedAccess.mockResolvedValueOnce(undefined as any)

      await commandInstall.install(mockPackageVersionInfo)

      expect(mockedRm).toHaveBeenCalledWith(
        '/home/user/.inkdrop/packages/math',
        {
          recursive: true,
          force: true
        }
      )
    })

    it('should install npm dependencies when package.json exists', async () => {
      const mockPackageJson = JSON.stringify({
        name: 'math',
        version: '1.6.1',
        dependencies: {
          katex: '^0.16.21'
        }
      })

      mockedReadFile.mockResolvedValueOnce(mockPackageJson)
      mockedAccess.mockResolvedValue(undefined as any) // Mock successful access for pathExists

      await commandInstall.install(mockPackageVersionInfo)

      expect(mockedReadFile).toHaveBeenCalledWith(
        '/home/user/.inkdrop/packages/math/package.json',
        'utf8'
      )
      expect(mockedMkdir).toHaveBeenCalledWith(
        '/home/user/.inkdrop/packages/math/node_modules',
        { recursive: true }
      )
    })

    it('should handle missing package.json gracefully', async () => {
      const error = new Error('File not found') as NodeJS.ErrnoException
      error.code = 'ENOENT'
      mockedReadFile.mockRejectedValueOnce(error)

      // Should not throw an error
      await expect(
        commandInstall.install(mockPackageVersionInfo)
      ).resolves.not.toThrow()
    })

    it('should clean up tarball after successful installation', async () => {
      await commandInstall.install(mockPackageVersionInfo)

      expect(mockedRm).toHaveBeenCalledWith(
        '/home/user/.inkdrop/.ipm/tmp/math-1.6.1.tgz',
        { force: true }
      )
    })

    it('should log installation progress', async () => {
      await commandInstall.install(mockPackageVersionInfo)

      expect(mockedLogger.info).toHaveBeenCalledWith('Installing math@1.6.1...')
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'Successfully installed math@1.6.1'
      )
    })

    it('should handle installation errors and log them', async () => {
      const error = new Error('Installation failed')
      mockedExtract.mockRejectedValueOnce(error)

      await expect(
        commandInstall.install(mockPackageVersionInfo)
      ).rejects.toThrow('Installation failed')
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Failed to install math@1.6.1:',
        error
      )
    })
  })

  describe('requestPackage', () => {
    it('should successfully fetch the math package from real API', async () => {
      const packageInfo = await commandInstall.requestPackage('math')

      expect(packageInfo).toBeDefined()
      expect(packageInfo.name).toBe('math')
      expect(packageInfo.releases).toBeDefined()
      expect(packageInfo.releases.latest).toBeDefined()
      expect(packageInfo.versions).toBeDefined()
      expect(typeof packageInfo.versions).toBe('object')
    }, 10000)

    it('should throw error for package with no releases', async () => {
      // This should fail with a real package that has no releases (if any exist)
      // For now, we'll test with a non-existent package
      await expect(
        commandInstall.requestPackage('definitely-does-not-exist-12345')
      ).rejects.toThrow()
    }, 10000)
  })

  describe('integration test with real math package', () => {
    it('should successfully complete the full installation flow for math package', async () => {
      // This is a comprehensive integration test that uses the real API
      // but mocks file system operations

      // Mock that package.json exists and has dependencies
      const mockPackageJson = JSON.stringify({
        name: 'math',
        version: '1.6.1',
        dependencies: {
          '@matejmazur/react-katex': '^3.1.3',
          katex: '^0.16.21'
        }
      })
      mockedReadFile.mockResolvedValueOnce(mockPackageJson)

      await commandInstall.run('math')

      // Verify the complete flow
      expect(mockedMkdir).toHaveBeenCalledWith('/home/user/.inkdrop/packages', {
        recursive: true
      })
      expect(mockedMkdir).toHaveBeenCalledWith('/home/user/.inkdrop/.ipm/tmp', {
        recursive: true
      })
      expect(mockedExtract).toHaveBeenCalled()
      expect(mockedLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/Installing math@/)
      )
      expect(mockedLogger.info).toHaveBeenCalledWith(
        expect.stringMatching(/Successfully installed math@/)
      )

      // Verify dependency installation was attempted
      expect(mockedReadFile).toHaveBeenCalledWith(
        expect.stringMatching(/\/math\/package\.json$/),
        'utf8'
      )
    }, 30000)
  })
})

