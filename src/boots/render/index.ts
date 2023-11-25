import App from '../app'
import { Method, Handler, Dispatch } from '@/base'

export default class Render extends Dispatch {
  private _handlers: Map<any, Map<any, Handler>>

  constructor() {
    super()

    this._handlers = new Map()
    this.handleRender = this.handleRender.bind(this)
  }

  destroy() {
    super.destroy()

    this.clear()
  }

  later(caller: any, method: Method, ...args: any): void {
    if (!this._handlers.has(caller)) {
      this._handlers.set(caller, new Map<any, Handler>())
    }
    const handlers = this._handlers.get(caller)
    if (handlers && !handlers?.has(method)) {
      handlers.set(method, new Handler(caller, method, args))
    }
    if (handlers?.size && !App.timer.hasFrameTimer(this, this.handleRender)) {
      App.timer.doFrameOnce(this, this.handleRender, 20)
    }
  }

  remove(caller: any, method: Method) {
    this.delete(caller, method)
  }

  clear() {
    this._handlers.clear()
    App.timer.clearCaller(this)
  }

  private handleRender(): void {
    this._handlers.forEach((handlers: Map<any, Handler>) => {
      handlers.forEach(handler => {
        handler.apply()
        handler.destroy()
      })
    })
    this._handlers.clear()
  }

  private delete(caller: any, method: Method): void {
    const handlers = this._handlers.get(caller)
    handlers?.has(method) && handlers.delete(method)
  }

  static get NAME() {
    return 'Render'
  }
}
