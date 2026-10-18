import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { climbPose, damp, islandPose } from '../../lib/scene-layout'
import { useSceneState } from './scene-state'

/**
 * Owns the camera: overview of the island by default, and, once a tree is
 * active, a spiral climb up its trunk. The camera never jumps; it eases
 * towards the pose it should have, which is what makes the "climb" feel physical.
 */
export default function CameraRig() {
  const stateRef = useSceneState()
  const size = useThree((s) => s.size)
  const look = useRef(new Vector3(0, 1, 0))
  const scratch = useRef({ position: new Vector3(), lookAt: new Vector3() })

  useFrame((frame, dt) => {
    const state = stateRef.current
    const { camera } = frame
    const step = Math.min(dt, 0.05)
    const reduced = state.reducedMotion
    const { position, lookAt } = scratch.current

    const tree = state.activeTreeId ? state.trees.get(state.activeTreeId) : undefined
    if (tree) {
      state.climb = damp(state.climb, state.climbTarget, reduced ? 40 : 3.2, step)
      const pose = climbPose(tree.shape, state.climb)
      // Tree-local pose -> world, through the island's current turn and the tree's current scale.
      tree.object.updateWorldMatrix(true, false)
      position.set(pose.position.x, pose.position.y, pose.position.z).applyMatrix4(tree.object.matrixWorld)
      lookAt.set(pose.lookAt.x, pose.lookAt.y, pose.lookAt.z).applyMatrix4(tree.object.matrixWorld)
    } else {
      const pose = islandPose(state.islandRadius, size.width / Math.max(size.height, 1))
      position.set(pose.position.x, pose.position.y, pose.position.z)
      lookAt.set(pose.lookAt.x, pose.lookAt.y, pose.lookAt.z)
    }

    const k = reduced ? 40 : tree ? 3.4 : 2.6
    camera.position.set(
      damp(camera.position.x, position.x, k, step),
      damp(camera.position.y, position.y, k, step),
      damp(camera.position.z, position.z, k, step),
    )
    look.current.set(
      damp(look.current.x, lookAt.x, k, step),
      damp(look.current.y, lookAt.y, k, step),
      damp(look.current.z, lookAt.z, k, step),
    )
    camera.lookAt(look.current)
  })

  return null
}
