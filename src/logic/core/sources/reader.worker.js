import { Reader } from './reader'

const reader = new Reader(self)
const MESSAGE = 'message'

addEventListener(MESSAGE, ({ data }) => {
  reader && reader.onWorking(data)
}, false)
