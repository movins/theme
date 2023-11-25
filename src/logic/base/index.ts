import {
  ExNodeTag,
  Excuter,
  ExcuterPtr,
  Method,
  argObject,
  format,
  useExcuter
} from '@/base'
import { App, LogTask } from '@/boots'

export class BaseEntry<T extends Excuter = Excuter> extends Excuter<T> {
  private static _args?: Record<string, any>

  protected app = App

  constructor(name: string) {
    super(name)
  }

  protected get args() {
    return BaseEntry._args || (BaseEntry._args = argObject())
  }

  protected callLater(method: Method, args: Array<any> = []) {
    return App.render.later(this, method, args)
  }

  protected callOnce(method: Method, delay: number, ...args: any) {
    return App.timer.doOnce(this, method, delay, undefined, undefined, ...args)
  }

  protected callLoop(method: Method, delay: number, ...args: any) {
    return App.timer.doLoop(this, method, delay, undefined, undefined, ...args)
  }

  protected clearLoop(key: any) {
    App.timer.clearTimer(this, key)
  }

  protected clearOnce(key: any) {
    App.timer.clearTimer(this, key)
  }

  protected log(title: string, content = '', ...args: any[]) {
    return App.log.log(this.key, title, content, ...args)
  }

  protected append(task: LogTask, content = '', ...args: any[]) {
    return App.log.append(task, content, ...args)
  }

  protected format(fmt: string, ...args: any[]): string {
    return format(fmt, ...args)
  }
}

export const useEntry = <T extends BaseEntry<T>>(
  root: ExcuterPtr,
  cls: ExNodeTag
): T | undefined => useExcuter<T>(root, cls)
