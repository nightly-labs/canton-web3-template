import React from 'react'
import TwitterIcon from '../svg/twitter.svg'
import DiscordIcon from '../svg/discord.svg'
import GithubIcon from '../svg/github.svg'

const Socials: React.FC = () => {
  return (
    <div className='fixed bottom-4 left-1/2 z-20 w-max -translate-x-1/2 rounded-xl bg-white/10 p-2 backdrop-blur-md sm:left-auto sm:right-4 sm:translate-x-0'>
      <div className='flex justify-center space-x-2'>
        <a
          href='https://twitter.com/Nightly_app'
          target='_blank'
          rel='noopener noreferrer'
          className='mt-[2px] transform transition-transform duration-300 hover:-rotate-12'
        >
          <TwitterIcon width={40} height={40} />
        </a>
        <a
          href='https://discord.com/invite/7nhFHA6yZq'
          target='_blank'
          rel='noopener noreferrer'
          className='transform transition-transform duration-300 hover:-rotate-12'
        >
          <DiscordIcon width={45} height={45} />
        </a>
        <a
          href='https://github.com/nightly-labs/canton-web3-template'
          target='_blank'
          rel='noopener noreferrer'
          className='mt-[2px] transform transition-transform duration-300 hover:-rotate-12'
        >
          <GithubIcon width={40} height={40} />
        </a>
      </div>
    </div>
  )
}

export default Socials
