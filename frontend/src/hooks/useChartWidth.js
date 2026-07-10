import { useEffect, useState } from 'react'

export function useChartWidth(containerRef) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    if (!containerRef.current) {
      return undefined
    }

    const node = containerRef.current

    const updateWidth = () => {
      const nextWidth = Math.floor(node.getBoundingClientRect().width)
      if (nextWidth > 0) {
        setWidth(nextWidth)
      }
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(node)
    window.addEventListener('resize', updateWidth)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateWidth)
    }
  }, [containerRef])

  return width
}
