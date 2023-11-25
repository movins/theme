import { Dispatch } from '@/base'
import App from '../app'
import { LogTask } from '../log'

const URI = (maxType: number, minType: number) => `${maxType}:${minType}`

// 优先级
export enum QUE_PRIORITY {
  DEFAULT = 0,
  ONE = 1000,
  TWO = 2000,
  HTREE = 3000,
  FOUR = 4000,
  FIVE = 5000,
  SIX = 6000,
  SEVEN = 7000,
  EIGHT = 8000,
  NINE = 9000,
  MAX = 100000,
  LOCKED = 200000
}

type Strategy = (priority: QUE_PRIORITY, size: number) => boolean
type Handler = <T extends Record<string, any>>(
  data: T,
  visible: boolean
) => boolean

export class Task<T extends Record<string, any> = Record<string, any>> {
  private static _nextTaskId = 0

  private _data: T

  private _minType: number
  private _id: number
  private _timeout: number
  private _expried: number | null
  private _deleted: boolean
  private _priority: QUE_PRIORITY

  constructor(
    minType: number,
    timeout: number,
    data: T,
    priority: QUE_PRIORITY
  ) {
    this._timeout = timeout
    this._minType = minType

    this._id = Task.createTaskId()
    this._priority = priority
    this._data = data
    this._expried = null
    this._deleted = false
  }

  get id() {
    return this._id
  }

  get priority() {
    return this._priority
  }

  get data() {
    return this._data
  }

  get deled() {
    return this._deleted
  }

  get minType() {
    return this._minType
  }

  run(now: number) {
    this._expried = now + this._timeout
  }

  del() {
    this._deleted = true
  }

  check(now: number): boolean {
    return !this._deleted && (this._expried === null || now < this._expried)
  }

  static createTaskId() {
    return ++Task._nextTaskId
  }
}

export class Queue {
  private _key: string
  private _tasks: Map<number, Task>
  private _lines: Map<QUE_PRIORITY, number[]>
  private _current: number

  constructor(key: string) {
    this._key = key
    this._tasks = new Map()
    this._lines = new Map()
    this._current = 0
  }

  get key() {
    return this._key
  }

  get size() {
    return this._tasks.size
  }

  toString() {
    const logs = [this._key]
    for (const [key, value] of this._lines) {
      logs.push(`${key}:[${value.join(',')}]`)
    }
    return `[${logs.join('=>')}]`
  }

  add<T extends Record<string, any>>(
    minType: number,
    data: T,
    timeout: number,
    priority: QUE_PRIORITY,
    strategy?: Strategy
  ): boolean {
    return this.addTask(minType, data, timeout, priority, strategy)
  }

  remove(id: number): boolean {
    return this.removeTask(id)
  }

  next(): boolean {
    return this.nextTask()
  }

  lockNext(): boolean {
    const task = (this._current && this._tasks.get(this._current)) || null
    if (!task) {
      return false
    }
    const line = this._lines.get(task.priority)
    const [id = 0] = line?.splice(1, 1) || []
    if (id > 0) {
      let locked = this._lines.get(QUE_PRIORITY.LOCKED)
      !locked && this._lines.set(QUE_PRIORITY.LOCKED, (locked = []))
      if (locked.indexOf(id) < 0) {
        locked.push(id)
      }
      return true
    }

    return false
  }

  dispatch(now: number): [Task | null, Task | null] {
    let task = this._tasks.get(this._current) || null
    if (task?.check(now)) {
      return [null, null]
    }

    const last = task
    task && this.deleteTask(task)

    task = this.doNext() || null
    task?.run(now)
    this._current = task?.id || 0

    return [last, task]
  }

  private doNext() {
    const prioritys = Array.from(this._lines.keys())
    prioritys.sort((a, b) => (b > a ? 1 : b == a ? 0 : -1))
    let result = undefined
    for (let index = 0; index < prioritys.length; ++index) {
      const taskId = prioritys[index]
      const line = this._lines.get(taskId)
      const [id] = line || []
      if (!id) continue
      if (!this._tasks.has(id)) {
        line?.splice(0, 1)
        continue
      }
      result = this._tasks.get(id)
      if (result) {
        break
      }
    }
    return result
  }

  private addTask<T extends Record<string, any>>(
    minType: number,
    data: T,
    timeout: number,
    priority: QUE_PRIORITY,
    strategy?: Strategy
  ): boolean {
    let line = this._lines.get(priority)

    !line && this._lines.set(priority, (line = []))

    const task = new Task(minType, timeout, data, priority)
    this._tasks.set(task.id, task)
    line.push(task.id)

    // 队列调整策略
    if (strategy?.(priority, line.length)) {
      const [_, id = 0] = line
      id && this.removeTask(id)
    }

    return true
  }

  private deleteTask({ id, priority }: Record<string, any>) {
    if (!id) {
      return
    }

    const line = this._lines.get(priority) || []
    const index = line.indexOf(id)
    index > -1 && line.splice(index, 1)

    this._tasks.delete(id)
  }

  private removeTask(id: number): boolean {
    const task = this._tasks.get(id)
    if (!task) {
      return false
    }
    task.del()

    if (id !== this._current) {
      this.deleteTask(task)
    }

    return true
  }

  private nextTask(): boolean {
    if (!this._current) {
      return false
    }

    return this.removeTask(this._current)
  }
}

export class Queues extends Dispatch {
  private static kInterval = 100

  private _queues: Map<number, Queue>
  private _timer: any
  private _logs: Record<string, any>
  private _strategy: Record<string, Strategy>
  private _handlers: Record<string, Handler>

  constructor() {
    super()

    this._queues = new Map()
    this.handleQueue = this.handleQueue.bind(this)
    this._timer = null
    this._logs = {}
    this._strategy = {}
    this._handlers = {}
  }

  inject(maxType: number, minType: number, strategy: Strategy) {
    const key = URI(maxType, minType)
    this._strategy[key] = strategy

    this.log(
      'inject',
      'maxType={%1} minType={%2} strategy={%3}',
      maxType,
      minType,
      !!strategy
    )
  }

  watch(maxType: number, minType: number, handler: Handler) {
    const key = URI(maxType, minType)
    this._handlers[key] = handler

    this.log(
      'watch',
      'maxType={%1} minType={%2} handler={%3}',
      maxType,
      minType,
      !!handler
    )
  }

  lockNext(maxType: number): boolean {
    this.log('lockNext', 'maxType={%1}', maxType)

    const queue = this.checkQueue(maxType, false)
    return !!queue?.lockNext()
  }

  add<T extends Record<string, any>>(
    maxType: number,
    minType: number,
    data: T,
    ms: number,
    priority: QUE_PRIORITY = QUE_PRIORITY.DEFAULT
  ) {
    const key = URI(maxType, minType)
    const queue = this.checkQueue(maxType)
    const result = !!queue?.add(
      minType,
      data,
      ms,
      priority,
      this._strategy[key]
    )
    result && this.checkStart()

    this.logAdd(
      'add([size:<maxType:minType:priority:ret>])',
      `${key}:${priority}:${!!result}`,
      queue?.size || 0
    )

    return result
  }

  onQueue<T extends Record<string, any>>(
    maxType: number,
    minType: number,
    handler: (data: T, visible: boolean) => void
  ) {
    const evt = URI(maxType, minType)
    super.on(evt, handler)
  }

  offQueue<T extends Record<string, any>>(
    maxType: number,
    minType: number,
    handler: (data: T, visible: boolean) => void
  ) {
    const evt = URI(maxType, minType)
    super.off(evt, handler)
  }

  remove(maxType: number, id: number) {
    const queue = this.checkQueue(maxType, false)
    const result = !!queue?.remove(id)

    this.logAdd(
      'remove([size:<maxType:id:ret>])',
      `${maxType}:${id}:${!!result}`,
      queue?.size || 0
    )
    return result
  }

  next(maxType: number) {
    const queue = this.checkQueue(maxType, false)
    const result = !!queue?.next()

    this.logAdd(
      'next([size:<maxType:ret>])',
      `${maxType}:${!!result}`,
      queue?.size || 0
    )
    return result
  }

  private doEvent(maxType: number, task: Task, visible: boolean) {
    const evt = URI(maxType, task.minType)

    const handler = this._handlers[evt]
    handler && handler(task.data, visible)

    this.emit(evt, task.data, visible)

    return evt
  }

  private handleQueue() {
    const queues = Array.from(this._queues.keys())
    const now = Date.now()
    let size = 0
    let log = ''
    queues.forEach(maxType => {
      const queue = this._queues.get(maxType)
      const [last = null, task = null] = queue?.dispatch(now) || []
      let evt1 = ''
      let evt2 = ''
      if (last || task) {
        evt1 = (last && this.doEvent(maxType, last, false)) || ''
        evt2 = (task && this.doEvent(maxType, task, true)) || ''

        log && (log += '|')
        log += `<[${evt1}]:${last?.priority || 0}:${
          last?.id || 0
        }=>>[${evt2}]:${task?.priority || 0}:${task?.id || 0}`
      }
      size += queue?.size || 0
    })

    log &&
      this.logAdd(
        'handle([size:<[evt]:priority:id=>[evt]:priority:id>])',
        log,
        size
      )

    if (size <= 0 && this._timer) {
      App.timer.clearTimer(this, this._timer)
      this._timer = null
    }
  }

  private checkStart() {
    if (this._timer) {
      return
    }

    this._timer = App.timer.doLoop(this, this.handleQueue, Queues.kInterval)
  }

  private checkQueue(maxType: number, isAdd = true): Queue | undefined {
    if (!this._queues.has(maxType) && isAdd) {
      this._queues.set(maxType, new Queue(`${maxType}`))
    }
    return this._queues.get(maxType)
  }

  private logAdd(title: string, key: string, size: number) {
    const log =
      this._logs[title] || (this._logs[title] = this.log(`queues ${title}`))
    log.timeout(10 * 1000)
    this.append(log, '[{%1}:<{%2}>]', size, key)
  }

  private log(title: string, centent = '', ...args: any[]) {
    return App.log.log('Queues', title, centent, ...args)
  }

  private append(task: LogTask, centent = '', ...args: any[]) {
    return App.log.append(task, centent, ...args)
  }
}
