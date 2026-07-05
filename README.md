# Endless Highway 3D

A Three.js based endless highway driving game featuring AI traffic,
multiple vehicles, endless procedural roads, and multiplayer-ready
architecture.

> **Status:** Active development 🚧

------------------------------------------------------------------------

## Current Features

### Driving

-   Third-person 3D driving
-   Smooth steering
-   Acceleration, braking and boost
-   Multiple vehicle types
-   Speed, distance and score HUD

### Traffic AI

-   Endless AI traffic
-   Predictive lane changing
-   Safe overtaking
-   Driver personalities
-   Lane-aware behavior

### World

-   Endless procedural road
-   Dynamic road chunk generation
-   Collision detection
-   Camera follow system

### Multiplayer

-   Multiplayer-ready architecture
-   Remote player synchronization
-   Vehicle selection synchronization

------------------------------------------------------------------------

# Tech Stack

-   JavaScript (ES6)
-   Three.js
-   HTML5
-   CSS3

Current development server:

``` bash
http-server -c-1
```

------------------------------------------------------------------------

# Project Roadmap

## Phase 1 ✅ Foundation

-   [x] Endless road
-   [x] Player controller
-   [x] Camera system
-   [x] HUD
-   [x] Multiple cars
-   [x] AI traffic
-   [x] Predictive lane-changing AI
-   [x] Collision detection

------------------------------------------------------------------------

## Phase 2 🚧 Immersion

### Crash System

-   [ ] Real crash physics
-   [ ] Vehicle spin
-   [ ] Sliding
-   [ ] Camera shake
-   [ ] Slow motion
-   [ ] Damage effects

### Particle Engine

-   [ ] Sparks
-   [ ] Smoke
-   [ ] Dust
-   [ ] Tire marks
-   [ ] Reusable particle system

### Audio

-   [ ] Engine RPM
-   [ ] Tire skid
-   [ ] Crash sounds
-   [ ] Wind
-   [ ] Ambient traffic

------------------------------------------------------------------------

## Phase 3 🌳 World

-   [ ] Procedural scenery
-   [ ] Trees
-   [ ] Buildings
-   [ ] Bridges
-   [ ] Streetlights
-   [ ] Road signs
-   [ ] Fuel stations
-   [ ] Rivers
-   [ ] Mountains

------------------------------------------------------------------------

## Phase 4 🌦 Weather

-   [ ] Day/Night cycle
-   [ ] Dynamic sun
-   [ ] Moonlight
-   [ ] Rain
-   [ ] Fog
-   [ ] Storms
-   [ ] Wet roads
-   [ ] Headlights

------------------------------------------------------------------------

## Phase 5 🚘 Graphics Upgrade

-   [ ] Replace cube cars with GLTF models
-   [ ] HDR environment
-   [ ] PBR materials
-   [ ] Bloom
-   [ ] SSAO
-   [ ] Motion blur
-   [ ] Better shadows
-   [ ] Lens flare

------------------------------------------------------------------------

## Phase 6 🎮 Gameplay

-   [ ] Garage
-   [ ] Car upgrades
-   [ ] Missions
-   [ ] Achievements
-   [ ] Coin collection
-   [ ] Save/Load
-   [ ] Police chase
-   [ ] Leaderboards

------------------------------------------------------------------------

# Planned Architecture

``` text
src/
├── core/
├── entities/
├── systems/
├── graphics/
├── ui/
├── assets/
└── main.js
```

------------------------------------------------------------------------

# Future Tech Stack

-   Vite
-   Three.js
-   TypeScript
-   GLTFLoader
-   EffectComposer
-   Cannon-es (optional)
-   ESLint
-   Prettier

------------------------------------------------------------------------

# Running Locally

``` bash
npm install -g http-server

http-server -c-1
```

Open:

    http://127.0.0.1:8080

------------------------------------------------------------------------

# Goals

-   Build a polished indie-style endless highway driving game.
-   Use realistic graphics, AI traffic, weather, and procedural
    environments.
-   Create a strong portfolio project demonstrating game architecture,
    AI behavior, graphics programming, and real-time systems.
# CarSimulation
