import axios from 'axios'
import type { PackageDetail, PackageInfo, PackageMetadata } from './types'
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
  async getPackageDetail(name: string): Promise<PackageDetail> {
    return this.apiClient.get(name).then(res => res.data)
  }

  /**
   * Search packages with keyword
   */
  async search(params: {
    q: string
    sort?: string
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
    sort: string
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
