// alert("AICar.js loaded");
class AICar extends GameObject3D {
  constructor(scene, x, z, carTypeIndex, speed, direction) {
    super(scene);

    this.name = "AICar";

    this.carTypeIndex =
      carTypeIndex != null
        ? carTypeIndex
        : Math.floor(Math.random() * CarFactory_typeCount());

    this.direction = direction || 1;

    this.speed = speed || 12;
    this.cruiseSpeed = this.speed;
    this.targetSpeed = this.speed;

    this.targetLaneOffset = x;

    this.position.set(x, 0, z);

    this.aiTimer = 0;

    this.driverType = Math.random();

    // Driver personalities
    if (this.driverType < 0.2) {
      this.lookAhead = 28;
      this.followGap = 18;
      this.maxLaneSpeed = 2.5;
    } else if (this.driverType < 0.8) {
      this.lookAhead = 22;
      this.followGap = 14;
      this.maxLaneSpeed = 3.5;
    } else {
      this.lookAhead = 16;
      this.followGap = 10;
      this.maxLaneSpeed = 4.5;
    }

    const palettes = [
      0xffffff,
      0x222222,
      0x8899aa,
      0xcc4422,
      0x336688,
      0xdd9944,
      0x448855,
      0xaaaaaa,
    ];

    this.tint = palettes[Math.floor(Math.random() * palettes.length)];

    this.createMesh();
  }

  createMesh() {
    const built = CarFactory_build(this.carTypeIndex, this.tint);

    this.mesh = built.group;
    this.wheels = built.wheels;

    this.rotation.y = this.direction === -1 ? Math.PI : 0;

    this.mesh.position.copy(this.position);
    this.mesh.rotation.copy(this.rotation);

    this.scene.add(this.mesh);
  }

  update(dt, playerZ, cars) {
    this.aiTimer -= dt;

    if (this.aiTimer <= 0) {
      this.aiTimer = 0.2;

      const lanes =
        this.direction === 1
          ? [1.5, 4.5, 7.5]
          : [-1.5, -4.5, -7.5];

      let nearest = null;
      let nearestDist = Infinity;

      for (const other of cars) {
        if (other === this) continue;
        if (other.direction !== this.direction) continue;

        if (Math.abs(other.position.x - this.targetLaneOffset) > 0.6)
          continue;

        let dz;

        if (this.direction === 1)
          dz = other.position.z - this.position.z;
        else
          dz = this.position.z - other.position.z;

        if (dz > 0 && dz < nearestDist) {
          nearest = other;
          nearestDist = dz;
        }
      }

      this.targetSpeed = this.cruiseSpeed;

      if (nearest && nearestDist < this.lookAhead) {
        this.targetSpeed = Math.min(
          this.cruiseSpeed,
          nearest.speed * 0.95
        );

        let chosenLane = this.targetLaneOffset;

        for (const lane of lanes) {
          if (lane === this.targetLaneOffset) continue;

          let blocked = false;

          for (const other of cars) {
            if (other === this) continue;
            if (other.direction !== this.direction) continue;

            if (Math.abs(other.position.x - lane) > 0.5)
              continue;

            if (
              Math.abs(
                other.position.z - this.position.z
              ) < this.followGap
            ) {
              blocked = true;
              break;
            }
          }

          if (!blocked) {
            chosenLane = lane;
            break;
          }
        }

        this.targetLaneOffset = chosenLane;
      }
    }

    // Smooth acceleration
    this.speed +=
      (this.targetSpeed - this.speed) *
      Math.min(1, dt * 2);

    this.position.z +=
      this.speed *
      this.direction *
      dt;

    // Lane movement
    const dx =
      this.targetLaneOffset - this.position.x;

    if (Math.abs(dx) > 0.05) {
      this.position.x +=
        Math.sign(dx) *
        Math.min(
          Math.abs(dx),
          this.maxLaneSpeed * dt
        );

      const base =
        this.direction === -1
          ? Math.PI
          : 0;

      this.rotation.y =
        base +
        Math.sign(dx) * 0.12;
    } else {
      const base =
        this.direction === -1
          ? Math.PI
          : 0;

      let d = base - this.rotation.y;

      while (d > Math.PI)
        d -= Math.PI * 2;

      while (d < -Math.PI)
        d += Math.PI * 2;

      this.rotation.y +=
        d *
        Math.min(1, dt * 4);
    }

    if (this.wheels) {
      const spin =
        this.speed *
        this.direction *
        dt /
        0.4;

      this.wheels.forEach(
        (w) => (w.rotation.x += spin)
      );
    }

    super.update(dt);
  }

  isOffScreen(playerZ) {
    if (this.direction === 1) {
      return this.position.z < playerZ - 60;
    }

    return (
      this.position.z < playerZ - 40 ||
      this.position.z > playerZ + 400
    );
  }
}
// class AICar extends GameObject3D {
//   constructor(scene, x, z, carTypeIndex, speed, direction) {
//     super(scene);
//     this.name = 'AICar';
//     this.carTypeIndex = carTypeIndex != null ? carTypeIndex : Math.floor(Math.random() * CarFactory_typeCount());
//     this.speed = speed || 12; // m/s
//     this.direction = direction || 1; // +1 same direction as player, -1 oncoming
//     this.laneChangeCooldown = 2 + Math.random() * 4;
//     this.targetLaneOffset = x;
//     this.position.set(x, 0, z);

//     // Slight color variation
//     const palettes = [0xffffff, 0x222222, 0x8899aa, 0xcc4422, 0x336688, 0xdd9944, 0x448855, 0xaaaaaa];
//     const tint = palettes[Math.floor(Math.random() * palettes.length)];
//     this.tint = tint;

//     this.createMesh();
//   }

//   createMesh() {
//     const built = CarFactory_build(this.carTypeIndex, this.tint);
//     this.mesh = built.group;
//     this.wheels = built.wheels;
//     // Oncoming cars face the player
//     this.rotation.y = this.direction === -1 ? Math.PI : 0;
//     this.mesh.position.copy(this.position);
//     this.mesh.rotation.copy(this.rotation);
//     this.scene.add(this.mesh);
//   }

//   update(dt, playerZ, otherAICars) {
//     // Move along the road. AI moves in world Z; player also moves +Z, so
//     // same-direction traffic uses a slower absolute speed and appears to drift back.
//     this.position.z += this.speed * this.direction * dt;

//     // Occasional lane changes for same-direction traffic to create dynamic dodging
//     this.laneChangeCooldown -= dt;
//     if (this.laneChangeCooldown <= 0 && this.direction === 1) {
//       this.laneChangeCooldown = 3 + Math.random() * 5;
//       // Pick a nearby lane offset
//       const lanes = [-6, -3, 0, 3, 6];
//       const target = lanes[Math.floor(Math.random() * lanes.length)];
//       // Same direction lanes are on the right side of the road (positive X half)
//       this.targetLaneOffset = Math.abs(target);
//       if (this.direction === 1) this.targetLaneOffset = 1.5 + Math.abs(target) * 0.5;
//       // Actually pick right-half lanes only
//       const rightLanes = [1.5, 4.5, 7.5];
//       this.targetLaneOffset = rightLanes[Math.floor(Math.random() * rightLanes.length)];
//     } else if (this.laneChangeCooldown <= 0 && this.direction === -1) {
//       this.laneChangeCooldown = 4 + Math.random() * 5;
//       const leftLanes = [-1.5, -4.5, -7.5];
//       this.targetLaneOffset = leftLanes[Math.floor(Math.random() * leftLanes.length)];
//     }

//     // Smooth lateral movement toward target lane
//     const dx = this.targetLaneOffset - this.position.x;
//     const lateralSpeed = 3.5;
//     if (Math.abs(dx) > 0.05) {
//       this.position.x += Math.sign(dx) * Math.min(Math.abs(dx), lateralSpeed * dt);
//       // Slight yaw during lane change
//       const yaw = Math.sign(dx) * 0.12;
//       const base = this.direction === -1 ? Math.PI : 0;
//       this.rotation.y = base + yaw * (this.direction === -1 ? -1 : 1);
//     } else {
//       const base = this.direction === -1 ? Math.PI : 0;
//       // Ease back to base heading
//       let cur = this.rotation.y;
//       let d = base - cur;
//       while (d > Math.PI) d -= Math.PI * 2;
//       while (d < -Math.PI) d += Math.PI * 2;
//       this.rotation.y += d * Math.min(1, dt * 3);
//     }

//     // Wheel spin
//     if (this.wheels) {
//       const spin = this.speed * this.direction * dt / 0.4;
//       this.wheels.forEach((w) => (w.rotation.x += spin));
//     }

//     super.update(dt);
//   }

//   isOffScreen(playerZ) {
//     // Same direction: dies when far behind player; oncoming: dies once well past.
//     if (this.direction === 1) {
//       return this.position.z < playerZ - 60;
//     } else {
//       return this.position.z < playerZ - 40 || this.position.z > playerZ + 400;
//     }
//   }
// }

