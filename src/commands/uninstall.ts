import { access, rm } from 'fs/promises'
import path from 'path'
import { Environment } from '../environment'
import { logger } from '../logger'

export class CommandUninstall {
  constructor(public env: Environment) {}

  async run(name: string): Promise<boolean> {
    const packagesDir = path.join(this.env.getInkdropDirectory(), 'packages')
    const packageDir = path.join(packagesDir, name)

    try {
      // Check if the package is installed
      if (!(await this.pathExists(packageDir))) {
        throw new Error(`Package \`${name}\` is not installed`)
      }

      logger.info(`Uninstalling ${name}...`)

      // Remove the package directory
      await rm(packageDir, { recursive: true, force: true })

      logger.info(`Successfully uninstalled ${name}`)
      return true
    } catch (error) {
      logger.error(`Failed to uninstall ${name}:`, error)
      throw error
    }
  }

  private async pathExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath)
      return true
    } catch {
      return false
    }
  }
}
