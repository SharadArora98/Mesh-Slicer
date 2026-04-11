import * as THREE from 'three';

export default class SelectionManager {

    constructor(scene, camera, renderer, controls) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.controls = controls;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.selected = null;

        this.isDragging = false;
        this.dragPlane = new THREE.Plane();
        this.offset = new THREE.Vector3();

        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
    }

    init() {
        const canvas = this.renderer.domElement;

        canvas.addEventListener('mousedown', this.onMouseDown);
        canvas.addEventListener('mousemove', this.onMouseMove);
        canvas.addEventListener('mouseup', this.onMouseUp);
    }

    dispose() {
        const canvas = this.renderer.domElement;

        canvas.removeEventListener('mousedown', this.onMouseDown);
        canvas.removeEventListener('mousemove', this.onMouseMove);
        canvas.removeEventListener('mouseup', this.onMouseUp);
    }

    getMouseCoord(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();

        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    }

    getMeshes() {
        const meshes = [];
        this.scene.traverse(obj => {
        if (obj.isMesh) meshes.push(obj);
        });
        return meshes;
    }

    onMouseDown(event) {
        this.getMouseCoord(event);

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const hits = this.raycaster.intersectObjects(this.getMeshes(), true);

        if (hits.length > 0) {
        const hit = hits[0];

        this.select(hit.object);

        this.isDragging = true;

        // disable orbit controls
        if (this.controls) this.controls.enabled = false;

        const normal = new THREE.Vector3();
        this.camera.getWorldDirection(normal);

        this.dragPlane.setFromNormalAndCoplanarPoint(normal, hit.point);

        this.offset.copy(hit.object.position).sub(hit.point);
        } else {
        this.clearSelection();
        }

    }

    onMouseMove(event) {
        if (!this.isDragging || !this.selected) return;

        this.getMouseCoord(event);

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const intersection = new THREE.Vector3();
        this.raycaster.ray.intersectPlane(this.dragPlane, intersection);

        if (intersection) {
            this.selected.position.copy(intersection.add(this.offset));
        }

    }
    onMouseUp() {
        if (this.isDragging) {
            this.isDragging = false;
            if (this.controls) this.controls.enabled = true;
        }

    }

    select(obj) {
        this.selected = obj;
    }

    clearSelection() {
        this.selected = null;
    }
}
