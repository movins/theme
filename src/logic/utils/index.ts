export const decrypt = (v: number[], k: number[]) => {
  let [v0, v1] = v
  let sum = 0xC6EF3720 /* set up */
  const delta = 0x9e3779b9 /* a key schedule constant */
  const [k0, k1, k2, k3] = k /* cache key */
  /* basic cycle start */
  for (let i=0; i<32; ++i) {
    v1 = (v1 - ((((v0 << 4) + k2)>>>0) ^ ((v0 + sum)>>>0) ^ (((v0 >>> 5) + k3)>>>0)) )>>>0
    v0 = (v0 - ((((v1 << 4) + k0)>>>0) ^ ((v1 + sum)>>>0) ^ (((v1 >>> 5) + k1)>>>0)) )>>>0
    sum = (sum - delta) >>> 0
  }
  /* end cycle */
  v[0] = v0
  v[1] = v1
  return v
}

export interface BufferItr {
  toString(): string
}

export class Buffer<T extends BufferItr = string> {
  private _buf: Array<T>

  constructor() {
    this._buf = new Array<T>()
  }

  append(...args: T[]): this {
    this._buf.push(...args)
    return this;
  }

  clear(): this {
    this._buf = []
    return this
  }

  toString(deli = '') {
    const buf = this._buf.map(itr => itr.toString())

    return buf.join(deli)
  }
}
