'use client'
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Uploader() {
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('model', file);

    setUploading(true);
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const json = await res.json();
    sessionStorage.setItem('model', json.base64);
    sessionStorage.setItem('modelType', json.type);
    setUploading(false);
    alert('Model stored in sessionStorage. Redirecting...');
    router.push('/');
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Upload 3D Model (.glb, .gltf, .fbx)</h1>
      <input type="file" onChange={handleUpload} accept=".glb,.gltf,.fbx" />
      {uploading && <p>Uploading and processing...</p>}
    </div>
  );
}
