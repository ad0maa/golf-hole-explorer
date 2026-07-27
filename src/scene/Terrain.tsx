import type { TerrainData } from '../lib/terrain'

export function Terrain({ terrain }: { terrain: TerrainData }) {
  return (
    <mesh geometry={terrain.geometry} receiveShadow castShadow>
      <meshStandardMaterial vertexColors flatShading={false} roughness={0.95} metalness={0} />
    </mesh>
  )
}
