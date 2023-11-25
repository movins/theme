import React, { Ref, useEffect, useImperativeHandle, useRef } from 'react'
import './index.scss'
import { getStyle, off, on } from '../../logic'

const ie = (function () {
  const document: any = window.document
  let result = 0
  for(let v = 3,
        el = document.createElement('b'),
        all = el.all || [];
        el.innerHTML = '<!--[if gt IE ' + (++v) + ']><i><![endif]-->',
        all[0];
  ){
    result = v
  }
  return result > 4 ? result : document.documentMode
}())

const is_mac = navigator.platform.toLowerCase().indexOf('mac') + 1;

export interface ListViewOptions {
  rows_in_block: number
  blocks_in_cluster: number
  tag: string
  show_no_data_row: boolean
  no_data_class: string
  no_data_text: string
  keep_parity: boolean
  rows_in_cluster: number
  scroll_top: number
  item_height: number
  content_tag: string
  cluster_height: number
  block_height: number
}

export interface LogViewHandler {
  update: (rows: string[]) => void
  append: (rows: string[]) => void
  prepend: (rows: string[]) => void
  refresh: (force?: boolean) => void
  getRowsAmount: () => number
  getScrollProgress: () => number
  clear: () => void
  destroy: (clean?: boolean) => void
}

export interface LogViewHolder {
  (options: Partial<ListViewOptions>): LogViewHandler | undefined
}

export interface ListViewProps {
  onScrollingProgress?: (value: number) => void
  onWillChange?: () => void
  onChanged?: () => void
}

export type LogViewProps = {
  handlerRef?: Ref<LogViewHolder>
} & ListViewProps

const kOptions: ListViewOptions = {
  rows_in_block: 50,
  blocks_in_cluster: 4,
  show_no_data_row: true,
  no_data_text: 'No data',
  keep_parity: true,
  tag: '',
  no_data_class: '',
  scroll_top: 0,
  rows_in_cluster: 0,
  item_height: 0,
  content_tag: '',
  cluster_height: 0,
  block_height: 0,
}

export const LogView = (props: LogViewProps) => {
  const {
    handlerRef,
    onScrollingProgress,
    onWillChange,
    onChanged
  } = props
  const rowsRef = useRef<string[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<LogViewHandler|null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const optRef = useRef<ListViewOptions>(kOptions)
  const cacheRef = useRef<Record<string, string>>({})
  const pointer_events_setRef = useRef<boolean>(false)
  const scroll_debounceRef = useRef<any>(null)
  const resize_debounceRef = useRef<any>(null)
  const last_clusterRef = useRef<number>(0)

  useEffect(() => {
    const elem = rootRef.current
    if (!elem?.hasAttribute('tabindex')) {
      elem?.setAttribute('tabindex', '0')
    }
    rowsRef.current = fetchMarkup()
    insertToDOM(rowsRef.current, cacheRef.current)
  }, [])

  const getChildNodes = ({children = []}: Record<string, any>) => {
    const result = []
    for (let i = 0, ii = children.length; i < ii; i++) {
      result.push(children[i])
    }
    return result
  }

  const checkChanges = (type: string, value: string, cache: Record<string, string>) => {
    const changed = value !== cache[type]
    cache[type] = value
    return changed
  }

  const fetchMarkup = () => {
    const result = []
    const list = listRef.current
    const nodes = getChildNodes(list || {}) || []
    while (nodes.length) {
      const node = nodes.shift()
      node && result.push(node.outerHTML)
    }
    return result
  }

  const html = (data: string) => {
    const list = listRef.current
    if (!list) {
      return
    }

    if(ie && ie <= 9 && optRef.current.tag == 'tr') {
      const div: HTMLDivElement = document.createElement('div')
      div.innerHTML = '<table><tbody>' + data + '</tbody></table>'
      let last = null
      while((last = list.lastChild)) {
        list.removeChild(last)
      }
      const { firstChild } = div.firstChild || {}
      const nodes = getChildNodes(firstChild || {})
      while (nodes.length) {
        const node = nodes.shift()
        node && list.appendChild(node)
      }
    } else {
      list.innerHTML = data
    }
  }

  const initRowsHeight = (rows: string[]) => {
    const opts = optRef.current
    const prev_item_height = opts.item_height
    opts.cluster_height = 0

    const list = listRef.current
    if (!rows.length || !list) {
      return
    }
    const nodes = list.children
    if (!nodes.length) {
      return
    }

    const node = nodes[Math.floor(nodes.length / 2)] as HTMLElement
    opts.item_height = node.offsetHeight
    if (opts.tag === 'tr' && getStyle(list, 'borderCollapse') !== 'collapse') {
      opts.item_height += parseInt(getStyle(list, 'borderSpacing'), 10) || 0
    }

    if(opts.tag != 'tr') {
      const marginTop = parseInt(getStyle(node, 'marginTop'), 10) || 0
      const marginBottom = parseInt(getStyle(node, 'marginBottom'), 10) || 0
      opts.item_height += Math.max(marginTop, marginBottom)
    }
    opts.block_height = opts.item_height * opts.rows_in_block
    opts.rows_in_cluster = opts.blocks_in_cluster * opts.rows_in_block
    opts.cluster_height = opts.blocks_in_cluster * opts.block_height

    return prev_item_height !== opts.item_height
  }

  const exploreEnvironment = (rows: string[], cache: Record<string, string>) => {
    const list = listRef.current
    if (!list) {
      return
    }
    const opts = optRef.current
    opts.content_tag = list.tagName.toLowerCase()
    if (!rows.length) {
      return
    }
    if (ie && ie <= 9 && !opts.tag) {
      const [first = ''] = rows
      const [, tag = ''] = first.match(/<([^>\s/]*)/) || []
      opts.tag = tag.toLowerCase()
    }
    if (list.children.length <= 1) {
      // cache.data = html(rows[0] + rows[0] + rows[0])
    }
    if (!opts.tag && list.children.length) {
      opts.tag = list.children[0]?.tagName.toLowerCase()
    }

    initRowsHeight(rows)
  }

  const getClusterNum = () => {
    const root = rootRef.current
    if (!root) {
      return 0
    }
    const opts = optRef.current
    opts.scroll_top = root.scrollTop

    return Math.floor(opts.scroll_top / (opts.cluster_height - opts.block_height)) || 0
  }

  const generateEmptyRow = () => {
    const opts = optRef.current
    if (!opts.tag || !opts.show_no_data_row) {
      return []
    }
    const empty_row = document.createElement(opts.tag)
    const no_data_content = document.createTextNode(opts.no_data_text)
    empty_row.className = opts.no_data_class

    let no_data = null
    if(opts.tag == 'tr') {
      no_data = document.createElement('td')
      no_data.colSpan = 100
      no_data.appendChild(no_data_content)
    }
    empty_row.appendChild(no_data || no_data_content)
    return [empty_row.outerHTML]
  }

  const generate = (rows: string[], cluster_num: number) => {
    const opts = optRef.current
    const rows_len = rows.length

    if (rows_len < opts.rows_in_block) {
      return {
        top_offset: 0,
        bottom_offset: 0,
        rows_above: 0,
        rows: rows_len ? rows : generateEmptyRow()
      }
    }
    const items_start = Math.max((opts.rows_in_cluster - opts.rows_in_block) * cluster_num, 0)
    const items_end = items_start + opts.rows_in_cluster
    const top_offset = Math.max(items_start * opts.item_height, 0)
    const bottom_offset = Math.max((rows_len - items_end) * opts.item_height, 0)
    const this_cluster_rows = []
    let rows_above = items_start

    if(top_offset < 1) {
      rows_above++;
    }

    for (let i = items_start; i < items_end; i++) {
      rows[i] && this_cluster_rows.push(rows[i])
    }

    return {
      top_offset,
      bottom_offset,
      rows_above,
      rows: this_cluster_rows
    }
  }
  const renderExtraTag = (class_name: string, height?: number) => {
    const opts = optRef.current
    const tag = document.createElement(opts.tag)
    const clusterize_prefix = 'clusterize-'

    tag.className = [clusterize_prefix + 'extra-row', clusterize_prefix + class_name].join(' ')
    height && (tag.style.height = height + 'px')

    return tag.outerHTML
  }

  const insertToDOM = (rows: string[], cache: Record<string, string>) => {
    const list = listRef.current
    if (!list) {
      return
    }
    const {cluster_height, keep_parity, content_tag} = optRef.current
    if(!cluster_height) {
      exploreEnvironment(rows, cache);
    }

    const data = generate(rows, getClusterNum())
    const this_cluster_rows = data.rows.join('')
    const this_cluster_content_changed = checkChanges('data', this_cluster_rows, cache)
    const top_offset_changed = checkChanges('top', String(data.top_offset), cache)
    const only_bottom_offset_changed = checkChanges('bottom', String(data.bottom_offset), cache)
    const layout = [];

    if(this_cluster_content_changed || top_offset_changed) {
      if(data.top_offset) {
        keep_parity && layout.push(renderExtraTag('keep-parity'))
        layout.push(renderExtraTag('top-space', data.top_offset))
      }
      layout.push(this_cluster_rows)
      data.bottom_offset && layout.push(renderExtraTag('bottom-space', data.bottom_offset))
      onWillChange && onWillChange()
      html(layout.join(''))
      content_tag === 'ol' && list.setAttribute('start', String(data.rows_above))
      const style: Record<string, any> = list.style
      style['counter-increment'] = 'clusterize-counter ' + (data.rows_above-1)
      onChanged && onChanged()
    } else if (only_bottom_offset_changed) {
      const { style = null } = (list.lastChild as HTMLElement) || {}
      style && (style.height = data.bottom_offset + 'px')
    }
  }

  const handleScroll = () => {
    const list = listRef.current
    if (!list) {
      return
    }

    if (is_mac) {
      if (!pointer_events_setRef.current) {
        list.style.pointerEvents = 'none'
      }
      pointer_events_setRef.current = true

      scroll_debounceRef.current && clearTimeout(scroll_debounceRef.current)
      scroll_debounceRef.current = setTimeout(() => {
        list.style.pointerEvents = 'auto'
        pointer_events_setRef.current = false
      }, 50);
    }
    if (last_clusterRef.current != (last_clusterRef.current = getClusterNum())) {
      insertToDOM(rowsRef.current, cacheRef.current)
    }

    onScrollingProgress && onScrollingProgress(getScrollProgress())
  }

  const handleResize = function() {
    resize_debounceRef.current && clearTimeout(resize_debounceRef.current)
    resize_debounceRef.current = setTimeout(refresh, 100)
  }

  const update = (rows: string[]) => {
    rowsRef.current = rows || []
    const root = rootRef.current
    if (!root) {
      return
    }
    const opts = optRef.current
    const scroll_top = root.scrollTop
    if(rows.length * opts.item_height < scroll_top) {
      root.scrollTop = 0
    }
    insertToDOM(rows, cacheRef.current)
    root.scrollTop = scroll_top
  }

  const append = (rows: string[]) => {
    if (!rows.length) {
      return
    }
    rowsRef.current = rowsRef.current.concat(rows)
    insertToDOM(rowsRef.current, cacheRef.current)
  }

  const prepend = (rows: string[]) => {
    if (!rows.length) {
      return
    }
    rowsRef.current = rows.concat(rowsRef.current)
    insertToDOM(rowsRef.current, cacheRef.current)
  }

  const refresh = (force?: boolean) => {
    const rows = rowsRef.current
    initRowsHeight(rows)

    force && update(rows)
  }

  const getRowsAmount = (): number => {
    return rowsRef.current.length
  }

  const getScrollProgress = (): number => {
    const opts = optRef.current
    const rows = rowsRef.current
    return opts.scroll_top / (rows.length * opts.item_height) * 100 || 0
  }

  const clear = () => {
    update([])
  }

  const destroy = (clean?: boolean) => {
    off('scroll', rootRef.current, handleScroll)
    off('resize', window, handleResize);
    html((clean ? generateEmptyRow() : rowsRef.current).join(''))
  }

  const handler = (options: Partial<ListViewOptions>) => {
    if (!handleRef.current) {
      optRef.current = {
        ...optRef.current,
        ...options
      }
      on('scroll', rootRef.current, handleScroll)
      on('resize', window, handleResize)
      handleRef.current = {
        update,
        append,
        prepend,
        refresh,
        getRowsAmount,
        getScrollProgress,
        clear,
        destroy
      }
    }

    return handleRef.current
  }

  useImperativeHandle(handlerRef, () => handler)

  return (
    <div ref={rootRef} className="logview-scroll">
      <ul ref={listRef} className="logview-content"></ul>
    </div>
  )
}
