import React, { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import NextTopLoader from 'nextjs-toploader'

import { Toaster } from '../components/ui/toaster'
import Sidebar from '../components/sidebar'
import { Animate } from '../components/animate'
import { useGlobalContext } from '../api/useGlobalContext'

export default function RootLayout({ children }) {
  const Navigate = useNavigate()
  const { currentUserId } = useContext(useGlobalContext)

  if (currentUserId === null) {
    setTimeout(() => {
      Navigate('/login') // window.location.href = '/login'
    }, 1)

    return <div></div>
  }

  return (
    <div className='app-page min-h-screen'>
      <NextTopLoader color='#F86F03' />
      <Sidebar />
      <div className='lg:pl-[300px] w-full'>
        <Animate>
          <div className='lg:flex'>{children}</div>
        </Animate>
      </div>
      <Toaster />
    </div>
  )
}
