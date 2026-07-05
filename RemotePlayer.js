class RemotePlayer extends GameObject3D {
  constructor(scene, playerIndex, carTypeIndex) {
    super(scene);
    this.name = 'RemotePlayer';
    this.playerIndex = playerIndex || 0;
    this.carTypeIndex = carTypeIndex || 0;
    this.targetPos = new THREE.Vector3();
    this.targetRotY = 0;
    this.wheelSpin = 0;
    this.lastPos = new THREE.Vector3();
    this.createMesh();
  }

  setCarType(carTypeIndex) {
    if (carTypeIndex === this.carTypeIndex) return;
    this.carTypeIndex = carTypeIndex;
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
          else c.material.dispose();
        }
      });
    }
    this.createMesh();
  }

  createMesh() {
    // Slightly hue-shift remote cars so they read as "other players"
    const palettes = [0x50e070, 0xa060ff, 0xffa030, 0x30d0e0, 0xff70b0, 0xf0f050, 0x60a0ff, 0xff5050];
    const tint = palettes[this.playerIndex % palettes.length];
    const built = CarFactory_build(this.carTypeIndex, tint);
    this.mesh = built.group;
    this.wheels = built.wheels;
    this.mesh.position.copy(this.position);
    this.mesh.rotation.copy(this.rotation);
    this.scene.add(this.mesh);
  }

  update(dt) {
    this.lastPos.copy(this.position);
    this.position.lerp(this.targetPos, Math.min(1, dt * 8));
    // Shortest-arc angle lerp
    let dy = this.targetRotY - this.rotation.y;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.rotation.y += dy * Math.min(1, dt * 8);

    // Wheel spin from delta position
    const dz = this.position.z - this.lastPos.z;
    if (this.wheels) {
      this.wheelSpin += dz / 0.4;
      this.wheels.forEach((w) => (w.rotation.x = this.wheelSpin));
    }

    super.update(dt);
  }
}

