import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { prefersReducedMotion } from '../../lib/motion';
import './hero.css';

/**
 * The Overview hero.
 *
 * A machined lens: a ring of glass, an iris of blades, a film strip of light
 * and a slow orbit of dust. It is the only place in the product with volume.
 *
 * The canvas is lazy-loaded, the device pixel ratio is capped, the scene is
 * torn down on unmount, and a static CSS/SVG fallback replaces it when WebGL
 * is unavailable or the visitor asked for less motion.
 */

/* --------------------------------------------------------------- geometry */

/** The lens ring: a torus with a brushed metal look. */
function LensRing({ radius = 1, tube = 0.055 }) {
  const geometry = useMemo(() => new THREE.TorusGeometry(radius, tube, 16, 96), [
    radius,
    tube,
  ]);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x2a2f38,
        metalness: 0.92,
        roughness: 0.24,
      }),
    []
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return <mesh geometry={geometry} material={material} rotation={[Math.PI / 2, 0, 0]} />;
}

/** The glass: a shallow disc that catches the rim light. */
function LensGlass({ radius = 0.92 }) {
  const geometry = useMemo(() => new THREE.CircleGeometry(radius, 72), [radius]);
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: 0x0b1016,
        metalness: 0.1,
        roughness: 0.08,
        transmission: 0.42,
        thickness: 0.35,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        transparent: true,
        opacity: 0.92,
      }),
    []
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  return (
    <mesh geometry={geometry} material={material} rotation={[-Math.PI / 2, 0, 0]} />
  );
}

/** The iris: a ring of blades that closes very slightly as it turns. */
function IrisBlades({ count = 7, radius = 0.5 }) {
  const group = useRef();
  const geometry = useMemo(() => new THREE.CircleGeometry(0.3, 3), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x171b22,
        metalness: 0.75,
        roughness: 0.42,
        side: THREE.DoubleSide,
      }),
    []
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    if (group.current && !prefersReducedMotion()) {
      group.current.rotation.z += delta * 0.06;
    }
  });

  return (
    <group ref={group} rotation={[-Math.PI / 2, 0, 0]}>
      {Array.from({ length: count }).map((_, index) => {
        const angle = (index / count) * Math.PI * 2;
        return (
          <mesh
            key={index}
            geometry={geometry}
            material={material}
            position={[
              Math.cos(angle) * radius * 0.52,
              Math.sin(angle) * radius * 0.52,
              0.002 * index,
            ]}
            rotation={[0, 0, angle + 0.5]}
            scale={0.78}
          />
        );
      })}
    </group>
  );
}

/** The reel: two plates and a band of film between them. */
function FilmReel({ radius = 1.45 }) {
  const geometry = useMemo(() => new THREE.TorusGeometry(radius, 0.022, 10, 120), [
    radius,
  ]);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: 0x6f7d8c,
        metalness: 0.85,
        roughness: 0.3,
        transparent: true,
        opacity: 0.72,
      }),
    []
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  const group = useRef();
  useFrame((_, delta) => {
    if (group.current && !prefersReducedMotion()) {
      group.current.rotation.y += delta * 0.085;
    }
  });

  return (
    <group ref={group} rotation={[Math.PI / 2.6, 0.2, 0]}>
      <mesh geometry={geometry} material={material} />
      <mesh geometry={geometry} material={material} scale={0.86} />
    </group>
  );
}

/** A restrained field of dust. It never sparkles. */
function Dust({ count = 90, radius = 2.6 }) {
  const points = useRef();
  const geometry = useMemo(() => {
    const buffer = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      // A deterministic layout - the same dust every time.
      const angle = index * 2.39996;
      const distance = radius * (0.35 + ((index * 37) % 100) / 160);
      buffer[index * 3] = Math.cos(angle) * distance;
      buffer[index * 3 + 1] = ((index * 53) % 100) / 50 - 1;
      buffer[index * 3 + 2] = Math.sin(angle) * distance;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(buffer, 3));
    return geo;
  }, [count, radius]);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: 0x9fb2c4,
        size: 0.018,
        transparent: true,
        opacity: 0.4,
        sizeAttenuation: true,
        depthWrite: false,
      }),
    []
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    if (points.current && !prefersReducedMotion()) {
      points.current.rotation.y += delta * 0.018;
    }
  });

  return <points ref={points} geometry={geometry} material={material} />;
}

/* ------------------------------------------------------------------ scene */

function Scene({ pointer }) {
  const rig = useRef();
  const { viewport } = useThree();

  useFrame((state, delta) => {
    if (!rig.current || prefersReducedMotion()) return;
    // A very small, slow parallax. It never takes over the pointer.
    const targetX = pointer.current.x * 0.18;
    const targetY = pointer.current.y * 0.12;
    rig.current.rotation.y += (targetX - rig.current.rotation.y) * Math.min(1, delta * 1.6);
    rig.current.rotation.x += (targetY - rig.current.rotation.x) * Math.min(1, delta * 1.6);
    rig.current.position.y = Math.sin(state.clock.elapsedTime * 0.42) * 0.035;
  });

  const scale = Math.min(1, viewport.width / 6);

  return (
    <group ref={rig} scale={scale}>
      <ambientLight intensity={0.32} />
      <directionalLight position={[4, 6, 5]} intensity={1.5} color="#dfe8f2" />
      <pointLight position={[-4, 1.5, 3]} intensity={26} color="#8b5cf6" distance={14} />
      <pointLight position={[3.5, -2, 2.5]} intensity={20} color="#2dd4bf" distance={13} />
      <pointLight position={[0, 0, 4]} intensity={10} color="#c6f24e" distance={9} />

      <group rotation={[0.34, 0, 0]}>
        <LensRing />
        <LensGlass />
        <IrisBlades />
        <FilmReel />
      </group>

      <Dust />
    </group>
  );
}

/* ------------------------------------------------------------------- hero */

function StaticFallback() {
  return (
    <div className="hero-fallback" aria-hidden="true">
      <svg viewBox="0 0 240 240" width="100%" height="100%">
        <defs>
          <radialGradient id="heroLens" cx="38%" cy="32%">
            <stop offset="0%" stopColor="#20262f" />
            <stop offset="60%" stopColor="#0d1116" />
            <stop offset="100%" stopColor="#08090b" />
          </radialGradient>
          <linearGradient id="heroRim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="52%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#c6f24e" />
          </linearGradient>
        </defs>
        <circle cx="120" cy="120" r="96" fill="none" stroke="url(#heroRim)" strokeWidth="1.5" opacity="0.7" />
        <circle cx="120" cy="120" r="74" fill="url(#heroLens)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        <circle cx="120" cy="120" r="30" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
        <circle cx="120" cy="120" r="7" fill="#c6f24e" opacity="0.85" />
      </svg>
    </div>
  );
}

export default function ReelLensHero() {
  const [supported, setSupported] = useState(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let cancelled = false;
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (cancelled) return undefined;
    setSupported(Boolean(gl));
    return () => {
      cancelled = true;
    };
  }, []);

  const onPointerMove = (event) => {
    if (prefersReducedMotion()) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointer.current.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.current.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
  };

  const onPointerLeave = () => {
    pointer.current.x = 0;
    pointer.current.y = 0;
  };

  if (supported === null) {
    return <div className="hero-canvas" aria-hidden="true" />;
  }

  if (!supported || prefersReducedMotion()) {
    return (
      <div
        className="hero-canvas"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        aria-hidden="true"
      >
        <StaticFallback />
      </div>
    );
  }

  return (
    <div
      className="hero-canvas"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      aria-hidden="true"
    >
      <Canvas
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        camera={{ position: [0, 0.55, 4.2], fov: 38 }}
        frameloop="always"
      >
        <Scene pointer={pointer} />
      </Canvas>
    </div>
  );
}
