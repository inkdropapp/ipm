import { writeFile } from 'fs/promises'

import axios from 'axios'
import type { AxiosInstance } from 'axios'

import { logger } from './logger'
import type { PackageInfo, PackageSortOptions, PackageVersionInfo } from './types'

export class IPMRegistry {
  apiClient: AxiosInstance
  installedInkdropVersion: string

  constructor(installedInkdropVersion: string, apiBaseUrl: string) {
    this.installedInkdropVersion = installedInkdropVersion
    this.apiClient = axios.create({
      baseURL: `${apiBaseUrl}/v2/packages`,
      headers: {
        'X-CLIENT-VERSION': this.installedInkdropVersion
      }
    })
  }

  /**
   * Get a package from the registry.
   *
   * Returns 404 when no version is compatible with the client's Inkdrop major.
   * Versions are returned as-is; the caller resolves the installable version
   * from each version's `engines`.
   */
  async getPackageInfo(name: string): Promise<PackageInfo> {
    return this.apiClient.get(name).then((res) => res.data)
  }

  /**
   * Get information about a specific version of a package
   */
  async getPackageVersionInfo(name: string, version: string): Promise<PackageVersionInfo> {
    return this.apiClient.get(`${name}/versions/${version}`).then((res) => res.data)
  }

  /**
   * Download a package tarball for a specific version and save it to a file.
   *
   * Hits the v2 tarball endpoint, which redirects to the storage URL; axios
   * follows the redirect and returns the binary payload.
   */
  async downloadPackageTarball(name: string, version: string, destPath: string): Promise<void> {
    logger.debug(`Downloading tarball for ${name}@${version} to ${destPath}...`)
    const data = await this.apiClient
      .get(`${name}/versions/${version}/tarball`, {
        responseType: 'arraybuffer'
      })
      .then((res) => res.data)

    await writeFile(destPath, Buffer.from(data))
  }

  /**
   * Search packages with a keyword
   */
  async search(params: { q: string }): Promise<PackageInfo[]> {
    const { q = '' } = params || {}
    return this.apiClient
      .get(`/search`, {
        params: {
          q
        }
      })
      .then((res) => res.data)
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
      .then((res) => res.data)
  }

  getPopularPackages(opts?: { page: number; theme: boolean }): Promise<PackageInfo[]> {
    return this.getPackages({
      ...(opts || {
        page: 0,
        theme: false
      }),
      sort: 'majority'
    })
  }

  getNewPackages(opts?: { page: number; theme: boolean }): Promise<PackageInfo[]> {
    return this.getPackages({
      ...(opts || {
        page: 0,
        theme: false
      }),
      sort: 'recency'
    })
  }
}
