import { ExNodeClass, ExNodeTag, Excuter } from '@/base'
import App from '../app'

export const EntryClass =
  <T extends Excuter<T>, R extends Excuter<R>>(
    { key }: ExNodeTag,
    cls?: ExNodeClass<R>
  ) =>
  (target: ExNodeClass<T>) => {
    target.key = key
    target.prototype.debug = (tag: string, content: string) => {
      App.info('YYBase.Entry', tag, content)
    }

    const node = (cls && App.logic.as(cls)) || undefined
    node?.add(target)
  }

@EntryClass({ key: 'app.RootCore' })
export class RootCore extends Excuter<RootCore> {
  constructor() {
    super(RootCore.key)
  }
}

export class RootLogic extends Excuter<RootLogic> {
  static key = 'app.RootLogic'
  private _core: RootCore

  constructor() {
    super(RootLogic.key)

    this._core = this.add(RootCore)
  }

  async init(...args: any[]) {
    await super.init(...args)
    await this.up(RootCore)
  }

  get core() {
    return this._core
  }
}
