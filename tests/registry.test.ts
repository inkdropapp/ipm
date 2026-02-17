import { writeFile } from 'fs/promises'
import { jest } from '@jest/globals'
import axios from 'axios'
import { IPMRegistry } from '../src/registry'

jest.mock('axios')
jest.mock('fs/promises')

const mockedAxios = axios as jest.Mocked<typeof axios>
const mockedWriteFile = writeFile as jest.MockedFunction<typeof writeFile>

describe('IPMRegistry', () => {
  let registry: IPMRegistry
  let mockAxiosInstance: jest.Mocked<any>

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn()
    }
    mockedAxios.create.mockReturnValue(mockAxiosInstance)
    registry = new IPMRegistry('5.9.0', 'https://api.inkdrop.app')
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should create axios instance with correct baseURL', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.inkdrop.app/v1/packages',
        headers: {
          'X-CLIENT-VERSION': '5.9.0'
        }
      })
    })
  })

  describe('getPackageInfo', () => {
    it('should fetch package information', async () => {
      const mockPackageInfo = {
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
        }
      }

      mockAxiosInstance.get.mockResolvedValue({ data: mockPackageInfo })

      const result = await registry.getPackageInfo('test-package')

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('test-package')
      expect(result).toEqual(mockPackageInfo)
    })

    it('should handle API errors', async () => {
      const error = new Error('Package not found')
      mockAxiosInstance.get.mockRejectedValue(error)

      await expect(registry.getPackageInfo('nonexistent')).rejects.toThrow(
        'Package not found'
      )
    })
  })

  describe('getPackageVersionInfo', () => {
    it('should fetch specific version information', async () => {
      const mockVersionInfo = {
        name: 'test-package',
        main: 'index.js',
        version: '1.0.0',
        description: 'Test package',
        repository: 'test/repo',
        dist: {
          tarball:
            'https://api.inkdrop.app/v1/packages/test-package/versions/1.0.0/tarball'
        }
      }

      mockAxiosInstance.get.mockResolvedValue({ data: mockVersionInfo })

      const result = await registry.getPackageVersionInfo(
        'test-package',
        '1.0.0'
      )

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        'test-package/versions/1.0.0'
      )
      expect(result).toEqual(mockVersionInfo)
    })

    it('should handle version not found errors', async () => {
      const error = new Error('Version not found')
      mockAxiosInstance.get.mockRejectedValue(error)

      await expect(
        registry.getPackageVersionInfo('test-package', '99.0.0')
      ).rejects.toThrow('Version not found')
    })
  })

  describe('downloadPackageTarball', () => {
    const mockVersionInfo = {
      name: 'test-package',
      version: '1.0.0',
      dist: {
        tarball:
          'https://api.inkdrop.app/v2/packages/test-package/versions/1.0.0/tarball'
      }
    }

    it('should download and save tarball to file', async () => {
      const mockTarballData = new ArrayBuffer(1024)
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockVersionInfo })
        .mockResolvedValueOnce({ data: mockTarballData })
      mockedWriteFile.mockResolvedValue(undefined)

      await registry.downloadPackageTarball(
        'test-package',
        '1.0.0',
        '/tmp/test-package-1.0.0.tgz'
      )

      expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(
        1,
        'test-package/versions/1.0.0'
      )
      expect(mockAxiosInstance.get).toHaveBeenNthCalledWith(
        2,
        'https://api.inkdrop.app/v2/packages/test-package/versions/1.0.0/tarball',
        {
          responseType: 'arraybuffer'
        }
      )
      expect(mockedWriteFile).toHaveBeenCalledWith(
        '/tmp/test-package-1.0.0.tgz',
        Buffer.from(mockTarballData)
      )
    })

    it('should handle download errors', async () => {
      const error = new Error('Download failed')
      mockAxiosInstance.get.mockRejectedValue(error)

      await expect(
        registry.downloadPackageTarball(
          'test-package',
          '1.0.0',
          '/tmp/test.tgz'
        )
      ).rejects.toThrow('Download failed')
    })

    it('should handle file write errors', async () => {
      const mockTarballData = new ArrayBuffer(1024)
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockVersionInfo })
        .mockResolvedValueOnce({ data: mockTarballData })
      mockedWriteFile.mockRejectedValue(new Error('Write failed'))

      await expect(
        registry.downloadPackageTarball(
          'test-package',
          '1.0.0',
          '/tmp/test.tgz'
        )
      ).rejects.toThrow('Write failed')
    })
  })

  describe('search', () => {
    it('should search packages with default parameters', async () => {
      const mockSearchResults = [
        {
          name: 'package1',
          created_at: 1234567890,
          updated_at: 1234567890,
          repository: 'user/package1',
          downloads: 50,
          releases: { latest: '1.0.0' },
          readme: 'Package 1',
          metadata: {
            name: 'package1',
            main: 'index.js',
            version: '1.0.0',
            description: 'Package 1',
            repository: 'user/package1'
          }
        }
      ]

      mockAxiosInstance.get.mockResolvedValue({ data: mockSearchResults })

      const result = await registry.search({ q: 'test' })

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/search', {
        params: {
          sort: 'score',
          q: 'test',
          direction: 'desc'
        }
      })
      expect(result).toEqual(mockSearchResults)
    })

    it('should search packages with custom parameters', async () => {
      const mockSearchResults = []
      mockAxiosInstance.get.mockResolvedValue({ data: mockSearchResults })

      await registry.search({
        q: 'markdown',
        sort: 'majority',
        direction: 'asc'
      })

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/search', {
        params: {
          sort: 'majority',
          q: 'markdown',
          direction: 'asc'
        }
      })
    })
  })

  describe('getPackages', () => {
    it('should get packages with default parameters', async () => {
      const mockPackages = [
        {
          name: 'package1',
          created_at: 1234567890,
          updated_at: 1234567890,
          repository: 'user/package1',
          downloads: 50,
          releases: { latest: '1.0.0' },
          readme: 'Package 1',
          metadata: {
            name: 'package1',
            main: 'index.js',
            version: '1.0.0',
            description: 'Package 1',
            repository: 'user/package1'
          }
        }
      ]

      mockAxiosInstance.get.mockResolvedValue({ data: mockPackages })

      const result = await registry.getPackages()

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/', {
        params: {
          sort: 'recency',
          page: 0,
          theme: ''
        }
      })
      expect(result).toEqual(mockPackages)
    })

    it('should get packages with custom parameters', async () => {
      const mockPackages = []
      mockAxiosInstance.get.mockResolvedValue({ data: mockPackages })

      await registry.getPackages({ sort: 'majority', page: 2, theme: true })

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/', {
        params: {
          sort: 'majority',
          page: 2,
          theme: 1
        }
      })
    })
  })

  describe('getPopularPackages', () => {
    it('should get popular packages with default parameters', async () => {
      const mockPackages = []
      mockAxiosInstance.get.mockResolvedValue({ data: mockPackages })

      await registry.getPopularPackages()

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/', {
        params: {
          sort: 'majority',
          page: 0,
          theme: ''
        }
      })
    })

    it('should get popular packages with custom parameters', async () => {
      const mockPackages = []
      mockAxiosInstance.get.mockResolvedValue({ data: mockPackages })

      await registry.getPopularPackages({ page: 1, theme: true })

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/', {
        params: {
          sort: 'majority',
          page: 1,
          theme: 1
        }
      })
    })
  })

  describe('getNewPackages', () => {
    it('should get new packages with default parameters', async () => {
      const mockPackages = []
      mockAxiosInstance.get.mockResolvedValue({ data: mockPackages })

      await registry.getNewPackages()

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/', {
        params: {
          sort: 'recency',
          page: 0,
          theme: ''
        }
      })
    })

    it('should get new packages with custom parameters', async () => {
      const mockPackages = []
      mockAxiosInstance.get.mockResolvedValue({ data: mockPackages })

      await registry.getNewPackages({ page: 3, theme: false })

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/', {
        params: {
          sort: 'recency',
          page: 3,
          theme: ''
        }
      })
    })
  })
})
