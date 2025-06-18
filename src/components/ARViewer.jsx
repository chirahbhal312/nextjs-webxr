'use client'

import { ARCanvas, XR } from '@react-three/xr'
import { OrbitControls } from '@react-three/drei'
import XRContent from './XRContent'

export default function ARViewer({ url }) {
  return (
    <ARCanvas sessionInit={{ requiredFeatures: ['hit-test'] }}>
      <XR>
        <OrbitControls />
        <XRContent url={url} />
      </XR>
    </ARCanvas>
  )
}
