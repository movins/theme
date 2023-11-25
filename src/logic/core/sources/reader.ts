import { kDwBufSize, kDwCookie, kDwFileFlag, kDwFileVersion, kDwKey } from "@/logic/consts"
import { decrypt } from "@/logic/utils"
import { ByteArray } from "@yy/bytearray"

export interface SourceItemTime {
  wYear: number
  wMonth: number
  wDayOfWeek: number
  wDay: number
  wHour: number
  wMinute: number
  wSecond: number
  wMilliseconds: number
}

export interface SourceItemInfo {
  dwProcessId: number
  dwThreadId: number
  wLevel: number
  wLine: number
  dwYY: number
  stTime: SourceItemTime
  lpszFilter: string
  lpszFunc: string
  lpszCppName: string
  lpszModule: string
  lpszLog: string
}

export class MessageData {
  id = 0
}

export interface BaseMessage<T extends MessageData = MessageData> {
  cmd: string
  data: T
}

export enum OpenType {
  OPEN,
  APPEND
}

export class OpenFileReq extends MessageData {
  static cmd = 'OpenFileReq'
  type = OpenType.OPEN
  file?: Blob
}

export class OpenFileRsp extends MessageData {
  static cmd = 'OpenFileRsp'
  type = OpenType.OPEN
  data: SourceItemInfo[] = []
}

export enum ErrorCode {
  OK = 0,
  FileUrlErr = 1,  // 链接错误
  FileReadErr = 2,  // 文件读取错误
  FileTypeErr = 3,  // 文件类型错误
  FileVerErr = 3,  // 文件版本错误
  FileLoadErr = 4,  // 文件加载错误
}

const kErrorMessage: Record<number, string> = {}
kErrorMessage[ErrorCode.OK] = ''
kErrorMessage[ErrorCode.FileUrlErr] = '链接错误'
kErrorMessage[ErrorCode.FileReadErr] = '文件读取错误'
kErrorMessage[ErrorCode.FileTypeErr] = '文件类型错误'
kErrorMessage[ErrorCode.FileVerErr] = '文件版本错误'
kErrorMessage[ErrorCode.FileLoadErr] = '文件加载错误'

export class MessageNotify extends MessageData {
  static cmd = 'MessageNotify'
  code = ErrorCode.OK
  msg = ''
}

export class Reader {
  private _worker: any
  private _handlers: Record<string, (data: any) => void>

  constructor(worker: any) {
    this._worker = worker

    this.handleReaderLoaded = this.handleReaderLoaded.bind(this)
    this._handlers = {}
    this._handlers[OpenFileReq.cmd] =
      this.handleOpenFileReq.bind(this)
  }

  onWorking({ cmd, data }: BaseMessage) {
    const handler = this._handlers[cmd]
    handler && handler(data)
  }

  private handleOpenFileReq({id, type, file}: OpenFileReq) {
    this.loadFile(id, type, file)
  }

  private loadFile(id: number, type: OpenType, file?: Blob) {
    if (!file) {
      this.showMessage(ErrorCode.FileUrlErr)
      return
    }

    const reader = new FileReader()
    reader.onload = ev => {
      const result = this.handleReaderLoaded(ev)
      this.openFileRsp(id, type, result)
    }
    reader.readAsArrayBuffer(file)
  }

  private readString(bytes: ByteArray, length: number) {
    let result = ''
    try {
      const data = bytes.readBytes(length)
      const arr = Array.from(data)
      result = String.fromCharCode.apply(null, arr)
    } catch (error) {
      result = ''
    }

    return result
  }

  private readLogItem(bytes: ByteArray): SourceItemInfo {
    const dwCookie = bytes.readUInt32()
    const wType = bytes.readUInt16()
    const wReserved = bytes.readUInt16()
    const dwProcessId = bytes.readUInt32()
    const dwThreadId = bytes.readUInt32()
    const wYear = bytes.readUInt16()
    const wMonth = bytes.readUInt16()
    const wDayOfWeek = bytes.readUInt16()
    const wDay = bytes.readUInt16()
    const wHour = bytes.readUInt16()
    const wMinute = bytes.readUInt16()
    const wSecond = bytes.readUInt16()
    const wMilliseconds = bytes.readUInt16()
    const wLevel = bytes.readUInt16()
    const wLine = bytes.readUInt16()
    const dwYY = bytes.readUInt32()
    const cchFilter = bytes.readUInt16()
    const cchFunc = bytes.readUInt16()
    const cchCppName = bytes.readUInt16()
    const cchModule = bytes.readUInt16()
    const cchLog = bytes.readUInt16()
    const ccalign = bytes.readUInt16()
    const lpszFilter = this.readString(bytes, cchFilter)
    const lpszFunc = this.readString(bytes, cchFunc)
    const lpszCppName = this.readString(bytes, cchCppName)
    const lpszModule = this.readString(bytes, cchModule)

    const data = bytes.readBytes(cchLog)
    let utf8decoder = new TextDecoder()
    const lpszLog = utf8decoder.decode(data)

    const stTime: SourceItemTime = {
      wYear, wMonth, wDayOfWeek, wDay, wHour, wMinute, wSecond, wMilliseconds
    }

    return {
      dwProcessId, dwThreadId, stTime, wLevel, wLine, dwYY, lpszFilter, lpszFunc, lpszCppName, lpszModule, lpszLog
    }
  }

  private handleReaderLoaded(ev: ProgressEvent<FileReader>) {
    const bytes = new ByteArray(ev.target?.result as ArrayBuffer)
    const result: SourceItemInfo[] = []
    if (!bytes.byteLength) {
      this.showMessage(ErrorCode.FileReadErr)
      return result
    }
    bytes.position = 0
    const dwFlag = bytes.readUInt32()
    const dwVer = bytes.readUInt32()
    if(dwFlag !== kDwFileFlag) {
      this.showMessage(ErrorCode.FileTypeErr)
      return result
    }
    if (dwVer !== kDwFileVersion) {
      this.showMessage(ErrorCode.FileVerErr)
      return result
    }
    let code = ErrorCode.OK
    while (1) {
      if (bytes.position + 4 > bytes.byteLength) {
        break
      }
      const dwBlockSize = bytes.readUInt32()
      if(dwBlockSize < 4) {
        continue
      }
      const length = dwBlockSize - 4
      if(length > kDwBufSize) {
        code = ErrorCode.FileLoadErr
        break
      }

      if (bytes.position + length > bytes.byteLength) {
        break
      }

      const data = bytes.readBytes(length)
      const dView = new Uint32Array(data.buffer, data.byteOffset, length / 4)
      const dwCookie = dView[0]

      let index = dwCookie !== kDwCookie ? 0 : 13 //日志版本号==4 dwCookie未加密
      for (; index < dView.length; index+=2) {
        const data = decrypt([dView[index], dView[index + 1]], kDwKey)
        dView[index] = data[0]
        dView[index + 1] = data[1]
      }

      const bytesArr = new ByteArray(dView)
      bytesArr.position = 0
      const item = this.readLogItem(bytesArr)
      result.push(item)
    }
    if (code !== ErrorCode.OK) {
      this.showMessage(code)
    }

    return result
  }

  private openFileRsp(id: number, type: OpenType, info: SourceItemInfo[] = []) {
    const data = new OpenFileRsp()
    data.id = id
    data.type = type
    data.data = info

    this.send({ cmd: OpenFileRsp.cmd, data })
  }

  private showMessage(code: ErrorCode, msg?: string) {
    const data = new MessageNotify()
    data.code = code
    data.msg = msg || kErrorMessage[code] || '未知错误'

    this.send({ cmd: MessageNotify.cmd, data })
  }

  private send<T extends MessageData>(msg: BaseMessage<T>, trans: any[] = []) {
    this.postMessage(msg, trans)
  }

  private postMessage(data: Record<string, any>, trans: any[] = []) {
    this._worker?.postMessage(data, trans)
  }
}
