import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react'
import {
  MIN_CLIMB,
  buildIslandTrees,
  clamp,
  normalizeAngle,
  rotationToFace,
  shapeTree,
} from '../../lib/scene-layout'
import { countFiles, filterTree } from '../../lib/filter'
import type { TreeNode } from '../../lib/types'
import { prefersReducedMotion } from '../../lib/webgl'
import DetailPane from '../DetailPane'
import Leaf from './Leaf'
import SceneCanvas from './SceneCanvas'
import { createSceneState, type SceneState } from './scene-state'
import './SceneView.css'

/** Island turn (rad) per scrolled pixel, and climb (levels) per scrolled pixel. */
const TURN_PER_PX = 0.004
const CLIMB_PER_PX = 0.006
const DRAG_TURN_PER_PX = 0.008
const DRAG_CLIMB_PER_PX = 0.02
const KEY_STEP_PX = 120

interface SceneViewProps {
  /** The folder the user picked; the first island. */
  root: TreeNode
  /** Mirrors what the user picks to the rest of the app. */
  onSelect: (node: TreeNode) => void
  /** The app's selected node; the Leaf renders from it. */
  selected: TreeNode | null
  /** Name filter, owned by App so the list view shares it. */
  query: string
  onQueryChange: (query: string) => void
  emptyMessage?: string
}

function wheelPixels(event: WheelEvent): number {
  if (event.deltaMode === 1) return event.deltaY * 16
  if (event.deltaMode === 2) return event.deltaY * 400
  return event.deltaY
}

/**
 * The 3D file browser. A folder is an Island, its sub-folders are Trees, a
 * tree's entries are Branches, and a file's metadata opens as a Leaf.
 * This component is the DOM layer: navigation state, input, HUD and the Leaf.
 */
export default function SceneView({ root, onSelect, selected, query, onQueryChange, emptyMessage }: SceneViewProps) {
  const [stateRef] = useState<{ current: SceneState }>(() => ({ current: createSceneState(prefersReducedMotion()) }))
  const [stack, setStack] = useState<TreeNode[]>([root])
  const [activeTreeId, setActiveTreeId] = useState<string | null>(null)
  const [leafOpen, setLeafOpen] = useState(false)
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  const current = stack[stack.length - 1]
  const visible = useMemo(() => filterTree(current, query), [current, query])
  const matchCount = useMemo(() => (query.trim() === '' ? 0 : countFiles(visible)), [visible, query])
  const trees = useMemo(() => buildIslandTrees(visible), [visible])
  const activeTree = trees.find((tree) => tree.id === activeTreeId) ?? null

  const levelsOf = useCallback((id: string | null) => {
    const tree = trees.find((t) => t.id === id)
    return tree ? shapeTree(tree.branches.length).levels : 0
  }, [trees])

  const setActive = useCallback((id: string | null) => {
    stateRef.current.activeTreeId = id
    setActiveTreeId(id)
  }, [stateRef])

  const selectTree = useCallback(
    (id: string) => {
      const state = stateRef.current
      const tree = state.trees.get(id)
      const spec = trees.find((t) => t.id === id)
      if (!tree || !spec) return
      state.revealed.add(id)
      // Turn the island so the tree faces us, then start the climb from the ground.
      state.rotationTarget = rotationToFace(normalizeAngle(tree.object.rotation.y), state.rotation)
      state.climb = MIN_CLIMB
      state.climbTarget = 0
      setActive(id)
      onSelect(spec.dir)
    },
    [stateRef, trees, setActive, onSelect],
  )

  const exitTree = useCallback(() => setActive(null), [setActive])

  // Filtering rebuilds the trees, so a tree being climbed may vanish: come back down first.
  const changeQuery = useCallback(
    (next: string) => {
      setActive(null)
      onQueryChange(next)
    },
    [setActive, onQueryChange],
  )

  const enterFolder = useCallback(
    (node: TreeNode) => {
      setActive(null)
      setStack((prev) => [...prev, node])
      onSelect(node)
    },
    [setActive, onSelect],
  )

  const goToLevel = useCallback(
    (index: number) => {
      setActive(null)
      setStack((prev) => prev.slice(0, index + 1))
    },
    [setActive],
  )

  const pickBranch = useCallback(
    (node: TreeNode) => {
      if (node.kind === 'dir') {
        enterFolder(node)
        return
      }
      const state = stateRef.current
      if (activeTree) {
        // Centre the camera on the branch that was picked.
        const index = activeTree.branches.findIndex((b) => b.path === node.path)
        const shape = shapeTree(activeTree.branches.length)
        if (index >= 0) state.climbTarget = shape.slots[index].level
      }
      setLeafOpen(true)
      onSelect(node)
    },
    [activeTree, enterFolder, onSelect, stateRef],
  )

  /** One unit of navigation input (pixels of scroll/drag): turns the island, or climbs the tree. */
  const navigate = useCallback(
    (turnPx: number, climbPx: number) => {
      const state = stateRef.current
      if (state.activeTreeId) {
        const top = Math.max(levelsOf(state.activeTreeId) - 1, 0)
        state.climbTarget = clamp(state.climbTarget + climbPx, 0, top)
      } else {
        state.rotationTarget += turnPx
      }
    },
    [stateRef, levelsOf],
  )

  function goBack() {
    if (activeTreeId) exitTree()
    else if (stack.length > 1) goToLevel(stack.length - 2)
  }

  function handleWheel(event: WheelEvent) {
    const px = wheelPixels(event)
    navigate(px * TURN_PER_PX, px * CLIMB_PER_PX)
  }

  function handlePointerDown(event: PointerEvent) {
    drag.current = { x: event.clientX, y: event.clientY, moved: false }
  }

  function handlePointerMove(event: PointerEvent) {
    const start = drag.current
    if (!start || event.buttons === 0) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (!start.moved && Math.hypot(dx, dy) < 4) return
    start.moved = true
    start.x = event.clientX
    start.y = event.clientY
    // Dragging the scene to the right turns it right; dragging up climbs.
    navigate(dx * DRAG_TURN_PER_PX, -dy * DRAG_CLIMB_PER_PX)
  }

  function handlePointerEnd() {
    drag.current = null
  }

  function handleStageKeyDown(event: KeyboardEvent) {
    const keys: Record<string, [number, number]> = {
      ArrowRight: [KEY_STEP_PX, KEY_STEP_PX],
      ArrowDown: [KEY_STEP_PX, KEY_STEP_PX],
      PageDown: [KEY_STEP_PX, KEY_STEP_PX],
      ArrowLeft: [-KEY_STEP_PX, -KEY_STEP_PX],
      ArrowUp: [-KEY_STEP_PX, -KEY_STEP_PX],
      PageUp: [-KEY_STEP_PX, -KEY_STEP_PX],
    }
    const step = keys[event.key]
    if (!step) return
    event.preventDefault()
    navigate(step[0] * TURN_PER_PX, step[1] * CLIMB_PER_PX)
  }

  // The Leaf shows only for a selected file; a stale flag over a folder must not swallow Escape.
  const leafVisible = leafOpen && selected?.kind === 'file'

  // Escape steps back one level: leaf (handled by the Leaf itself) -> tree -> parent folder.
  function handleRootKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape' || leafVisible) return
    goBack()
  }

  const isEmpty = trees.length === 0
  const crumbs = stack.map((node, i) => ({ node, i, label: i === 0 ? node.name || 'Folder' : node.name }))

  return (
    <div className="scene" onKeyDown={handleRootKeyDown}>
      <div
        className="scene__stage"
        tabIndex={0}
        role="application"
        aria-label="3D folder view. Scroll or use the arrow keys to turn the island or climb a tree. A list of the same items is available with Tab."
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
        onKeyDown={handleStageKeyDown}
      >
        <SceneCanvas
          dir={current}
          trees={trees}
          stateRef={stateRef}
          activeTreeId={activeTreeId}
          onSelectTree={selectTree}
          onPickBranch={pickBranch}
          query={query}
          onQueryChange={changeQuery}
          matchCount={matchCount}
        />
      </div>

      <div className="scene__hud">
        <nav className="scene__crumbs" aria-label="Location">
          {crumbs.map(({ node, i, label }) => {
            const isLast = i === crumbs.length - 1 && !activeTree
            return (
              <span key={node.path || 'root'} className="scene__crumb">
                {i > 0 && <span className="scene__crumb-sep" aria-hidden="true">›</span>}
                {isLast ? (
                  <span className="scene__crumb-current">{label}</span>
                ) : (
                  <button type="button" className="scene__crumb-button" onClick={() => goToLevel(i)}>
                    {label}
                  </button>
                )}
              </span>
            )
          })}
          {activeTree && (
            <span className="scene__crumb">
              <span className="scene__crumb-sep" aria-hidden="true">›</span>
              <span className="scene__crumb-current">{activeTree.label}</span>
            </span>
          )}
        </nav>

        {(activeTree || stack.length > 1) && (
          <button type="button" className="scene__back" onClick={goBack}>
            ↩ {activeTree ? 'Back to island' : 'Up one folder'}
          </button>
        )}
      </div>

      {isEmpty && (
        <p className="scene__empty">
          {query.trim() !== '' ? 'No file or folder matches this filter.' : (emptyMessage ?? 'This folder has nothing in it yet.')}
        </p>
      )}

      <p className="scene__hint" aria-hidden="true">
        {activeTree
          ? 'Scroll to climb · click a leaf to read it · Esc to come down'
          : isEmpty
            ? ''
            : 'Scroll or drag to turn the island · click a tree to climb it'}
      </p>

      {/* Keyboard / screen-reader route to exactly the same items as the 3D scene. */}
      <nav className="scene__list" aria-label={activeTree ? `Contents of ${activeTree.label}` : 'Folders'}>
        <ul>
          {activeTree
            ? activeTree.branches.map((node) => (
                <li key={node.path}>
                  <button type="button" onClick={() => pickBranch(node)}>
                    {node.kind === 'dir' ? `Open folder ${node.name}` : `Read ${node.name}`}
                  </button>
                </li>
              ))
            : trees.map((tree) => (
                <li key={tree.id}>
                  <button type="button" onClick={() => selectTree(tree.id)}>
                    {`Climb ${tree.label} (${tree.branches.length} item${tree.branches.length === 1 ? '' : 's'})`}
                  </button>
                </li>
              ))}
        </ul>
      </nav>

      {leafVisible && selected && (
        <Leaf label={selected.name} onClose={() => setLeafOpen(false)}>
          <DetailPane node={selected} />
        </Leaf>
      )}
    </div>
  )
}
