import * as THREE from "three";

import { GameObject3D } from "../core/GameObject3D.js";
import {
    CarFactory_create,
    CarFactory_getType
} from "../graphics/CarFactory.js";

export class Player extends GameObject3D {
  constructor(scene, camera, playerIndex, carTypeIndex) {
    super(scene);
    this.name = 'Player';
    this.camera = camera;
    this.playerIndex = playerIndex || 0;
    this.carTypeIndex = carTypeIndex || 0;
    this.type = CarFactory_getType(this.carTypeIndex);

    this.forwardSpeed = 0; // m/s along local forward axis
    this.lateralOffset = 0; // world X
    this.heading = 0; // yaw radians (small — we bank/turn slightly)
    this.wheelSpin = 0;
    this.boosting = false;
    this.braking = false;
    this.crashed = false;
    this.crashTimer = 0;

    this.createMesh();
  }

  createMesh() {

    const built = CarFactory_create(this.carTypeIndex);

    this.mesh = built.group;

    this.wheels = built.wheels;

    this.mesh.position.copy(this.position);
    this.mesh.rotation.copy(this.rotation);

    this.scene.add(this.mesh);

}

  swapCar(carTypeIndex) {
    if (carTypeIndex === this.carTypeIndex) return;
    this.carTypeIndex = carTypeIndex;
    this.type = CarFactory_getType(this.carTypeIndex);
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

  crash() {
    if (this.crashed) return;
    this.crashed = true;
    this.crashTimer = 1.5;
    this.forwardSpeed *= 0.15;
  }

  respawn() {
    this.crashed = false;
    this.crashTimer = 0;
    this.forwardSpeed = 8;
    this.lateralOffset = 0;
    this.heading = 0;
    this.position.x = 0;
    this.position.z = 0;
  }

  update(dt, input) {
    input = input || { dx: 0, dz: 0, boost: false, brake: false };

    if (this.crashed) {
      this.crashTimer -= dt;
      this.forwardSpeed *= (1 - dt * 1.2);
      if (this.forwardSpeed < 0.1) this.forwardSpeed = 0;
      this.heading += Math.sin(this.crashTimer * 8) * 0.02;
    } else {
      const type = this.type;
      const boostMul = input.boost ? type.boost : 1.0;
      const targetMax = type.maxSpeed * boostMul;

      // Longitudinal
      if (input.dz > 0) {
        this.forwardSpeed += type.accel * dt * boostMul;
      } else if (input.dz < 0 || input.brake) {
        // Brake / reverse
        const brakeStrength = input.brake ? type.accel * 1.6 : type.accel * 0.9;
        this.forwardSpeed -= brakeStrength * dt;
      } else {
        // Coast — engine drag
        this.forwardSpeed -= type.accel * 0.25 * dt;
      }

      // Rolling resistance
      this.forwardSpeed -= this.forwardSpeed * 0.05 * dt;

      if (this.forwardSpeed > targetMax) this.forwardSpeed = targetMax;
      if (this.forwardSpeed < -type.maxSpeed * 0.3) this.forwardSpeed = -type.maxSpeed * 0.3;

      // Steering — scaled by speed for feel
      const speedFactor = Math.min(1, Math.abs(this.forwardSpeed) / 15);
      const steer = -input.dx * type.turn * speedFactor;
      this.heading += steer * dt * 0.6;
      // Auto-center heading
      this.heading -= this.heading * dt * 1.8;
      // Clamp heading
      const maxHeading = 0.55;
      if (this.heading > maxHeading) this.heading = maxHeading;
      if (this.heading < -maxHeading) this.heading = -maxHeading;

      // Lateral movement is heading * speed + direct strafe input for responsive lane changes
      const strafe = -input.dx * type.grip * 1.8;
      const lateralVel = Math.sin(this.heading) * this.forwardSpeed + strafe;
      this.lateralOffset += lateralVel * dt;

      // Road boundaries
      const halfRoad = 9.5;
      if (this.lateralOffset > halfRoad) {
        this.lateralOffset = halfRoad;
        this.forwardSpeed *= 0.92;
      }
      if (this.lateralOffset < -halfRoad) {
        this.lateralOffset = -halfRoad;
        this.forwardSpeed *= 0.92;
      }

      this.boosting = input.boost === true;
      this.braking = input.brake === true;
    }

    // Move world Z forward (car drives in +Z direction)
    this.position.z += this.forwardSpeed * dt;
    this.position.x = this.lateralOffset;

    this.rotation.y = this.heading;

    // Wheel spin animation
    if (this.wheels) {
      const spin = this.forwardSpeed * dt / (this.type.wheelRadius || 0.4);
      this.wheelSpin += spin;
      this.wheels.forEach((w) => (w.rotation.x = this.wheelSpin));
    }

    super.update(dt);
  }

  getSpeedKmh() {
    return Math.abs(this.forwardSpeed) * 3.6;
  }
}

