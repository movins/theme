import { App } from '@/boots'
import { BaseEntry, useEntry } from '../../base'

export abstract class Sources extends BaseEntry<Sources> {
  static key = 'YYLogic.Sources'

  abstract open(file: Blob): void

  static get impl(): Sources | undefined {
    return useUser()
  }
}

export const useUser = (): Sources | undefined => {
  const core = App.logic.core
  return useEntry<Sources>(core, Sources)
}
