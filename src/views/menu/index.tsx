import React, { useRef } from 'react'
import { Sources } from '@/logic'
import { useCoreLogic, useLog, useTimeout } from '@/boots'

import logo from '/vite.svg'
import './index.scss'

const Menu = () => {
  const inputRef = useRef<HTMLInputElement>(null)

  const log = useLog('Menu')
  useTimeout(() => {
    log.append('useTimeout================')
  }, 2000)
  useCoreLogic<Sources>(Sources, itr => {
    log.append('itr={%1}', itr)
  })

  const handleOpen = () => {
    console.info('9999999999999999999999111')
    inputRef.current?.click()
  }

  const handleFileChange = (e: any) => {
    Sources.impl?.open(e.target?.files[0])
    console.info('9999999999999999999999', e.target?.files[0])
  }

  return (
    <>
      <input ref={inputRef} style={{display: 'none'}} onChange={handleFileChange} type="file" accept=".lg" multiple/>
      <img src={logo} className="menu-logo" onClick={handleOpen}/>
    </>
  )
}

export default Menu
