import { createContext, useContext, type MutableRefObject } from 'react'
import type { Object3D } from 'three'
import type { TreeShape } from '../../lib/scene-layout'

/**
 * Per-frame animation state shared by the scene components. It lives in a ref,
 * not React state: it changes every frame and must never trigger re-renders.
 * The DOM layer (SceneView) writes the targets; the scene lerps towards them.
 */
export interface SceneState {
  /** Island yaw (rad): `rotation` eases towards `rotationTarget`. */
  rotation: number
  rotationTarget: number
  /** Fractional branch level the camera is at, while a tree is active. */
  climb: number
  climbTarget: number
  /** Tree being climbed, or null while looking at the whole island. */
  activeTreeId: string | null
  islandRadius: number
  /** Trees that already sprouted; they never un-sprout. */
  revealed: Set<string>
  /** Mounted trees, so the camera can follow one. */
  trees: Map<string, { object: Object3D; shape: TreeShape }>
  reducedMotion: boolean
}

export function createSceneState(reducedMotion: boolean): SceneState {
  return {
    rotation: 0,
    rotationTarget: 0,
    climb: 0,
    climbTarget: 0,
    activeTreeId: null,
    islandRadius: 8,
    revealed: new Set(),
    trees: new Map(),
    reducedMotion,
  }
}

export const SceneStateContext = createContext<MutableRefObject<SceneState> | null>(null)

export function useSceneState(): MutableRefObject<SceneState> {
  const state = useContext(SceneStateContext)
  if (!state) throw new Error('useSceneState must be used inside the scene canvas')
  return state
}
