import EventEmitter from 'eventemitter3'
import { uuid } from './utils'

export class UBase extends EventEmitter<string> {
  private _uuid: number

  constructor() {
    super()
    this._uuid = uuid()
  }

  get uuid(): number {
    return this._uuid
  }
}
