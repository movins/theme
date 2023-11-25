import React from 'react'

import './index.scss'
import Menu from './menu'

const View = () => {
  return (
    <>
      <div className='view-menu'><Menu></Menu></div>
      <div className='view-body'>
        <div className='view-body-tools'></div>
        <div className='view-body-list'></div>
      </div>
      <div className='view-status'></div>
    </>
  )
}

export default View
