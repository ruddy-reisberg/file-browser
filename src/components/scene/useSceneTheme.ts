import { useEffect, useState } from 'react'
import { Color } from 'three'

const COLOR_TOKENS = {
  skyTop: '--scene-sky-top',
  grass: '--scene-grass',
  grassDark: '--scene-grass-dark',
  soil: '--scene-soil',
  rock: '--scene-rock',
  trunk: '--scene-trunk',
  branch: '--scene-branch',
  foliage: '--scene-foliage',
  foliageAlt: '--scene-foliage-alt',
  cloud: '--scene-cloud',
  sparkle: '--scene-sparkle',
  flower: '--scene-flower',
  leafImage: '--scene-leaf-image',
  leafPdf: '--scene-leaf-pdf',
  leafAudio: '--scene-leaf-audio',
  leafVideo: '--scene-leaf-video',
  leafOther: '--scene-leaf-other',
  leafFolder: '--scene-leaf-folder',
} as const

export type SceneColors = Record<keyof typeof COLOR_TOKENS, Color>

export interface SceneTheme {
  colors: SceneColors
  ambient: number
  sun: number
}

function readTheme(): SceneTheme {
  const style = getComputedStyle(document.documentElement)
  const read = (name: string) => style.getPropertyValue(name).trim()

  const colors = {} as SceneColors
  for (const key of Object.keys(COLOR_TOKENS) as (keyof typeof COLOR_TOKENS)[]) {
    colors[key] = new Color(read(COLOR_TOKENS[key]) || '#ff00ff')
  }
  return {
    colors,
    ambient: parseFloat(read('--scene-ambient')) || 1,
    sun: parseFloat(read('--scene-sun')) || 2,
  }
}

/**
 * The 3D scene's palette, read from the CSS tokens (tokens.css stays the single
 * source of truth for design values) and refreshed when the OS switches between
 * light and dark mode.
 */
export function useSceneTheme(): SceneTheme {
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const refresh = () => setTheme(readTheme())
    media.addEventListener('change', refresh)
    return () => media.removeEventListener('change', refresh)
  }, [])

  return theme
}
