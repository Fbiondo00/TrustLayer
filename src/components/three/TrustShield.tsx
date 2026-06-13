"use client";

import { useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Float, Icosahedron, Octahedron, Torus, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

export interface TrustShieldProps {
  position?: [number, number, number];
  scale?: number | [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  accent?: string;
  distort?: number;
  speed?: number;
  hovered?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
}

/**
 * TrustShield — central crystalline mark for the hero scene.
 *
 * Three layers:
 *  - Outer octahedron with a distort material (organic, breathing surface)
 *  - Inner icosahedron, wireframe, counter-rotating
 *  - Equatorial torus ring, slow spin
 *
 * Mouse parallax: tilts toward pointer via useFrame + state.pointer.
 */
export function TrustShield({
  position = [0, 0, 0],
  scale = 1,
  rotation = [0, 0, 0],
  color = "#5eead4",
  accent = "#a78bfa",
  distort = 0.32,
  speed = 1,
  onClick,
  onPointerOver,
  onPointerOut,
}: TrustShieldProps) {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    if (!group.current || !inner.current || !ring.current) return;
    const t = state.clock.elapsedTime * speed;
    const px = state.pointer.x * 0.4;
    const py = state.pointer.y * 0.4;

    // Smooth parallax tilt toward the pointer
    group.current.rotation.y += (px - group.current.rotation.y * 0.0 + px * 0.0) * 0;
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, px, 0.05);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -py, 0.05);

    inner.current.rotation.x = -t * 0.4;
    inner.current.rotation.y = -t * 0.3;

    ring.current.rotation.x = Math.PI / 2;
    ring.current.rotation.z = t * 0.4;

    // breathing scale
    const breathe = 1 + Math.sin(t * 1.4) * 0.02;
    group.current.scale.setScalar(
      (typeof scale === "number" ? scale : 1) * breathe * (hovered ? 1.06 : 1)
    );
    void delta;
  });

  const ringGeo = useMemo(() => new THREE.TorusGeometry(1.7, 0.012, 12, 96), []);

  return (
    <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.45}>
      <group
        ref={group}
        position={position}
        rotation={rotation}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onPointerOver?.(e);
        }}
        onPointerOut={(e) => {
          setHovered(false);
          onPointerOut?.(e);
        }}
      >
        {/* Outer faceted core */}
        <Octahedron args={[1.2, 0]}>
          <MeshDistortMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered ? 0.55 : 0.35}
            roughness={0.18}
            metalness={0.55}
            distort={distort}
            speed={1.6}
            flatShading
          />
        </Octahedron>

        {/* Inner wireframe counter-rotating */}
        <Icosahedron ref={inner} args={[1.55, 0]}>
          <meshBasicMaterial color={accent} wireframe transparent opacity={0.35} />
        </Icosahedron>

        {/* Equatorial ring */}
        <Torus ref={ring} args={[1.7, 0.012, 12, 96]}>
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </Torus>

        {/* Inner glow orb */}
        <mesh>
          <sphereGeometry args={[0.55, 32, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.18} />
        </mesh>

        {/* re-use ringGeo for a second tilted ring */}
        <mesh geometry={ringGeo} rotation={[Math.PI / 3, 0, Math.PI / 4]}>
          <meshBasicMaterial color={accent} transparent opacity={0.35} />
        </mesh>
      </group>
    </Float>
  );
}
