import { execFile } from 'child_process'
import * as fs from 'fs/promises'
import path from 'path'
import { promisify } from 'util'

import axios, { isAxiosError } from 'axios'
import type { AxiosInstance } from 'axios'
import FormData from 'form-data'
import * as tar from 'tar'

import { PACKAGE_MAX_SIZE } from '../consts'
import { Environment } from '../environment'
import { logger } from '../logger'
import { IPMRegistry } from '../registry'

/**
 * Command to publish a new Inkdrop package
 */
export class CommandPublish {
  apiClient: AxiosInstance

  constructor(
    public env: Environment,
    public registry: IPMRegistry
  ) {
    this.apiClient = this.getAxiosInstance()
  }

  private getAxiosInstance() {
    // Get local HTTP server config with auth
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

  async run(opts: { dryrun?: boolean; path?: string }): Promise<boolean> {
    const { dryrun = false, path: packagePath } = opts
    const repoDir = packagePath || process.cwd()

    try {
      const pkg = JSON.parse(await fs.readFile(path.join(repoDir, 'package.json'), 'utf-8'))
      const repository = this.getRepositoryId(pkg)

      logger.info(`Publishing ${pkg.name}@${pkg.version}...`)

      // Step 1 - Validate the package metadata
      await this.validatePackageContents(pkg, repoDir)

      // Step 2 - Run prepublishOnly script if defined
      await this.runPrepublishScript(pkg, repoDir)

      // Step 3 - Create a tarball file of the package
      const { filePath } = await this.createTarball(pkg, repoDir)

      // Step 4 - Upload the tarball to the Inkdrop package registry via the local http server
      await this.uploadTarball(pkg, filePath, repository!, dryrun)

      // Step 5 - Clean up the created tarball file
      await fs.rm(filePath, { force: true })
      logger.info('Cleaned up temporary tarball')

      logger.info(`Successfully published ${pkg.name}@${pkg.version}`)
      return true
    } catch (error) {
      logger.error(`Failed to publish the package:`, error)
      throw error
    }
  }

  getRepositoryId(pack: any = {}): string | null {
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

  async validatePackageContents(pkg: any, _repoDir: string) {
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
        throw new Error('package.json not found in the current directory', {
          cause: error
        })
      }
      throw error
    }
  }

  private async runPrepublishScript(pkg: any, repoDir: string) {
    const script = pkg.scripts?.prepublishOnly
    if (!script) {
      return
    }

    logger.info(`Running prepublishOnly script: ${script}`)

    const execFileAsync = promisify(execFile)
    const shell = process.platform === 'win32' ? 'cmd' : '/bin/sh'
    const shellArgs = process.platform === 'win32' ? ['/c', script] : ['-c', script]

    try {
      const { stdout, stderr } = await execFileAsync(shell, shellArgs, {
        cwd: repoDir
      })
      if (stdout) logger.debug(stdout)
      if (stderr) logger.warn(stderr)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`prepublishOnly script failed: ${message}`, {
        cause: error
      })
    }
  }

  async createTarball(pkg: any, repoDir: string) {
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
        filter: (path) => {
          const normalizedPath = path.replace(/\\/g, '/')

          for (const pattern of excludePatterns) {
            if (pattern.includes('*')) {
              const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
              if (regex.test(normalizedPath)) {
                return false
              }
            } else {
              if (
                normalizedPath === pattern ||
                normalizedPath === `./${pattern}` ||
                normalizedPath.startsWith(`${pattern}/`) ||
                normalizedPath.startsWith(`./${pattern}/`)
              ) {
                return false
              }
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
      await fs.rm(tarballPath, { force: true })
      throw new Error(
        `Package tarball size (${(stats.size / 1024 / 1024).toFixed(2)}MB) exceeds the 30MB limit`
      )
    }

    logger.debug(`Created tarball: ${tarballPath}`)

    return {
      filePath: tarballPath
    }
  }

  private async uploadTarball(
    pkg: any,
    filePath: string,
    repositoryId: string,
    dryrun: boolean = false
  ) {
    // Check if the package already exists. Only a 404 means "not published yet" —
    // treating any other failure as a new package sends an update to the create
    // endpoint, which rejects it and would otherwise reset the package document.
    let isNewPackage = false
    try {
      await this.registry.getPackageInfo(pkg.name, { ignoreCompatibility: true })
    } catch (error: any) {
      if (!isAxiosError(error) || error.response?.status !== 404) {
        throw new Error(`Could not check whether the package ${pkg.name} exists`, { cause: error })
      }
      isNewPackage = true
    }

    // Prepare form data
    const form = new FormData()
    form.append('tarball', await fs.readFile(filePath), {
      filename: path.basename(filePath),
      contentType: 'application/gzip'
    })
    form.append('dryrun', dryrun ? 'true' : 'false')

    if (isNewPackage) {
      form.append('repository', repositoryId)
    }

    // Determine the endpoint
    const endpoint = isNewPackage ? `` : `/${pkg.name}/versions`

    logger.info(`Uploading to ${endpoint}...`)

    try {
      const response = await this.apiClient.post(endpoint, form, {
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
        const { message = '' } = error.response.data || {}
        throw new Error(`Upload failed: ${error.response.status} - ${message}`, {
          cause: error
        })
      }
      throw error
    }
  }
}
