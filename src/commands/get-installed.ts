import { readdir, readFile } from 'fs/promises'
import path from 'path'
import { Environment } from '../environment'
import { logger } from '../logger'
import { PackageMetadata } from '../types'

export class CommandGetInstalled {
  constructor(public env: Environment) {}

  async run(): Promise<PackageMetadata[]> {
    const packagesDir = path.join(this.env.getInkdropDirectory(), 'packages')
    return await this.getInstalledPackages(packagesDir)
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