import path from 'path'
import { IPMOptions } from './types'

export class Environment {
  constructor(public options: IPMOptions) {}

  asarPath: string | null = null

  getHomeDirectory() {
    if (process.platform === 'win32') {
      return process.env.USERPROFILE
    } else {
      return process.env.HOME
    }
  }

  /**
   * The path to the directory where Inkdrop stores its data, configuration, cache, and packages.
   */
  getInkdropDirectory() {
    const pathToHome = process.env.INKDROP_HOME || this.options.appHomePath
    return pathToHome != null
      ? pathToHome
      : path.join(this.getAppDataPath(), 'inkdrop')
  }

  getCacheDirectory() {
    return path.join(this.getInkdropDirectory(), '.ipm')
  }

  getAppDataPath() {
    if (this.options.appDataPath) return this.options.appDataPath
    switch (process.platform) {
      case 'darwin':
        return path.join(
          process.env.HOME || '',
          'Library',
          'Application Support'
        )
      case 'linux':
        return path.join(process.env.HOME || '', '.config')
      case 'win32':
        return process.env.APPDATA || ''
      default:
        throw new Error('Unsupported platform')
    }
  }

  getInkdropPackagesUrl() {
    const value = process.env.INKDROP_PACKAGES_URL || this.options.packagesUrl
    return value != null ? value : `${this.getInkdropApiUrl()}/packages`
  }

  getInkdropApiUrl() {
    const value = process.env.INKDROP_API_URL || this.options.apiUrl
    return value != null ? value : 'https://api.inkdrop.app'
  }

  getInkdropAccessKey() {
    const accessKeyId =
      process.env.INKDROP_ACCESS_KEY_ID || this.options.accessKeyId
    const secretAccessKey =
      process.env.INKDROP_SECRET_ACCESS_KEY || this.options.secretAccessKey
    return accessKeyId && secretAccessKey
      ? {
          accessKeyId,
          secretAccessKey
        }
      : null
  }
}
