class RoadChunk extends GameObject3D {
  constructor(scene, zStart, length) {
    super(scene);
    this.name = 'RoadChunk';
    this.zStart = zStart;
    this.length = length;
    this.position.set(0, 0, zStart + length / 2);
    this.createMesh();
  }

  createMesh() {
    const group = new THREE.Group();

    // Road
    const roadGeom = new THREE.PlaneGeometry(20, this.length);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x3a3a44,
      roughness: 0.85,
      metalness: 0.05,
    });
    const road = new THREE.Mesh(roadGeom, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.receiveShadow = true;
    group.add(road);

    // Center dashed line
    const dashCount = Math.floor(this.length / 6);
    const dashGeom = new THREE.PlaneGeometry(0.25, 3);
    const dashMat = new THREE.MeshStandardMaterial({
      color: 0xffee66,
      emissive: 0x554400,
      emissiveIntensity: 0.4,
      roughness: 0.6,
    });
    for (let i = 0; i < dashCount; i++) {
      const d = new THREE.Mesh(dashGeom, dashMat);
      d.rotation.x = -Math.PI / 2;
      d.position.set(0, 0.06, -this.length / 2 + 3 + i * 6);
      group.add(d);
    }

    // Lane divider lines (white)
    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      roughness: 0.7,
    });
    const laneLineGeom = new THREE.PlaneGeometry(0.15, this.length - 1);
    const lanePositions = [-6, -3, 3, 6];
    lanePositions.forEach((lx) => {
      const l = new THREE.Mesh(laneLineGeom, whiteMat);
      l.rotation.x = -Math.PI / 2;
      l.position.set(lx, 0.05, 0);
      group.add(l);
    });

    // Shoulders / grass
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x2a5a2a,
      roughness: 1.0,
    });
    const shoulderGeom = new THREE.PlaneGeometry(60, this.length);
    const leftGrass = new THREE.Mesh(shoulderGeom, grassMat);
    leftGrass.rotation.x = -Math.PI / 2;
    leftGrass.position.set(-40, -0.05, 0);
    leftGrass.receiveShadow = true;
    group.add(leftGrass);
    const rightGrass = new THREE.Mesh(shoulderGeom, grassMat);
    rightGrass.rotation.x = -Math.PI / 2;
    rightGrass.position.set(40, -0.05, 0);
    rightGrass.receiveShadow = true;
    group.add(rightGrass);

    // Guard rails (simple boxes)
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.7,
      roughness: 0.4,
    });
    const railGeom = new THREE.BoxGeometry(0.2, 0.8, this.length);
    const railL = new THREE.Mesh(railGeom, railMat);
    railL.position.set(-10.2, 0.4, 0);
    railL.castShadow = true;
    group.add(railL);
    const railR = new THREE.Mesh(railGeom, railMat);
    railR.position.set(10.2, 0.4, 0);
    railR.castShadow = true;
    group.add(railR);

    // Roadside trees / posts (deterministic per chunk)
    const rand = this._seededRand(this.zStart);
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x1e5030, roughness: 0.9 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a1a, roughness: 1.0 });
    const treesPerSide = Math.floor(this.length / 12);
    for (let s = -1; s <= 1; s += 2) {
      for (let i = 0; i < treesPerSide; i++) {
        if (rand() < 0.35) continue; // not every slot
        const x = s * (14 + rand() * 20);
        const z = -this.length / 2 + 6 + i * 12 + (rand() - 0.5) * 4;
        const scale = 0.8 + rand() * 0.9;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * scale, 0.25 * scale, 1.2 * scale, 6), trunkMat);
        trunk.position.set(x, 0.6 * scale, z);
        trunk.castShadow = true;
        group.add(trunk);
        const foliage = new THREE.Mesh(new THREE.ConeGeometry(1.2 * scale, 2.6 * scale, 6), treeMat);
        foliage.position.set(x, 1.2 * scale + 1.3 * scale, z);
        foliage.castShadow = true;
        group.add(foliage);
      }
    }

    this.mesh = group;
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  _seededRand(seed) {
    let s = Math.floor(seed) * 9301 + 49297;
    return function () {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }
}

