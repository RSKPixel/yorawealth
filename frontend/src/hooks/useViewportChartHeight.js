import { useCallback, useEffect, useState } from 'react'

const DEFAULT_MIN_HEIGHT = 240
const DEFAULT_BOTTOM_GAP = 24

function measureChartHeight(node, minHeight, bottomGap) {
  const shellMain = node.closest('.shell-main')

  if (!shellMain) {
    const top = node.getBoundingClientRect().top
    return Math.max(minHeight, Math.floor(window.innerHeight - top - bottomGap))
  }

  const shellRect = shellMain.getBoundingClientRect()
  const nodeRect = node.getBoundingClientRect()
  const contentOffset = nodeRect.top - shellRect.top + shellMain.scrollTop
  const available = shellMain.clientHeight - contentOffset - bottomGap

  return Math.max(minHeight, Math.floor(available))
}

export function useViewportChartHeight({
  minHeight = DEFAULT_MIN_HEIGHT,
  bottomGap = DEFAULT_BOTTOM_GAP,
  layoutKey,
} = {}) {
  const [node, setNode] = useState(null)
  const [height, setHeight] = useState(minHeight)

  const ref = useCallback((element) => {
    setNode(element)
  }, [])

  useEffect(() => {
    if (!node) {
      return undefined
    }

    const updateHeight = () => {
      setHeight(measureChartHeight(node, minHeight, bottomGap))
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)

    const observer = new ResizeObserver(updateHeight)
    observer.observe(node)

    const section = node.closest('.mf-section-portfolio-charts')
    if (section) {
      observer.observe(section)
    }

    const shellMain = node.closest('.shell-main')
    if (shellMain) {
      observer.observe(shellMain)
    }

    return () => {
      window.removeEventListener('resize', updateHeight)
      observer.disconnect()
    }
  }, [node, minHeight, bottomGap, layoutKey])

  return [ref, height]
}
