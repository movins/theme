import React from 'react'
import { ExNodeItr, Excuter, ExcuterPtr, UDate, useExcuter } from '@/base'
import { App, LogTask } from '@/boots'

const useLogic = <T extends Excuter<T>>(
  root: ExcuterPtr,
  node: ExNodeItr,
  handler: (itr: T) => void
) => {
  const handlerRef = React.useRef<any>()
  const nodeRef = React.useRef<T>()
  handlerRef.current = handler

  React.useEffect(() => {
    const handleChange = () => {
      handlerRef.current?.call(handlerRef, nodeRef.current)
    }
    const useNode = () => {
      if (!root.has(node) || nodeRef.current) {
        return
      }
      nodeRef.current = useExcuter<T>(root, node)
      nodeRef.current?.on(node.READY, handleChange)
      nodeRef.current?.on(node.CHANGED, handleChange)
      nodeRef.current?.ready && handleChange()
    }
    const handleAdd = (n: ExNodeItr) => {
      if (node.key !== n.key) {
        return
      }
      useNode()
    }
    root.on(Excuter.ADD, handleAdd)
    useNode()

    return () => {
      nodeRef.current?.off(node.READY, handleChange)
      nodeRef.current?.off(node.CHANGED, handleChange)
      nodeRef.current = undefined
      root.off(node.READY, handleAdd)
    }
  }, [])
}

export const useCoreLogic = <T extends Excuter<T>>(
  node: ExNodeItr,
  handler: (itr: T) => void
) => useLogic(App.logic.core, node, handler)

export const useTimeout = (
  handler: (...args: any[]) => void,
  timeout: number,
  ...args: any[]
) => {
  const objRef = React.useRef<any>()
  objRef.current = Symbol.for('boots::use::timeout')

  const handlerRef = React.useRef<any>()
  handlerRef.current = handler
  const timerRef = React.useRef<any>()

  React.useEffect(() => {
    timerRef.current = App.timer.doOnce(
      objRef.current,
      (...args: any[]) => {
        handlerRef.current?.call(handlerRef, ...args)
      },
      timeout,
      undefined,
      undefined,
      ...args
    )

    return () => {
      if (timerRef.current) {
        App.timer.clearTimer(objRef.current, timerRef.current)
      }
    }
  }, [])
}

export const useInterval = (
  handler: (...args: any[]) => void,
  interval: number,
  ...args: any[]
) => {
  const objRef = React.useRef<any>()
  objRef.current = Symbol.for('boots::use::interval')

  const handlerRef = React.useRef<any>()
  handlerRef.current = handler
  const timerRef = React.useRef<any>()

  React.useEffect(() => {
    timerRef.current = App.timer.doLoop(
      null,
      (...args: any[]) => {
        handlerRef.current?.call(handlerRef, ...args)
      },
      interval,
      undefined,
      undefined,
      ...args
    )

    return () => {
      if (timerRef.current) {
        App.timer.clearTimer(null, timerRef.current)
      }
    }
  }, [])
}

export const useLog = (tag: string, timeout = 5 * 1000) => {
  const logRef = React.useRef<LogTask>()
  logRef.current = logRef.current || App.log.log(`YYui.${tag}`, tag)
  logRef.current.timeout(timeout)

  const append = (fmt: string, ...args: any[]) => {
    const now = new UDate().format('hh:mm:ss')
    fmt = `now=${now} ${fmt}`
    logRef.current && App.log.append(logRef.current, fmt, ...args)
  }

  React.useEffect(() => {
    append('enter')
    return () => {
      append('quit')
    }
  }, [])

  return { append }
}
