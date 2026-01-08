import React from 'react'
import './StarryButton.css'
export interface StarryButtonProps {
  connected: boolean
  publicKey?: string
  onConnect: () => Promise<void>
  onDisconnect: () => Promise<void>
}

const truncateAddress = (address: string) => {
  if (address.length <= 20) return address
  return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`
}

const StarryButton: React.FC<StarryButtonProps> = ({
  connected,
  onConnect,
  onDisconnect,
  publicKey,
}) => {
  const [connecting, setConnecting] = React.useState(false)
  const [hovering, setHovering] = React.useState(false)
  
  const displayText = hovering && connected 
    ? 'Disconnect' 
    : connected && publicKey 
      ? truncateAddress(publicKey) 
      : 'Connect'

  return (
    <button
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onClick={async () => {
        if (connecting) return
        if (connected) {
          setConnecting(true)
          await onDisconnect()
          setConnecting(false)
        } else {
          setConnecting(true)
          await onConnect()
          setConnecting(false)
        }
      }}
      className={`relative overflow-hidden bg-black text-white h-[50px] rounded-lg glow-effect hover:scale-105 transition-all duration-250 ${
        connected ? 'min-w-[220px] px-4' : 'w-[180px]'
      }`}
    >
      <span className='absolute inset-0 flex items-center justify-center z-10'>
        {displayText}
      </span>
      <div className='absolute inset-0 bg-black stars-bg animate-move-stars z-0'></div>
    </button>
  )
}

export default StarryButton
