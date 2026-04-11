import * as THREE from 'three';

export default class MeshCutter {

    static cut(mesh, plane) {
        const geometry = mesh.geometry.clone().toNonIndexed();
        const pos = geometry.attributes.position.array;

        const front = [];
        const back = [];

        const a = new THREE.Vector3();
        const b = new THREE.Vector3();
        const c = new THREE.Vector3();

        for (let i = 0; i < pos.length; i += 9) {

            a.set(pos[i], pos[i+1], pos[i+2]);
            b.set(pos[i+3], pos[i+4], pos[i+5]);
            c.set(pos[i+6], pos[i+7], pos[i+8]);

            const d1 = plane.distanceToPoint(a);
            const d2 = plane.distanceToPoint(b);
            const d3 = plane.distanceToPoint(c);

            const sideA = d1 >= 0;
            const sideB = d2 >= 0;
            const sideC = d3 >= 0;

            const totalFront = sideA + sideB + sideC;

            if (totalFront === 3) {
                this._pushTri(front, a, b, c);
                continue;
            }

            if (totalFront === 0) {
                this._pushTri(back, a, b, c);
                continue;
            }

            this.splitTriangle(a, b, c, d1, d2, d3, plane, front, back);
        }

        const matA = new THREE.MeshBasicMaterial({ color: 0xff5555, side: THREE.DoubleSide });
        const matB = new THREE.MeshBasicMaterial({ color: 0x5555ff, side: THREE.DoubleSide });

        const meshA = this.buildMesh(front, matA);
        const meshB = this.buildMesh(back, matB);

        return [meshA, meshB];

    }

    static _pushTri(arr, a, b, c) {
        arr.push(
            a.x, a.y, a.z,
            b.x, b.y, b.z,
            c.x, c.y, c.z
        );
    }

    static intersect(p1, p2, d1, d2) {
        const t = d1 / (d1 - d2);
        return new THREE.Vector3().lerpVectors(p1, p2, t);
    }

    static splitTriangle(a, b, c, d1, d2, d3, plane, front, back) {

        const pts = [a, b, c];
        const dists = [d1, d2, d3];
        const sides = dists.map(d => d >= 0);

        const frontPts = [];
        const backPts = [];

        for (let i = 0; i < 3; i++) {
        if (sides[i]) frontPts.push(pts[i]);
        else backPts.push(pts[i]);
        }

        if (frontPts.length === 1) {

            const f = frontPts[0];
            const b1 = backPts[0];
            const b2 = backPts[1];

            const i1 = this.intersect(f, b1, plane.distanceToPoint(f), plane.distanceToPoint(b1));
            const i2 = this.intersect(f, b2, plane.distanceToPoint(f), plane.distanceToPoint(b2));

            this._pushTri(front, f, i1, i2);

            this._pushTri(back, b1, b2, i1);
            this._pushTri(back, b2, i2, i1);
        }

        else if (frontPts.length === 2) {

            const f1 = frontPts[0];
            const f2 = frontPts[1];
            const b = backPts[0];

            const i1 = this.intersect(f1, b, plane.distanceToPoint(f1), plane.distanceToPoint(b));
            const i2 = this.intersect(f2, b, plane.distanceToPoint(f2), plane.distanceToPoint(b));

            this._pushTri(back, b, i1, i2);

            this._pushTri(front, f1, f2, i1);
            this._pushTri(front, f2, i2, i1);
        }

    }

    static buildMesh(vertices, material) {
        if (vertices.length === 0) return null;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(vertices, 3)
        );

        geometry.computeVertexNormals();

        return new THREE.Mesh(geometry, material);

    }
}
