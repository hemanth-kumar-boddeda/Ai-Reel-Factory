import { useState, useMemo, memo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';

const PIPELINE_STAGES = [
  { id: 'discover', label: 'DISCOVER', color: '#ffc107' },
  { id: 'research', label: 'RESEARCH', color: '#2196f3' },
  { id: 'script', label: 'SCRIPT', color: '#9c27b0' },
  { id: 'storyboard', label: 'STORYBOARD', color: '#009688' },
  { id: 'visuals', label: 'VISUALS', color: '#ff5722' },
  { id: 'voice', label: 'VOICE', color: '#795548' },
  { id: 'render', label: 'RENDER', color: '#3f51b5' },
  { id: 'qa', label: 'QA', color: '#ff9800' },
  { id: 'publish', label: 'PUBLISH', color: '#4caf50' },
  { id: 'analytics', label: 'ANALYTICS', color: '#00bcd4' },
];

// Memoized components to prevent unnecessary re-renders
const ReelMesh = memo(({ reelToShow }) => {
  const ref = useState(() => ({ current: null }))[0];

  useFrame((state, delta) => {
    // Rotate the central reel slowly
    if (ref.current) {
      ref.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <mesh ref={ref} rotation={[0, 0, 0]} scale={2}>
      <planeGeometry args={[10, 18]} />
      <meshStandardMaterial color={reelToShow ? '#1a73e8' : '#666'} />
    </mesh>
  );
});

const PipelineNode = memo(({ stage, reelToShow, index, total }) => {
  const angle = (index / total) * Math.PI * 2;
  const radius = 20;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const isActive = reelToShow && reelToShow.status === stage.id.toUpperCase();

  return (
    <mesh key={stage.id} position={[x, 0, z]} rotation={[0, angle + Math.PI / 2, 0]}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial
        color={isActive ? stage.color : '#555'}
        emissive={isActive ? stage.color : '#000'}
        emissiveIntensity={isActive ? 0.5 : 0}
      />
    </mesh>
  );
});

function Reel3D({ reels }) {
  const [selectedReel, setSelectedReel] = useState(null);
  const [webglAvailable, setWebglAvailable] = useState(true);

  // Check WebGL availability on mount
  useState(() => {
    try {
      const canvas = document.createElement('canvas');
      return !!window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (e) {
      return false;
    }
  }, []);

  // Find the reel with the highest progress (or the first one that is not DISCOVERED)
  const getReelStatus = (reel) => {
    // We'll map the status to a stage index for simplicity
    const statusOrder = ['DISCOVERED', 'RESEARCHING', 'SCRIPTING', 'STORYBOARDING', 'ASSET_GENERATION', 'VOICE_GENERATION', 'RENDERING', 'QA', 'READY_TO_PUBLISH', 'PUBLISHED', 'FAILED'];
    return statusOrder.indexOf(reel.status);
  };

  // Sort reels by progress (highest first) - memoized
  const sortedReels = useMemo(() => {
    return [...reels].sort((a, b) => getReelStatus(b) - getReelStatus(a));
  }, [reels]);

  const reelToShow = useMemo(() => {
    return sortedReels[0] || null;
  }, [sortedReels]);

  if (!webglAvailable) {
    return (
      <div className="webgl-fallback" style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#e0e0e0'
      }}>
        <h2>3D Experience Not Available</h2>
        <p>Your browser does not support WebGL, which is required for the 3D Reel Factory.</p>
        <p>Please try a different browser or enable WebGL in your settings.</p>
      </div>
    );
  }

  return (
    <Canvas style={{ height: '100%', width: '100%' }} camera={{ position: [0, 0, 30], fov: 45 }}>
      <OrbitControls enablePan={false} enableZoom={false} rotateSpeed={0.5} />
      {/* Central Reel */}
      <ReelMesh reelToShow={reelToShow} />
      {/* Pipeline Nodes */}
      {PIPELINE_STAGES.map((stage, index) => (
        <PipelineNode
          key={stage.id}
          stage={stage}
          reelToShow={reelToShow}
          index={index}
          total={PIPELINE_STAGES.length}
        />
      ))}
      {/* Lights */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
    </Canvas>
  );
}

export default memo(Reel3D);