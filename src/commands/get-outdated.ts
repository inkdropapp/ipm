import { readdir, readFile } from 'fs/promises'
import path from 'path'
import semver from 'semver'
import { Environment } from '../environment'
import { logger } from '../logger'
import { IPMRegistry } from '../registry'
import { OutdatedPackageInfo, PackageMetadata } from '../types'
import { getLatestCompatibleVersion } from '../utils'

export class CommandGetOutdated {
  constructor(
    public installedInkdropVersion: string,
    public env: Environment,
    public registry: IPMRegistry
  ) {}

  async run(): Promise<OutdatedPackageInfo[]> {
    const packagesDir = path.join(this.env.getInkdropDirectory(), 'packages')
    const outdatedPackages: OutdatedPackageInfo[] = []

    try {
      const installedPkgs = await this.getInstalledPackages(packagesDir)
      
      for (const pkg of installedPkgs) {
        try {
          const packageInfo = await this.registry.getPackageInfo(pkg.name)
          const latestVersion = getLatestCompatibleVersion(
            packageInfo,
            this.installedInkdropVersion
          )

          if (latestVersion && semver.gt(latestVersion, pkg.version)) {
            outdatedPackages.push({
              name: pkg.name,
              version: pkg.version,
              latestVersion
            })
          }
        } catch (error) {
          logger.warn(`Warning: Could not check updates for ${pkg.name}:`, error)
        }
      }
    } catch (error) {
      logger.error('Failed to get outdated packages:', error)
      throw error
    }

    return outdatedPackages
  }

  private async getInstalledPackages(packagesDir: string): Promise<PackageMetadata[]> {
    const installedPackages: PackageMetadata[] = []

    try {
      const packageNames = await readdir(packagesDir)
      
      for (const packageName of packageNames) {
        const packageDir = path.join(packagesDir, packageName)
        const packageJsonPath = path.join(packageDir, 'package.json')

        try {
          const packageJsonContent = await readFile(packageJsonPath, 'utf8')
          const packageJson: PackageMetadata = JSON.parse(packageJsonContent)
          installedPackages.push(packageJson)
        } catch (error) {
          logger.warn(`Warning: Could not read package.json for ${packageName}:`, error)
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
      // No packages directory means no packages installed
    }

    return installedPackages
  }
}