import * as THREE from 'three';
import MeshCutter from './meshCutter';

export default class CutManager {
    constructor(mesh, camera, renderer, controls, selectionControl, scene) {
        this.model = mesh;
        this.camera = camera;
        this.renderer = renderer;
        this.controls = controls;
        this.selectionControl = selectionControl;
        this.scene = scene;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.isActive = false;
        this.isDrawing = false;

        this.startScreen = null;
        this.endScreen = null;

        this.startPoint = null;
        this.endPoint = null;

        this.line = null;

        // bind once
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);

    }

    init() {
        if (this.isActive) return;

        const canvas = this.renderer.domElement;

        canvas.addEventListener('mousedown', this.onMouseDown);
        canvas.addEventListener('mousemove', this.onMouseMove);
        canvas.addEventListener('mouseup', this.onMouseUp);

        this.isActive = true;
    }

    getMouseCoords(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();

        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    createLine(start, end) {
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);

        const material = new THREE.LineBasicMaterial({
        color: 0x0099ff,
        depthTest: false
        });

        this.line = new THREE.Line(geometry, material);
        this.scene.add(this.line);

    }

    updateLine(start, end) {
        if (!this.line) return;

        const pos = this.line.geometry.attributes.position.array;

        pos[0] = start.x;
        pos[1] = start.y;
        pos[2] = start.z;

        pos[3] = end.x;
        pos[4] = end.y;
        pos[5] = end.z;

        this.line.geometry.attributes.position.needsUpdate = true;
    }

    removeLine() {
        if (!this.line) return;

        this.scene.remove(this.line);
        this.line.geometry.dispose();
        this.line.material.dispose();
        this.line = null;
    }

    onMouseDown(event) {
        if (!this.isActive) return;

        this.getMouseCoords(event);

        this.isDrawing = true;
        this.startScreen = this.mouse.clone();

        if (this.controls) this.controls.enabled = false;
        if (this.selectionControl) this.selectionControl.dispose();
    }

    onMouseMove(event) {
        if (!this.isDrawing) return;

        this.getMouseCoords(event);
        this.endScreen = this.mouse.clone();

        const startWorld = this.screenToWorldOnPlane(this.startScreen);
        const endWorld = this.screenToWorldOnPlane(this.endScreen);

        if (!this.line) {
        this.createLine(startWorld, endWorld);
        } else {
        this.updateLine(startWorld, endWorld);
        }

    }

    onMouseUp(event) {
        if (!this.isDrawing) return;

        this.getMouseCoords(event);
        this.endScreen = this.mouse.clone();

        this.isDrawing = false;

        if (this.controls) this.controls.enabled = true;
        if (this.selectionControl) this.selectionControl.init();

        this.startPoint = this.raycastFromScreen(this.startScreen);
        this.endPoint = this.raycastFromScreen(this.endScreen);
        if (this.startPoint && this.endPoint) {
        this.onCutComplete(this.startPoint, this.endPoint);
        }

        this.removeLine();

        this.startScreen = null;
        this.endScreen = null;

    }

    screenToWorldOnPlane(mouseCord, planeZ = 0) {
        const vector = new THREE.Vector3(mouseCord.x, mouseCord.y, 0.5).unproject(this.camera);

        const dir = vector.sub(this.camera.position).normalize();
        const distance = (planeZ - this.camera.position.z) / dir.z;

        return this.camera.position.clone().add(dir.multiplyScalar(distance));
    }

    raycastFromScreen(lineCoord) {
        this.raycaster.setFromCamera(lineCoord, this.camera);
        // const hits = this.raycaster.intersectObject(this.model, true);
        // console.log(hits, lineCoord);
        // if (hits.length) {
        //     return hits[0].point.clone();
        // }
        const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        const point = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(plane, point);

        return point;
        // return hits.length ? hits[0].point.clone() : null;
    }

    onCutComplete(start, end) {
        const direction = new THREE.Vector3().subVectors(end, start).normalize();

        const camDir = new THREE.Vector3();
        this.camera.getWorldDirection(camDir);

        const normal = new THREE.Vector3().crossVectors(direction, camDir).normalize();

        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, start);
        const [meshA, meshB] = MeshCutter.cut(this.model, plane);
        if (meshA && meshB) {
            this.scene.remove(this.model);
            this.scene.add(meshA);
            this.scene.add(meshB);
        }
    }

    dispose() {
        const canvas = this.renderer.domElement;

        canvas.removeEventListener('mousedown', this._onMouseDown);
        canvas.removeEventListener('mousemove', this._onMouseMove);
        canvas.removeEventListener('mouseup', this._onMouseUp);

        this.isActive = false;
    }
}
