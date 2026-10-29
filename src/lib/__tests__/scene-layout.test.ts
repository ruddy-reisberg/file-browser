import { describe, expect, it } from 'vitest'
import {
  MAX_BRANCH_LEVELS,
  buildIslandTrees,
  climbPose,
  createRng,
  damp,
  easeOutBack,
  initialIslandRotation,
  islandRadius,
  isInRevealArc,
  layoutTrees,
  leafCategory,
  normalizeAngle,
  positionNoise,
  rotationToFace,
  scatterDecor,
  shapeTree,
} from '../scene-layout'
import { buildTree } from '../tree'
import type { FileEntry } from '../types'

function entry(path: string[], type = ''): FileEntry {
  return { path, file: new File(['x'], path[path.length - 1], { type }) }
}

describe('buildIslandTrees', () => {
  it('makes one tree per sub-folder, with its entries as branches', () => {
    const root = buildTree('root', [
      entry(['docs', 'a.pdf']),
      entry(['docs', 'b.txt']),
      entry(['photos', 'c.jpg']),
    ])

    const trees = buildIslandTrees(root)

    expect(trees.map((t) => t.label)).toEqual(['docs', 'photos'])
    expect(trees.every((t) => !t.loose)).toBe(true)
    expect(trees[0].branches.map((b) => b.name)).toEqual(['a.pdf', 'b.txt'])
  })

  it('adds one extra loose-files tree when files sit directly in the folder', () => {
    const root = buildTree('root', [entry(['docs', 'a.pdf']), entry(['readme.md']), entry(['todo.md'])])

    const trees = buildIslandTrees(root)

    expect(trees.map((t) => t.label)).toEqual(['docs', 'Loose files'])
    expect(trees[1].loose).toBe(true)
    expect(trees[1].branches.map((b) => b.name)).toEqual(['readme.md', 'todo.md'])
  })

  it('keeps sub-folders as branches so nested folders stay reachable', () => {
    const root = buildTree('root', [entry(['a', 'b', 'deep.txt']), entry(['a', 'top.txt'])])

    const [tree] = buildIslandTrees(root)

    expect(tree.branches.map((b) => `${b.kind}:${b.name}`)).toEqual(['dir:b', 'file:top.txt'])
  })

  it('returns no trees for an empty folder', () => {
    expect(buildIslandTrees(buildTree('root', []))).toEqual([])
  })

  it('gives every tree a distinct id', () => {
    const root = buildTree('root', [entry(['a', 'x.txt']), entry(['b', 'x.txt']), entry(['x.txt'])])

    const ids = buildIslandTrees(root).map((t) => t.id)

    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('leafCategory', () => {
  it('classifies images, pdfs and everything else', () => {
    expect(leafCategory(new File([''], 'a.png'))).toBe('image')
    expect(leafCategory(new File([''], 'a.PDF'))).toBe('pdf')
    expect(leafCategory(new File([''], 'a.mp3'))).toBe('audio')
    expect(leafCategory(new File([''], 'a.MP4'))).toBe('video')
    expect(leafCategory(new File([''], 'main.ts', { type: 'video/mp2t' }))).toBe('other')
    expect(leafCategory(new File([''], 'a.txt'))).toBe('other')
    expect(leafCategory(undefined)).toBe('other')
  })
})

describe('layoutTrees', () => {
  it('places the requested number of trees inside the island', () => {
    for (const count of [0, 1, 3, 6, 7, 40]) {
      const radius = islandRadius(count)
      const placements = layoutTrees(count, radius)
      expect(placements).toHaveLength(count)
      for (const p of placements) expect(Math.hypot(p.x, p.z)).toBeLessThanOrEqual(radius)
    }
  })

  it('keeps trees apart from each other, even on a crowded island', () => {
    const count = 60
    const placements = layoutTrees(count, islandRadius(count))
    let closest = Infinity
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        closest = Math.min(closest, Math.hypot(placements[i].x - placements[j].x, placements[i].z - placements[j].z))
      }
    }
    expect(closest).toBeGreaterThan(1.8)
  })

  it('keeps position and angle consistent', () => {
    const [p] = layoutTrees(1, 10)
    expect(Math.atan2(p.x, p.z)).toBeCloseTo(p.angle)
  })

  it('grows the island with the number of trees, within bounds', () => {
    expect(islandRadius(0)).toBe(6)
    expect(islandRadius(10)).toBeGreaterThan(islandRadius(2))
    expect(islandRadius(100000)).toBe(40)
  })
})

describe('reveal arc', () => {
  it('reveals a tree only when it is in front of the camera', () => {
    expect(isInRevealArc(0, 0)).toBe(true)
    expect(isInRevealArc(Math.PI, 0)).toBe(false)
    expect(isInRevealArc(Math.PI, Math.PI)).toBe(true)
  })

  it('always starts with the first tree in the arc', () => {
    for (const count of [1, 2, 5, 9, 33]) {
      const placements = layoutTrees(count, islandRadius(count))
      const rotation = initialIslandRotation(placements)
      expect(isInRevealArc(placements[0].angle, rotation)).toBe(true)
    }
  })

  it('reveals every tree during one full turn of the island', () => {
    const placements = layoutTrees(25, islandRadius(25))
    const revealed = new Set<number>()
    for (let step = 0; step < 720; step++) {
      const rotation = (step / 720) * Math.PI * 2
      placements.forEach((p, i) => {
        if (isInRevealArc(p.angle, rotation)) revealed.add(i)
      })
    }
    expect(revealed.size).toBe(25)
  })

  it('turns the island the short way to face a tree', () => {
    const target = rotationToFace(0.5, 0.1)
    expect(normalizeAngle(0.5 + target)).toBeCloseTo(0)
    expect(Math.abs(target - 0.1)).toBeLessThanOrEqual(Math.PI)

    const wrapped = rotationToFace(3, 0.5)
    expect(normalizeAngle(3 + wrapped)).toBeCloseTo(0)
    expect(Math.abs(wrapped - 0.5)).toBeLessThanOrEqual(Math.PI)
  })
})

describe('shapeTree', () => {
  it('uses one level per branch for small folders', () => {
    const shape = shapeTree(5)
    expect(shape.levels).toBe(5)
    expect(shape.perLevel).toBe(1)
    expect(shape.slots.map((s) => s.level)).toEqual([0, 1, 2, 3, 4])
  })

  it('caps the number of levels for huge folders by adding branches per level', () => {
    const shape = shapeTree(500)
    expect(shape.levels).toBeLessThanOrEqual(MAX_BRANCH_LEVELS)
    expect(shape.perLevel).toBeGreaterThan(1)
    expect(shape.slots).toHaveLength(500)
    expect(Math.max(...shape.slots.map((s) => s.level))).toBe(shape.levels - 1)
  })

  it('spaces the branches of one level evenly around the trunk', () => {
    const shape = shapeTree(MAX_BRANCH_LEVELS * 2)
    const level0 = shape.slots.filter((s) => s.level === 0)
    expect(level0).toHaveLength(2)
    expect(Math.abs(normalizeAngle(level0[1].angle - level0[0].angle))).toBeCloseTo(Math.PI)
  })

  it('handles an empty folder', () => {
    const shape = shapeTree(0)
    expect(shape.levels).toBe(0)
    expect(shape.slots).toEqual([])
    expect(shape.height).toBeGreaterThan(0)
  })

  it('makes tall trees taller but keeps them readable from the island', () => {
    const small = shapeTree(2)
    const big = shapeTree(30)
    expect(big.height).toBeGreaterThan(small.height)
    expect(big.islandScale).toBeLessThan(small.islandScale)
    expect(big.height * big.islandScale).toBeLessThanOrEqual(6.01)
    expect(big.islandScale).toBeGreaterThanOrEqual(0.1)
  })
})

describe('climbPose', () => {
  it('rises with the climb level and stays clear of the trunk', () => {
    const shape = shapeTree(20)
    const low = climbPose(shape, 0)
    const high = climbPose(shape, 15)
    expect(high.position.y).toBeGreaterThan(low.position.y)
    expect(Math.hypot(low.position.x, low.position.z)).toBeGreaterThan(shape.trunkRadius)
  })

  it('approaches from the ground and never goes below it', () => {
    const shape = shapeTree(5)
    expect(climbPose(shape, -1.5).position.y).toBeLessThan(climbPose(shape, 0).position.y)
    expect(climbPose(shape, -100).position.y).toBeGreaterThan(0)
  })

  it('clamps above the top level', () => {
    const shape = shapeTree(5)
    expect(climbPose(shape, 99)).toEqual(climbPose(shape, 4))
  })
})

describe('easing and smoothing', () => {
  it('easeOutBack runs from 0 to 1 and overshoots in between', () => {
    expect(easeOutBack(0)).toBeCloseTo(0)
    expect(easeOutBack(1)).toBeCloseTo(1)
    expect(Math.max(...[0.5, 0.6, 0.7, 0.8].map(easeOutBack))).toBeGreaterThan(1)
  })

  it('damp moves towards the target without overshooting, at any frame rate', () => {
    const slow = damp(0, 10, 4, 1 / 30)
    const fast = damp(0, 10, 4, 1 / 120)
    expect(slow).toBeGreaterThan(fast)
    expect(slow).toBeLessThan(10)
    // Two small steps equal one big step (frame-rate independence).
    expect(damp(damp(0, 10, 4, 0.01), 10, 4, 0.01)).toBeCloseTo(damp(0, 10, 4, 0.02))
  })

  it('normalizeAngle wraps into (-PI, PI]', () => {
    expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI)
    expect(normalizeAngle(-3 * Math.PI)).toBeCloseTo(Math.PI)
    expect(normalizeAngle(0.3)).toBeCloseTo(0.3)
  })
})

describe('deterministic decoration', () => {
  it('replays the same sequence for the same seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
    expect(createRng(1)()).not.toBe(createRng(2)())
  })

  it('positionNoise is stable and bounded', () => {
    expect(positionNoise(1, 2, 3)).toBe(positionNoise(1, 2, 3))
    for (let i = 0; i < 50; i++) {
      const n = positionNoise(i, i * 2, i * 3)
      expect(n).toBeGreaterThanOrEqual(-1)
      expect(n).toBeLessThanOrEqual(1)
    }
  })

  it('scatterDecor keeps its distance from trees and stays on the island', () => {
    const trees = [{ x: 0, z: 0 }, { x: 4, z: 1 }]
    const spots = scatterDecor(30, 8, trees, createRng(7))
    expect(spots.length).toBeGreaterThan(0)
    for (const s of spots) {
      expect(Math.hypot(s.x, s.z)).toBeLessThanOrEqual(8)
      for (const t of trees) expect(Math.hypot(s.x - t.x, s.z - t.z)).toBeGreaterThanOrEqual(1.4)
    }
  })
})
