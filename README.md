# Mesh-Slicer
Browser based tool to slice 3D meshes into independent pieces.

Framework - Three.js

Shading Model - PBR, env map, combination of ambient and direction lights

Third Party Tools -
    GLTF loader - To load gltf models
    HDRLoader - To load hdr texture to add in environment
    three-mesh-bvh - To use bvh, to accelerate and optimize the triangle filtering while splitting

Geometry Slicing Approach-
    > Create a plane using the end points given by the user, normal to the camera direction. \n
    > Sort triangles into 3 arrays, left of plane, right of plane and the triangles which are being intersected by plane. Sorting is done using distance from the plane +ve means to the right, -ve means to the left, intersecting triangles has mixed distance of each vertex.
    > Apply splitting logic on intersected triangles. Calculate the intersection points of the triangle edges by the   plane.
    > Create 3 new triangles, 2 will be either in front of plane, 1 in the back of plane , or vice-versa.
    > Using the intersection points, create loops, create planes out of that loop and merge with the original split part of model.
    > Compute the same process for UVs to split texures as well.

Known Issues / Incomplete areas - 
    1. only single loops are handled for now while cap creation.
    2. Multi cuts are not working as expected. Initial model is loaded in the CutManager, so it cuts the original model instead of new Splitted models.
    3. Some times splitting line goes in opposite direction of being dragged.


