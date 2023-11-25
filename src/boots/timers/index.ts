import { Handler, Method, Dispatch } from '@/base'

class TimerHandler extends Handler {
  /** 执行间隔 */
  private _delay: number
  /** 是否重复执行 */
  private _repeat: boolean
  /** 执行时间 */
  private _exeTime: number
  /** 执行次数 */
  private _count: number
  private _priority: number
  private _key: Method | number

  constructor(
    caller: any,
    method: Method,
    exeTime: number,
    delay: number,
    cover: boolean,
    priority = 0,
    count?: number,
    ...args: any
  ) {
    super(caller, method, ...args)
    this._delay = delay
    this._repeat = !count
    this._exeTime = exeTime
    this._count = count || 1
    this._priority = priority
    this._key = (cover && method) || this._uuid
  }

  excute(current: number, ...args: any) {
    while (current >= this._exeTime && (this._repeat || this._count > 0)) {
      --this._count
      this._exeTime += this._delay

      if (this._repeat) {
        Promise.resolve(this.apply(...args))
      } else {
        this.apply(...args)
      }
    }
    return this._repeat || this._count > 0
  }

  get priority() {
    return this._priority
  }

  get key() {
    return this._key
  }
}

type TimerKey = Method | number
type QueueType = Map<TimerKey, TimerHandler>
type TaskMapType = Map<any, QueueType>
export default class Timers extends Dispatch {
  private static __INTERVAL = 100

  private _frameTasks: TaskMapType
  private _timerTasks: TaskMapType
  private _currTime: number

  private _timerId: any
  private _frameId: any

  constructor() {
    super()

    this._frameTasks = new Map()
    this._timerTasks = new Map()
    this._currTime = new Date().getTime()
    this._timerId = null
    this._frameId = null

    this.handleFrameLoop = this.handleFrameLoop.bind(this)
    this.handleTimerLoop = this.handleTimerLoop.bind(this)
  }

  destroy() {
    this.clearALL()
    super.destroy()
  }

  clearALL() {
    this._frameTasks.clear()
    this._timerTasks.clear()

    this._frameId && this.cancelAnimationFrame(this._frameId)
    this._timerId && window.clearInterval(this._timerId)

    this._frameId = null
    this._timerId = null
  }

  clearTimer(caller: any, key: TimerKey) {
    let result = this.clearTimerTask(caller, key)
    result = this.clearFrameTask(caller, key) || result
    return result
  }

  hasTimer(caller: any, key?: TimerKey) {
    return (
      this.hasTaskTimer(this._timerTasks, caller, key) ||
      this.hasTaskTimer(this._frameTasks, caller, key)
    )
  }

  hasFrameTimer(caller: any, key?: TimerKey) {
    return this.hasTaskTimer(this._frameTasks, caller, key)
  }

  hasTimeTimer(caller: any, key?: TimerKey) {
    return this.hasTaskTimer(this._timerTasks, caller, key)
  }

  clearCaller(caller: any) {
    let result = this.clearTimerCaller(caller)
    result = this.clearFrameCaller(caller) || result
    return result
  }

  private hasTaskTimer(tasks: TaskMapType, caller: any, key?: TimerKey) {
    const queue = tasks.get(caller)
    return queue && (!key || queue.has(key))
  }

  private clearTimerCaller(caller: any) {
    let result = false
    if (this._timerTasks.has(caller)) {
      this._timerTasks.delete(caller)
      result = true
    }
    return result
  }

  private clearFrameCaller(caller: any) {
    let result = false
    if (this._frameTasks.has(caller)) {
      this._frameTasks.delete(caller)
      result = true
    }
    return result
  }

  private clearTimerTask(caller: any, key: TimerKey) {
    const tasks = this._timerTasks.get(caller)
    let result = false
    if (tasks?.has(key)) {
      tasks.delete(key)
      this.checkTimerQueue()

      result = true
    }

    return result
  }

  private clearEmptyQueue(tasks: TaskMapType) {
    const keys = Array.from(tasks.keys())
    keys.forEach(key => {
      const queue = tasks.get(key)
      !queue?.size && queue?.delete(key)
    })
  }

  private checkFrameQueue() {
    this.clearEmptyQueue(this._frameTasks)

    if (this._frameTasks.size && !this._frameId) {
      const loop = () => {
        this.handleFrameLoop()
        this.requestAnimationFrame(loop)
      }
      this._frameId = this.requestAnimationFrame(loop)
    }
    if (this._frameId && !this._frameTasks.size) {
      this.cancelAnimationFrame(this._frameId)
      this._frameId = null
    }
  }

  private checkTimerQueue() {
    this.clearEmptyQueue(this._timerTasks)

    if (this._timerTasks.size && !this._timerId) {
      this._timerId = window.setInterval(() => {
        this.handleTimerLoop()
      }, Timers.__INTERVAL)
    }
    if (this._timerId && !this._timerTasks.size) {
      window.clearInterval(this._timerId)
      this._timerId = null
    }
  }

  private clearFrameTask(caller: any, key: TimerKey) {
    const tasks = this._frameTasks.get(caller)
    let result = false
    if (tasks?.has(key)) {
      tasks.delete(key)
      this.checkFrameQueue()

      result = true
    }

    return result
  }

  /** 定时执行一次
   * @param caller 调用者
   * @param method 结束时的回调方法
   * @param delay  延迟时间(单位毫秒)
   * @param cover 是否覆盖
   * @param priority 优先级
   * @param args   回调参数
   * @return  key= 任务标志 */
  doOnce(
    caller: any,
    method: Method,
    delay: number,
    cover = true,
    priority?: number,
    ...args: any
  ) {
    return this.pushTimerTask(
      caller,
      method,
      delay,
      1,
      priority,
      cover,
      ...args
    )
  }

  /** 定时执行有限次
   * @param caller 调用者
   * @param method 结束时的回调方法
   * @param delay  延迟时间(单位毫秒)
   * @param count 执行次数
   * @param cover 是否覆盖
   * @param priority 优先级
   * @param args   回调参数
   * @return  key= 覆盖key */
  doCount(
    caller: any,
    method: Method,
    delay: number,
    count: number,
    cover = true,
    priority?: number,
    ...args: any
  ) {
    return this.pushTimerTask(
      caller,
      method,
      delay,
      count,
      priority,
      cover,
      ...args
    )
  }

  /** 定时重复执行
   * @param caller 调用者
   * @param method 结束时的回调方法
   * @param delay  延迟时间(单位毫秒)
   * @param cover 是否覆盖
   * @param priority 优先级
   * @param args   回调参数
   * @return  key= 覆盖key */
  doLoop(
    caller: any,
    method: Method,
    delay: number,
    cover = true,
    priority?: number,
    ...args: any
  ) {
    return this.pushTimerTask(
      caller,
      method,
      delay,
      0,
      priority,
      cover,
      ...args
    )
  }

  /** 定时执行一次(基于帧率)
   * @param caller 调用者
   * @param method 结束时的回调方法
   * @param delay  延迟时间(单位毫秒)
   * @param cover 是否覆盖
   * @param priority 优先级
   * @param args   回调参数
   * @return  key= 任务标志 */
  doFrameOnce(
    caller: any,
    method: Method,
    delay: number,
    cover = true,
    priority?: number,
    ...args: any
  ) {
    return this.pushFrameTask(
      caller,
      method,
      delay,
      1,
      priority,
      cover,
      ...args
    )
  }

  /** 定时执行有限次(基于帧率)
   * @param caller 调用者
   * @param method 结束时的回调方法
   * @param delay  延迟时间(单位毫秒)
   * @param count 执行次数
   * @param cover 是否覆盖
   * @param priority 优先级
   * @param args   回调参数
   * @return  key= 覆盖key */
  doFrameCount(
    caller: any,
    method: Method,
    delay: number,
    count: number,
    cover = true,
    priority?: number,
    ...args: any
  ) {
    return this.pushFrameTask(
      caller,
      method,
      delay,
      count,
      priority,
      cover,
      ...args
    )
  }

  /** 定时重复执行(基于帧率)
   * @param caller 调用者
   * @param method 结束时的回调方法
   * @param delay  延迟时间(单位毫秒)
   * @param cover 是否覆盖
   * @param priority 优先级
   * @param args   回调参数
   * @return  key= 覆盖key */
  doFrameLoop(
    caller: any,
    method: Method,
    delay: number,
    cover = true,
    priority?: number,
    ...args: any
  ) {
    return this.pushFrameTask(
      caller,
      method,
      delay,
      0,
      priority,
      cover,
      ...args
    )
  }

  /** 定时器执行数量 */
  get size() {
    return this._timerTasks.size + this._frameTasks.size
  }

  private requestAnimationFrame(callback: (timestamp: number) => void) {
    let requestFrame = window.requestAnimationFrame
    if (!requestFrame) {
      const vendors = ['webkit', 'moz']
      let index = 0
      for (; index < vendors.length && !requestFrame; ++index) {
        const prefix = vendors[index]
        const win: Record<string, any> = window
        requestFrame = win[`${prefix}RequestAnimationFrame`]
      }
    }

    if (!requestFrame) {
      let lastTime = 0
      requestFrame = (callback: (timestamp: number) => void) => {
        const currTime = new Date().getTime()
        const elapsed = Math.max(0, 16 - (currTime - lastTime))
        const result = window.setTimeout(() => {
          callback && callback(currTime + elapsed)
        }, elapsed)
        lastTime = currTime + elapsed
        return result
      }
    }
    return requestFrame(callback)
  }

  private cancelAnimationFrame(handle: number) {
    let cancelFrame = window.cancelAnimationFrame
    if (!cancelFrame) {
      const vendors = ['webkit', 'moz']
      let index = 0
      for (; index < vendors.length && !cancelFrame; ++index) {
        const prefix = vendors[index]
        const win: Record<string, any> = window
        cancelFrame =
          win[prefix + 'CancelAnimationFrame'] ||
          win[prefix + 'CancelRequestAnimationFrame']
      }
    }
    cancelFrame = cancelFrame || window.clearTimeout
    cancelFrame(handle)
  }

  private excuteTasks(queue: QueueType, current: number) {
    const tasks = Array.from(queue.values())
    tasks.sort((task1, task2) => task2.priority - task1.priority)
    tasks.forEach(task => {
      const valid = task.excute(current)
      !valid && queue.delete(task.key)
    })
    return !queue.size
  }

  private excuteTaskLoop(queueTasks: TaskMapType, current: number) {
    this._currTime = new Date().getTime()
    const emptys: any[] = []
    queueTasks.forEach((queue, caller) => {
      const empty = this.excuteTasks(queue, this._currTime)
      empty && emptys.push(caller)
    })
    emptys.forEach(key => queueTasks.delete(key))
  }

  private handleTimerLoop() {
    this._currTime = new Date().getTime()
    this.excuteTaskLoop(this._timerTasks, this._currTime)

    this.checkTimerQueue()
  }

  private handleFrameLoop() {
    this._currTime = new Date().getTime()
    this.excuteTaskLoop(this._frameTasks, this._currTime)

    this.checkFrameQueue()
  }

  private pushFrameTask(
    caller: any,
    method: Method,
    delay: number,
    count?: number,
    priority = 0,
    cover = true,
    ...args: any
  ) {
    const result = this.pushTask(
      this._frameTasks,
      caller,
      method,
      delay,
      count,
      priority,
      cover,
      ...args
    )
    result && this.checkFrameQueue()

    return result
  }

  private pushTask(
    tasks: TaskMapType,
    caller: any,
    method: Method,
    delay: number,
    count?: number,
    priority = 0,
    cover = true,
    ...args: any
  ): Method | number | null {
    if ((!count || count < 1) && !delay) {
      Handler.excute(caller, method, ...args)
      return null
    }

    if (!tasks.has(caller)) {
      tasks.set(caller, new Map())
    }
    const queue = tasks.get(caller)
    if (cover && queue?.has(method)) {
      queue?.delete(method)
    }

    const task = new TimerHandler(
      caller,
      method,
      new Date().getTime() + delay,
      delay,
      cover,
      priority,
      count,
      ...args
    )
    queue?.set(task.key, task)

    return task?.key
  }

  private pushTimerTask(
    caller: any,
    method: Method,
    delay: number,
    count?: number,
    priority = 0,
    cover = true,
    ...args: any
  ) {
    const result = this.pushTask(
      this._timerTasks,
      caller,
      method,
      delay,
      count,
      priority,
      cover,
      ...args
    )
    result && this.checkTimerQueue()

    return result
  }

  static get NAME() {
    return 'Timers'
  }
}
