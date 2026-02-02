import { writeFile } from 'fs/promises'
import axios from 'axios'
import { logger } from './logger'
import type {
  PackageInfo,
  PackageSortOptions,
  PackageVersionInfo
} from './types'
import type { AxiosInstance } from 'axios'

export class IPMRegistry {
  apiClient: AxiosInstance

  constructor(apiBaseUrl: string) {
    this.apiClient = axios.create({
      baseURL: `${apiBaseUrl}/v1/packages`
    })
  }

  /**
   * Get a package from the registry
   */
  async getPackageInfo(name: string): Promise<PackageInfo> {
    return this.apiClient.get(name).then(res => res.data)
  }

  /**
   * Get information about a specific version of a package
   */
  async getPackageVersionInfo(
    name: string,
    version: string
  ): Promise<PackageVersionInfo> {
    return this.apiClient
      .get(`${name}/versions/${version}`)
      .then(res => res.data)
  }

  /**
   * Download package tarball for a specific version and save to file
   */
  async downloadPackageTarball(
    name: string,
    version: string,
    destPath: string
  ): Promise<void> {
    const versionInfo = await this.getPackageVersionInfo(name, version)
    const tarballUrl = versionInfo?.dist?.tarball
    logger.debug(`Downloading tarball from ${tarballUrl}...`)
    if (tarballUrl) {
      const data = await this.apiClient
        .get(tarballUrl, {
          responseType: 'arraybuffer'
        })
        .then(res => res.data)

      await writeFile(destPath, Buffer.from(data))
    } else {
      throw new Error(`Tarball URL not found for ${name}@${version}`)
    }
  }

  /**
   * Search packages with keyword
   */
  async search(params: {
    q: string
    sort?: PackageSortOptions | 'score'
    direction?: string
  }): Promise<PackageInfo[]> {
    const { sort = 'score', q = '', direction = 'desc' } = params || {}
    return this.apiClient
      .get(`/search`, {
        params: {
          sort,
          q,
          direction
        }
      })
      .then(res => res.data)
  }

  async getPackages(opts?: {
    sort: PackageSortOptions
    page: number
    theme: boolean
  }): Promise<PackageInfo[]> {
    const { sort = 'recency', page = 0, theme = false } = opts || {}
    return this.apiClient
      .get(`/`, {
        params: {
          sort,
          page,
          theme: theme ? 1 : ''
        }
      })
      .then(res => res.data)
  }

  getPopularPackages(opts?: {
    page: number
    theme: boolean
  }): Promise<PackageInfo[]> {
    return this.getPackages({
      ...(opts || {
        page: 0,
        theme: false
      }),
      sort: 'majority'
    })
  }

  getNewPackages(opts?: {
    page: number
    theme: boolean
  }): Promise<PackageInfo[]> {
    return this.getPackages({
      ...(opts || {
        page: 0,
        theme: false
      }),
      sort: 'recency'
    })
  }
}
