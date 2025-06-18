import { useState } from 'react'
import ARViewer from '../components/ARViewer'

export default function Home() {
  const [url, setUrl] = useState('')

  return (
    <div>
      <input
        type="file"
        accept=".glb,.gltf"
        onChange={e => {
          const file = e.target.files[0]
          if (!file) return
          const blobURL = URL.createObjectURL(file)
          setUrl(blobURL)
        }}
        style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}
      />
      <ARViewer url={url} />
    </div>
  )
}
