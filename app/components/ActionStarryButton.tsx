import React from 'react'
import './StarryButton.css'
export interface ActionStarryButtonProps {
  onClick: () => Promise<void>
  name: string
}
const ActionStarryButton: React.FC<ActionStarryButtonProps> = ({ onClick, name }) => {
  return (
    <button
      onClick={async () => {
        await onClick()
      }}
      className='relative min-h-[50px] w-full overflow-hidden rounded-lg bg-black px-4 text-white glow-effect transition-transform duration-250 hover:scale-[1.02]'
    >
      <span className='absolute inset-0 flex items-center justify-center z-10'>{name}</span>
      <div className='absolute inset-0 bg-black stars-bg animate-move-stars z-0'></div>
    </button>
  )
}

export default ActionStarryButton
