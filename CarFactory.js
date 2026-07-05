// Utility module — shared car mesh factory used by Player, RemotePlayer, and AICar.
// No class, only top-level helpers prefixed with the file stem.

const CarFactory_TYPES = [
  {
    id: 'sports',
    name: 'Sports',
    bodyColor: 0xff3b3b,
    bodySize: [1.6, 0.5, 3.4],
    cabinColor: 0x1a1a1a,
    cabinSize: [1.4, 0.42, 1.6],
    cabinOffset: [0, 0.55, -0.15],
    wheelRadius: 0.34,
    wheelWidth: 0.28,
    accel: 22,
    maxSpeed: 60,
    turn: 2.4,
    grip: 3.2,
    boost: 1.35,
    mass: 1.0,
  },
  {
    id: 'truck',
    name: 'Truck',
    bodyColor: 0x3aa5ff,
    bodySize: [2.0, 0.9, 4.4],
    cabinColor: 0x0d223a,
    cabinSize: [1.85, 0.75, 1.8],
    cabinOffset: [0, 0.9, 0.6],
    wheelRadius: 0.5,
    wheelWidth: 0.42,
    accel: 12,
    maxSpeed: 42,
    turn: 1.6,
    grip: 2.4,
    boost: 1.15,
    mass: 1.6,
  },
  {
    id: 'muscle',
    name: 'Muscle',
    bodyColor: 0xffb200,
    bodySize: [1.85, 0.6, 3.9],
    cabinColor: 0x2a1a05,
    cabinSize: [1.55, 0.5, 1.8],
    cabinOffset: [0, 0.65, 0.0],
    wheelRadius: 0.42,
    wheelWidth: 0.36,
    accel: 18,
    maxSpeed: 54,
    turn: 2.0,
    grip: 2.7,
    boost: 1.5,
    mass: 1.25,
  },
];

function CarFactory_getType(index) {
  const i = ((index % CarFactory_TYPES.length) + CarFactory_TYPES.length) % CarFactory_TYPES.length;
  return CarFactory_TYPES[i];
}

function CarFactory_typeCount() {
  return CarFactory_TYPES.length;
}

function CarFactory_build(typeIndex, tint) {
  const type = CarFactory_getType(typeIndex);
  const group = new THREE.Group();

  const bodyColor = tint !== undefined ? tint : type.bodyColor;

  // Body
  const bodyGeom = new THREE.BoxGeometry(type.bodySize[0], type.bodySize[1], type.bodySize[2]);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    metalness: 0.55,
    roughness: 0.35,
  });
  const body = new THREE.Mesh(bodyGeom, bodyMat);
  body.position.y = type.wheelRadius + type.bodySize[1] / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Cabin
  const cabinGeom = new THREE.BoxGeometry(type.cabinSize[0], type.cabinSize[1], type.cabinSize[2]);
  const cabinMat = new THREE.MeshStandardMaterial({
    color: type.cabinColor,
    metalness: 0.2,
    roughness: 0.5,
  });
  const cabin = new THREE.Mesh(cabinGeom, cabinMat);
  cabin.position.set(
    type.cabinOffset[0],
    body.position.y + type.bodySize[1] / 2 + type.cabinSize[1] / 2 - 0.05,
    type.cabinOffset[2]
  );
  cabin.castShadow = true;
  group.add(cabin);

  // Windshield accent
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x88bbff,
    metalness: 0.9,
    roughness: 0.15,
    transparent: true,
    opacity: 0.6,
  });
  const glassGeom = new THREE.BoxGeometry(type.cabinSize[0] * 0.94, type.cabinSize[1] * 0.6, 0.05);
  const glass = new THREE.Mesh(glassGeom, glassMat);
  glass.position.set(
    cabin.position.x,
    cabin.position.y + 0.02,
    cabin.position.z + type.cabinSize[2] / 2 + 0.02
  );
  group.add(glass);

  // Wheels
  const wheelGeom = new THREE.CylinderGeometry(type.wheelRadius, type.wheelRadius, type.wheelWidth, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const wheelPositions = [
    [type.bodySize[0] / 2 + type.wheelWidth / 2 - 0.05, type.wheelRadius, type.bodySize[2] / 2 - 0.6],
    [-type.bodySize[0] / 2 - type.wheelWidth / 2 + 0.05, type.wheelRadius, type.bodySize[2] / 2 - 0.6],
    [type.bodySize[0] / 2 + type.wheelWidth / 2 - 0.05, type.wheelRadius, -type.bodySize[2] / 2 + 0.6],
    [-type.bodySize[0] / 2 - type.wheelWidth / 2 + 0.05, type.wheelRadius, -type.bodySize[2] / 2 + 0.6],
  ];
  const wheels = [];
  wheelPositions.forEach((p) => {
    const w = new THREE.Mesh(wheelGeom, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(p[0], p[1], p[2]);
    w.castShadow = true;
    group.add(w);
    wheels.push(w);
  });

  // Headlights
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffffcc,
    emissive: 0xffffaa,
    emissiveIntensity: 1.2,
  });
  const headGeom = new THREE.BoxGeometry(0.28, 0.18, 0.08);
  const hlFrontZ = type.bodySize[2] / 2 + 0.01;
  const h1 = new THREE.Mesh(headGeom, headMat);
  h1.position.set(-type.bodySize[0] / 2 + 0.35, type.wheelRadius + 0.35, hlFrontZ);
  const h2 = new THREE.Mesh(headGeom, headMat);
  h2.position.set(type.bodySize[0] / 2 - 0.35, type.wheelRadius + 0.35, hlFrontZ);
  group.add(h1);
  group.add(h2);

  // Tail lights
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xff2020,
    emissive: 0xff0000,
    emissiveIntensity: 0.7,
  });
  const tailGeom = new THREE.BoxGeometry(0.28, 0.14, 0.06);
  const tlZ = -type.bodySize[2] / 2 - 0.01;
  const t1 = new THREE.Mesh(tailGeom, tailMat);
  t1.position.set(-type.bodySize[0] / 2 + 0.32, type.wheelRadius + 0.4, tlZ);
  const t2 = new THREE.Mesh(tailGeom, tailMat);
  t2.position.set(type.bodySize[0] / 2 - 0.32, type.wheelRadius + 0.4, tlZ);
  group.add(t1);
  group.add(t2);

  return { group, wheels, type };
}

