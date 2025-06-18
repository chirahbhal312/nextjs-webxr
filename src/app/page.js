'use client'

import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { XR, createXRStore } from '@react-three/xr'

export default function Home() {
  const [red, setRed] = useState(false)
  const store = createXRStore()

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <button
        style={{
          position: 'absolute',
          zIndex: 1,
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '0.5rem 1rem',
        }}
        onClick={() => store.enterAR()}
      >
        Enter AR
      </button>

      <Canvas>
        <XR store={store} sessionInit={{ requiredFeatures: ['hit-test'] }}>
          <ambientLight />
          <pointLight position={[10, 10, 10]} />

          <mesh
            position={[0, 0, -1]}
            onClick={() => setRed((s) => !s)}
          >
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color={red ? 'red' : 'blue'} />
          </mesh>
        </XR>
      </Canvas>
    </div>
  )
}
