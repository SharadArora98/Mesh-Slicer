import * as THREE from 'three';

export default class MeshCutter {

    static cut(mesh, plane) {
        const cutEdges = [];
        mesh.updateMatrixWorld(true);

        let geometry = mesh.geometry.clone();
        geometry.applyMatrix4(mesh.matrixWorld);

        geometry.deleteAttribute('normal');
        geometry = geometry.toNonIndexed();

        const pos = geometry.attributes.position.array;
        const uvAttr = geometry.attributes.uv;
        const uv = uvAttr ? uvAttr.array : null;

        const front = [];
        const back = [];

        for (let i = 0; i < pos.length; i += 9) {

            // positions
            const a = new THREE.Vector3(pos[i], pos[i+1], pos[i+2]);
            const b = new THREE.Vector3(pos[i+3], pos[i+4], pos[i+5]);
            const c = new THREE.Vector3(pos[i+6], pos[i+7], pos[i+8]);

            // UVs (correct indexing)
            const uvIndex = (i / 3) * 2;

            const aUV = uv ? new THREE.Vector2(uv[uvIndex], uv[uvIndex + 1]) : new THREE.Vector2();
            const bUV = uv ? new THREE.Vector2(uv[uvIndex + 2], uv[uvIndex + 3]) : new THREE.Vector2();
            const cUV = uv ? new THREE.Vector2(uv[uvIndex + 4], uv[uvIndex + 5]) : new THREE.Vector2();

            const d1 = plane.distanceToPoint(a);
            const d2 = plane.distanceToPoint(b);
            const d3 = plane.distanceToPoint(c);

            const sideA = d1 >= 0;
            const sideB = d2 >= 0;
            const sideC = d3 >= 0;

            const totalFront = sideA + sideB + sideC;

            const va = { pos: a, uv: aUV };
            const vb = { pos: b, uv: bUV };
            const vc = { pos: c, uv: cUV };

            if (totalFront === 3) {
                this.pushTri(front, va, vb, vc);
                continue;
            }

            if (totalFront === 0) {
                this.pushTri(back, va, vb, vc);
                continue;
            }

            this.splitTriangle(va, vb, vc, d1, d2, d3, plane, front, back, cutEdges);
        }

        let meshA = this.buildMesh(front, mesh.material.clone());
        let meshB = this.buildMesh(back, mesh.material.clone());
        if (cutEdges.length > 0) {

            const loop = this.buildLoop([...cutEdges]);

            const cap = this.buildCap(loop, plane);

            if (cap) {
                meshA.add(cap);
                meshB.add(cap.clone());
            }
        }

        return [meshA, meshB];

    }

    static pushTri(arr, v1, v2, v3) {
        arr.push(v1, v2, v3);
    }

    static intersect(v1, v2, d1, d2) {

        const t = d1 / (d1 - d2);

        return {
            pos: new THREE.Vector3().lerpVectors(v1.pos, v2.pos, t),
            uv: new THREE.Vector2().lerpVectors(v1.uv, v2.uv, t)
        };
    }

    static splitTriangle(a, b, c, d1, d2, d3, plane, front, back, cutEdges) {

        const pts = [a, b, c];
        const dists = [d1, d2, d3];

        const frontPts = [];
        const backPts = [];

        for (let i = 0; i < 3; i++) {
            if (dists[i]>=0) frontPts.push(pts[i]);
            else backPts.push(pts[i]);
        }

        // 1 front, 2 back
        if (frontPts.length === 1) {

            const f = frontPts[0];
            const b1 = backPts[0];
            const b2 = backPts[1];

            const i1 = this.intersect(f, b1, plane.distanceToPoint(f.pos), plane.distanceToPoint(b1.pos));
            const i2 = this.intersect(f, b2, plane.distanceToPoint(f.pos), plane.distanceToPoint(b2.pos));
            cutEdges.push([i1.pos.clone(), i2.pos.clone()]);
            this.pushTri(front, f, i1, i2);

            this.pushTri(back, b1, b2, i1);
            this.pushTri(back, b2, i2, i1);
        }

        // 2 front, 1 back
        else if (frontPts.length === 2) {
            const f1 = frontPts[0];
            const f2 = frontPts[1];
            const b = backPts[0];

            const i1 = this.intersect(f1, b, plane.distanceToPoint(f1.pos), plane.distanceToPoint(b.pos));
            const i2 = this.intersect(f2, b, plane.distanceToPoint(f2.pos), plane.distanceToPoint(b.pos));
            cutEdges.push([i1.pos.clone(), i2.pos.clone()]);
            this.pushTri(back, b, i1, i2);

            this.pushTri(front, f1, f2, i1);
            this.pushTri(front, f2, i2, i1);
        }

    }

    static buildMesh(vertices, material) {

        if (vertices.length === 0) return null;

        const positions = [];
        const uvs = [];

        vertices.forEach(v => {
            positions.push(v.pos.x, v.pos.y, v.pos.z);
            uvs.push(v.uv.x, v.uv.y);
        });

        const geometry = new THREE.BufferGeometry();

        geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
        );

        geometry.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(uvs, 2)
        );

        geometry.computeVertexNormals();

        return new THREE.Mesh(geometry, material);

    }

    static buildLoop(edges) {
        const loop = [edges[0][0].clone(), edges[0][1].clone()];
        edges.splice(0, 1);
        let guard = 0;

        while (edges.length && guard < 10000) {
            guard++;
            const last = loop[loop.length - 1];

            for (let i = 0; i < edges.length; i++) {
                const [a, b] = edges[i];

                if (a.distanceTo(last) < 1e-5) {
                    loop.push(b);
                    edges.splice(i, 1);
                    break;
                }

                if (b.distanceTo(last) < 1e-5) {
                    loop.push(a);
                    edges.splice(i, 1);
                    break;
                }
            }
        }

        return loop;
    }

    static buildCap(loop, plane) {

        if (loop.length < 3) return null;

        const normal = plane.normal;

        // build local basis
        const tangent = new THREE.Vector3(1, 0, 0);
        if (Math.abs(normal.dot(tangent)) > 0.9) {
            tangent.set(0, 1, 0);
        }

        tangent.cross(normal).normalize();
        const bitangent = new THREE.Vector3().crossVectors(normal, tangent);

        // project to 2D
        const pts2D = loop.map(p => new THREE.Vector2(
            p.dot(tangent),
            p.dot(bitangent)
        ));

        // triangulate
        const indices = THREE.ShapeUtils.triangulateShape(pts2D, []);

        const vertices = [];
        const uvs = [];

        indices.forEach(tri => {
            tri.forEach(i => {
                const p = loop[i];

                vertices.push(p.x, p.y, p.z);

                // simple planar UV
                uvs.push(pts2D[i].x, pts2D[i].y);
            });
        });

        const geo = new THREE.BufferGeometry();

        geo.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(vertices, 3)
        );

        geo.setAttribute(
            'uv',
            new THREE.Float32BufferAttribute(uvs, 2)
        );

        geo.computeVertexNormals();

        return new THREE.Mesh(
            geo,
            new THREE.MeshStandardMaterial({
                color: 0xffcc88,
                side: THREE.DoubleSide
            })
        );
    }
}
