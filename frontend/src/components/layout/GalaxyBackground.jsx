import AppLogo from './AppLogo'
import NightSkyBackground from './NightSkyBackground'

function GalaxyBackground({ children, className = '' }) {
  return (
    <div className={`relative min-h-screen w-full overflow-hidden bg-[#0a0a12] ${className}`}>
      <NightSkyBackground />
      <AppLogo />
      <div className="relative z-10 flex w-full justify-center px-4">{children}</div>
    </div>
  )
}

export default GalaxyBackground
