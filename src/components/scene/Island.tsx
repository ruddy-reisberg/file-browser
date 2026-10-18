import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { CylinderGeometry, Object3D, type Group, type InstancedMesh } from 'three'
import {
  createRng,
  damp,
  hashString,
  initialIslandRotation,
  islandRadius,
  layoutTrees,
  positionNoise,
  scatterDecor,
  shapeTree,
  type DecorSpot,
  type TreeSpec,
} from '../../lib/scene-layout'
import type { TreeNode } from '../../lib/types'
import { useSceneState } from './scene-state'
import SceneTree from './SceneTree'
import type { SceneTheme } from './useSceneTheme'

const GROUND_THICKNESS = 0.6

/** Low-poly underside of the floating island: a jagged inverted cone of soil and rock. */
function buildSoilGeometry(radius: number): CylinderGeometry {
  const depth = radius * 0.8
  const geometry = new CylinderGeometry(radius * 0.98, radius * 0.16, depth, 28, 5)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    // Noise depends on the position only, so the cylinder's duplicated seam vertices stay welded.
    const n = positionNoise(x, y, z)
    const isTop = y > depth / 2 - 0.001
    const wobble = isTop ? 1 : 1 + n * 0.14
    position.setXYZ(i, x * wobble, y + (isTop ? 0 : n * radius * 0.05), z * wobble)
  }
  geometry.computeVertexNormals()
  return geometry
}

interface IslandProps {
  dir: TreeNode
  trees: TreeSpec[]
  theme: SceneTheme
  activeTreeId: string | null
  onSelectTree: (id: string) => void
  onPickBranch: (node: TreeNode) => void
}

/** The folder being browsed: a floating island that turns with the scroll and grows one tree per sub-folder. */
export default function Island({ dir, trees, theme, activeTreeId, onSelectTree, onPickBranch }: IslandProps) {
  const stateRef = useSceneState()
  const bobRef = useRef<Group>(null)
  const turnRef = useRef<Group>(null)

  const radius = useMemo(() => islandRadius(trees.length), [trees.length])
  const placements = useMemo(() => layoutTrees(trees.length, radius), [trees.length, radius])
  const shapes = useMemo(() => trees.map((tree) => shapeTree(tree.branches.length)), [trees])
  const soil = useMemo(() => buildSoilGeometry(radius), [radius])
  const decor = useMemo(
    () => scatterDecor(Math.round(radius * 7), radius, placements, createRng(hashString(dir.path || dir.name))),
    [radius, placements, dir.path, dir.name],
  )

  // Start with the first tree in front of the camera so the island never opens empty.
  useLayoutEffect(() => {
    const state = stateRef.current
    const start = initialIslandRotation(placements)
    state.rotation = start
    state.rotationTarget = start
    state.islandRadius = radius
    state.revealed.clear()
    if (turnRef.current) turnRef.current.rotation.y = start
  }, [placements, radius, stateRef])

  useFrame((frame, dt) => {
    const state = stateRef.current
    state.rotation = damp(state.rotation, state.rotationTarget, state.reducedMotion ? 40 : 4.5, Math.min(dt, 0.05))
    if (turnRef.current) turnRef.current.rotation.y = state.rotation
    if (bobRef.current && !state.reducedMotion) {
      bobRef.current.position.y = Math.sin(frame.clock.elapsedTime * 0.6) * 0.12
    }
  })

  return (
    <group ref={bobRef}>
      <directionalLight
        position={[radius * 0.6, radius * 1.1 + 6, radius * 0.5]}
        intensity={theme.sun}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-radius * 1.3}
        shadow-camera-right={radius * 1.3}
        shadow-camera-top={radius * 1.3}
        shadow-camera-bottom={-radius * 1.3}
        shadow-camera-near={1}
        shadow-camera-far={radius * 4 + 30}
        shadow-bias={-0.0005}
      />

      <group ref={turnRef}>
        <mesh position={[0, -GROUND_THICKNESS / 2, 0]} receiveShadow>
          <cylinderGeometry args={[radius, radius * 0.98, GROUND_THICKNESS, 56]} />
          <meshStandardMaterial color={theme.colors.grass} flatShading />
        </mesh>
        <mesh geometry={soil} position={[0, -GROUND_THICKNESS - (radius * 0.8) / 2 + 0.05, 0]} receiveShadow>
          <meshStandardMaterial color={theme.colors.soil} flatShading />
        </mesh>

        <Decor spots={decor} theme={theme} />

        {trees.map((tree, i) => (
          <SceneTree
            key={tree.id}
            spec={tree}
            shape={shapes[i]}
            placement={placements[i]}
            theme={theme}
            active={activeTreeId === tree.id}
            climbing={activeTreeId !== null}
            onSelect={onSelectTree}
            onPickBranch={onPickBranch}
          />
        ))}
      </group>
    </group>
  )
}

/** Pebbles, grass tufts and flowers scattered between the trees (3 instanced meshes). */
function Decor({ spots, theme }: { spots: DecorSpot[]; theme: SceneTheme }) {
  const pebbles = useMemo(() => spots.filter((_, i) => i % 3 === 0), [spots])
  const tufts = useMemo(() => spots.filter((_, i) => i % 3 === 1), [spots])
  const flowers = useMemo(() => spots.filter((_, i) => i % 3 === 2), [spots])

  return (
    <>
      <Scattered spots={pebbles} lift={0.06} scale={0.18}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={theme.colors.rock} flatShading />
      </Scattered>
      <Scattered spots={tufts} lift={0.17} scale={0.22}>
        <coneGeometry args={[0.6, 1.6, 5]} />
        <meshStandardMaterial color={theme.colors.grassDark} flatShading />
      </Scattered>
      <Scattered spots={flowers} lift={0.2} scale={0.12}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={theme.colors.flower} flatShading emissive={theme.colors.flower} emissiveIntensity={0.25} />
      </Scattered>
    </>
  )
}

function Scattered({
  spots,
  lift,
  scale,
  children,
}: {
  spots: DecorSpot[]
  lift: number
  scale: number
  children: ReactNode
}) {
  const ref = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    spots.forEach((spot, i) => {
      dummy.position.set(spot.x, lift * spot.scale, spot.z)
      dummy.rotation.set(0, spot.x * 3.1 + spot.z * 1.7, 0)
      dummy.scale.setScalar(scale * spot.scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [spots, lift, scale])

  if (spots.length === 0) return null
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, spots.length]} receiveShadow>
      {children}
    </instancedMesh>
  )
}
