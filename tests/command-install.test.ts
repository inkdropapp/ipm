import { access, mkdir, readFile, rm, writeFile } from 'fs/promises'
import path from 'path'
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
jest.mock('../src/registry')

const mockedMkdir = mkdir as jest.MockedFunction<typeof mkdir>
const mockedReadFile = readFile as jest.MockedFunction<typeof readFile>
const mockedRm = rm as jest.MockedFunction<typeof rm>
const mockedWriteFile = writeFile as jest.MockedFunction<typeof writeFile>
const mockedAccess = access as jest.MockedFunction<typeof access>
const mockedExtract = extract as jest.MockedFunction<any>
const mockedLogger = logger as jest.Mocked<typeof logger>

// Mock data based on real math package from api.inkdrop.app
const mockMathPackageInfo: PackageInfo = {
  name: 'math',
  created_at: 1477372283896,
  updated_at: 1742973710964,
  repository: 'inkdropapp/inkdrop-math',
  downloads: 19181,
  releases: {
    latest: '1.6.1'
  },
  readme: 'Math package for Inkdrop',
  metadata: {
    name: 'math',
    main: './lib/index',
    version: '1.6.1',
    description: 'Add math syntax support to the editor and the preview',
    repository: 'https://github.com/inkdropapp/inkdrop-math'
  },
  versions: {
    '1.6.0': {
      name: 'math',
      main: './lib/index',
      version: '1.6.0',
      description: 'Add math syntax support to the editor and the preview',
      repository: 'https://github.com/inkdropapp/inkdrop-math',
      engines: {
        inkdrop: '>=5.9.0 <7.0.0'
      },
      dependencies: {
        '@matejmazur/react-katex': '^3.1.3',
        'katex': '^0.16.10'
      },
      dist: {
        tarball: 'https://api.inkdrop.app/v1/packages/math/versions/1.6.0/tarball'
      }
    },
    '1.6.1': {
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
        'katex': '^0.16.21'
      },
      dist: {
        tarball: 'https://api.inkdrop.app/v1/packages/math/versions/1.6.1/tarball'
      }
    },
    '999.0.0': {
      name: 'math',
      main: './lib/index',
      version: '999.0.0',
      description: 'Add math syntax support to the editor and the preview',
      repository: 'https://github.com/inkdropapp/inkdrop-math',
      engines: {
        inkdrop: '>=999.0.0 <1000.0.0' // Incompatible version for testing
      },
      dist: {
        tarball: 'https://api.inkdrop.app/v1/packages/math/versions/999.0.0/tarball'
      }
    }
  }
}

describe('CommandInstall', () => {
  let commandInstall: CommandInstall
  let mockEnvironment: Environment
  let mockRegistry: jest.Mocked<IPMRegistry>
  const testInkdropVersion = '5.9.0'
  let testInkdropDir: string
  let testCacheDir: string

  beforeEach(() => {
    // Create mock environment
    mockEnvironment = new Environment({ appVersion: testInkdropVersion })
    testInkdropDir = process.platform === 'win32' 
      ? path.join('C:', 'Users', 'user', 'AppData', 'Roaming', 'inkdrop')
      : path.join(process.env.HOME || '/home/user', '.config', 'inkdrop')
    testCacheDir = path.join(testInkdropDir, '.ipm')
    
    jest
      .spyOn(mockEnvironment, 'getInkdropDirectory')
      .mockReturnValue(testInkdropDir)
    jest
      .spyOn(mockEnvironment, 'getCacheDirectory')
      .mockReturnValue(testCacheDir)

    // Create mocked registry
    mockRegistry = {
      getPackageInfo: jest.fn(),
      getPackageVersionInfo: jest.fn(),
      downloadPackageTarball: jest.fn(),
      search: jest.fn(),
      getPackages: jest.fn(),
      getPopularPackages: jest.fn(),
      getNewPackages: jest.fn()
    } as any

    // Setup default mock responses
    mockRegistry.getPackageInfo.mockImplementation((name: string) => {
      if (name === 'math') {
        return Promise.resolve(mockMathPackageInfo)
      } else if (name === 'non-existent-package-12345') {
        return Promise.reject(new Error('Package not found'))
      } else {
        return Promise.reject(new Error('Package not found'))
      }
    })

    mockRegistry.downloadPackageTarball.mockResolvedValue(undefined)

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
    it('should successfully install the math package using mocked API', async () => {
      await commandInstall.run('math')

      // Verify that the registry API was called
      expect(mockRegistry.getPackageInfo).toHaveBeenCalledWith('math')
      expect(mockRegistry.downloadPackageTarball).toHaveBeenCalledWith(
        'math',
        '1.6.1',
        path.join(testCacheDir, 'tmp', 'math-1.6.1.tgz')
      )

      // Verify file system operations were performed
      expect(mockedMkdir).toHaveBeenCalledWith(path.join(testInkdropDir, 'packages'), {
        recursive: true
      })
      expect(mockedMkdir).toHaveBeenCalledWith(path.join(testCacheDir, 'tmp'), {
        recursive: true
      })
      expect(mockedMkdir).toHaveBeenCalledWith(
        path.join(testInkdropDir, 'packages', 'math'),
        { recursive: true }
      )
      expect(mockedExtract).toHaveBeenCalled()
      expect(mockedLogger.info).toHaveBeenCalledWith('Installing math@1.6.1...')
      expect(mockedLogger.info).toHaveBeenCalledWith('Successfully installed math@1.6.1')
    })

    it('should install specific version when provided', async () => {
      await commandInstall.run('math', '1.6.0')

      expect(mockRegistry.getPackageInfo).toHaveBeenCalledWith('math')
      expect(mockRegistry.downloadPackageTarball).toHaveBeenCalledWith(
        'math',
        '1.6.0',
        path.join(testCacheDir, 'tmp', 'math-1.6.0.tgz')
      )
      expect(mockedLogger.info).toHaveBeenCalledWith('Installing math@1.6.0...')
      expect(mockedLogger.info).toHaveBeenCalledWith('Successfully installed math@1.6.0')
    })

    it('should throw error for incompatible version', async () => {
      await expect(commandInstall.run('math', '999.0.0')).rejects.toThrow(
        'math@999.0.0 is not compatible with your Inkdrop v5.9.0'
      )
    })

    it('should throw error for non-existent package', async () => {
      await expect(
        commandInstall.run('non-existent-package-12345')
      ).rejects.toThrow('Package not found')
    })
  })

  describe('getLatestCompatibleVersion', () => {
    it('should return compatible version for current Inkdrop version', () => {
      const latestVersion = commandInstall.getLatestCompatibleVersion(mockMathPackageInfo)

      expect(latestVersion).toBe('1.6.1') // Latest compatible version
      expect(mockRegistry.getPackageInfo).not.toHaveBeenCalled() // This test doesn't need API call
    })

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

      expect(mockedMkdir).toHaveBeenCalledWith(path.join(testInkdropDir, 'packages'), {
        recursive: true
      })
      expect(mockedMkdir).toHaveBeenCalledWith(path.join(testCacheDir, 'tmp'), {
        recursive: true
      })
      expect(mockedMkdir).toHaveBeenCalledWith(
        path.join(testInkdropDir, 'packages', 'math'),
        { recursive: true }
      )
      expect(mockedExtract).toHaveBeenCalledWith({
        file: path.join(testCacheDir, 'tmp', 'math-1.6.1.tgz'),
        cwd: path.join(testInkdropDir, 'packages', 'math'),
        strip: 1
      })
    })

    it('should remove existing package directory before installing', async () => {
      // Mock that the directory exists
      mockedAccess.mockResolvedValueOnce(undefined as any)

      await commandInstall.install(mockPackageVersionInfo)

      expect(mockedRm).toHaveBeenCalledWith(
        path.join(testInkdropDir, 'packages', 'math'),
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
        path.join(testInkdropDir, 'packages', 'math', 'package.json'),
        'utf8'
      )
      expect(mockedMkdir).toHaveBeenCalledWith(
        path.join(testInkdropDir, 'packages', 'math', 'node_modules'),
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
        path.join(testCacheDir, 'tmp', 'math-1.6.1.tgz'),
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
    it('should successfully fetch the math package from mocked API', async () => {
      const packageInfo = await commandInstall.requestPackage('math')

      expect(mockRegistry.getPackageInfo).toHaveBeenCalledWith('math')
      expect(packageInfo).toBeDefined()
      expect(packageInfo.name).toBe('math')
      expect(packageInfo.releases).toBeDefined()
      expect(packageInfo.releases.latest).toBe('1.6.1')
      expect(packageInfo.versions).toBeDefined()
      expect(typeof packageInfo.versions).toBe('object')
    })

    it('should throw error for package with no releases', async () => {
      // Mock a package with no releases
      const packageWithoutReleases = { ...mockMathPackageInfo, releases: {} as any }
      mockRegistry.getPackageInfo.mockResolvedValueOnce(packageWithoutReleases)

      await expect(commandInstall.requestPackage('no-releases-package')).rejects.toThrow(
        'No releases available for no-releases-package'
      )
    })

    it('should throw error for non-existent package', async () => {
      await expect(
        commandInstall.requestPackage('definitely-does-not-exist-12345')
      ).rejects.toThrow('Package not found')
    })
  })

  describe('integration test with mocked math package', () => {
    it('should successfully complete the full installation flow for math package', async () => {
      // This is a comprehensive integration test that uses mocked API
      // and mocks file system operations

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

      // Verify API calls
      expect(mockRegistry.getPackageInfo).toHaveBeenCalledWith('math')
      expect(mockRegistry.downloadPackageTarball).toHaveBeenCalledWith(
        'math',
        '1.6.1',
        path.join(testCacheDir, 'tmp', 'math-1.6.1.tgz')
      )

      // Verify the complete flow
      expect(mockedMkdir).toHaveBeenCalledWith(path.join(testInkdropDir, 'packages'), {
        recursive: true
      })
      expect(mockedMkdir).toHaveBeenCalledWith(path.join(testCacheDir, 'tmp'), {
        recursive: true
      })
      expect(mockedExtract).toHaveBeenCalled()
      expect(mockedLogger.info).toHaveBeenCalledWith('Installing math@1.6.1...')
      expect(mockedLogger.info).toHaveBeenCalledWith('Successfully installed math@1.6.1')

      // Verify dependency installation was attempted
      expect(mockedReadFile).toHaveBeenCalledWith(
        path.join(testInkdropDir, 'packages', 'math', 'package.json'),
        'utf8'
      )
    })
  })

})

