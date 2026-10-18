import type { MutableRefObject } from 'react'
import { Canvas } from '@react-three/fiber'
import { PCFSoftShadowMap } from 'three'
import { islandRadius, type TreeSpec } from '../../lib/scene-layout'
import type { TreeNode } from '../../lib/types'
import Atmosphere from './Atmosphere'
import CameraRig from './CameraRig'
import Island from './Island'
import { SceneStateContext, type SceneState } from './scene-state'
import { useSceneTheme } from './useSceneTheme'

interface SceneCanvasProps {
  dir: TreeNode
  trees: TreeSpec[]
  stateRef: MutableRefObject<SceneState>
  activeTreeId: string | null
  onSelectTree: (id: string) => void
  onPickBranch: (node: TreeNode) => void
}

/** The WebGL layer. Pure rendering: all input arrives through `stateRef` and the callbacks. */
export default function SceneCanvas({ dir, trees, stateRef, activeTreeId, onSelectTree, onPickBranch }: SceneCanvasProps) {
  const theme = useSceneTheme()
  const radius = islandRadius(trees.length)

  return (
    <Canvas
      shadows={{ type: PCFSoftShadowMap }}
      dpr={[1, 2]}
      camera={{ fov: 45, near: 0.1, far: 400, position: [0, 12, 20] }}
      gl={{ antialias: true, alpha: true }}
    >
      <SceneStateContext.Provider value={stateRef}>
        <hemisphereLight args={[theme.colors.skyTop, theme.colors.soil, theme.ambient]} />
        <ambientLight intensity={theme.ambient * 0.25} />
        <Island
          key={dir.path}
          dir={dir}
          trees={trees}
          theme={theme}
          activeTreeId={activeTreeId}
          onSelectTree={onSelectTree}
          onPickBranch={onPickBranch}
        />
        <Atmosphere theme={theme} radius={radius} />
        <CameraRig />
      </SceneStateContext.Provider>
    </Canvas>
  )
}
