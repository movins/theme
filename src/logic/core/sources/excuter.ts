import { EntryClass, RootCore } from '@/boots'
import { Sources } from './types'
import { Thread } from '@/base/Thread'
import Worker from "./reader.worker.js?worker"
import { BaseMessage, MessageData, MessageNotify, OpenFileReq, OpenFileRsp, OpenType } from './reader'

@EntryClass(Sources, RootCore)
export class SourcesImpl extends Sources {
  private _taskId: number
  private _worker: Thread
  private _handlers: Record<string, (data: any) => void>

  constructor() {
    super(SourcesImpl.key)

    this._taskId = 0
    this._worker = new Thread(Worker)

    this.handleMessage = this.handleMessage.bind(this)
    this.handleError = this.handleError.bind(this)

    this._handlers = {}
    this._handlers[OpenFileRsp.cmd] =
      this.handleOpenFileRsp.bind(this)
    this._handlers[MessageNotify.cmd] =
      this.handleMessageNotify.bind(this)
  }

  async init() {
    await super.init()
    this._worker.init()
    this._worker.on(Thread.ONMESSAGE, this.handleMessage)
    this._worker.on(Thread.ONERROR, this.handleError)
  }

  async start() {
    await super.start()
    this._worker.start()
  }

  async stop() {
    this._worker.stop()
    await super.stop()
  }

  async destroy() {
    this._worker.off(Thread.ONMESSAGE, this.handleMessage)
    this._worker.off(Thread.ONERROR, this.handleError)
    this._worker.destroy()

    await super.destroy()
  }

  open(file: Blob) {
    this.openFileReq(OpenType.OPEN, file)
  }

  private openFileReq(type: OpenType, file: Blob) {
    const data = new OpenFileReq()
    data.id = ++this._taskId
    data.type = type
    data.file = file

    this.send({ cmd: OpenFileReq.cmd, data })
  }

  private handleOpenFileRsp({ id, type, data }: OpenFileRsp) {
    console.info('9999999999', id, type, data)
  }

  private handleMessageNotify({ code, msg }: MessageNotify) {
  }

  private handleMessage({ cmd, data }: BaseMessage) {
    const handler = this._handlers[cmd]
    handler && handler(data)
  }

  private handleError(data: any) {}

  private send<T extends MessageData>(msg: BaseMessage<T>, trans: any[] = []) {
    this.postMessage(msg, trans)
  }

  private postMessage(data: Record<string, any>, trans: any[] = []) {
    this._worker?.send(data, trans)
  }
}
