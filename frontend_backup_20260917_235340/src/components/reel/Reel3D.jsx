import { useState } from 'react';
import { useFrame } from '@react-three/fiber';
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

export default function Reel3D({ reels }) {
  const [selectedReel, setSelectedReel] = useState(null);

  // Find the reel with the highest progress (or the first one that is not DISCOVERED)
  const getReelStatus = (reel) => {
    // We'll map the status to a stage index for simplicity
    const statusOrder = ['DISCOVERED', 'RESEARCHING', 'SCRIPTING', 'STORYBOARDING', 'ASSET_GENERATION', 'VOICE_GENERATION', 'RENDERING', 'QA', 'READY_TO_PUBLISH', 'PUBLISHED', 'FAILED'];
    return statusOrder.indexOf(reel.status);
  };

  // Sort reels by progress (highest first)
  const sortedReels = [...reels].sort((a, b) => getReelStatus(b) - getReelStatus(a));
  const reelToShow = sortedReels[0] || null;

  useFrame((state, delta) => {
    // Rotate the central reel slowly
    const reelRef = state?.reelRef;
    if (reelRef && reelRef.current) {
      reelRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <>
      <OrbitControls enablePan={false} enableZoom={false} rotateSpeed={0.5} />
      {/* Central Reel */}
      <mesh ref={reel => (state.reelRef = reel)} rotation={[0, 0, 0]} scale={2}>
        <planeGeometry args={[10, 18]} />
        <meshStandardMaterial color={reelToShow ? '#1a73e8' : '#666'} />
      </mesh>
      {/* Pipeline Nodes */}
      {PIPELINE_STAGES.map((stage, index) => {
        const angle = (index / PIPELINE_STAGES.length) * Math.PI * 2;
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
      })}
      {/* Lights */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
    </>
  );
}