import { rm } from 'fs/promises'
import * as fs from 'fs/promises'
import path from 'path'
import axios, { isAxiosError } from 'axios'
import FormData from 'form-data'
import { PACKAGE_MAX_SIZE } from 'src/consts'
import * as tar from 'tar'
import { Environment } from '../environment'
import { logger } from '../logger'

/**
 * Command to publish a new Inkdrop package
 */
export class CommandPublish {
  constructor(public env: Environment) {}

  async run(): Promise<boolean> {
    const repoDir = process.cwd()

    try {
      const { default: pkg } = await import(
        path.join(repoDir, 'package.json'),
        { with: { type: 'json' } }
      )
      const repository = this.getRepositoryId(pkg)

      logger.info(`Publishing ${pkg.name}@${pkg.version}...`)

      // Step 1 - Validate the package metadata
      await this.validatePackageContents(pkg, repoDir)

      // Step 2 - Create a tarball file of the package
      const { filePath } = await this.createTarball(pkg, repoDir)

      // Step 3 - Upload the tarball to the Inkdrop package registry via the local http server
      await this.uploadTarball(pkg, filePath, repository!)

      // Step 4 - Clean up the created tarball file
      await rm(filePath, { force: true })
      logger.info('Cleaned up temporary tarball')

      logger.info(`Successfully published ${pkg.name}@${pkg.version}`)
      return true
    } catch (error) {
      logger.error(`Failed to publish the package:`, error)
      throw error
    }
  }

  private getRepositoryId(pack: any = {}): string | null {
    const repository = pack.repository?.url ?? pack.repository

    if (!repository || typeof repository !== 'string') {
      return null
    }

    try {
      const repoPath = new URL(repository.replace(/\.git$/, '')).pathname
      const [owner, name] = repoPath.split('/').slice(-2)

      if (name && owner) {
        return `${owner}/${name}`
      }
    } catch {
      return null
    }

    return null
  }

  private async validatePackageContents(pkg: any, repoDir: string) {
    try {
      // Validate required fields
      if (!pkg.name || typeof pkg.name !== 'string') {
        throw new Error('package.json must have a valid "name" field')
      }

      if (!pkg.version || typeof pkg.version !== 'string') {
        throw new Error('package.json must have a valid "version" field')
      }

      // Validate repository field
      const repository = this.getRepositoryId(pkg)
      if (!repository) {
        throw new Error(
          'package.json must have a valid "repository" field (e.g., https://github.com/owner/repo)'
        )
      }

      // Validate Inkdrop engine compatibility
      if (!pkg.engines?.inkdrop) {
        logger.warn(
          'Warning: package.json does not specify "engines.inkdrop" field. This package may not be compatible with all Inkdrop versions.'
        )
      }

      logger.debug('Package validation passed')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error('package.json not found in the current directory')
      }
      throw error
    }
  }

  private async createTarball(pkg: any, repoDir: string) {
    const tempDir = path.join(this.env.getCacheDirectory(), 'publish')
    await fs.mkdir(tempDir, { recursive: true })

    const tarballPath = path.join(tempDir, `${pkg.name}-${pkg.version}.tar.gz`)

    // Files to exclude from the tarball
    const excludePatterns = [
      'node_modules',
      '.git',
      '.github',
      '.vscode',
      '.DS_Store',
      '*.log',
      '.npm',
      '.eslint*',
      '.env',
      '.env.local',
      '.env.*.local',
      'coverage',
      '.nyc_output',
      'tmp',
      'temp',
      '*.tgz',
      '*.tar.gz'
    ]

    await tar.create(
      {
        gzip: true,
        file: tarballPath,
        cwd: repoDir,
        filter: path => {
          // Check if path matches any exclude pattern
          for (const pattern of excludePatterns) {
            if (pattern.includes('*')) {
              // Simple glob pattern matching
              const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
              if (regex.test(path)) {
                return false
              }
            } else if (path === pattern || path.startsWith(`${pattern}/`)) {
              return false
            }
          }
          return true
        }
      },
      ['.']
    )

    // Check file size (max 30MB)
    const stats = await fs.stat(tarballPath)

    if (stats.size > PACKAGE_MAX_SIZE) {
      await rm(tarballPath, { force: true })
      throw new Error(
        `Package tarball size (${(stats.size / 1024 / 1024).toFixed(2)}MB) exceeds the 30MB limit`
      )
    }

    logger.debug(`Created tarball: ${tarballPath}`)

    return {
      filePath: tarballPath
    }
  }

  private getAxiosInstance() {
    // Get local HTTP server config with auth
    const config = this.env.getLocalHttpServerConfig()
    if (!config) {
      throw new Error(
        'Local HTTP server authentication is not configured. Please set INKDROP_LOCAL_HTTP_SERVER_USERNAME and INKDROP_LOCAL_HTTP_SERVER_PASSWORD environment variables.'
      )
    }

    const { url, auth } = config
    return axios.create({
      baseURL: url,
      auth: {
        username: auth.username,
        password: auth.password
      }
    })
  }

  private async uploadTarball(
    pkg: any,
    filePath: string,
    repositoryId: string
  ) {
    const apiClient = this.getAxiosInstance()

    // Check if the package already exists
    let isNewPackage = true
    try {
      const checkResponse = await apiClient.get(`/v2/packages/${pkg.name}`)
      isNewPackage = !checkResponse.data
    } catch (error: any) {
      if (error.response?.status !== 404) {
        // If it's not a 404, something else went wrong
        logger.warn('Could not check if package exists:', error.message)
      }
      // 404 means package doesn't exist, so it's a new package
    }

    // Prepare form data
    const form = new FormData()
    form.append('tarball', await fs.readFile(filePath), {
      filename: path.basename(filePath),
      contentType: 'application/gzip'
    })

    if (isNewPackage) {
      form.append('repository', repositoryId)
    }

    // Determine the endpoint
    const endpoint = isNewPackage
      ? `/v2/packages`
      : `/v2/packages/${pkg.name}/versions`

    logger.info(`Uploading to ${endpoint}...`)

    try {
      const response = await apiClient.post(endpoint, form, {
        headers: {
          ...form.getHeaders()
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      })

      logger.info('Upload successful!')
      return response.data
    } catch (error: any) {
      if (isAxiosError(error) && error.response) {
        throw new Error(
          `Upload failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        )
      }
      throw error
    }
  }
}
