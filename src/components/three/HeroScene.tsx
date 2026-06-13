"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Sparkles, AdaptiveDpr, AdaptiveEvents, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { TrustShield } from "./TrustShield";
import { OrbitingRings } from "./OrbitingRings";
import { ParticleField } from "./ParticleField";
import { ScoreRing } from "./ScoreRing";

export interface HeroSceneProps {
  className?: string;
  intensity?: "low" | "normal" | "high";
  interactive?: boolean;
  score?: number;
}

const PARTICLE_BUDGET = { low: 90, normal: 220, high: 360 } as const;
const SPARKLE_BUDGET = { low: 30, normal: 60, high: 110 } as const;

/**
 * HeroScene — orchestrates the full hero composition.
 *
 * Composition:
 *   - Canvas with sRGB + ACES tone mapping
 *   - Two-point lighting in brand + accent colors
 *   - TrustShield at center (interactive parallax)
 *   - ScoreRing tilted above the shield (live A+ gauge)
 *   - OrbitingRings encircling the shield
 *   - ParticleField ambient dust
 *   - Sparkles for high-frequency highlight flicker
 *   - ContactShadows to ground the scene
 *
 * SSR-safe via dynamic import in calling code.
 */
export function HeroScene({
  className,
  intensity = "normal",
  interactive = true,
  score = 97,
}: HeroSceneProps) {
  return (
    <Canvas
      className={className}
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ position: [0, 0.4, 6.2], fov: 38, near: 0.1, far: 100 }}
    >
      <color attach="background" args={["#05060a"]} />
      <fog attach="fog" args={["#05060a", 7, 18]} />

      <AdaptiveDpr pixelated />
      <AdaptiveEvents />

      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 6, 4]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-5, -1, 3]} intensity={28} color="#5eead4" distance={14} decay={2} />
      <pointLight position={[5, 2, -2]} intensity={22} color="#a78bfa" distance={14} decay={2} />
      <pointLight position={[0, 4, -4]} intensity={14} color="#60a5fa" distance={16} decay={2} />

      <Suspense fallback={null}>
        <group position={[0, 0.1, 0]}>
          <TrustShield />
          <group position={[0, 1.9, 0.4]} rotation={[0.4, 0, 0]}>
            <ScoreRing score={score} animateTo={score} radius={0.95} />
          </group>
          <OrbitingRings />
        </group>

        <ParticleField count={PARTICLE_BUDGET[intensity]} />
        <Sparkles
          count={SPARKLE_BUDGET[intensity]}
          scale={[8, 5, 8]}
          size={2}
          speed={0.35}
          opacity={0.55}
          color="#5eead4"
        />

        <ContactShadows
          position={[0, -2.0, 0]}
          opacity={0.55}
          scale={14}
          blur={3.2}
          far={5}
          color="#000000"
        />

        <Environment preset="night" />
      </Suspense>
    </Canvas>
  );
}
