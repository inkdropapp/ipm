import { readFile } from 'fs/promises'
import path from 'path'
import semver from 'semver'
import { logger } from '../logger'
import { PackageMetadata } from '../types'
import { getLatestCompatibleVersion } from '../utils'
import { CommandInstall } from './install'

export class CommandUpdate extends CommandInstall {
  async run(name: string, version?: string): Promise<void> {
    const packagesDir = path.join(this.env.getInkdropDirectory(), 'packages')
    const packageDir = path.join(packagesDir, name)
    const packageJsonPath = path.join(packageDir, 'package.json')

    // Check if package is currently installed
    let currentVersion: string | null
    try {
      const packageJsonContent = await readFile(packageJsonPath, 'utf8')
      const packageJson: PackageMetadata = JSON.parse(packageJsonContent)
      currentVersion = packageJson.version
    } catch {
      // Package not installed, proceed with installation
      logger.info(`Package ${name} is not installed, installing...`)
      return super.run(name, version)
    }

    // Determine target version
    let targetVersion: string
    if (version) {
      targetVersion = version
    } else {
      // Get latest compatible version from registry
      const pkg = await this.requestPackage(name)
      const latestVersion = getLatestCompatibleVersion(
        pkg,
        this.installedInkdropVersion
      )
      if (!latestVersion) {
        throw new Error(
          `No compatible version found for package \`${name}\` with Inkdrop v${this.installedInkdropVersion}`
        )
      }
      targetVersion = latestVersion
    }

    // Check if already at target version
    if (currentVersion === targetVersion) {
      logger.info(`Package ${name}@${currentVersion} is already up to date`)
      return
    }

    // Check if current version is newer than target (downgrade case)
    if (semver.gt(currentVersion, targetVersion)) {
      logger.info(
        `Downgrading ${name} from ${currentVersion} to ${targetVersion}`
      )
    } else {
      logger.info(`Updating ${name} from ${currentVersion} to ${targetVersion}`)
    }

    // Proceed with installation (which will replace the existing version)
    return super.run(name, version)
  }
}
