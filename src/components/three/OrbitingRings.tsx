"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface OrbitingRingsProps {
  count?: number;
  radius?: number;
  particlesPerRing?: number;
  particleSize?: number;
  speed?: number;
  colors?: string[];
  tilt?: number;
}

function Ring({
  radius,
  count,
  size,
  color,
  speed,
  phase,
  axis,
}: {
  radius: number;
  count: number;
  size: number;
  color: string;
  speed: number;
  phase: number;
  axis: THREE.Vector3;
}) {
  const group = useRef<THREE.Group>(null);

  const positions = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      out.push([Math.cos(a) * radius, 0, Math.sin(a) * radius]);
    }
    return out;
  }, [count, radius]);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime * speed + phase;
    group.current.rotation.y = t;
    // gentle vertical bob
    group.current.position.y = Math.sin(t * 0.6) * 0.05;
  });

  return (
    <group ref={group} rotation={[axis.x, axis.y, axis.z]}>
      {positions.map((p, i) => (
        <mesh key={i} position={p}>
          <octahedronGeometry args={[size, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.7}
            roughness={0.3}
            metalness={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * OrbitingRings — concentric rings of small crystalline satellites.
 * Used to evoke the 8-step pipeline / 6 analysis layers.
 */
export function OrbitingRings({
  count = 3,
  radius = 2.4,
  particlesPerRing = 8,
  particleSize = 0.05,
  speed = 0.4,
  colors = ["#a78bfa", "#c4b5fd", "#60a5fa"],
  tilt = 0.35,
}: OrbitingRingsProps) {
  const axes = useMemo(
    () => [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(tilt, 0, tilt),
      new THREE.Vector3(-tilt, tilt, 0),
    ],
    [tilt]
  );

  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <Ring
          key={i}
          radius={radius + i * 0.45}
          count={particlesPerRing}
          size={particleSize}
          color={colors[i % colors.length]}
          speed={speed * (1 - i * 0.18)}
          phase={i * 1.7}
          axis={axes[i % axes.length]}
        />
      ))}
    </group>
  );
}
