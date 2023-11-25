# log
从h5-bytearray重构，用于写入二进制及读取

# 接口说明
```
export declare type ByteBuffer = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | ArrayBuffer | Array<number>;
export declare class ByteArray {
  /**
    * 构建
    * @param buf 可选，指定现有buf 或者初始长度，避免频繁分配.
    * @param littleEndian If false or undefined, a big-endian value should be read.
    */
  constructor(buf?: ByteBuffer | number, littleEndian?: boolean);
  /**
    * 设置读写位置
    * @param value 值.
    */
  set position(value: number);
  /**
    * 获取读写位置
    */
  get position(): number;
  /**
    * 获取字节长度
    */
  get byteLength(): number;
  /**
    * 获取buffer 深拷贝
    */
  get buffer(): ArrayBuffer;
  /**
    * 拷贝
    * @param begin 开始位置
    * @param end 结束位置，默认读完.
    */
  slice(begin: number, end?: number): ArrayBuffer;
  readFloat32(): number;
  writeFloat32(value: number): void;
  readFloat64(): number;
  writeFloat64(value: number): void;
  readDouble(): number;
  writeDouble(value: number): void;
  readInt8(): number;
  writeInt8(value: number): void;
  readByte(): number;
  writeByte(value: number): void;
  readUInt8(): number;
  writeUInt8(value: number): void;
  readInt16(): number;
  writeInt16(value: number): void;
  readShort(): number;
  writeShort(value: number): void;
  readUInt16(): number;
  writeUInt16(value: number): void;
  readUShort(): number;
  writeUShort(value: number): void;
  readInt32(): number;
  writeInt32(value: number): void;
  readUInt32(): number;
  writeUInt32(value: number): void;
  readInt64(): number;
  writeInt64(value: number): void;
  readUInt64(): number;
  writeUInt64(value: number): void;
  readLong(): number;
  writeLong(value: number): void;
  readString(): string;
  writeString(value?: string): void;
  readString32(): string;
  writeString32(value?: string): void;
  readUtf8(): string;
  writeUtf8(value: string): void;
  readUtf8Ex(): string;
  writeUtf8Ex(value: string): void;
  readBytes(length?: number): Uint8Array;
  writeBytes(value?: ByteBuffer): void;
}
```

# remark
目前Float32有精度问题，为已知，其他问题@liaoguoguang
