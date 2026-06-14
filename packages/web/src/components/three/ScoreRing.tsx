"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { gradeForScore } from "@/lib/trust";

export interface ScoreRingProps {
  score?: number;
  radius?: number;
  thickness?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  animateTo?: number;
  pulse?: boolean;
}

/**
 * ScoreRing — 3D ring gauge that fills based on score (0-100).
 * Color is derived from the grade (safe → danger).
 * Used inside the hero as the live "trust score" readout.
 */
export function ScoreRing({
  score = 97,
  radius = 0.9,
  thickness = 0.06,
  position = [0, 0, 0],
  rotation = [Math.PI / 2.2, 0, 0],
  animateTo,
  pulse = true,
}: ScoreRingProps) {
  const fillRef = useRef<THREE.Mesh>(null);
  const target = useRef(new THREE.Vector3(0, 0, 0));
  const displayScore = useRef(0);

  const color = useMemo(() => new THREE.Color(gradeForScore(score).color), [score]);
  const glow = useMemo(() => new THREE.Color(gradeForScore(score).glow), [score]);

  useFrame((_, delta) => {
    if (!fillRef.current) return;
    // animate displayed score toward target
    const goal = animateTo ?? score;
    displayScore.current = THREE.MathUtils.damp(displayScore.current, goal, 3, delta);

    const arcLength = (displayScore.current / 100) * Math.PI * 2;
    fillRef.current.scale.x = Math.max(0.001, arcLength);
    // re-center the arc so it grows from one end
    fillRef.current.position.x = -(arcLength / 2) * radius;

    if (pulse) {
      const p = 1 + Math.sin(performance.now() * 0.003) * 0.03;
      fillRef.current.scale.y = p;
    }
  });

  target.current.set(...position);

  // Use a torus for the background track and a thin curved tube for the fill.
  // For the fill we approximate with a scaled torus section.
  return (
    <group position={position} rotation={rotation}>
      {/* Background track */}
      <mesh>
        <torusGeometry args={[radius, thickness, 16, 96]} />
        <meshStandardMaterial
          color="#1f2330"
          emissive="#0a0c12"
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>
      {/* Fill arc (cloned segment) */}
      <mesh ref={fillRef} position={[0, 0, 0]}>
        <torusGeometry args={[radius, thickness * 1.05, 16, 96]} />
        <meshStandardMaterial
          color={color}
          emissive={glow}
          emissiveIntensity={1.4}
          roughness={0.25}
          metalness={0.4}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
