"use client";

import dynamic from "next/dynamic";
import { HeroScene as HeroSceneImpl, type HeroSceneProps } from "./HeroScene";

/**
 * Scene — public, SSR-safe wrapper around the 3D hero.
 *
 * The Canvas only mounts on the client (next/dynamic ssr:false) because
 * three.js touches `window` during render. The placeholder below avoids
 * layout shift while the canvas boots.
 */
const ClientHero = dynamic(() => Promise.resolve(HeroSceneImpl), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
    </div>
  ),
});

export function Scene(props: HeroSceneProps) {
  return <ClientHero {...props} />;
}

export { TrustShield } from "./TrustShield";
export { OrbitingRings } from "./OrbitingRings";
export { ParticleField } from "./ParticleField";
export { ScoreRing } from "./ScoreRing";
export { HeroScene } from "./HeroScene";
