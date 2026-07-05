import { useEffect, useMemo, useState } from 'react'
import {
  STARS_SETTINGS_CHANGE_EVENT,
  readStarsSettings,
} from '../../config/starsBackground'
import { generateStars } from '../../utils/generateStars'

function NightSkyBackground() {
  const [settings, setSettings] = useState(() => readStarsSettings())

  useEffect(() => {
    const onSettingsChange = () => {
      setSettings(readStarsSettings())
    }

    window.addEventListener(STARS_SETTINGS_CHANGE_EVENT, onSettingsChange)
    return () => window.removeEventListener(STARS_SETTINGS_CHANGE_EVENT, onSettingsChange)
  }, [])

  const stars = useMemo(() => {
    if (!settings.enabled) return []
    return generateStars(settings.count, settings.brightness)
  }, [settings.brightness, settings.count, settings.enabled])

  return (
    <div className="night-sky" aria-hidden="true">
      <div className="night-sky-gradient" />
      {settings.enabled && (
        <div className="night-sky-stars">
          {stars.map((star) => (
            <span
              key={star.id}
              className={`night-star night-star-${star.size}${star.twinkle ? ' night-star-twinkle' : ''}`}
              style={{
                left: star.left,
                top: star.top,
                opacity: star.opacity,
                animationDelay: star.delay,
                animationDuration: star.duration,
              }}
            />
          ))}
        </div>
      )}
      <div className="night-sky-orb night-sky-orb-1" />
      <div className="night-sky-orb night-sky-orb-2" />
      <div className="night-sky-orb night-sky-orb-3" />
    </div>
  )
}

export default NightSkyBackground
