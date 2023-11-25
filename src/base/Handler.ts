import { uuid } from './utils'
export type Method = (...args: any) => any

export class Handler {
  private _caller: any
  private _method: Method | null
  private _args: any[]
  protected _uuid: number

  constructor(caller: any, method: Method, ...args: any) {
    this._caller = caller
    this._method = method
    this._args = args || []

    this._uuid = uuid()
  }

  apply(...args: any) {
    return this._method?.apply(this._caller || null, [
      ...(this._args || []),
      ...args
    ])
  }

  call(...args: any) {
    return this._method?.call(
      this._caller || null,
      ...[...(this._args || []), ...args]
    )
  }

  destroy(): void {
    this._caller = null
    this._method = null
    this._args = []
  }

  get caller() {
    return this._caller
  }

  get method() {
    return this._method
  }

  get args() {
    return this._args
  }

  get uuid() {
    return this._uuid
  }

  static excute(caller: any, method: Method, ...args: any) {
    return new Promise<any>(reslove => {
      const result = method?.apply(caller || null, args)
      reslove(result)
    })
  }
}
