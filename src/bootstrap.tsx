import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from '@/boots'
import { loadLogic } from '@/logic'

import View from './views'
import './index.scss'

; (function () {
  App.init()
  loadLogic()
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <View />
    </React.StrictMode>,
  )
  App.start()
})()


