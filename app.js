import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import CutManager from './cutManager';

const canvas = document.getElementById('designCanvas');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75,window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 2;

const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const geometry = new THREE.BoxGeometry(1,1,1);
const material = new THREE.MeshBasicMaterial({color:0xff0000});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const cutManager = new CutManager(mesh, camera, renderer, controls, scene);

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