import { useMemo, useRef } from 'react'
import { Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { createRng } from '../../lib/scene-layout'
import { useSceneState } from './scene-state'
import type { SceneTheme } from './useSceneTheme'

interface CloudSpec {
  x: number
  y: number
  z: number
  scale: number
  puffs: { x: number; y: number; z: number; r: number }[]
}

function makeClouds(radius: number): CloudSpec[] {
  const rng = createRng(2024)
  return Array.from({ length: 9 }, (_, i) => {
    const angle = (i / 9) * Math.PI * 2 + rng() * 0.5
    const distance = radius * (1.5 + rng() * 0.9) + 4
    return {
      x: Math.sin(angle) * distance,
      y: -4 + rng() * 9,
      z: Math.cos(angle) * distance,
      scale: 0.9 + rng() * 1.2,
      puffs: Array.from({ length: 4 }, (_, p) => ({
        x: (p - 1.5) * 1.1,
        y: rng() * 0.5,
        z: (rng() - 0.5) * 0.8,
        r: 0.8 + rng() * 0.6,
      })),
    }
  })
}

/** Drifting clouds around the island, and sparkles (fireflies at night) in the air above it. */
export default function Atmosphere({ theme, radius }: { theme: SceneTheme; radius: number }) {
  const stateRef = useSceneState()
  const driftRef = useRef<Group>(null)
  const clouds = useMemo(() => makeClouds(radius), [radius])

  useFrame((_, dt) => {
    if (driftRef.current && !stateRef.current.reducedMotion) driftRef.current.rotation.y += Math.min(dt, 0.05) * 0.02
  })

  return (
    <>
      <group ref={driftRef}>
        {clouds.map((cloud, i) => (
          <group key={i} position={[cloud.x, cloud.y, cloud.z]} scale={cloud.scale}>
            {cloud.puffs.map((puff, p) => (
              <mesh key={p} position={[puff.x, puff.y, puff.z]}>
                <icosahedronGeometry args={[puff.r, 1]} />
                <meshStandardMaterial color={theme.colors.cloud} flatShading transparent opacity={0.85} />
              </mesh>
            ))}
          </group>
        ))}
      </group>

      {!stateRef.current.reducedMotion && (
        <Sparkles
          count={Math.round(30 + radius * 4)}
          scale={[radius * 2.4, 9, radius * 2.4]}
          position={[0, 4, 0]}
          size={4}
          speed={0.35}
          opacity={0.8}
          color={theme.colors.sparkle}
        />
      )}
    </>
  )
}
