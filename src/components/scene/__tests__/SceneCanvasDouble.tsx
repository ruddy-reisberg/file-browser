import { useEffect, type MutableRefObject } from 'react'
import type { Object3D } from 'three'
import { shapeTree, type TreeSpec } from '../../../lib/scene-layout'
import type { SceneState } from '../scene-state'

interface DoubleProps {
  trees: TreeSpec[]
  stateRef: MutableRefObject<SceneState>
}

/** Stand-in for SceneCanvas (no WebGL in jsdom): registers the trees so SceneView can climb them. */
export default function SceneCanvasDouble({ trees, stateRef }: DoubleProps) {
  useEffect(() => {
    const state = stateRef.current
    for (const tree of trees) {
      state.trees.set(tree.id, {
        object: { rotation: { y: 0 } } as unknown as Object3D,
        shape: shapeTree(tree.branches.length),
      })
    }
  }, [trees, stateRef])
  return null
}
