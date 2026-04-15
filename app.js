import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import CutManager from './cutManager';
import SelectionManager from './selectionControls';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

const loader = new GLTFLoader();

const canvas = document.getElementById('designCanvas');
const scene = new THREE.Scene();

new HDRLoader().load(
  '/citrus_orchard_road_puresky_1k.hdr',
  (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.background = texture;
  }
);

const camera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 2;

const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 10, 5);
dirLight.target.position.set(0, 0, 0);
scene.add(dirLight);
scene.add(dirLight.target);

const selectionControl = new SelectionManager(scene,camera, renderer, controls);
selectionControl.init();

const geometry = new THREE.BoxGeometry(1,1,1);
const material = new THREE.MeshStandardMaterial({color:0xff5000, side: THREE.DoubleSide});

let model = new THREE.Mesh(geometry, material);
scene.add(model);

const cutManager = new CutManager(model, camera, renderer, controls, selectionControl, scene);

const cutBtn = document.getElementById('cutBtn');

let cutEnabled = false;

cutBtn.addEventListener('click', () => {
  cutEnabled = !cutEnabled;

  if (cutEnabled) {
    cutManager.init();
    cutBtn.innerText = "Cut Mode ON";
    cutBtn.style.background = "#e74c3c";
  } else {
    cutManager.dispose();
    cutBtn.innerText = "Enable Cut Mode";
    cutBtn.style.background = "#222";
  }
});

function animate() {
	requestAnimationFrame( animate );
	renderer.render( scene, camera );
    controls.update();
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function uploadModel(event){
    const file = event.target.files[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    loader.load(url, (gltf) => {
        // remove old model
        if (model) {
            scene.remove(model);
        }

        const uploadedModel = gltf.scene.children[0];
        uploadedModel.geometry.computeVertexNormals();

        // center uploadedModel
        const box = new THREE.Box3().setFromObject(uploadedModel);
        const center = new THREE.Vector3();
        box.getCenter(center);

        uploadedModel.position.sub(center);

        scene.add(uploadedModel);

        model = uploadedModel;
        selectionControl.selected = null;
        cutManager.model = model;
    });
}

const fileInput = document.getElementById('fileInput');

fileInput.addEventListener('change', uploadModel);