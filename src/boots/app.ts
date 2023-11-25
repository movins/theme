import Render from './render'
import Timer from './timers'
import { Queues } from './queue'
import { Log } from './log'
import { RootLogic } from './logic'

export default class App {
  private static _timer: Timer = new Timer()
  private static _render: Render = new Render()
  private static _log: Log = new Log()
  private static _queues: Queues = new Queues()
  private static _logic: RootLogic = new RootLogic()

  static init(): void {
    App._log.init()
    App._timer.init()
    App._render.init()
    App._queues.init()
    App._logic.init()

    window.onerror = (
      message: any,
      source: any,
      lineno: any,
      colno: any,
      error: any
    ) => {
      App.error(
        'onerror',
        'message={%1},source={%2},lineno={%3},colno={%4},error={%5}',
        message,
        source,
        lineno,
        colno,
        error
      )
    }
    window.addEventListener(
      'error',
      (error: any) => {
        App.error('error', 'error={%1}', error)
      },
      true
    )
    window.addEventListener('unhandledrejection', (error: any) => {
      App.error('unhandledrejection', 'error={%1}', error)
    })
  }

  static run(node: any, dom: HTMLElement, callback?: () => void) {
    // ReactDOM.render(node, dom, callback)
  }

  static start() {
    App._timer.start()
    App._render.start()
    App._log.start()
    App._queues.start()
    App._logic.start()
  }

  static stop() {
    App._timer.stop()
    App._render.stop()
    App._log.stop()
    App._queues.stop()
    App._logic.stop()
  }

  static destroy() {
    App._logic.destroy()
    App._timer.destroy()
    App._render.destroy()
    App._log.destroy()
    App._queues.destroy()
  }

  static get timer() {
    return App._timer
  }

  static get render() {
    return App._render
  }

  static get log() {
    return App._log
  }

  static get queues() {
    return App._queues
  }

  static get logic() {
    return App._logic
  }

  static error(title: string, centent = '', ...args: any[]) {
    return App._log.log('YYLog.Error', title, centent, ...args)
  }

  static info(tag: string, title: string, centent = '', ...args: any[]) {
    return App._log.log(tag, title, centent, ...args)
  }
}
