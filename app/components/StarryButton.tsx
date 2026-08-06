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
      className={`relative min-h-[50px] w-full overflow-hidden rounded-lg bg-black px-4 text-white glow-effect transition-all duration-250 hover:scale-[1.02] ${
        connected ? 'min-w-0' : ''
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
