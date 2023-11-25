import { Dispatch } from './Dispatch'
import { MethodPicks, MethodNames } from './utils'

export interface ExNodeTag {
  key: string
  debug?: (tag: string, content: string) => void
}

export class ExNode extends Dispatch implements ExNodeTag {
  static key = ''
  static debug = (tag: string, content: string) => {
    console.info(tag, content)
  }

  private _key: string
  private _ready: boolean
  private _active: boolean

  constructor(key: string) {
    super()
    this._key = key
    this._ready = false
    this._active = false
  }

  debug(tag: string, content: string) {
    console.info(tag, content)
  }

  static get READY(): string {
    return 'ExNode.READY'
  }

  static get CHANGED(): string {
    return 'ExNode.CHANGED'
  }

  get key(): string {
    return this._key
  }

  get active() {
    return this._active
  }

  set active(val: boolean) {
    this._active = val
  }

  set ready(val: boolean) {
    if (this._ready !== val) {
      this._ready = val
      this.debug('ready', `Node:[${this.key}] ready=${val}`)
      this.emit(ExNode.READY, this._ready)
    }
  }

  get ready() {
    return this._ready
  }

  change() {
    this.emit(ExNode.CHANGED)
  }

  wait(timeout: number): Promise<boolean> {
    const check = () => {
      return this._ready
    }

    return new Promise((resolve, reject) => {
      let ready = check()
      if (ready || this._stoped) {
        resolve(ready)
        return
      }
      let trycount = 0
      const count = Math.ceil(timeout / 100)
      const timerId = setInterval(() => {
        ready = check()
        if (ready || ++trycount >= count || this._stoped) {
          clearInterval(timerId)
          resolve(ready)
        }
      }, 100)
    })
  }

  reduce(tasks: any[]) {
    return new Promise<any[]>(resolve => {
      const result: any[] = []
      tasks.reduce(
        (previous, next, index) =>
          previous.then(async () => {
            result.push(await next)
            if (index >= tasks.length - 1) {
              resolve(result)
            }
          }),
        Promise.resolve()
      )
    })
  }

  protected set key(val: string) {
    this._key = val
  }
}

export interface ExNodeItr extends ExNodeTag {
  READY: string
  CHANGED: string
}

export interface ExNodeClass<T extends ExNode = ExNode> extends ExNodeItr {
  new (key: string): T
}

export type ExcuterItr<T extends ExNode = ExNode> = Exclude<
  MethodPicks<ExNode, T>,
  MethodNames<ExcuterPtr<T>>
>
export abstract class ExcuterPtr<T extends ExNode = ExNode> extends ExNode {
  abstract excute(key: ExcuterItr<T>, ...args: any[]): any
  abstract get<N extends ExcuterPtr<N>>({ key }: ExNodeTag): N | undefined
  abstract fetch<N extends ExcuterPtr<N>>(node: ExNodeItr): Promise<N>
  abstract as<N extends ExcuterPtr<N>>({ key }: ExNodeTag): N | undefined
  abstract has({ key }: ExNodeTag): boolean
  abstract can({ key }: ExNodeTag): boolean
  abstract up<N extends ExcuterPtr<N>>(
    { key }: ExNodeTag,
    node?: N
  ): Promise<boolean>
  abstract down({ key }: ExNodeTag): Promise<boolean>
  abstract add<N extends ExcuterPtr<N>>(cls: ExNodeClass<N>): N
  abstract remove({ key }: ExNodeTag): boolean
}

export class HolderPtr<T extends ExcuterPtr<T> = Excuter> extends ExNode {
  private _itr?: T

  constructor(itr?: T) {
    super('')
    this.reset(itr)
    this.handleReady = this.handleReady.bind(this)
    this.handleChange = this.handleChange.bind(this)
  }

  get itr(): T|undefined {
    return this._itr
  }

  get valid() {
    return !!this._itr
  }

  reset(itr?: T) {
    this._itr?.off(ExNode.READY, this.handleReady)
    this._itr?.off(ExNode.CHANGED, this.handleReady)

    this.key = `${itr?.key || ''}.Holder`
    this._itr = itr

    this._itr?.on(ExNode.READY, this.handleReady)
    this._itr?.on(ExNode.CHANGED, this.handleReady)
  }

  destroy(): void {
    this._itr?.off(ExNode.READY, this.handleReady)
    this._itr?.off(ExNode.CHANGED, this.handleReady)
    this._itr = undefined

    super.destroy()
  }

  private handleReady(val: boolean) {
    this.ready = val
  }

  private handleChange() {
    this.change()
  }
}

export class Excuter<T extends ExNode = ExNode> extends ExcuterPtr<T> {
  private _childs: Map<string, ExNode>

  constructor(key: string) {
    super(key)

    this._childs = new Map()
  }

  static get UP(): string {
    return 'Excuter.UP'
  }

  static get DWON(): string {
    return 'Excuter.DWON'
  }

  static get ADD(): string {
    return 'Excuter.ADD'
  }

  static get REMOVE(): string {
    return 'Excuter.REMOVE'
  }

  excute(key: ExcuterItr<T>, ...args: any[]): any {
    const invoker = this[key as string]
    return invoker?.call(this, ...args)
  }

  get<N extends ExcuterPtr<N>>({ key }: ExNodeTag): N | undefined {
    const result = this._childs.get(key) as N
    return result
  }

  fetch<N extends ExcuterPtr<N>>(node: ExNodeItr): Promise<N> {
    return new Promise<N>(resolve => {
      const useNode = () => {
        let itr = this.get<N>(node)
        if (itr) {
          handleNotify(itr)
          return
        }

        if (this.can(node)) {
          this.up(node)
        }
        itr = this.get<N>(node)
        itr?.on(node.READY, handleNotify)
        itr?.ready && handleNotify(itr)
      }
      const handleAdd = (n: ExNodeItr) => {
        if (node.key !== n.key) {
          return
        }
        useNode()
      }
      const handleNotify = (itr: N) => {
        itr.off(node.READY, handleNotify)
        this.off(Excuter.ADD, handleAdd)
        resolve(itr)
      }
      this.on(Excuter.ADD, handleAdd)
      useNode()
    })
  }

  as<N extends ExcuterPtr<N> = Excuter>({ key }: ExNodeTag): N | undefined {
    if (!this._childs.has(key)) {
      this.debug('as', `Node:[${this.key}] as [${key}] error`)

      throw new Error(`Excuter has not ${key}`)
    }

    const result = this._childs.get(key) as N
    return result
  }

  has({ key }: ExNodeTag): boolean {
    return this._childs.has(key)
  }

  can({ key }: ExNodeTag): boolean {
    const node = this._childs.get(key)
    return !!node && !node.active
  }

  async up<N extends ExcuterPtr<N>>({ key }: ExNodeTag, node?: N) {
    if (!key || (!this._childs.has(key) && !node)) {
      return false
    }

    if (node && !this._childs.has(key)) {
      this._childs.set(key, node)
    }

    const child = this._childs.get(key)
    if (!child) {
      return false
    }

    if (!child.active) {
      child.active = true

      const [, lt, err] = await this.watch(async () => {
        await child?.init()
        await child?.start()
        child && (child.ready = true)
      })

      this.debug(
        'up',
        `Node:[${this.key}] up [${key}] lt=${lt}${(err && ` err=${err}`) || ''}`
      )

      this.emit(Excuter.UP, { key })
    }

    return true
  }

  async down({ key }: ExNodeTag) {
    const child = this._childs.get(key)
    if (!child) {
      return false
    }

    child.active = false
    this.emit(Excuter.DWON, { key })
    const [, lt, err] = await this.watch(async () => {
      child && (child.ready = false)
      await child.stop()
      await child.destroy()
    })

    this.debug(
      'down',
      `Node:[${this.key}] down [${key}] lt=${lt}${(err && ` err=${err}`) || ''}`
    )

    return true
  }

  add<N extends ExcuterPtr<N>>(cls: ExNodeClass<N>): N {
    const { key } = cls
    let result = this._childs.get(key)
    if (!result) {
      this._childs.set(key, (result = new cls(key)))
      this.emit(Excuter.ADD, { key })

      this.debug('add', `Node:[${this.key}] add [${key}]`)
    }

    return result as N
  }

  remove({ key }: ExNodeTag): boolean {
    const child = (key && this._childs.get(key)) || null
    if (!child) {
      return false
    }

    if (child.active) {
      this.down({ key })
    }

    this._childs.delete(key)
    this.debug('remove', `Node:[${this.key}] remove [${key}]`)

    this.emit(Excuter.REMOVE, { key })

    return true
  }

  async init(...args: any[]) {
    super.init()
    this._childs.forEach(async el => await el.init())
  }

  async start() {
    super.start()
    this._childs.forEach(async el => await el.start())
  }

  async stop() {
    this._childs.forEach(async el => await el.stop())
    super.stop()
  }

  async destroy() {
    this._childs.forEach(async el => await el.destroy())
    super.destroy()
  }

  protected async watch<T>(
    handler: (...args: any[]) => Promise<T>,
    ...args: any[]
  ): Promise<[result: T | undefined, lt: number, err: any]> {
    let lt = window.performance.now()
    let result = undefined
    let err = undefined
    try {
      result = await handler?.(...args)
    } catch (error) {
      result = undefined
      err = error
    }
    lt = window.performance.now() - lt

    return [result, lt, err]
  }
}

export const useExcuter = <T extends Excuter<T>>(
  root: ExcuterPtr,
  cls: ExNodeTag
): T | undefined => {
  if (root.can(cls)) {
    root.up(cls)
  }
  return root.as<T>(cls)
}
