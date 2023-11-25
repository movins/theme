let nextUuid = 0

export function uuid() {
  return ++nextUuid
}

export type TypesPick<T, F> = {
  [K in keyof T]: T[K] extends F ? T[K] : never
}[keyof T]

export type TypePick<K, T, F> = {
  [KK in keyof T]: KK extends K ? T[KK] : never
}[keyof T]

export type NamesPick<T, F> = {
  [K in keyof T]: T[K] extends F ? K : never
}[keyof T]

export type MethodNames<T> = NamesPick<T, Function>
export type MethodTypes<T> = TypesPick<T, Function>
export type MethodPicks<B, T extends B> = Exclude<
  MethodNames<T>,
  MethodNames<B>
>

export const format = (format: string, ...args: any[]) => {
  const exg = /{%(\d+)}/g
  if (exg.test(format)) {
    format = format.replace(exg, (_: any, x: any) => {
      let result = args[x - 1]
      if (result && typeof result !== 'string' && typeof result !== 'number') {
        try {
          result = JSON.stringify(result)
        } catch (error) {
          result = '{stringify error}'
        }
      }
      return result
    })
  }
  return format
}

export const getArgs = function (): string {
  const src = location.search || location.href || ''
  const str = src // src.slice(1)

  const num = str.indexOf('?')
  return (num >= 0 && str.substr(num + 1)) || ''
}

export const urlArgs = function (url: string): Record<string, string> {
  const num = url.indexOf('?')
  const ex = /([^&]+?)=([^#&]+)/g
  const result: Record<string, any> = {}

  url = url.substr(num + 1)
  while (ex.test(url)) {
    result[RegExp.$1] = RegExp.$2
  }

  return result
}

export const argObject = function (): Record<string, string> {
  const src = location.search || location.href || ''
  const str = src.slice(1)
  return urlArgs(str)
}

export const paramFmt = function (url: string) {
  const arg = function (...args: any[]) {
    return format(url, ...args)
  }
  return { url, arg }
}

export class UDate extends Date {
  /*
   * eg:format="yyyy-MM-dd hh:mm:ss";
   */
  format(format: string) {
    const o: Record<string, any> = {
      'M+': this.getMonth() + 1, // month
      'd+': this.getDate(), // day
      'h+': this.getHours(), // hour
      'm+': this.getMinutes(), // minute
      's+': this.getSeconds(), // second
      'q+': Math.floor((this.getMonth() + 3) / 3), // quarter
      'S+': this.getMilliseconds()
    }

    if (/(y+)/.test(format)) {
      format = format.replace(
        RegExp.$1,
        (this.getFullYear() + '').substr(4 - RegExp.$1.length)
      )
    }

    for (const k in o) {
      if (new RegExp('(' + k + ')').test(format)) {
        let formatStr = ''
        for (let i = 1; i <= RegExp.$1.length; i++) {
          formatStr += '0'
        }

        let replaceStr = ''
        if (RegExp.$1.length == 1) {
          replaceStr = o[k]
        } else {
          formatStr = formatStr + o[k]
          const index = ('' + o[k]).length
          formatStr = formatStr.substr(index)
          replaceStr = formatStr
        }
        format = format.replace(RegExp.$1, replaceStr)
      }
    }
    return format
  }
}
