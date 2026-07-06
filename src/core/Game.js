class Game {
  constructor() {
    window.game = this;
    this.entities = [];
    this.remotePlayers = {};
    this.aiCars = [];
    this.roadChunks = [];
    this.myPlayerIndex = -1;
    this.isConnected = false;
    this.keys = {};
    this.input = { dx: 0, dz: 1, boost: false, brake: false };
    this.startTime = performance.now();
    this.lastFrame = performance.now();
    this.displayScore = 0;
    this.startZ = 0;

    // Base class + factory sanity references (endless-mode helpers rely on these)
    // Wired: GameObject3D.js (base entity), CarFactory.js (shared car mesh factory)
    this._baseClass = GameObject3D;
    this._carTypeCount = CarFactory_typeCount();
    this._defaultCarType = CarFactory_getType(0);

    this.gameConfig = {
      worldBounds: { width: 40, height: 100000 },
      playerSpeed: 60,
      maxPlayerSpeed: 60,
      maxEntitySpeed: 60,
      entityTypes: {},
      collisionRules: [],
    };

    // ---------- Scene / Camera / Renderer ----------
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b8ff);
    this.scene.fog = new THREE.Fog(0x87b8ff, 40, 240);

    this.camera = new THREE.PerspectiveCamera(65, 1, 0.1, 1000);
    this.camera.position.set(0, 6, -12);
    this.camera.lookAt(0, 1.5, 5);

    this.playfield = document.getElementById('playfield');
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.playfield.appendChild(this.renderer.domElement);

    // ---------- Lights ----------
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);
    const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x557755, 0.6);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(20, 40, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.bias = -0.002;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 200;
    this.scene.add(sun);
    this.sun = sun;

    // ---------- World seeding ----------
    this.chunkLength = 80;
    this.forwardChunks = 6;
    this.behindChunks = 2;
    this.seedRoad();

    // ---------- Player (created immediately for solo play) ----------
    this.selectedCar = 0;
    this.player = new Player(this.scene, this.camera, 0, this.selectedCar);
    this.player.forwardSpeed = 8;
    this.entities.push(this.player);

    // ---------- Events ----------
    window.addEventListener('resize', () => this.onResize());
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(() => this.onResize()).observe(this.playfield);
    }
    this.onResize();
    this.bindInput();
    this.bindUI();

    // ---------- Multiplayer ----------
    this.connectMultiplayer();

    // ---------- AI spawn cadence ----------
    this.aiSpawnTimer = 0;
    this.aiOncomingTimer = 0;

    // ---------- Kick loop ----------
    this.start();
  }

  // -------- Setup helpers --------

  seedRoad() {
    for (let i = -this.behindChunks; i < this.forwardChunks; i++) {
      const chunk = new RoadChunk(this.scene, i * this.chunkLength, this.chunkLength);
      this.roadChunks.push(chunk);
      this.entities.push(chunk);
    }
  }

  bindInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
      this.keys[e.code] = true;
      // Car swap 1/2/3
      if (e.key === '1') this.setCar(0);
      if (e.key === '2') this.setCar(1);
      if (e.key === '3') this.setCar(2);
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
      this.keys[e.code] = false;
    });
    window.addEventListener('blur', () => { this.keys = {}; });
  }

  bindUI() {
    document.querySelectorAll('.car-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-car'), 10) || 0;
        this.setCar(idx);
      });
    });
    const respawn = document.getElementById('respawnBtn');
    if (respawn) respawn.addEventListener('click', () => this.respawnPlayer());
  }

  setCar(idx) {
    if (!this.player) return;
    if (idx === this.selectedCar) return;
    this.selectedCar = idx;
    this.player.swapCar(idx);
    document.querySelectorAll('.car-btn').forEach((b) => {
      b.classList.toggle('active', parseInt(b.getAttribute('data-car'), 10) === idx);
    });
    const label = document.getElementById('carValue');
    if (label) label.textContent = CarFactory_getType(idx).name;
    // Broadcast to other players
    if (this.isConnected && Multiplayer && Multiplayer.sendMessage) {
      Multiplayer.sendMessage('carChange', { carType: idx });
    }
  }

  respawnPlayer() {
    if (!this.player) return;
    this.player.respawn();
    const overlay = document.getElementById('crashOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  // -------- Multiplayer --------

  async connectMultiplayer() {
    try {
      if (!window.Multiplayer) return;
      await Multiplayer.connect();
      this.isConnected = true;
      this.myPlayerIndex = Multiplayer.getMyPlayerIndex();
      if (this.player) this.player.playerIndex = this.myPlayerIndex;
      Multiplayer.registerGameConfig(this.gameConfig);

      // Hydrate existing players
      const existing = Multiplayer.getPlayers ? Multiplayer.getPlayers() : [];
      existing.forEach((p) => {
        if (p.id === Multiplayer.getMyId()) return;
        this.addRemotePlayer(p);
      });

      Multiplayer.onPlayerJoin((player) => {
        if (player.id === Multiplayer.getMyId()) return;
        this.addRemotePlayer(player);
        this.updateSoloBadge();
      });

      Multiplayer.onPlayerLeave((data) => {
        const rp = this.remotePlayers[data.id];
        if (rp) {
          const idx = this.entities.indexOf(rp);
          if (idx !== -1) this.entities.splice(idx, 1);
          rp.destroy();
          delete this.remotePlayers[data.id];
        }
        this.updateSoloBadge();
      });

      Multiplayer.onStateSync((state) => {
        if (!state || !state.players) return;
        state.players.forEach((p) => {
          if (p.id === Multiplayer.getMyId()) return;
          let rp = this.remotePlayers[p.id];
          if (!rp) {
            this.addRemotePlayer(p);
            rp = this.remotePlayers[p.id];
          }
          if (rp) {
            const px = typeof p.x === 'number' ? p.x : rp.targetPos.x;
            const pz = typeof p.z === 'number' ? p.z : (typeof p.y === 'number' ? p.y : rp.targetPos.z);
            rp.targetPos.set(px, 0, pz);
            if (typeof p.rotY === 'number') rp.targetRotY = p.rotY;
          }
        });
      });

      if (Multiplayer.onMessage) {
        Multiplayer.onMessage('pos', (msg) => {
          const from = msg.from || (msg.data && msg.data.from);
          const data = msg.data || msg;
          if (!from || from === Multiplayer.getMyId()) return;
          const rp = this.remotePlayers[from];
          if (!rp) return;
          if (typeof data.x === 'number' && typeof data.z === 'number') {
            rp.targetPos.set(data.x, 0, data.z);
          }
          if (typeof data.rotY === 'number') rp.targetRotY = data.rotY;
        });
        Multiplayer.onMessage('carChange', (msg) => {
          const from = msg.from || (msg.data && msg.data.from);
          const data = msg.data || msg;
          if (!from || from === Multiplayer.getMyId()) return;
          const rp = this.remotePlayers[from];
          if (rp && typeof data.carType === 'number') rp.setCarType(data.carType);
        });
      }

      this.updateSoloBadge();
    } catch (err) {
      console.warn('Multiplayer connect failed, running solo:', err);
      this.isConnected = false;
    }
  }

  addRemotePlayer(playerData) {
    if (!playerData || !playerData.id) return;
    if (this.remotePlayers[playerData.id]) return;
    const carType = (playerData.carType != null) ? playerData.carType : (playerData.playerIndex || 0) % CarFactory_typeCount();
    const rp = new RemotePlayer(this.scene, playerData.playerIndex || 0, carType);
    if (typeof playerData.x === 'number') {
      const pz = typeof playerData.z === 'number' ? playerData.z : (typeof playerData.y === 'number' ? playerData.y : 0);
      rp.position.set(playerData.x, 0, pz);
      rp.targetPos.set(playerData.x, 0, pz);
    }
    this.remotePlayers[playerData.id] = rp;
    this.entities.push(rp);
  }

  updateSoloBadge() {
    const badge = document.getElementById('solo-badge');
    if (!badge) return;
    const count = Object.keys(this.remotePlayers).length;
    if (count > 0) {
      badge.textContent = count + ' other driver' + (count > 1 ? 's' : '') + ' online';
    } else {
      badge.textContent = 'Solo — dodging AI traffic';
    }
  }

  // -------- AI cars --------

  spawnAI(dt) {
    if (!this.player) return;
    const playerZ = this.player.position.z;

    this.aiSpawnTimer -= dt;
    if (this.aiSpawnTimer <= 0) {
      this.aiSpawnTimer = 0.9 + Math.random() * 1.4;
      const rightLanes = [1.5, 4.5, 7.5];
      const lane = rightLanes[Math.floor(Math.random() * rightLanes.length)];
      const z = playerZ + 90 + Math.random() * 60;
      const type = Math.floor(Math.random() * CarFactory_typeCount());
      const speed = 6 + Math.random() * 10;
      const car = new AICar(this.scene, lane, z, type, speed, 1);
      this.aiCars.push(car);
      this.entities.push(car);
    }

    this.aiOncomingTimer -= dt;
    if (this.aiOncomingTimer <= 0) {
      this.aiOncomingTimer = 1.4 + Math.random() * 1.8;
      const leftLanes = [-1.5, -4.5, -7.5];
      const lane = leftLanes[Math.floor(Math.random() * leftLanes.length)];
      const z = playerZ + 220 + Math.random() * 40;
      const type = Math.floor(Math.random() * CarFactory_typeCount());
      const speed = 14 + Math.random() * 10;
      const car = new AICar(this.scene, lane, z, type, speed, -1);
      this.aiCars.push(car);
      this.entities.push(car);
    }

    for (let i = this.aiCars.length - 1; i >= 0; i--) {
      const c = this.aiCars[i];
      if (c.isOffScreen(playerZ)) {
        const eIdx = this.entities.indexOf(c);
        if (eIdx !== -1) this.entities.splice(eIdx, 1);
        c.destroy();
        this.aiCars.splice(i, 1);
      }
    }
  }

  // -------- Endless road --------

  updateRoadChunks() {
    if (!this.player) return;
    const playerZ = this.player.position.z;

    let maxZ = -Infinity;
    let minZ = Infinity;
    this.roadChunks.forEach((c) => {
      if (c.zStart > maxZ) maxZ = c.zStart;
      if (c.zStart < minZ) minZ = c.zStart;
    });

    while (maxZ < playerZ + this.forwardChunks * this.chunkLength) {
      maxZ += this.chunkLength;
      const chunk = new RoadChunk(this.scene, maxZ, this.chunkLength);
      this.roadChunks.push(chunk);
      this.entities.push(chunk);
    }

    for (let i = this.roadChunks.length - 1; i >= 0; i--) {
      const c = this.roadChunks[i];
      if (c.zStart + this.chunkLength < playerZ - (this.behindChunks + 1) * this.chunkLength) {
        const eIdx = this.entities.indexOf(c);
        if (eIdx !== -1) this.entities.splice(eIdx, 1);
        c.destroy();
        this.roadChunks.splice(i, 1);
      }
    }
  }

  // -------- Collisions --------

  checkCollisions() {
    if (!this.player || this.player.crashed) return;
    const pb = this.player.getBounds();
    if (!pb) return;
    pb.expandByScalar(-0.15);

    for (const ai of this.aiCars) {
      const ab = ai.getBounds();
      if (!ab) continue;
      if (pb.intersectsBox(ab)) {
        this.player.crash();
        this.showCrashOverlay();
        break;
      }
    }
  }

  showCrashOverlay() {
    const overlay = document.getElementById('crashOverlay');
    const distEl = document.getElementById('crashDistance');
    if (distEl) distEl.textContent = Math.max(0, Math.floor(this.player.position.z - this.startZ));
    if (overlay) overlay.classList.remove('hidden');
  }

  // -------- Camera / HUD --------

  updateCamera() {
    if (!this.player) return;
    const target = new THREE.Vector3(
      this.player.position.x * 0.6,
      3.8,
      this.player.position.z - 10
    );
    this.camera.position.lerp(target, 0.12);
    const look = new THREE.Vector3(
      this.player.position.x * 0.4,
      1.6,
      this.player.position.z + 12
    );
    this.camera.lookAt(look);
  }

  updateHUD() {
    if (!this.player) return;
    const speed = Math.floor(this.player.getSpeedKmh());
    const dist = Math.max(0, Math.floor(this.player.position.z - this.startZ));
    this.displayScore = dist + Math.floor(speed * 0.3);
    const sp = document.getElementById('speedValue');
    const ds = document.getElementById('distanceValue');
    const sc = document.getElementById('scoreValue');
    if (sp) sp.textContent = speed;
    if (ds) ds.textContent = dist;
    if (sc) sc.textContent = this.displayScore;
  }

  // -------- Input build --------

  buildInput() {
    const k = this.keys;
    let dx = 0;
    let dz = 0;
    
    // NATIVE ASSIGNMENT: Left reduces X, Right increases X to match 3D camera space
    if (k['a'] || k['A'] || k['ArrowLeft']) dx -= 1;
    if (k['d'] || k['D'] || k['ArrowRight']) dx += 1;
    if (k['w'] || k['W'] || k['ArrowUp']) dz += 1;
    if (k['s'] || k['S'] || k['ArrowDown']) dz -= 1;
    
    if (dz === 0) dz = 0.6;
    const boost = !!(k['Shift'] || k['ShiftLeft'] || k['ShiftRight']);
    const brake = !!(k[' '] || k['Space']);
    this.input.dx = dx;
    this.input.dz = dz;
    this.input.boost = boost;
    this.input.brake = brake;
  }

  // -------- Loop --------

  onResize() {
    const r = this.playfield.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.renderer.setSize(r.width, r.height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
  }

  update() {
    const now = performance.now();
    let dt = (now - this.lastFrame) / 1000;
    if (dt > 0.1) dt = 0.1;
    if (dt < 0) dt = 0;
    this.lastFrame = now;

    this.buildInput();

    if (this.player) {
      this.player.update(dt, this.input);
    }

    for (const id in this.remotePlayers) {
      this.remotePlayers[id].update(dt);
    }

    this.spawnAI(dt);
    for (const ai of this.aiCars) ai.update(dt, this.player ? this.player.position.z : 0, this.aiCars);

    this.updateRoadChunks();

    for (const chunk of this.roadChunks) chunk.update(dt);

    this.checkCollisions();

    this.updateCamera();
    this.updateHUD();

    if (this.isConnected && this.player && Multiplayer && Multiplayer.sendInput) {
      Multiplayer.sendInput({ dx: this.input.dx, dy: 0, keys: {} });
      if (Multiplayer.sendMessage) {
        this._posBroadcastTimer = (this._posBroadcastTimer || 0) - dt;
        if (this._posBroadcastTimer <= 0) {
          this._posBroadcastTimer = 0.05;
          Multiplayer.sendMessage('pos', {
            x: this.player.position.x,
            z: this.player.position.z,
            rotY: this.player.rotation.y,
          });
        }
      }
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  start() {
    const loop = () => {
      requestAnimationFrame(loop);
      this.update();
      this.render();
    };
    loop();
  }

  getObjectAt(screenX, screenY) {
    const r = this.playfield.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((screenX - r.left) / r.width) * 2 - 1,
      -((screenY - r.top) / r.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);
    const meshes = this.entities.map((e) => e.mesh).filter((m) => m);
    const intersects = raycaster.intersectObjects(meshes, true);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      return this.entities.find((e) => {
        if (!e.mesh) return false;
        if (e.mesh === hit) return true;
        let parent = hit.parent;
        while (parent) {
          if (parent === e.mesh) return true;
          parent = parent.parent;
        }
        return false;
      });
    }
    return null;
  }
}