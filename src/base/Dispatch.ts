import { UBase } from './UBase'

export class Dispatch extends UBase {
  protected _stoped: boolean

  constructor() {
    super()
    this._stoped = false
  }

  emit(event: string, ...args: any[]): boolean {
    if (this._stoped) return false
    return super.emit(event, ...args)
  }

  init(): void {
    this._stoped = false
    this.emit(Dispatch.ONINIT)
  }

  start(): void {
    this._stoped = false
    this.emit(Dispatch.ONSTART)
  }

  stop(): void {
    this.emit(Dispatch.ONSTOP)
    super.removeAllListeners()
    this._stoped = true
  }

  destroy(): void {
    this.emit(Dispatch.ONDESTROY)
    this._stoped = true
    super.removeAllListeners()
  }

  static get ONINIT(): string {
    return 'Dispatch.ONINIT'
  }

  static get ONSTART(): string {
    return 'Dispatch.ONSTART'
  }

  static get ONSTOP(): string {
    return 'Dispatch.ONSTOP'
  }

  static get ONDESTROY(): string {
    return 'Dispatch.ONDESTROY'
  }
}
