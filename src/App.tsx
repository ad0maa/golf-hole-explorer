import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

export default function App() {
  return (
    <Canvas
      dpr={[1, 2]}
      shadows="percentage"
      camera={{ position: [8, 6, 12], fov: 55, near: 0.1, far: 2000 }}
    >
      <color attach="background" args={['#8fc0dc']} />
      <hemisphereLight args={['#bcd9ea', '#3f5a3a', 0.6]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[40, 60, 20]} intensity={1.6} castShadow />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#6b7a70" roughness={0.95} metalness={0} />
      </mesh>

      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#d8c68d" roughness={0.6} metalness={0} />
      </mesh>

      <OrbitControls />
    </Canvas>
  )
}
