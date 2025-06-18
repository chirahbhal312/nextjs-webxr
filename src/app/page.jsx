import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';

export default function Home() {
  const mountRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    const container = mountRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.01, 100);
    camera.position.set(2, 2, 4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);
    container.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

    const controls = new OrbitControls(camera, renderer.domElement);
    renderer.xr.addEventListener('sessionstart', () => (controls.enabled = false));
    renderer.xr.addEventListener('sessionend', () => (controls.enabled = true));

    const listener = new THREE.AudioListener();
    camera.add(listener);
    scene.add(new THREE.AmbientLight(0xffffff, 1));

    const gltfLoader = new GLTFLoader();
    const fbxLoader = new FBXLoader();

    const clock = new THREE.Clock();
    let mixer = null;
    const meshList = [];
    const audioList = [];
    let animationList = [];

    let hitTestSource = null;
    let hitTestSourceRequested = false;
    let placedModel = null;
    let modelPlaced = false;

    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.05, 0.08, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const dragPlane = new THREE.Plane();
    const dragIntersection = new THREE.Vector3();
    const dragOffset = new THREE.Vector3();
    let isDragging = false;
    let initialDistance = 0;
    let initialScale = 1;
    let rotationStartAngle = 0;
    let initialRotationY = 0;

    function processModel(model, animations = []) {
      if (placedModel) scene.remove(placedModel);
      placedModel = model;

      meshList.length = 0;
      audioList.length = 0;
      animationList = animations;

      model.traverse(child => {
        if (child.isMesh) meshList.push(child);
        if (child.type === 'Audio') audioList.push(child);
      });

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      const sizeVec = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
      const scale = Math.min(1, 0.6 / maxDim);
      model.scale.setScalar(scale);
      model.position.y = 0;

      mixer = animations.length ? new THREE.AnimationMixer(model) : null;

      document.getElementById('meshButtons').innerHTML = '';
      animations.forEach((clip, i) => {
        const btn = document.createElement('button');
        btn.textContent = clip.name || `Animation ${i + 1}`;
        btn.onclick = () => {
          mixer.stopAllAction();
          mixer.clipAction(clip).reset().play();
        };
        document.getElementById('meshButtons').appendChild(btn);
      });

      document.getElementById('animations').textContent = JSON.stringify(animations.map(a => a.name), null, 2);
      document.getElementById('audios').textContent = JSON.stringify(audioList.map((_, i) => `Audio ${i}`), null, 2);
      document.getElementById('selectedMesh').textContent = 'None';
    }

    inputRef.current.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = evt => {
        const buffer = evt.target.result;
        if (file.name.toLowerCase().endsWith('.fbx')) {
          const model = fbxLoader.parse(buffer, '');
          processModel(model, []);
        } else {
          gltfLoader.parse(buffer, '', gltf => processModel(gltf.scene, gltf.animations));
        }
      };
      reader.readAsArrayBuffer(file);
    };

    function handleRaycast(raycaster) {
      const intersects = raycaster.intersectObjects(meshList, true);
      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        document.getElementById('selectedMesh').textContent = mesh.name || 'Unnamed Mesh';
        const idx = meshList.indexOf(mesh);
        if (idx >= 0 && audioList[idx]) {
          audioList[idx].setVolume(1.0);
          audioList[idx].play();
        }
        if (mixer && mesh.name) {
          const clip = animationList.find(c => c.name === mesh.name);
          if (clip) {
            mixer.stopAllAction();
            mixer.clipAction(clip).reset().play();
          }
        }
      }
    }

    window.addEventListener('click', e => {
      mouse.x = (e.clientX / container.clientWidth) * 2 - 1;
      mouse.y = -(e.clientY / container.clientHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      handleRaycast(raycaster);
    });

    const controller = renderer.xr.getController(0);
    controller.addEventListener('select', () => {
      if (reticle.visible && placedModel && !modelPlaced) {
        placedModel.position.setFromMatrixPosition(reticle.matrix);
        scene.add(placedModel);
        reticle.visible = false;
        hitTestSourceRequested = true;
        hitTestSource = null;
        modelPlaced = true;
      } else {
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).transformDirection(controller.matrixWorld);
        handleRaycast(raycaster);
      }
    });
    scene.add(controller);

    window.addEventListener('touchstart', e => {
      if (!placedModel) return;
      if (e.touches.length === 1) {
        isDragging = true;
        const touch = e.touches[0];
        const ndc = new THREE.Vector2((touch.clientX / container.clientWidth) * 2 - 1, -(touch.clientY / container.clientHeight) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        dragPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).normalize(), placedModel.position);
        raycaster.ray.intersectPlane(dragPlane, dragIntersection);
        dragOffset.copy(dragIntersection).sub(placedModel.position);
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialDistance = Math.hypot(dx, dy);
        initialScale = placedModel.scale.x;
        rotationStartAngle = Math.atan2(dy, dx);
        initialRotationY = placedModel.rotation.y;
      }
    });

    window.addEventListener('touchmove', e => {
      if (!placedModel) return;
      if (e.touches.length === 1 && isDragging) {
        const touch = e.touches[0];
        const ndc = new THREE.Vector2((touch.clientX / container.clientWidth) * 2 - 1, -(touch.clientY / container.clientHeight) * 2 + 1);
        raycaster.setFromCamera(ndc, camera);
        raycaster.ray.intersectPlane(dragPlane, dragIntersection);
        placedModel.position.copy(dragIntersection.sub(dragOffset));
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const newDistance = Math.hypot(dx, dy);
        const scale = initialScale * (newDistance / initialDistance);
        placedModel.scale.set(scale, scale, scale);
        const angle = Math.atan2(dy, dx);
        placedModel.rotation.y = initialRotationY + (angle - rotationStartAngle);
      }
    });

    window.addEventListener('touchend', () => (isDragging = false));

    function animate(time, frame) {
      mixer?.update(clock.getDelta());
      if (frame && !modelPlaced) {
        const ref = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();
        if (!hitTestSourceRequested) {
          session.requestReferenceSpace('viewer').then(vref =>
            session.requestHitTestSource({ space: vref }).then(src => (hitTestSource = src))
          );
          session.addEventListener('end', () => {
            hitTestSourceRequested = false;
            hitTestSource = null;
            modelPlaced = false;
          });
          hitTestSourceRequested = true;
        }
        if (hitTestSource) {
          const hits = frame.getHitTestResults(hitTestSource);
          if (hits.length > 0) {
            const pose = hits[0].getPose(ref);
            reticle.visible = true;
            reticle.matrix.fromArray(pose.transform.matrix);
          } else reticle.visible = false;
        }
      }
      renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(animate);

    window.addEventListener('resize', () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
  }, []);

  return (
    <>
      <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />
      <input ref={inputRef} type="file" id="modelInput" accept=".glb,.gltf,.fbx" style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }} />
      <div id="infoPanel" style={{
        position: 'absolute', top: 0, right: 0, width: 300,
        height: '100%', overflowY: 'auto', background: '#111',
        color: '#eee', padding: 15, fontSize: 14, zIndex: 10
      }}>
        <h3>Animations</h3>
        <div id="meshButtons">Load a model to see animations...</div>
        <h3>All Animation Names</h3><pre id="animations"></pre>
        <h3>Audios</h3><pre id="audios"></pre>
        <h3>Selected Mesh</h3><div id="selectedMesh">None</div>
      </div>
    </>
  );
}
