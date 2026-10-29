import { classifyFile, type FileKind } from './file-kind'
import type { TreeNode } from './types'

/**
 * Pure layout + math for the 3D view. Nothing here knows about three.js or
 * React: it turns the file tree into numbers (positions, heights, angles)
 * that the scene components then render.
 *
 * Vocabulary: the Island is the folder being browsed, a Tree is one of its
 * sub-folders, a Branch is an entry inside a tree, a Leaf is the metadata
 * card of a file.
 *
 * Angle convention: 0 points at +Z (towards the default camera) and grows
 * towards +X, so a point at angle `a` and distance `d` is (sin a * d, cos a * d).
 * Rotating a group by `rotation.y = t` adds `t` to the angle of everything in it.
 */

const TWO_PI = Math.PI * 2

export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

/** Hard cap on the number of branch levels, so huge folders stay climbable. */
export const MAX_BRANCH_LEVELS = 30
export const LEVEL_HEIGHT = 1.15
export const TRUNK_BASE_HEIGHT = 1.4
export const CROWN_MARGIN = 2.4
/** Rotation (rad) between two consecutive levels, so branches spiral up the trunk. */
export const LEVEL_TWIST = 0.9
export const BRANCH_REACH = 2.1
/** Half-width (rad) of the arc, in front of the camera, where trees sprout. */
export const REVEAL_HALF_ARC = 0.75

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Frame-rate independent exponential smoothing of `current` towards `target`. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt))
}

export function smoothstep(t: number): number {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

/** Ease with a small overshoot: 0 -> 0, 1 -> 1. Used for the sprouting trees. */
export function easeOutBack(t: number): number {
  const x = clamp(t, 0, 1)
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}

/** Wrap an angle into (-PI, PI]. */
export function normalizeAngle(angle: number): number {
  let a = angle % TWO_PI
  if (a > Math.PI) a -= TWO_PI
  else if (a <= -Math.PI) a += TWO_PI
  return a
}

/** Deterministic 32-bit string hash, used to seed per-folder decoration. */
export function hashString(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Small seeded PRNG (mulberry32): same seed, same sequence. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Stable pseudo-noise in [-1, 1] from a position; equal inputs give equal outputs. */
export function positionNoise(x: number, y: number, z: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453
  return (s - Math.floor(s)) * 2 - 1
}

// ---------------------------------------------------------------------------
// Tree specs: which folders become trees, which entries become branches
// ---------------------------------------------------------------------------

export interface TreeSpec {
  /** Stable identity within one island. */
  id: string
  label: string
  /** Folder this tree stands for (the island folder itself for the loose-files tree). */
  dir: TreeNode
  /** True for the extra tree that carries the files sitting directly in the island folder. */
  loose: boolean
  /** Entries hanging off the tree: sub-folders first, then files. */
  branches: TreeNode[]
}

/**
 * One tree per sub-folder of `dir`. Files that sit directly in `dir` have no
 * folder to stand for, so they get one extra "loose files" tree; without it
 * they would be unreachable in the 3D view.
 */
export function buildIslandTrees(dir: TreeNode): TreeSpec[] {
  const children = dir.children ?? []
  const specs: TreeSpec[] = children
    .filter((child) => child.kind === 'dir')
    .map((child) => ({
      id: child.path,
      label: child.name,
      dir: child,
      loose: false,
      branches: child.children ?? [],
    }))

  const looseFiles = children.filter((child) => child.kind === 'file')
  if (looseFiles.length > 0) {
    specs.push({
      id: `loose:${dir.path}`,
      label: 'Loose files',
      dir,
      loose: true,
      branches: looseFiles,
    })
  }
  return specs
}

export type LeafCategory = FileKind

/** Coarse file category; drives the colour of the leaf at the tip of a branch. */
export function leafCategory(file: File | undefined): LeafCategory {
  return file ? classifyFile(file) : 'other'
}

// ---------------------------------------------------------------------------
// Island + tree layout
// ---------------------------------------------------------------------------

export interface TreePlacement {
  /** Angle around the island centre (see the angle convention above). */
  angle: number
  distance: number
  x: number
  z: number
}

/** Island radius that keeps trees about 3 units apart, within sane bounds. */
export function islandRadius(treeCount: number): number {
  return clamp(3.5 + 2 * Math.sqrt(Math.max(treeCount, 0)), 6, 40)
}

/**
 * Spread `count` trees over a disc of `radius`. Few trees sit on a ring so the
 * island reads cleanly; many trees follow a sunflower (phyllotaxis) spiral,
 * which fills the disc evenly.
 */
export function layoutTrees(count: number, radius: number): TreePlacement[] {
  const placements: TreePlacement[] = []
  for (let i = 0; i < count; i++) {
    let angle: number
    let distance: number
    if (count === 1) {
      angle = 0
      distance = radius * 0.4
    } else if (count <= 6) {
      angle = (TWO_PI * i) / count
      distance = radius * 0.55
    } else {
      angle = normalizeAngle(i * GOLDEN_ANGLE)
      distance = radius * 0.85 * Math.sqrt((i + 0.5) / count)
    }
    placements.push({ angle, distance, x: Math.sin(angle) * distance, z: Math.cos(angle) * distance })
  }
  return placements
}

/** Rotation that brings the first tree in front of the camera, so the island never starts empty. */
export function initialIslandRotation(placements: TreePlacement[]): number {
  return placements.length > 0 ? normalizeAngle(-placements[0].angle) : 0
}

/** Rotation target that turns the island so `treeAngle` faces the camera, via the short way round. */
export function rotationToFace(treeAngle: number, currentRotation: number): number {
  return currentRotation + normalizeAngle(-(treeAngle + currentRotation))
}

/** True when a tree at `treeAngle`, on an island turned by `rotation`, is inside the reveal arc. */
export function isInRevealArc(
  treeAngle: number,
  rotation: number,
  halfArc: number = REVEAL_HALF_ARC,
): boolean {
  return Math.abs(normalizeAngle(treeAngle + rotation)) <= halfArc
}

export interface DecorSpot {
  x: number
  z: number
  scale: number
}

/**
 * Scatter small decorations (pebbles, flowers) over the island, keeping a
 * clearing around every tree. Deterministic for a given rng.
 */
export function scatterDecor(
  count: number,
  radius: number,
  avoid: { x: number; z: number }[],
  rng: () => number,
  clearing = 1.4,
): DecorSpot[] {
  const spots: DecorSpot[] = []
  for (let attempt = 0; attempt < count * 4 && spots.length < count; attempt++) {
    const angle = rng() * TWO_PI
    const distance = radius * 0.94 * Math.sqrt(rng())
    const x = Math.sin(angle) * distance
    const z = Math.cos(angle) * distance
    if (avoid.some((p) => Math.hypot(p.x - x, p.z - z) < clearing)) continue
    spots.push({ x, z, scale: 0.6 + rng() * 0.8 })
  }
  return spots
}

// ---------------------------------------------------------------------------
// Tree shape: how a folder's entries are arranged up the trunk
// ---------------------------------------------------------------------------

export interface BranchSlot {
  level: number
  /** Tree-local angle of the branch around the trunk. */
  angle: number
}

export interface TreeShape {
  branchCount: number
  levels: number
  perLevel: number
  height: number
  trunkRadius: number
  crownRadius: number
  /** Uniform scale of the tree when seen from the island. */
  islandScale: number
  slots: BranchSlot[]
}

/** Height (above the island) of the branch level `level`. */
export function levelY(level: number): number {
  return TRUNK_BASE_HEIGHT + level * LEVEL_HEIGHT
}

/**
 * Arrange `branchCount` entries up a trunk, one level at a time. Folders with
 * more than MAX_BRANCH_LEVELS entries get several branches per level.
 */
export function shapeTree(branchCount: number): TreeShape {
  const perLevel = Math.max(1, Math.ceil(branchCount / MAX_BRANCH_LEVELS))
  const levels = Math.ceil(branchCount / perLevel)

  const height = TRUNK_BASE_HEIGHT + Math.max(levels - 1, 0) * LEVEL_HEIGHT + CROWN_MARGIN
  const trunkRadius = 0.28 + 0.014 * height
  const crownRadius = 1.4 + 0.07 * height
  const visualHeight = Math.min(3 + 0.6 * Math.sqrt(levels), 6)

  const slots: BranchSlot[] = []
  for (let i = 0; i < branchCount; i++) {
    const level = Math.floor(i / perLevel)
    const slot = i % perLevel
    slots.push({ level, angle: normalizeAngle(level * LEVEL_TWIST + (slot * TWO_PI) / perLevel) })
  }

  return {
    branchCount,
    levels,
    perLevel,
    height,
    trunkRadius,
    crownRadius,
    islandScale: clamp(visualHeight / height, 0.1, 1),
    slots,
  }
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface CameraPose {
  position: Vec3
  lookAt: Vec3
}

/** How far (rad) the climbing camera sits to the side of the branch it is looking at. */
const CAMERA_SIDE_OFFSET = 0.85
const MIN_CLIMB_LEVEL = -1.5

export const MIN_CLIMB = MIN_CLIMB_LEVEL

/**
 * Camera pose, in tree-local space, for a (fractional) climb position:
 * the camera spirals up around the trunk, one branch level at a time.
 * Levels below 0 are the approach from the ground.
 */
export function climbPose(shape: TreeShape, level: number): CameraPose {
  const l = clamp(level, MIN_CLIMB_LEVEL, Math.max(shape.levels - 1, 0))
  const y = Math.max(levelY(l), 0.6)
  const twist = Math.max(l, 0) * LEVEL_TWIST
  const cameraAngle = twist + CAMERA_SIDE_OFFSET
  const cameraRadius = shape.trunkRadius + 7
  return {
    position: {
      x: Math.sin(cameraAngle) * cameraRadius,
      y: y + 0.7,
      z: Math.cos(cameraAngle) * cameraRadius,
    },
    lookAt: { x: Math.sin(twist) * 1.7, y: y + 0.6, z: Math.cos(twist) * 1.7 },
  }
}

/** Camera pose, in world space, for looking at an island of `radius` from the front. */
export function islandPose(radius: number, aspect: number, fovDegrees = 45): CameraPose {
  const tanHalf = Math.tan((fovDegrees * Math.PI) / 360)
  // Fit both the island's width (depends on aspect) and its depth (does not).
  const fitWidth = (1.25 * radius) / (tanHalf * Math.max(aspect, 0.6))
  const fitDepth = (1.0 * radius) / tanHalf
  const distance = Math.max(14, fitWidth, fitDepth)
  const elevation = 0.5
  return {
    position: { x: 0, y: Math.sin(elevation) * distance + 1, z: Math.cos(elevation) * distance },
    lookAt: { x: 0, y: 0.8, z: 0 },
  }
}
