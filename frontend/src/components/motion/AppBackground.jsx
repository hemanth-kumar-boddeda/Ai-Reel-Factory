import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { gsap, prefersReducedMotion } from '../../lib/motion';
import './AppBackground.css';

/**
 * The field behind the product.
 *
 * The same restraint as the hero: a deterministic drift of dust and two thin
 * signal rings, nothing that sparkles and nothing with volume, so the UI stays
 * the loudest thing on screen. It sits on the z:-1 layer, so it can only ever
 * tint the background - it never passes over text or controls.
 *
 * No WebGL or reduced motion: the CSS field alone is the background.
 */

// Shared pointer - the layer is pointer-events:none, so the hero-style
// container events cannot feed it.
const pointer = { x: 0, y: 0 };

// A canvas failure must never take the product down: the CSS field remains.
class QuietBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const DUST_COUNT = 160;

/** A deterministic layout - the same dust every time, like the hero. */
function Dust() {
  const geometry = useMemo(() => {
    const buffer = new Float32Array(DUST_COUNT * 3);
    for (let index = 0; index < DUST_COUNT; index += 1) {
      const angle = index * 2.39996;
      const distance = 3.2 * (0.4 + ((index * 41) % 100) / 140);
      buffer[index * 3] = Math.cos(angle) * distance;
      buffer[index * 3 + 1] = ((index * 59) % 100) / 25 - 2;
      buffer[index * 3 + 2] = Math.sin(angle) * distance - 4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(buffer, 3));
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: 0x8fa3b8,
        size: 0.022,
        transparent: true,
        opacity: 0.5,
        sizeAttenuation: true,
        depthWrite: false,
      }),
    []
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return <points geometry={geometry} material={material} />;
}

/** Two thin rings: the factory's signal, never a solid object. */
function SignalRings() {
  const violet = useMemo(() => new THREE.TorusGeometry(3.1, 0.012, 6, 128), []);
  const teal = useMemo(() => new THREE.TorusGeometry(2.3, 0.01, 6, 128), []);
  const violetMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x8b5cf6,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    []
  );
  const tealMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x2dd4bf,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
    []
  );

  useEffect(
    () => () => {
      violet.dispose();
      teal.dispose();
      violetMaterial.dispose();
      tealMaterial.dispose();
    },
    [violet, teal, violetMaterial, tealMaterial]
  );

  const rig = useRef();
  useFrame((_, delta) => {
    if (rig.current) {
      rig.current.rotation.z += delta * 0.02;
      rig.current.rotation.x +=
        (pointer.y * 0.06 - rig.current.rotation.x) * Math.min(1, delta * 1.2);
    }
  });

  return (
    <group ref={rig}>
      <mesh geometry={violet} material={violetMaterial} rotation={[1.15, 0.2, 0]} />
      <mesh geometry={teal} material={tealMaterial} rotation={[0.6, -0.5, 0.4]} />
    </group>
  );
}

function Field() {
  const rig = useRef();

  useFrame((_, delta) => {
    if (!rig.current) return;
    // The same very small, slow parallax as the hero.
    const targetX = pointer.x * 0.16;
    const targetY = pointer.y * 0.1;
    rig.current.rotation.y += (targetX - rig.current.rotation.y) * Math.min(1, delta * 1.4);
    rig.current.rotation.x += (targetY - rig.current.rotation.x) * Math.min(1, delta * 1.4);
  });

  return (
    <group ref={rig}>
      <Dust />
      <SignalRings />
    </group>
  );
}

export default function AppBackground() {
  // Checked once, at first render: the hero uses the same support gate.
  const [supported] = useState(() => {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
      return false;
    }
  });
  const glowRef = useRef(null);
  const reduced = prefersReducedMotion();

  // The cursor glow: a tint that follows the pointer on the background layer.
  useEffect(() => {
    const node = glowRef.current;
    if (reduced || !node || !window.matchMedia('(pointer: fine)').matches) return undefined;

    const xTo = gsap.quickTo(node, 'x', { duration: 0.5, ease: 'power2.out' });
    const yTo = gsap.quickTo(node, 'y', { duration: 0.5, ease: 'power2.out' });
    const onMove = (event) => {
      gsap.set(node, { opacity: 1 });
      xTo(event.clientX);
      yTo(event.clientY);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      gsap.set(node, { clearProps: 'x,y,opacity' });
    };
  }, [reduced]);

  // Track the pointer for the field's parallax while the canvas is mounted.
  useEffect(() => {
    if (!supported || reduced) return undefined;
    const onMove = (event) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [supported, reduced]);

  return (
    <div className="app-bg" aria-hidden="true">
      <span className="motion-glow" ref={glowRef} />
      {supported && !reduced && (
        <QuietBoundary>
          <Canvas
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
            camera={{ position: [0, 0, 6], fov: 45 }}
          >
            <Field />
          </Canvas>
        </QuietBoundary>
      )}
    </div>
  );
}
