import { CommandInstall } from './command-install'
import { Environment } from './environment'
import { IPMRegistry } from './registry'
import { IPMOptions } from './types'

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
}
