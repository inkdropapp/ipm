import { CommandInstall } from './command-install'
import { Environment } from './environment'
import { IPMRegistry } from './registry'
import { IPMOptions, PackageVersionInfo } from './types'

export class IPM {
  env: Environment
  registry: IPMRegistry

  constructor(public options: IPMOptions) {
    this.env = new Environment(options)
    this.registry = new IPMRegistry(this.env.getInkdropApiUrl())
  }

  async install(pkg: PackageVersionInfo): Promise<void> {
    const command = new CommandInstall(this.env, this.registry)
    await command.run(pkg)
  }
}
