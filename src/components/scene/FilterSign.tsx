import { useRef, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react'
import { Html } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3, type Group } from 'three'
import type { SceneTheme } from './useSceneTheme'
import './FilterSign.css'

/** Distance (world units) in front of the camera, and gap kept to the right edge of the screen. */
const SIGN_DISTANCE = 6
const EDGE_GAP = 0.25
const SIGN_WIDTH = 1.7
const SIGN_HEIGHT = 1.1
const POST_HEIGHT = 1.5

interface FilterSignProps {
  theme: SceneTheme
  query: string
  onQueryChange: (query: string) => void
  /** How many files match, for the counter on the board. */
  matchCount: number
}

/** The scene owns wheel, drag and arrow keys: the board's input must keep them to itself. */
function keepLocal(event: PointerEvent | WheelEvent | KeyboardEvent) {
  event.stopPropagation()
}

/**
 * A signpost that stays fixed at the right of the screen whatever the camera
 * does. Its board is real 3D geometry; the text field sits on the board.
 */
export default function FilterSign({ theme, query, onQueryChange, matchCount }: FilterSignProps) {
  const groupRef = useRef<Group>(null)
  const size = useThree((s) => s.size)
  const scratch = useRef(new Vector3())

  useFrame(({ camera }) => {
    const group = groupRef.current
    if (!group) return
    const aspect = size.width / Math.max(size.height, 1)
    const halfHeight = Math.tan((((camera as { fov?: number }).fov ?? 45) * Math.PI) / 360) * SIGN_DISTANCE
    const x = halfHeight * aspect - SIGN_WIDTH / 2 - EDGE_GAP
    group.position.copy(scratch.current.set(x, -0.2, -SIGN_DISTANCE).applyMatrix4(camera.matrixWorld))
    group.quaternion.copy(camera.quaternion)
  })

  return (
    <group ref={groupRef}>
      {/* Post */}
      <mesh position={[0, -POST_HEIGHT / 2 - SIGN_HEIGHT / 2 + 0.1, -0.08]}>
        <boxGeometry args={[0.16, POST_HEIGHT, 0.16]} />
        <meshStandardMaterial color={theme.colors.trunk} flatShading />
      </mesh>
      {/* Board */}
      <mesh castShadow>
        <boxGeometry args={[SIGN_WIDTH, SIGN_HEIGHT, 0.14]} />
        <meshStandardMaterial color={theme.colors.branch} flatShading />
      </mesh>
      <Html transform occlude={false} position={[0, 0, 0.09]} scale={0.4} zIndexRange={[40, 0]}>
        <div
          className="filter-sign"
          onPointerDown={keepLocal}
          onPointerMove={keepLocal}
          onWheel={keepLocal}
          onKeyDown={keepLocal}
        >
          <label className="filter-sign__label" htmlFor="filter-sign-input">
            Filter by name
          </label>
          <input
            id="filter-sign-input"
            className="filter-sign__input"
            type="search"
            placeholder="e.g. report"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <p className="filter-sign__count" aria-live="polite">
            {query.trim() === '' ? 'Showing everything' : `${matchCount} file${matchCount === 1 ? '' : 's'} match`}
          </p>
        </div>
      </Html>
    </group>
  )
}
