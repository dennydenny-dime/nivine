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
      groupRef.current.position.y = Math.sin(elapsed * 0.4) * 0.14;
      groupRef.current.rotation.z = Math.sin(elapsed * 0.14) * 0.05;
    }

    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0028;
      meshRef.current.rotation.x = Math.sin(elapsed * 0.2) * 0.08;
    }
  });

  return (
    <group ref={groupRef} scale={0.82}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.28, 96, 96]} />
        <MeshDistortMaterial
          color="#8b5cf6"
          emissive="#2563eb"
          emissiveIntensity={1.05}
          metalness={0.42}
          roughness={0.22}
          clearcoat={1}
          clearcoatRoughness={0.18}
          distort={0.14}
          speed={0.9}
          opacity={0.88}
          transparent
        />
      </mesh>
    </group>
  );
};

const BackgroundOrb: React.FC = () => {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex h-full min-h-[460px] items-start justify-center overflow-hidden">
      <div className="absolute left-1/2 top-[10%] h-64 w-64 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.28)_0%,rgba(124,58,237,0.12)_46%,rgba(15,23,42,0)_76%)] blur-[110px] sm:h-[22rem] sm:w-[22rem]" />
      <div className="absolute left-1/2 top-[17%] h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12)_0%,rgba(96,165,250,0.1)_34%,rgba(15,23,42,0)_70%)] blur-[140px] sm:h-[26rem] sm:w-[26rem]" />
      <div className="absolute left-1/2 top-[18%] h-56 w-56 -translate-x-1/2 rounded-full border border-white/10 opacity-60 blur-xl sm:h-72 sm:w-72" />

      <div className="h-full w-full max-w-[620px] opacity-[0.88] blur-[0.6px] drop-shadow-[0_0_120px_rgba(99,102,241,0.3)]">
        <Canvas
          camera={{ position: [0, 0, 4.8], fov: 42 }}
          dpr={[1, 1.5]}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={0.72} color="#c4b5fd" />
          <pointLight position={[2.5, 2.5, 3]} intensity={20} color="#60a5fa" distance={8} />
          <pointLight position={[-2.5, -1.5, 2.2]} intensity={15} color="#8b5cf6" distance={8} />
          <pointLight position={[0, 2.8, -2]} intensity={6} color="#ffffff" distance={10} />
          <OrbMesh />
        </Canvas>
      </div>
    </div>
  );
};

export default BackgroundOrb;
