export enum SHAPES {
  SHAPE = -1,
  POLY = 0,
  RECT = 1,
  CIRC = 2,
  ELIP = 3,
  RREC = 4
}

export type Kind =
  | SHAPES.SHAPE
  | SHAPES.POLY
  | SHAPES.RECT
  | SHAPES.CIRC
  | SHAPES.ELIP
  | SHAPES.RREC

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export type Rect = Point&Size

export interface Margin {
  top: number
  left: number
  right: number
  bottom: number
}

export class CSize implements Size {
  protected _width: number
  protected _height: number

  constructor(width?: number, height?: number) {
    this._width = width || 0
    this._height = height || 0
  }

  get width() {
    return this._width
  }

  get height() {
    return this._height
  }

  clone(): Size {
    return new CSize(this._width, this._height)
  }

  assign({width, height}: Size): boolean {
    let result = false
    if (this._width !== width || this._height !== height) {
      this._width = width
      this._height = height

      result = true
    }

    return result
  }

  contains({width, height}: Size): boolean {
    return this._width === width && this._height === height
  }

  equal({width, height}: Size): boolean {
    return (
      width === this._width &&
      height === this._height
    )
  }
}

export class CPoint implements Point {
  protected _x: number
  protected _y: number

  constructor(x?: number, y?: number) {
    this._x = x || 0
    this._y = y || 0
  }

  get x() {
    return this._x
  }

  get y() {
    return this._y
  }

  clone(): Point {
    return new CPoint(this.x, this.y)
  }

  assign({x, y}: Point): boolean {
    let result = false
    if (this._x !== x || this._y !== y) {
      this._x = x
      this._y = y

      result = true
    }

    return result
  }

  contains({x, y}: Point): boolean {
    return this.x === x && this.y === y
  }

  equal({x, y}: Point): boolean {
    return (
      x === this.x &&
      y === this.y
    )
  }
}

type Shape = Point&{kind: Kind}
export class CShape<T extends Point = Point> extends CPoint {
  private _kind: Kind

  constructor(k?: Kind, x?: number, y?: number) {
    super(x, y)
    this._kind = k || SHAPES.SHAPE
  }

  get empty(): boolean {
    return true
  }

  get kind(): Kind {
    return this._kind
  }

  get bounds(): Rect {
    const {x, y} = this
    return { x, y, width: 0, height: 0 }
  }

  clone(): CShape<T> {
    return new CShape<T>(this.x, this.y)
  }

  assign(val: Point): boolean {
    return super.assign(val)
  }

  contains({x, y}: Point): boolean {
    return this.x === x && this.y === y
  }

  equal(value: CShape<T>): boolean {
    return super.equal(value) && this._kind === value.kind
  }
}

export class CRect extends CShape<Rect> {
  protected _width: number
  protected _height: number

  constructor(x?: number, y?: number, width?: number, height?: number) {
    super(SHAPES.RECT, x, y)
    this._width = width || 0
    this._height = height || 0
  }

  static get EMPTY(): CRect {
    return new CRect(0, 0, 0, 0)
  }

  get left(): number {
    return this.x
  }

  get right(): number {
    return this.x + this._width
  }

  get top(): number {
    return this.y
  }

  get bottom(): number {
    return this.y + this._height
  }

  get width(): number {
    return this._width
  }

  get height(): number {
    return this._height
  }

  get empty(): boolean {
    return this._width === 0 || this._height === 0
  }

  get bounds(): Rect {
    return {x: this.x, y: this.y, width: this._width, height: this._height}
  }

  clone(): CRect {
    return new CRect(this.x, this.y, this._width, this._height)
  }

  assign(val: Rect): boolean {
    let result = super.assign(val)
    if (this._width !== val.width || this._height !== val.height) {
      this._width = val.width
      this._height = val.height

      result = true
    }

    return result
  }

  contains({x, y}: Point): boolean {
    if (this._width <= 0 || this._height <= 0) {
      return false
    }

    if (x >= this.x && x < this.x + this._width) {
      if (y >= this.y && y < this.y + this._height) {
        return true
      }
    }

    return false
  }

  pad(paddingX: number, paddingY: number): this {
    paddingX = paddingX || 0
    paddingY = paddingY || (paddingY !== 0 ? paddingX : 0)

    this._x -= paddingX
    this._y -= paddingY

    this._width += paddingX * 2
    this._height += paddingY * 2

    return this
  }

  fit({x, y, width, height}: Rect): this {
    if (this.x < x) {
      this._width += this.x
      if (this._width < 0) {
        this._width = 0
      }

      this._x = x
    }

    if (this._y < y) {
      this._height += this._y
      if (this._height < 0) {
        this._height = 0
      }
      this._y = y
    }

    if (this._x + this._width > x + width) {
      this._width = width - this._x
      if (this._width < 0) {
        this._width = 0
      }
    }

    if (this._y + this._height > y + height) {
      this._height = height - this._y
      if (this._height < 0) {
        this._height = 0
      }
    }

    return this
  }

  enlarge({x, y, width, height}: Rect): this {
    const x1 = Math.min(this._x, x)
    const x2 = Math.max(this._x + this._width, x + width)
    const y1 = Math.min(this._y, y)
    const y2 = Math.max(this._y + this._height, y + height)

    this._x = x1
    this._width = x2 - x1
    this._y = y1
    this._height = y2 - y1

    return this
  }

  equal(val: CRect): boolean {
    return (
      super.equal(val) &&
      val.width === this._width &&
      val.height === this._height
    )
  }
}


