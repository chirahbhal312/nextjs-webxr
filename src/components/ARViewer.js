'use client'
import { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { XR, ARButton, useHitTest, useController } from '@react-three/xr'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

export default function ARViewer({ url }) {
  const [model, setModel] = useState()
  const [animations, setAnimations] = useState([])
  const mixerRef = useRef()
  const reticle = useRef()
  const meshList = useRef([])
  const audioList = useRef([])
  const animationList = useRef([])

  // 1️⃣ Load model (GLTF only; you can add FBX similarly)
  useEffect(() => {
    if (!url) return
    useGLTF.preload(url)
    const { scene, animations: anims } = useGLTF(url)
    processModel(scene, anims)
    // eslint-disable-next-line
  }, [url])

  const processModel = (gltfScene, anims) => {
    sceneClear()
    setModel(gltfScene)
    animationList.current = anims

    // Center + scale
    const box = new THREE.Box3().setFromObject(gltfScene)
    const center = box.getCenter(new THREE.Vector3())
    gltfScene.position.sub(center)
    const size = box.getSize(new THREE.Vector3())
    const scale = Math.min(1, 0.6 / Math.max(size.x, size.y, size.z))
    gltfScene.scale.setScalar(scale)

    mixerRef.current = anims.length ? new THREE.AnimationMixer(gltfScene) : null

    // Build mesh/audio list
    meshList.current = []
    audioList.current = []
    gltfScene.traverse(child => {
      if (child.isMesh) meshList.current.push(child)
      if (child.type === 'Audio') audioList.current.push(child)
    })
  }

  const sceneClear = () => {
    animationList.current = []
    meshList.current = []
    audioList.current = []
    mixerRef.current = null
    setModel(null)
  }

  // 2️⃣ Hit-test reticle
  useHitTest((hitMatrix) => {
    reticle.current.visible = true
    reticle.current.matrix.fromArray(hitMatrix)
  })

  const controller = useController()

  // 3️⃣ Handle user-place model + orbit toggle
  function onSelect() {
    if (model && reticle.current.visible) {
      model.position.setFromMatrixPosition(reticle.current.matrix)
      reticle.current.visible = false
    }
  }

  useEffect(() => {
    controller?.addEventListener('select', onSelect)
    return () => controller?.removeEventListener('select', onSelect)
  }, [controller, model])

  // 4️⃣ Animate mixer
  useFrame((_, delta) => mixerRef.current?.update(delta))

  return (
    <>
      <Canvas shadows>
        <XR sessionInit={{ requiredFeatures: ['hit-test'] }}>
          <ambientLight intensity={1} />
          <pointLight position={[10, 10, 10]} />

          <primitive ref={reticle} object={new THREE.Mesh(
            new THREE.RingGeometry(0.05, 0.08, 32).rotateX(-Math.PI/2),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
          )} visible={false} />

          {model && <primitive object={model} />}

          <OrbitControls enabled={true} />
          <ARButton />

          <mesh />
        </XR>
      </Canvas>

      {/* UI panels for animations */}
      <div style={{
         position: 'absolute', top: 10, left: 10, background: '#111', color: '#eee',
         padding: 10, maxWidth: 300, fontSize: 14
      }}>
        <h3>Animations</h3>
        {animationList.current.map((clip, i) => (
          <button
            key={i}
            onClick={() => {
              mixerRef.current.stopAllAction()
              mixerRef.current.clipAction(clip).play()
            }}
            style={{ display: 'block', width: '100%', marginBottom: 5 }}
          >
            {clip.name || `Anim ${i + 1}`}
          </button>
        ))}

        <h3>All Animation Names</h3>
        <pre>
          {JSON.stringify(animationList.current.map(a => a.name), null, 2)}
        </pre>

        <h3>Audios</h3>
        <pre>
          {JSON.stringify(audioList.current.map((_,i)=>`Audio ${i}`), null, 2)}
        </pre>
      </div>
    </>
  )
}
