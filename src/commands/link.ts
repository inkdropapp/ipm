import { access, mkdir, readFile, rm, symlink } from 'fs/promises'
import path from 'path'

import { Environment } from '../environment'
import { logger } from '../logger'

export type LinkOptions = {
  dev?: boolean
  name?: string
}

export class CommandLink {
  constructor(public env: Environment) {}

  async run(packagePath: string, opts: LinkOptions = {}): Promise<string> {
    const sourcePath = path.resolve(packagePath)

    if (!(await this.pathExists(sourcePath))) {
      throw new Error(`Package directory does not exist: ${sourcePath}`)
    }

    const packageName = opts.name ?? (await this.resolvePackageName(sourcePath))

    if (!packageName || packageName.includes('..') || path.isAbsolute(packageName)) {
      throw new Error(`Invalid package name: ${packageName}`)
    }

    const targetDir = opts.dev
      ? path.join(this.env.getInkdropDirectory(), 'dev', 'packages')
      : path.join(this.env.getInkdropDirectory(), 'packages')

    const targetPath = path.join(targetDir, packageName)

    try {
      await rm(targetPath, { recursive: true, force: true })
      await mkdir(path.dirname(targetPath), { recursive: true })

      const symlinkType = process.platform === 'win32' ? 'junction' : 'dir'
      await symlink(sourcePath, targetPath, symlinkType)

      logger.info(`${targetPath} -> ${sourcePath}`)
      return targetPath
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const linkError = new Error(`Linking ${targetPath} to ${sourcePath} failed: ${message}`)
      logger.error(`Failed to link package:`, linkError)
      throw linkError
    }
  }

  private async resolvePackageName(sourcePath: string): Promise<string> {
    try {
      const content = await readFile(path.join(sourcePath, 'package.json'), 'utf-8')
      const pkg = JSON.parse(content)
      if (pkg.name) {
        return pkg.name
      }
    } catch {
      // Fall through to basename
    }
    return path.basename(sourcePath)
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
