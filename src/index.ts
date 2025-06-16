import { Environment } from './environment'
import { IPMRegistry } from './registry'
import { IPMOptions } from './types'

export class IPM {
  env: Environment
  registry: IPMRegistry

  constructor(public options: IPMOptions) {
    this.env = new Environment(options)
    this.registry = new IPMRegistry(this.env.getInkdropApiUrl())
  }
}
