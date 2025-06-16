import { mkdir, readFile, rm } from 'fs/promises'
import path from 'path'
import axios from 'axios'
import { extract } from 'tar'
import { Environment } from './environment'
import { logger } from './logger'
import { IPMRegistry } from './registry'
import { PackageMetadata, PackageVersionInfo } from './types'

export class CommandInstall {
  constructor(
    public env: Environment,
    public registry: IPMRegistry
  ) {}

  async run(pkg: PackageVersionInfo): Promise<void> {
    const packagesDir = path.join(this.env.getInkdropDirectory(), 'packages')
    const packageDir = path.join(packagesDir, pkg.name)
    const tempDir = path.join(this.env.getCacheDirectory(), 'tmp')
    const tarballPath = path.join(tempDir, `${pkg.name}-${pkg.version}.tgz`)

    try {
      await mkdir(packagesDir, { recursive: true })
      await mkdir(tempDir, { recursive: true })

      logger.info(`Installing ${pkg.name}@${pkg.version}...`)

      await this.registry.downloadPackageTarball(
        pkg.name,
        pkg.version,
        tarballPath
      )

      if (await this.pathExists(packageDir)) {
        await rm(packageDir, { recursive: true, force: true })
      }
      await mkdir(packageDir, { recursive: true })

      await this.extractTarball(tarballPath, packageDir)

      await this.installDependencies(packageDir)

      await rm(tarballPath, { force: true })

      logger.info(`Successfully installed ${pkg.name}@${pkg.version}`)
    } catch (error) {
      logger.error(`Failed to install ${pkg.name}@${pkg.version}:`, error)
      throw error
    }
  }

  private async extractTarball(
    tarballPath: string,
    extractDir: string
  ): Promise<void> {
    await extract({
      file: tarballPath,
      cwd: extractDir,
      strip: 1
    })
  }

  private async installDependencies(packageDir: string): Promise<void> {
    const packageJsonPath = path.join(packageDir, 'package.json')

    try {
      const packageJsonContent = await readFile(packageJsonPath, 'utf8')
      const packageJson: PackageMetadata = JSON.parse(packageJsonContent)

      if (packageJson.dependencies) {
        const nodeModulesDir = path.join(packageDir, 'node_modules')
        await mkdir(nodeModulesDir, { recursive: true })

        for (const [depName, depVersion] of Object.entries(
          packageJson.dependencies
        )) {
          await this.installNpmDependency(depName, depVersion, nodeModulesDir)
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warn(
          `Warning: Could not read package.json for dependency installation:`,
          error
        )
      }
    }
  }

  private async installNpmDependency(
    name: string,
    version: string,
    nodeModulesDir: string
  ): Promise<void> {
    const depDir = path.join(nodeModulesDir, name)
    const tempDir = path.join(this.env.getCacheDirectory(), 'npm-tmp')
    await mkdir(tempDir, { recursive: true })

    try {
      const cleanVersion = version.replace(/^[\^~]/, '')
      const tarballUrl = `https://registry.npmjs.org/${name}/-/${name}-${cleanVersion}.tgz`
      const tarballPath = path.join(tempDir, `${name}-${cleanVersion}.tgz`)

      logger.info(`  Installing dependency ${name}@${cleanVersion}...`)

      const response = await axios({
        method: 'GET',
        url: tarballUrl,
        responseType: 'arraybuffer'
      })

      await import('fs/promises').then(fs =>
        fs.writeFile(tarballPath, Buffer.from(response.data))
      )

      if (await this.pathExists(depDir)) {
        await rm(depDir, { recursive: true, force: true })
      }
      await mkdir(depDir, { recursive: true })

      await this.extractTarball(tarballPath, depDir)
      await rm(tarballPath, { force: true })
    } catch (error) {
      logger.warn(
        `Warning: Failed to install dependency ${name}@${version}:`,
        error
      )
    }
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await import('fs/promises').then(fs => fs.access(filePath))
      return true
    } catch {
      return false
    }
  }
}
