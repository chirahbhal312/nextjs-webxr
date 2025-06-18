'use client'

import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { ARButton, useHitTest, useXREvent } from '@react-three/xr'
import * as THREE from 'three'

export default function XRContent({ url }) {
  const [model, setModel] = useState(null)
  const gltf = useGLTF(url || '', true)
  const mixer = useRef()
  const clips = useRef([])
  const reticle = useRef()

  useEffect(() => {
    if (!gltf.scene) return
    const scene = gltf.scene.clone()
    const { animations } = gltf

    const box = new THREE.Box3().setFromObject(scene)
    scene.position.sub(box.getCenter(new THREE.Vector3()))
    const scale = Math.min(1, 0.6 / Math.max(...box.getSize(new THREE.Vector3()).toArray()))
    scene.scale.setScalar(scale)

    mixer.current = animations.length ? new THREE.AnimationMixer(scene) : null
    clips.current = animations
    setModel(scene)
  }, [gltf])

  useHitTest((hitMatrix) => {
    reticle.current.visible = true
    hitMatrix.decompose(reticle.current.position, reticle.current.quaternion, reticle.current.scale)
  })

  useXREvent('select', () => {
    if (model && reticle.current.visible) {
      model.position.copy(reticle.current.position)
      reticle.current.visible = false
    }
  })

  useFrame((_, delta) => mixer.current?.update(delta))

  return (
    <>
      <ARButton />
      <mesh ref={reticle} visible={false}>
        <ringGeometry args={[0.05, 0.08, 32]} />
        <meshBasicMaterial color="lime" />
      </mesh>
      {model && <primitive object={model} />}
      {clips.current.length > 0 && (
        <div style={{ position:'absolute', top:10, left:10, background:'#111', color:'#eee', padding:10, fontSize:14 }}>
          {clips.current.map((clip, idx) => (
            <button
              key={idx}
              onClick={() => {
                mixer.current.stopAllAction()
                mixer.current.clipAction(clip)?.play()
              }}
              style={{ display:'block', marginBottom:5 }}
            >
              {clip.name || `Clip ${idx+1}`}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
