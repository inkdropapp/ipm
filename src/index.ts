import { CommandInstall } from './commands/install'
import { CommandUpdate } from './commands/update'
import { CommandUninstall } from './commands/uninstall'
import { CommandGetOutdated } from './commands/get-outdated'
import { Environment } from './environment'
import { IPMRegistry } from './registry'
import { IPMOptions, OutdatedPackageInfo } from './types'

export class IPM {
  env: Environment
  registry: IPMRegistry
  installedInkdropVersion: string

  constructor(public options: IPMOptions) {
    this.installedInkdropVersion = options.appVersion
    this.env = new Environment(options)
    this.registry = new IPMRegistry(this.env.getInkdropApiUrl())
  }

  async install(name: string, version?: string): Promise<void> {
    const command = new CommandInstall(
      this.installedInkdropVersion,
      this.env,
      this.registry
    )
    await command.run(name, version)
  }

  async update(name: string, version?: string): Promise<void> {
    const command = new CommandUpdate(
      this.installedInkdropVersion,
      this.env,
      this.registry
    )
    await command.run(name, version)
  }

  async uninstall(name: string): Promise<boolean> {
    const command = new CommandUninstall(this.env)
    return await command.run(name)
  }

  async getOutdated(): Promise<OutdatedPackageInfo[]> {
    const command = new CommandGetOutdated(
      this.installedInkdropVersion,
      this.env,
      this.registry
    )
    return await command.run()
  }
}
