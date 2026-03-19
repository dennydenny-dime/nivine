import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import type { Group, Mesh } from 'three';

const OrbMesh: React.FC = () => {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(elapsed * 0.55) * 0.18;
      groupRef.current.rotation.z = Math.sin(elapsed * 0.18) * 0.08;
    }

    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0035;
      meshRef.current.rotation.x = Math.sin(elapsed * 0.22) * 0.12;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.28, 96, 96]} />
        <MeshDistortMaterial
          color="#8b5cf6"
          emissive="#2563eb"
          emissiveIntensity={1.15}
          metalness={0.45}
          roughness={0.18}
          clearcoat={1}
          clearcoatRoughness={0.16}
          distort={0.16}
          speed={1.1}
          opacity={0.95}
          transparent
        />
      </mesh>
    </group>
  );
};

const BackgroundOrb: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex h-full min-h-[460px] items-start justify-center overflow-hidden">
      <div className="absolute left-1/2 top-[12%] h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.22)_0%,rgba(124,58,237,0.14)_42%,rgba(15,23,42,0)_74%)] blur-3xl sm:h-[24rem] sm:w-[24rem]" />
      <div className="absolute left-1/2 top-[18%] h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.22)_0%,rgba(37,99,235,0.16)_38%,rgba(15,23,42,0)_72%)] blur-[120px] sm:h-[28rem] sm:w-[28rem]" />

      <div className="h-full w-full max-w-[720px] opacity-90">
        <Canvas
          camera={{ position: [0, 0, 4.5], fov: 42 }}
          dpr={[1, 1.5]}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={0.8} color="#c4b5fd" />
          <pointLight position={[2.5, 2.5, 3]} intensity={24} color="#60a5fa" distance={8} />
          <pointLight position={[-2.5, -1.5, 2.2]} intensity={18} color="#8b5cf6" distance={8} />
          <pointLight position={[0, 2.8, -2]} intensity={8} color="#ffffff" distance={10} />
          <OrbMesh />
        </Canvas>
      </div>
    </div>
  );
};

export default BackgroundOrb;
