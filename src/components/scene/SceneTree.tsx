import { useEffect, useRef, useState } from 'react'
import { Html, useCursor } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import type { Group } from 'three'
import {
  clamp,
  damp,
  easeOutBack,
  isInRevealArc,
  lerp,
  smoothstep,
  type TreePlacement,
  type TreeShape,
  type TreeSpec,
} from '../../lib/scene-layout'
import type { TreeNode } from '../../lib/types'
import Branch from './Branch'
import { useSceneState } from './scene-state'
import type { SceneTheme } from './useSceneTheme'

/** Seconds a tree takes to sprout once it enters the reveal arc. */
const SPROUT_SECONDS = 1.1
/** Branch labels are mounted for this many levels around the camera. */
const LABEL_WINDOW = 3
/** Pointer travel (px) above which a press counts as a drag, not a click. */
const CLICK_SLOP = 6

interface SceneTreeProps {
  spec: TreeSpec
  shape: TreeShape
  placement: TreePlacement
  theme: SceneTheme
  /** This is the tree being climbed. */
  active: boolean
  /** Some tree is being climbed (so island-level interaction is off). */
  climbing: boolean
  onSelect: (id: string) => void
  onPickBranch: (node: TreeNode) => void
}

/** A folder: sprouts when the island turns it into view, and can be climbed. */
export default function SceneTree({
  spec,
  shape,
  placement,
  theme,
  active,
  climbing,
  onSelect,
  onPickBranch,
}: SceneTreeProps) {
  const stateRef = useSceneState()
  const groupRef = useRef<Group>(null)
  const crownRef = useRef<Group>(null)
  const grow = useRef(0)
  const zoom = useRef(0)
  const focusLevelRef = useRef(0)
  const [sprouted, setSprouted] = useState(false)
  const [branchesMounted, setBranchesMounted] = useState(false)
  const [focusLevel, setFocusLevel] = useState(0)
  const [hovered, setHovered] = useState(false)
  const canSelect = !climbing
  useCursor(hovered && canSelect)

  // The camera follows this tree while it is the active one.
  useEffect(() => {
    const object = groupRef.current
    if (!object) return
    const trees = stateRef.current.trees
    trees.set(spec.id, { object, shape })
    return () => {
      trees.delete(spec.id)
    }
  }, [spec.id, shape, stateRef])

  useEffect(() => {
    if (active) {
      focusLevelRef.current = 0
      setFocusLevel(0)
      setBranchesMounted(true)
    }
  }, [active])

  useFrame((frame, dt) => {
    const group = groupRef.current
    if (!group) return
    const step = Math.min(dt, 0.05)
    const state = stateRef.current
    const reduced = state.reducedMotion

    if (!state.revealed.has(spec.id) && isInRevealArc(placement.angle, state.rotation)) {
      state.revealed.add(spec.id)
    }
    const revealed = state.revealed.has(spec.id)
    grow.current = reduced
      ? revealed ? 1 : 0
      : clamp(grow.current + (revealed ? step / SPROUT_SECONDS : 0), 0, 1)
    zoom.current = damp(zoom.current, active ? 1 : 0, reduced ? 40 : 3, step)

    const scale = lerp(shape.islandScale, 1, smoothstep(zoom.current)) * easeOutBack(grow.current)
    group.scale.setScalar(Math.max(scale, 0.0001))
    group.visible = grow.current > 0.003

    if (grow.current > 0.85 && !sprouted) setSprouted(true)
    if (!active && zoom.current < 0.02 && branchesMounted) setBranchesMounted(false)

    if (active) {
      const level = clamp(Math.round(state.climb), 0, Math.max(shape.levels - 1, 0))
      if (level !== focusLevelRef.current) {
        focusLevelRef.current = level
        setFocusLevel(level)
      }
    }

    const crown = crownRef.current
    if (crown && !reduced) crown.rotation.z = Math.sin(frame.clock.elapsedTime * 0.9 + placement.angle) * 0.025
  })

  function handleClick(event: ThreeEvent<MouseEvent>) {
    if (!canSelect) return
    event.stopPropagation()
    if (event.delta > CLICK_SLOP) return
    onSelect(spec.id)
  }

  const trunkHeight = shape.height - 0.6
  const crownColor = spec.loose ? theme.colors.flower : theme.colors.foliage
  const crownAltColor = spec.loose ? theme.colors.flower : theme.colors.foliageAlt
  const glow = hovered && canSelect ? 0.35 : 0
  const crownY = shape.height - 0.3
  const r = shape.crownRadius

  return (
    <group ref={groupRef} position={[placement.x, 0, placement.z]} rotation={[0, placement.angle, 0]} scale={0.0001} visible={false}>
      <mesh position={[0, trunkHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[shape.trunkRadius * 0.65, shape.trunkRadius * 1.2, trunkHeight, 9]} />
        <meshStandardMaterial color={theme.colors.trunk} flatShading />
      </mesh>

      <group ref={crownRef} position={[0, crownY, 0]}>
        <mesh castShadow>
          <icosahedronGeometry args={[r, 1]} />
          <meshStandardMaterial color={crownColor} flatShading emissive={crownColor} emissiveIntensity={glow} />
        </mesh>
        <mesh position={[r * 0.55, -r * 0.3, r * 0.2]} castShadow>
          <icosahedronGeometry args={[r * 0.68, 1]} />
          <meshStandardMaterial color={crownAltColor} flatShading emissive={crownAltColor} emissiveIntensity={glow} />
        </mesh>
        <mesh position={[-r * 0.5, -r * 0.2, -r * 0.3]} castShadow>
          <icosahedronGeometry args={[r * 0.6, 1]} />
          <meshStandardMaterial color={crownAltColor} flatShading emissive={crownAltColor} emissiveIntensity={glow} />
        </mesh>
      </group>

      {/* Island-level hit area. */}
      <mesh
        visible={false}
        position={[0, shape.height / 2 + 0.3, 0]}
        onClick={handleClick}
        onPointerOver={(e) => {
          if (!canSelect) return
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
      >
        <cylinderGeometry args={[Math.max(r, 1.2), Math.max(r, 1.2), shape.height + 1.2, 10]} />
        <meshBasicMaterial />
      </mesh>

      {branchesMounted &&
        spec.branches.map((node, i) => {
          const slot = shape.slots[i]
          return (
            <Branch
              key={node.path}
              node={node}
              slot={slot}
              trunkRadius={shape.trunkRadius}
              theme={theme}
              showLabel={active && Math.abs(slot.level - focusLevel) <= LABEL_WINDOW}
              growDelay={0.35 + slot.level * 0.06}
              onPick={onPickBranch}
            />
          )
        })}

      {sprouted && !climbing && (
        <Html position={[0, shape.height + r * 0.9, 0]} center zIndexRange={[20, 0]}>
          <div className={`scene-label scene-label--tree${hovered ? ' scene-label--hover' : ''}`}>
            <span className="scene-label__name">{spec.label}</span>
            <span className="scene-label__meta">
              {spec.branches.length} item{spec.branches.length === 1 ? '' : 's'}
            </span>
          </div>
        </Html>
      )}
    </group>
  )
}
