import { Dispatch, format } from '@/base'
import App from '../app'

export interface IConsole extends Record<string, any> {
  log(...args: any[]): void
  debug(...args: any[]): void
  error(...args: any[]): void
  info(...args: any[]): void
}

export abstract class LogTask {
  abstract get title(): string
  abstract get type(): string
  abstract get filter(): string
  abstract get content(): string
  abstract get expired(): boolean
  abstract append(fmt: string, ...args: any[]): boolean
  abstract clear(): void
  abstract timeout(value: number): void
}

class TaskImpl implements LogTask {
  private static kExpired = 2 * 1000
  private static kTlFmt = 'tl={%1} {%2}'

  private _tl: number
  private _filter: string
  private _content: string
  private _expired: boolean
  private _uuid: number
  private _started: number
  private _type: string
  private _title: string
  private _count: number
  private _timeout: number

  constructor(type: string, uuid: number, filter: string, title: string) {
    this._tl = Date.now()
    this._type = type
    this._filter = filter
    this._content = ''
    this._expired = true
    this._uuid = uuid
    this._started = 0
    this._title = title
    this._count = 0
    this._timeout = 0
  }

  get uuid() {
    return this._uuid
  }

  get content() {
    return this._content
  }

  get type() {
    return this._type
  }

  get expired() {
    return this._expired
  }

  get title() {
    return this._title
  }

  get filter() {
    return this._filter
  }

  get totalkey() {
    return `${this._type}_${this._filter}_${this._title}_t`
  }

  get activekey() {
    return `${this._type}_${this._filter}_${this._title}_a`
  }

  timeout(value: number) {
    this._timeout = value
  }

  append(fmt: string, ...args: any[]) {
    this._content += format('\n' + fmt, ...args)

    return this._expired
  }

  clear(): void {
    this._content = ''
  }

  increase() {
    ++this._count
  }

  begin(fmt?: string, ...args: any[]) {
    if (!this._expired && fmt) {
      this.append(fmt, ...args)
      return
    }

    this._started = Date.now()
    this._expired = false
    this._count = 0
    const content = (fmt && format(fmt, ...args)) || ''
    this._content = format(TaskImpl.kTlFmt, this._tl, content)
  }

  same(task: LogTask) {
    return (
      this._content &&
      this._content === task.content &&
      this._filter === task.filter &&
      this._title === task.title
    )
  }

  end() {
    const timeout = this._timeout || TaskImpl.kExpired

    if (Date.now() - this._started < timeout) {
      return []
    }

    this._expired = true
    let content = this._title
    content && (content += (this._count && `[${this._count + 1}]===`) || '===')
    content += this._content

    return [this._filter, content]
  }
}

export class Log extends Dispatch {
  private static kDelay = 500
  private static kHoldMax = 20

  private _id: number
  private _print: IConsole
  private _buffers: Map<string, TaskImpl[]>
  private _timerId: any
  private _statis: Record<string, number>

  constructor() {
    super()
    this._print = console
    this._buffers = new Map()
    this._id = 0
    this._statis = {}
    this.handlePrint = this.handlePrint.bind(this)
  }

  get statis() {
    return this._statis
  }

  init(print: IConsole = console): void {
    super.init()
    this._print = print
    this._statis['__begin'] = new Date().getTime()
  }

  log(filter: string, title: string, format?: string, ...args: any[]): LogTask {
    return this.doAppend(filter, Log.LOG, title, format, ...args)
  }

  debug(
    filter: string,
    title: string,
    format?: string,
    ...args: any[]
  ): LogTask {
    return this.doAppend(filter, Log.DEBUG, title, format, ...args)
  }

  error(
    filter: string,
    title: string,
    format?: string,
    ...args: any[]
  ): LogTask {
    return this.doAppend(filter, Log.ERROR, title, format, ...args)
  }

  info(
    filter: string,
    title: string,
    format?: string,
    ...args: any[]
  ): LogTask {
    return this.doAppend(filter, Log.INFO, title, format, ...args)
  }

  append(node: LogTask, format: string, ...args: any[]) {
    const task = node as TaskImpl
    if (task.expired) {
      task.begin(format, ...args)
      this.appendTask(task.type, task)
    } else {
      task.append(format, ...args)
    }
  }

  private doAppend(
    filter: string,
    key: string,
    title: string,
    fmt?: string,
    ...args: any[]
  ) {
    const task = new TaskImpl(key, ++this._id, filter, title)
    task.begin(fmt, ...args)
    return this.appendTask(key, task)
  }

  private incStatis(task: TaskImpl, active = true) {
    const totalkey = task.totalkey
    let count = Number(this._statis[totalkey] || 0)
    this._statis[totalkey] = ++count

    if (active) {
      const activekey = task.activekey
      count = Number(this._statis[activekey] || 0)
      this._statis[activekey] = ++count
    }
  }

  private decStatis(task: TaskImpl) {
    const activekey = task.activekey
    const count = Number(this._statis[activekey] || 1)
    this._statis[activekey] = count - 1
  }

  private activeCount(task: TaskImpl) {
    const activekey = task.activekey
    return Number(this._statis[activekey] || 1)
  }

  private appendTask(key: string, task: TaskImpl) {
    if (!this._buffers.has(key)) {
      this._buffers.set(key, [])
    }
    const queue = this._buffers.get(key) || []
    let result = task
    const activeCount = this.activeCount(task)
    if (activeCount <= Log.kHoldMax) {
      const top = queue[queue.length - 1]
      if (top?.same(task)) {
        top.increase()
        result = top
      } else {
        this.incStatis(task)
        queue.push(task)
      }
    } else {
      this.incStatis(task, false)
    }

    this._timerId =
      this._timerId || App.timer.doFrameLoop(this, this.handlePrint, Log.kDelay)

    return result
  }

  private handlePrint() {
    let count = 0
    count += this.doKindTask(Log.ERROR)
    count += this.doKindTask(Log.LOG)
    count += this.doKindTask(Log.INFO)
    count += this.doKindTask(Log.DEBUG)

    if (count <= 0 && this._timerId) {
      App.timer.clearTimer(this, this.handlePrint)
      this._timerId = null
    }
  }

  private doKindTask(key: string) {
    let result = 0
    let tasks = this._buffers.get(key)
    if (tasks && tasks.length) {
      tasks = this.doPrintTask(key, tasks)
      result = tasks.length
      this._buffers.set(key, tasks)
    }

    return result
  }

  private doPrintTask(key: string, tasks: TaskImpl[]) {
    const result = []
    for (let index = 0; index < tasks.length; ++index) {
      const task = tasks[index]
      const [filter, content] = task.end()
      if (!filter) {
        result.push(task)
        continue
      }
      this.decStatis(task)
      content && this.doPrint(key, filter, content)
    }
    return result
  }

  private doPrint(key: string, filter: string, content: string) {
    const print = (key && this._print[key]) || null
    print && print.call(this._print, filter, content)
  }

  static get NAME() {
    return 'Log'
  }

  static get LOG() {
    return 'log'
  }
  static get DEBUG() {
    return 'debug'
  }
  static get ERROR() {
    return 'error'
  }
  static get INFO() {
    return 'info'
  }
}
