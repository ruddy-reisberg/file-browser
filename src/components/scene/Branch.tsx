import { useMemo, useRef, useState } from 'react'
import { Html, useCursor } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { DoubleSide, Shape, ShapeGeometry, type Group } from 'three'
import { BRANCH_REACH, clamp, easeOutBack, leafCategory, levelY, type BranchSlot } from '../../lib/scene-layout'
import type { TreeNode } from '../../lib/types'
import { useSceneState } from './scene-state'
import type { SceneTheme } from './useSceneTheme'

/** How far the branch tilts up from horizontal (rad). */
const BRANCH_TILT = 0.3
/** Pointer travel (px) above which a press counts as a drag, not a click. */
const CLICK_SLOP = 6

let leafGeometry: ShapeGeometry | null = null

/** One shared leaf outline for every branch tip (tip points along +Y). */
function getLeafGeometry(): ShapeGeometry {
  if (!leafGeometry) {
    const shape = new Shape()
    shape.moveTo(0, 0)
    shape.bezierCurveTo(0.45, 0.25, 0.45, 0.85, 0, 1.3)
    shape.bezierCurveTo(-0.45, 0.85, -0.45, 0.25, 0, 0)
    leafGeometry = new ShapeGeometry(shape, 8)
  }
  return leafGeometry
}

interface BranchProps {
  node: TreeNode
  slot: BranchSlot
  trunkRadius: number
  theme: SceneTheme
  /** Name labels are only mounted near the camera: hundreds of DOM labels would be slow. */
  showLabel: boolean
  /** Seconds to wait after the tree is entered before this branch grows. */
  growDelay: number
  onPick: (node: TreeNode) => void
}

/** A file (leaf at the tip) or a sub-folder (little crown at the tip) hanging off a tree. */
export default function Branch({ node, slot, trunkRadius, theme, showLabel, growDelay, onPick }: BranchProps) {
  const stateRef = useSceneState()
  const groupRef = useRef<Group>(null)
  const swayRef = useRef<Group>(null)
  const age = useRef(0)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  const isFolder = node.kind === 'dir'
  const length = trunkRadius + BRANCH_REACH
  const radius = isFolder ? 0.13 : 0.09
  const tip: [number, number, number] = [0, length * Math.sin(BRANCH_TILT), length * Math.cos(BRANCH_TILT)]
  const phase = useMemo(() => (slot.level * 1.7 + slot.angle) % (Math.PI * 2), [slot])

  const leafColor = isFolder
    ? theme.colors.leafFolder
    : { image: theme.colors.leafImage, pdf: theme.colors.leafPdf, other: theme.colors.leafOther }[leafCategory(node.file)]

  useFrame((frame, dt) => {
    const group = groupRef.current
    if (!group) return
    age.current += Math.min(dt, 0.05)
    const reduced = stateRef.current.reducedMotion
    const grown = reduced ? 1 : easeOutBack(clamp((age.current - growDelay) / 0.8, 0, 1))
    group.scale.setScalar(Math.max(grown, 0.0001))

    const sway = swayRef.current
    if (sway) {
      const target = hovered ? 1.35 : 1
      sway.scale.setScalar(sway.scale.x + (target - sway.scale.x) * Math.min(1, dt * 10))
      sway.rotation.z = reduced ? 0 : Math.sin(frame.clock.elapsedTime * 1.4 + phase) * 0.07
    }
  })

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation()
    if (event.delta > CLICK_SLOP) return
    onPick(node)
  }

  return (
    <group ref={groupRef} position={[0, levelY(slot.level), 0]} rotation={[0, slot.angle, 0]} scale={0.0001}>
      <group rotation={[Math.PI / 2 - BRANCH_TILT, 0, 0]}>
        <mesh position={[0, length / 2, 0]} castShadow>
          <cylinderGeometry args={[radius * 0.55, radius, length, 8]} />
          <meshStandardMaterial color={theme.colors.branch} flatShading />
        </mesh>
      </group>

      <group ref={swayRef} position={tip}>
        {isFolder ? (
          <mesh position={[0, 0.25, 0]} castShadow>
            <icosahedronGeometry args={[0.5, 0]} />
            <meshStandardMaterial
              color={leafColor}
              flatShading
              emissive={leafColor}
              emissiveIntensity={hovered ? 0.5 : 0.1}
            />
          </mesh>
        ) : (
          [-0.9, 0, 0.9].map((yaw) => (
            <group key={yaw} rotation={[0, yaw, 0]}>
              <mesh
                geometry={getLeafGeometry()}
                rotation={[Math.PI / 2 - 0.55, 0, 0]}
                scale={yaw === 0 ? 0.6 : 0.46}
                castShadow
              >
                <meshStandardMaterial
                  color={leafColor}
                  side={DoubleSide}
                  emissive={leafColor}
                  emissiveIntensity={hovered ? 0.55 : 0.12}
                />
              </mesh>
            </group>
          ))
        )}
      </group>

      {/* Generous invisible hit area: the leaves themselves are small targets. */}
      <mesh
        visible={false}
        position={[tip[0], tip[1] + 0.1, tip[2] * 0.85]}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.95, 12, 8]} />
        <meshBasicMaterial />
      </mesh>

      {showLabel && (
        <Html position={[tip[0], tip[1] + 1.0, tip[2]]} center distanceFactor={7} zIndexRange={[30, 0]}>
          <div
            className={[
              'scene-label',
              'scene-label--branch',
              isFolder ? 'scene-label--folder' : '',
              hovered ? 'scene-label--hover' : '',
            ].join(' ')}
          >
            {isFolder ? '▸ ' : ''}
            {node.name}
          </div>
        </Html>
      )}
    </group>
  )
}
