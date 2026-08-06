import React from 'react'

const Background: React.FC = () => {
  return (
    <div className='pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden bg-[#272730]'>
      <div className='flex h-screen w-full items-center justify-center px-6'>
        <div className='select-none text-center text-[clamp(4rem,16vw,12rem)] font-extrabold leading-none tracking-[-0.08em] text-white/10'>
          Canton
        </div>
      </div>
    </div>
  )
}

export default Background
