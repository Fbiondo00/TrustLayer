"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface ParticleFieldProps {
  count?: number;
  radius?: number;
  size?: number;
  color?: string;
  opacity?: number;
  speed?: number;
}

/**
 * ParticleField — slow-drifting cloud of points that surrounds the hero.
 * Used as the ambient "data dust" layer.
 */
export function ParticleField({
  count = 220,
  radius = 6,
  size = 0.025,
  color = "#9aa3b8",
  opacity = 0.5,
  speed = 0.04,
}: ParticleFieldProps) {
  const points = useRef<THREE.Points>(null);

  const { geometry, material } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // bias toward spherical shell so the center stays clear
      const r = radius * (0.55 + Math.random() * 0.55);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
      positions[i * 3 + 2] = r * Math.cos(phi);
      scales[i] = Math.random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("scale", new THREE.BufferAttribute(scales, 1));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    return { geometry, material };
  }, [count, radius, size, color, opacity]);

  useFrame((_, delta) => {
    if (!points.current) return;
    points.current.rotation.y += delta * speed;
    points.current.rotation.x += delta * speed * 0.35;
  });

  return <points ref={points} geometry={geometry} material={material} />;
}
