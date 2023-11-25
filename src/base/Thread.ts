import { Dispatch } from './Dispatch'

export interface WorkerCls {
  new (): Worker
}

export class Thread extends Dispatch {
  private _cls: WorkerCls
  private _worker: Worker | null

  constructor(cls: WorkerCls) {
    super()

    this._cls = cls
    this._worker = null

    this.handleMessage = this.handleMessage.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  get running() {
    return !!this._worker
  }

  destroy() {
    super.destroy()
    this._worker?.terminate()
    this._worker = null
  }

  start() {
    this._worker = this._worker || this.initWorker()
    super.start()
  }

  stop() {
    super.stop()
    this._worker?.terminate()
    this._worker = null
  }

  send(data: Record<string, any>, trans: any[] = []) {
    this._worker?.postMessage(data, trans)
  }

  restart() {
    this._worker?.terminate()
    this._worker = this.initWorker()
  }

  private initWorker() {
    const worker = new this._cls()
    worker.addEventListener('message', this.handleMessage)
    worker.addEventListener('error', this.handleError)
    return worker
  }

  protected handleMessage({ data }: Record<string, any>) {
    this.emit(Thread.ONMESSAGE, data)
  }

  protected handleError({ data }: Record<string, any>) {
    this.emit(Thread.ONERROR, data)
  }

  static get ONMESSAGE() {
    return 'Thread.ONMESSAGE'
  }

  static get ONERROR() {
    return 'Thread.ONERROR'
  }
}
