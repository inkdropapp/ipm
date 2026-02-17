import axios, { isAxiosError } from 'axios'
import { Environment } from '../environment'
import { logger } from '../logger'
import { IPMRegistry } from '../registry'
import type { AxiosInstance } from 'axios'

/**
 * Command to unpublish a package or package version from the registry.
 */
export class CommandUnpublish {
  apiClient: AxiosInstance

  constructor(
    public env: Environment,
    public registry: IPMRegistry
  ) {
    this.apiClient = this.getAxiosInstance()
  }

  private getAxiosInstance() {
    // Get access key for authentication
    const accessKey = this.env.getInkdropAccessKey()
    if (!accessKey) {
      throw new Error('The access key is not configured.')
    }

    const apiBaseUrl = this.env.getInkdropApiUrl()
    return axios.create({
      baseURL: `${apiBaseUrl}/v2/packages`,
      auth: {
        username: accessKey.accessKeyId,
        password: accessKey.secretAccessKey
      },
      headers: {
        'X-API-KEY': '1'
      }
    })
  }

  async run(name: string, opts: { version?: string }): Promise<boolean> {
    const { version } = opts

    try {
      // Validate package exists
      await this.validatePackageExists(name, version)

      if (version) {
        // Unpublish specific version
        logger.info(`Unpublishing ${name}@${version}...`)
        await this.unpublishVersion(name, version)
        logger.info(`Successfully unpublished ${name}@${version}`)
      } else {
        // Unpublish entire package
        logger.info(`Unpublishing entire package ${name}...`)
        await this.unpublishPackage(name)
        logger.info(`Successfully unpublished ${name}`)
      }

      return true
    } catch (error) {
      logger.error(`Failed to unpublish the package:`, error)
      throw error
    }
  }

  private async validatePackageExists(
    name: string,
    version?: string
  ): Promise<void> {
    try {
      const packageInfo = await this.registry.getPackageInfo(name)

      if (version) {
        // Check if the specific version exists
        if (!packageInfo.versions || !packageInfo.versions[version]) {
          throw new Error(
            `Version ${version} does not exist for package ${name}`
          )
        }
      }
    } catch (error: any) {
      if (isAxiosError(error) && error.response?.status === 404) {
        throw new Error(`Package ${name} does not exist in the registry`, {
          cause: error
        })
      }
      throw error
    }
  }

  private async unpublishPackage(name: string): Promise<void> {
    try {
      await this.apiClient.delete(`/${name}`)
      logger.debug(`DELETE request successful for package: ${name}`)
    } catch (error: any) {
      if (isAxiosError(error) && error.response) {
        throw new Error(
          `Failed to unpublish package: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
          { cause: error }
        )
      }
      throw error
    }
  }

  private async unpublishVersion(name: string, version: string): Promise<void> {
    try {
      await this.apiClient.delete(`/${name}/versions/${version}`)
      logger.debug(`DELETE request successful for ${name}@${version}`)
    } catch (error: any) {
      if (isAxiosError(error) && error.response) {
        throw new Error(
          `Failed to unpublish version: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
          { cause: error }
        )
      }
      throw error
    }
  }
}
