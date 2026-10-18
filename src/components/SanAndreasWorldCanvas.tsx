import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  DEFAULT_HANDLING_TABLE,
  HandlingData,
} from '../engine/HandlingMgr';
import {
  GraphicsTuningConfig,
  WeatherPresetId,
  interpolateTimeCycle,
} from '../engine/TimeCycle';
import {
  GTA_SA_MISSIONS,
  MissionDefinition,
  getZoneAtPosition,
} from '../engine/MissionScripts';
import { audioEngine } from '../engine/AudioEngine';

export interface WeaponSlot {
  id: 'UNARMED' | 'PISTOL' | 'MICRO_UZI' | 'SHOTGUN' | 'AK47' | 'SPRAYCAN' | 'RPG';
  name: string;
  clipAmmo: number;
  totalAmmo: number;
  damage: number;
  range: number;
}

export interface WorldEntityBlip {
  id: string;
  x: number;
  z: number;
  type: 'vehicle' | 'mission' | 'paynspray' | 'cluckinbell' | 'gym' | 'tag' | 'enemy' | 'police';
  label: string;
  color: string;
  code?: string;
}

export interface TelemetrySnapshot {
  fps: number;
  playerX: number;
  playerY: number;
  playerZ: number;
  headingRad: number;
  speedKmh: number;
  inVehicle: HandlingData | null;
  vehicleHealth: number;
  zoneName: string;
  districtName: string;
  controllingGang: string;
  nearVehicleName: string | null;
  activeMission: MissionDefinition | null;
  activeStageIndex: number;
  subtitle: { speaker: string; text: string } | null;
  tagsSprayed: number;
  totalTags: number;
  gangWarActive: boolean;
  gangWarWave: number;
  gangWarKillsLeft: number;
  blips: WorldEntityBlip[];
}

interface Props {
  gameHour: number;
  weather: WeatherPresetId;
  tuning: GraphicsTuningConfig;
  health: number;
  armor: number;
  cash: number;
  respect: number;
  muscle: number;
  stamina: number;
  wantedStars: number;
  neverWanted: boolean;
  godMode: boolean;
  jetpackActive: boolean;
  megaJump: boolean;
  carsFly: boolean;
  allCarsNitro: boolean;
  currentWeapon: WeaponSlot;
  spawnRequest: { vehicleId: string; nonce: number } | null;
  teleportRequest: { x: number; y: number; z: number; nonce: number } | null;
  missionStartRequest: { missionId: string; nonce: number } | null;
  triggerActionRequest: { action: 'FIRE' | 'ENTER_EXIT' | 'HYDRAULICS' | 'NITRO'; nonce: number } | null;
  onUpdateStats: (updater: (prev: {
    health: number;
    armor: number;
    cash: number;
    respect: number;
    muscle: number;
    stamina: number;
    wantedStars: number;
  }) => {
    health: number;
    armor: number;
    cash: number;
    respect: number;
    muscle: number;
    stamina: number;
    wantedStars: number;
  }) => void;
  onBannerNotification: (banner: {
    type: 'MISSION_PASSED' | 'WASTED' | 'BUSTED' | 'GANG_WAR' | 'RESPRAYED' | 'TAG_SPRAYED';
    title: string;
    subtitle: string;
  }) => void;
  onTelemetry: (snapshot: TelemetrySnapshot) => void;
}

interface SpawnedVehicleInstance {
  uid: string;
  handling: HandlingData;
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  bodyMaterial: THREE.MeshPhysicalMaterial;
  wheels: THREE.Object3D[];
  sirenLightL?: THREE.PointLight;
  sirenLightR?: THREE.PointLight;
  rotorMain?: THREE.Object3D;
  turretGroup?: THREE.Object3D;
  nitroFlame?: THREE.Mesh;
  speed: number;
  steering: number;
  heading: number;
  hp: number;
  hydraulicBounceVel: number;
  hydraulicOffset: number;
  isPoliceAI?: boolean;
}

interface NpcInstance {
  uid: string;
  faction: 'GROVE' | 'BALLAS' | 'CIV' | 'LSPD';
  group: THREE.Group;
  leftLeg: THREE.Object3D;
  rightLeg: THREE.Object3D;
  hp: number;
  alive: boolean;
  walkAngle: number;
  speed: number;
}

interface GraffitiTagInstance {
  id: string;
  x: number;
  z: number;
  sprayed: boolean;
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
}

export const SanAndreasWorldCanvas: React.FC<Props> = ({
  gameHour,
  weather,
  tuning,
  health,
  wantedStars,
  neverWanted,
  godMode,
  jetpackActive,
  megaJump,
  carsFly,
  allCarsNitro,
  currentWeapon,
  spawnRequest,
  teleportRequest,
  missionStartRequest,
  triggerActionRequest,
  onUpdateStats,
  onBannerNotification,
  onTelemetry,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const stateRef = useRef({
    gameHour,
    weather,
    tuning,
    health,
    wantedStars,
    neverWanted,
    godMode,
    jetpackActive,
    megaJump,
    carsFly,
    allCarsNitro,
    currentWeapon,
  });

  useEffect(() => {
    stateRef.current = {
      gameHour,
      weather,
      tuning,
      health,
      wantedStars,
      neverWanted,
      godMode,
      jetpackActive,
      megaJump,
      carsFly,
      allCarsNitro,
      currentWeapon,
    };
  }, [
    gameHour,
    weather,
    tuning,
    health,
    wantedStars,
    neverWanted,
    godMode,
    jetpackActive,
    megaJump,
    carsFly,
    allCarsNitro,
    currentWeapon,
  ]);

  const actionsRef = useRef<{
    spawnVehicleNearPlayer: (vehicleId: string) => void;
    teleportPlayer: (x: number, y: number, z: number) => void;
    startMissionById: (missionId: string) => void;
    fireWeapon: () => void;
    toggleEnterExitVehicle: () => void;
    triggerHydraulics: () => void;
  } | null>(null);

  useEffect(() => {
    if (spawnRequest && actionsRef.current) {
      actionsRef.current.spawnVehicleNearPlayer(spawnRequest.vehicleId);
    }
  }, [spawnRequest]);

  useEffect(() => {
    if (teleportRequest && actionsRef.current) {
      actionsRef.current.teleportPlayer(
        teleportRequest.x,
        teleportRequest.y,
        teleportRequest.z
      );
    }
  }, [teleportRequest]);

  useEffect(() => {
    if (missionStartRequest && actionsRef.current) {
      actionsRef.current.startMissionById(missionStartRequest.missionId);
    }
  }, [missionStartRequest]);

  useEffect(() => {
    if (!triggerActionRequest || !actionsRef.current) return;
    if (triggerActionRequest.action === 'FIRE') {
      actionsRef.current.fireWeapon();
    } else if (triggerActionRequest.action === 'ENTER_EXIT') {
      actionsRef.current.toggleEnterExitVehicle();
    } else if (triggerActionRequest.action === 'HYDRAULICS') {
      actionsRef.current.triggerHydraulics();
    }
  }, [triggerActionRequest]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Setup Scene, Camera & WebGL2 Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xd89b68, 0.0018);

    const camera = new THREE.PerspectiveCamera(
      66,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.5,
      2200
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Procedural Environment Map for PBR Vehicle Clearcoat Reflections
    const envCanvas = document.createElement('canvas');
    envCanvas.width = 256;
    envCanvas.height = 128;
    const envCtx = envCanvas.getContext('2d')!;
    const grad = envCtx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, '#3a6ea5');
    grad.addColorStop(0.48, '#f4a261');
    grad.addColorStop(0.52, '#2b2d42');
    grad.addColorStop(1, '#141619');
    envCtx.fillStyle = grad;
    envCtx.fillRect(0, 0, 256, 128);
    const envTexture = new THREE.CanvasTexture(envCanvas);
    envTexture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = envTexture;

    // 3. Lighting & Sun/Moon Disc
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffe4b5, 0x2d3748, 0.55);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffdfa8, 1.45);
    sunLight.position.set(120, 160, -140);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 560;
    const d = 180;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const sunDisc = new THREE.Mesh(
      new THREE.SphereGeometry(20, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffb74d })
    );
    scene.add(sunDisc);

    // 4. Procedural Asphalt & Concrete Textures
    const makeAsphaltTexture = () => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#23262b';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2400; i++) {
        const v = 30 + Math.floor(Math.random() * 22);
        ctx.fillStyle = `rgb(${v},${v},${v + 2})`;
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
      }
      ctx.fillStyle = '#eab308';
      for (let y = 0; y < 256; y += 32) {
        ctx.fillRect(126, y, 4, 18);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, 24);
      return tex;
    };

    const roadTex = makeAsphaltTexture();
    const roadMaterial = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.42,
      metalness: 0.18,
    });

    // 5. Multi-Biome San Andreas Terrain:
    // - Main Los Santos & Countryside Grass Terrain
    const groundGeo = new THREE.PlaneGeometry(1600, 1600);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3b4d32,
      roughness: 0.92,
      metalness: 0.02,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // - Bone County & Las Venturas Desert Sand Biome (North-East X: 110..560, Z: -480..-170)
    const desertBiome = new THREE.Mesh(
      new THREE.PlaneGeometry(460, 320),
      new THREE.MeshStandardMaterial({ color: 0x85633e, roughness: 0.92 })
    );
    desertBiome.rotation.x = -Math.PI / 2;
    desertBiome.position.set(330, 0.02, -320);
    desertBiome.receiveShadow = true;
    scene.add(desertBiome);

    // 6. Authentic Grove Street Topology (LAe.ipl Orientation):
    // Grove Street runs West-to-East (X: -145 to +28 along Z = 0) into the East-Facing Cul-de-Sac at (28, 0, 0)!
    const groveStreetRoad = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 175),
      roadMaterial
    );
    groveStreetRoad.rotation.x = -Math.PI / 2;
    groveStreetRoad.rotation.z = Math.PI / 2;
    groveStreetRoad.position.set(-58, 0.05, 0);
    groveStreetRoad.receiveShadow = true;
    scene.add(groveStreetRoad);

    // East-Facing Grove Street Cul-de-Sac Circle at (28, 0.06, 0)
    const culDeSacPavement = new THREE.Mesh(
      new THREE.CircleGeometry(28, 48),
      new THREE.MeshStandardMaterial({
        color: 0x26292e,
        roughness: 0.38,
        metalness: 0.22,
      })
    );
    culDeSacPavement.rotation.x = -Math.PI / 2;
    culDeSacPavement.position.set(28, 0.06, 0);
    culDeSacPavement.receiveShadow = true;
    scene.add(culDeSacPavement);

    // Center Grassy Island inside the Cul-de-Sac at (28, 0.12, 0)
    const culDeSacIsland = new THREE.Mesh(
      new THREE.CylinderGeometry(8.5, 9, 0.25, 32),
      new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.85 })
    );
    culDeSacIsland.position.set(28, 0.12, 0);
    culDeSacIsland.receiveShadow = true;
    scene.add(culDeSacIsland);

    // North-South Avenues: Liverpool Rd / Ganton (-32), Downtown (-145), East Beach (185), Las Venturas Strip (365)
    [-145, -32, 185, 365].forEach((xPos) => {
      const nsRoad = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 680),
        roadMaterial
      );
      nsRoad.rotation.x = -Math.PI / 2;
      nsRoad.position.set(xPos, 0.04, -30);
      nsRoad.receiveShadow = true;
      scene.add(nsRoad);
    });

    // East-West Arterials: Idlewood Blvd (Z=145), Glen Park Blvd (Z=-115), Mulholland/Interstate (Z=-245), LSIA Hwy (Z=285)
    [-245, -115, 145, 285].forEach((zPos) => {
      const ewRoad = new THREE.Mesh(
        new THREE.PlaneGeometry(860, 20),
        roadMaterial
      );
      ewRoad.rotation.x = -Math.PI / 2;
      ewRoad.rotation.z = Math.PI / 2;
      ewRoad.position.set(-20, 0.04, zPos);
      ewRoad.receiveShadow = true;
      scene.add(ewRoad);
    });

    // 7. Los Santos Concrete Storm Drain / Flood Control Channel (Directly East of Grove St Cul-de-Sac at X = 76)
    const canalGroup = new THREE.Group();
    const canalFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 420),
      new THREE.MeshStandardMaterial({ color: 0x52525b, roughness: 0.8 })
    );
    canalFloor.rotation.x = -Math.PI / 2;
    canalFloor.position.set(76, 0.04, -10);
    canalGroup.add(canalFloor);

    // Central drainage water stream inside Storm Drain
    const canalWater = new THREE.Mesh(
      new THREE.PlaneGeometry(4.5, 420),
      new THREE.MeshPhysicalMaterial({
        color: 0x0284c7,
        roughness: 0.15,
        clearcoat: 1.0,
      })
    );
    canalWater.rotation.x = -Math.PI / 2;
    canalWater.position.set(76, 0.08, -10);
    canalGroup.add(canalWater);

    // Sloped concrete walls on West & East banks of Storm Drain
    [-11, 11].forEach((offsetX, i) => {
      const bank = new THREE.Mesh(
        new THREE.BoxGeometry(5.5, 0.4, 420),
        new THREE.MeshStandardMaterial({ color: 0x71717a, roughness: 0.85 })
      );
      bank.position.set(76 + offsetX, 1.1, -10);
      bank.rotation.z = i === 0 ? 0.42 : -0.42;
      canalGroup.add(bank);
    });
    scene.add(canalGroup);

    // Helper: Build Palm Tree
    const createPalmTree = (x: number, z: number, height = 14) => {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.52, height, 8),
        new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 })
      );
      trunk.position.y = height / 2;
      trunk.castShadow = true;
      tree.add(trunk);

      const frondMat = new THREE.MeshStandardMaterial({
        color: 0x2d6a3e,
        roughness: 0.7,
        side: THREE.DoubleSide,
      });
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2;
        const frond = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 0.12, 4.8),
          frondMat
        );
        frond.position.set(
          Math.sin(angle) * 2.1,
          height - 0.3,
          Math.cos(angle) * 2.1
        );
        frond.rotation.y = angle;
        frond.rotation.x = 0.38;
        frond.castShadow = true;
        tree.add(frond);
      }
      tree.position.set(x, 0, z);
      scene.add(tree);
    };

    const palmCoords: Array<[number, number, number]> = [
      [28, 0, 16],     // Center of Grove St Cul-de-Sac!
      [48, -14, 15],
      [48, 14, 15],
      [8, -22, 15],
      [8, 22, 16],
      [-18, -14, 14],
      [-18, 14, 15],
      [45, -102, 14],  // Glen Park
      [62, -125, 15],
      [-265, 195, 16], // Santa Maria Beach
      [-285, 225, 16],
      [352, -310, 15], // Las Venturas Strip Palms
      [378, -310, 15],
      [352, -340, 15],
      [378, -340, 15],
    ];
    palmCoords.forEach(([px, pz, ph]) => createPalmTree(px, pz, ph));

    // Helper: Build House
    const buildHouse = (
      x: number,
      z: number,
      w: number,
      h: number,
      d: number,
      wallColor: number,
      roofColor: number,
      rotY = 0,
      hasPorch = false
    ) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.8 })
      );
      body.position.y = h / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(Math.max(w, d) * 0.78, h * 0.45, 4),
        new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.85 })
      );
      roof.position.y = h + (h * 0.45) / 2;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      g.add(roof);

      const winMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const win1 = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), winMat);
      win1.position.set(-w * 0.25, h * 0.55, d / 2 + 0.05);
      g.add(win1);
      const win2 = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), winMat);
      win2.position.set(w * 0.25, h * 0.55, d / 2 + 0.05);
      g.add(win2);

      const door = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 2.5),
        new THREE.MeshStandardMaterial({ color: 0x451a03 })
      );
      door.position.set(0, 1.25, d / 2 + 0.05);
      g.add(door);

      if (hasPorch) {
        const porchRoof = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.7, 0.35, 3.2),
          new THREE.MeshStandardMaterial({ color: roofColor })
        );
        porchRoof.position.set(0, 3.3, d / 2 + 1.5);
        g.add(porchRoof);
      }

      g.position.set(x, 0, z);
      g.rotation.y = rotY;
      scene.add(g);
    };

    // Iconic Grove Street Cul-de-Sac Houses (True LAe.ipl Ring around (28, 0, 0)):
    // 1. CJ's Johnson House (East/South-East of Cul-de-Sac facing West into circle)
    buildHouse(56, 6, 13, 8.4, 11, 0xd6cfc2, 0x3f3f46, -Math.PI / 2, true);
    // 2. Sweet's House (South side of Cul-de-Sac facing North)
    buildHouse(28, 32, 11, 5.6, 10, 0x84a98c, 0x374151, Math.PI, true);
    // 3. Ryder's House (North-West side of Cul-de-Sac facing South)
    buildHouse(24, -32, 11, 5.6, 10, 0xb5a895, 0x4b5563, 0, true);
    // 4. Neighboring Cul-de-Sac & Grove Street Homes
    buildHouse(48, -24, 11, 6.0, 10, 0xe2e8f0, 0x334155, -0.6);
    buildHouse(6, 28, 11, 5.8, 10, 0x9ca3af, 0x3f3f46, Math.PI);
    buildHouse(-12, -22, 11, 5.8, 10, 0xa8a29e, 0x27272a, 0);
    buildHouse(-12, 22, 11, 5.8, 10, 0x94a3b8, 0x27272a, Math.PI);

    // Ganton Gym & Basketball Court at (-48, 0, 18)
    buildHouse(-48, 24, 16, 6.5, 12, 0x3f6212, 0x18181b, Math.PI);

    // Ganton Overpass Bridge (Liverpool Rd spanning North-South over Grove St at X = -32)
    const bridgeDeck = new THREE.Mesh(
      new THREE.BoxGeometry(14, 1.4, 48),
      new THREE.MeshStandardMaterial({ color: 0x71717a, roughness: 0.85 })
    );
    bridgeDeck.position.set(-32, 8.2, 0);
    bridgeDeck.castShadow = true;
    scene.add(bridgeDeck);
    [-16, 16].forEach((bz) => {
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.1, 8.2, 12),
        new THREE.MeshStandardMaterial({ color: 0x52525b })
      );
      pillar.position.set(-32, 4.1, bz);
      pillar.castShadow = true;
      scene.add(pillar);
    });

    // Idlewood Pay 'n' Spray Garage at (-48, 0, 145)
    const pnsGroup = new THREE.Group();
    const pnsBody = new THREE.Mesh(
      new THREE.BoxGeometry(16, 7.5, 14),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.65 })
    );
    pnsBody.position.y = 3.75;
    pnsBody.castShadow = true;
    pnsGroup.add(pnsBody);
    const pnsBay = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 5.2),
      new THREE.MeshBasicMaterial({ color: 0x090d16 })
    );
    pnsBay.position.set(0, 2.6, -7.05);
    pnsBay.rotation.y = Math.PI;
    pnsGroup.add(pnsBay);
    const pnsRing = new THREE.Mesh(
      new THREE.RingGeometry(4.5, 5.4, 32),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
      })
    );
    pnsRing.rotation.x = -Math.PI / 2;
    pnsRing.position.set(0, 0.12, -11);
    pnsGroup.add(pnsRing);
    pnsGroup.position.set(-48, 0, 162);
    scene.add(pnsGroup);

    // Willowfield Cluckin' Bell Drive-Thru at (55, 0, 165)
    const cbGroup = new THREE.Group();
    const cbBuilding = new THREE.Mesh(
      new THREE.BoxGeometry(18, 7, 14),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.7 })
    );
    cbBuilding.position.y = 3.5;
    cbBuilding.castShadow = true;
    cbGroup.add(cbBuilding);
    const cbSignPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 14, 10),
      new THREE.MeshStandardMaterial({ color: 0xe5e7eb })
    );
    cbSignPole.position.set(-10, 7, -6);
    cbGroup.add(cbSignPole);
    const cbSignTop = new THREE.Mesh(
      new THREE.ConeGeometry(2.8, 4.5, 12),
      new THREE.MeshStandardMaterial({ color: 0xfacc15 })
    );
    cbSignTop.position.set(-10, 15, -6);
    cbGroup.add(cbSignTop);
    cbGroup.position.set(62, 0, 178);
    scene.add(cbGroup);

    // Unity Station (El Corona Lowrider Meet Depot) at (-125, 0, 95)
    buildHouse(-125, 112, 28, 8.5, 14, 0xd97706, 0x7c2d12, Math.PI, true);

    // Glen Park Pond & Bridge at (45, 0, -115)
    const glenPond = new THREE.Mesh(
      new THREE.CircleGeometry(24, 36),
      new THREE.MeshPhysicalMaterial({
        color: 0x0284c7,
        roughness: 0.12,
        metalness: 0.1,
        clearcoat: 1.0,
      })
    );
    glenPond.rotation.x = -Math.PI / 2;
    glenPond.position.set(45, 0.08, -115);
    scene.add(glenPond);

    // Downtown Los Santos Skyscrapers & U.S. Bank Tower at (-175, 0, -65)
    const lsTower = new THREE.Mesh(
      new THREE.CylinderGeometry(16, 19, 138, 24),
      new THREE.MeshPhysicalMaterial({
        color: 0x64748b,
        metalness: 0.75,
        roughness: 0.22,
        clearcoat: 0.8,
      })
    );
    lsTower.position.set(-175, 69, -65);
    lsTower.castShadow = true;
    lsTower.receiveShadow = true;
    scene.add(lsTower);

    const towerCrown = new THREE.Mesh(
      new THREE.CylinderGeometry(11, 14, 14, 20),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    towerCrown.position.set(-175, 140, -65);
    scene.add(towerCrown);

    const skyscraperSpecs = [
      { x: -195, z: -5, w: 24, h: 78, d: 24, c: 0x334155 },
      { x: -135, z: -45, w: 22, h: 64, d: 22, c: 0x475569 },
      { x: -215, z: -85, w: 26, h: 92, d: 24, c: 0x1e293b },
      { x: -165, z: 25, w: 20, h: 54, d: 20, c: 0x3f3f46 },
    ];
    skyscraperSpecs.forEach((s) => {
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(s.w, s.h, s.d),
        new THREE.MeshPhysicalMaterial({
          color: s.c,
          metalness: 0.6,
          roughness: 0.3,
        })
      );
      b.position.set(s.x, s.h / 2, s.z);
      b.castShadow = true;
      scene.add(b);
    });

    // Vinewood Hills & Giant White "VINEWOOD" Sign at (-65, 38, -235)
    const hillMesh = new THREE.Mesh(
      new THREE.ConeGeometry(165, 58, 8),
      new THREE.MeshStandardMaterial({ color: 0x365314, roughness: 0.95 })
    );
    hillMesh.position.set(-65, 24, -275);
    scene.add(hillMesh);

    const makeVinewoodSign = () => {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 256;
      const ctx = c.getContext('2d')!;
      ctx.clearRect(0, 0, 1024, 256);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 158px Arial Black, Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('VINEWOOD', 512, 128);
      const tex = new THREE.CanvasTexture(c);
      const signMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(115, 28),
        new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          side: THREE.DoubleSide,
        })
      );
      signMesh.position.set(-65, 42, -215);
      scene.add(signMesh);
    };
    makeVinewoodSign();

    // LSIA Airport Runway at (-100, 0.06, 295)
    const runwayMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 34),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })
    );
    runwayMesh.rotation.x = -Math.PI / 2;
    runwayMesh.position.set(-95, 0.06, 295);
    scene.add(runwayMesh);

    // Santa Maria Beach Ocean, Pier & Lighthouse at (-285, 0.1, 210)
    const oceanMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(380, 420),
      new THREE.MeshPhysicalMaterial({
        color: 0x0369a1,
        roughness: 0.15,
        metalness: 0.2,
        clearcoat: 1.0,
      })
    );
    oceanMesh.rotation.x = -Math.PI / 2;
    oceanMesh.position.set(-380, 0.08, 220);
    scene.add(oceanMesh);

    const lighthouse = new THREE.Mesh(
      new THREE.CylinderGeometry(2.5, 4.2, 28, 16),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc })
    );
    lighthouse.position.set(-285, 14, 225);
    lighthouse.castShadow = true;
    scene.add(lighthouse);

    // San Fierro Gant Bridge (Red Golden Gate Suspension Towers) & Mount Chiliad at (-420, 0, -260)
    [-445, -395].forEach((tx) => {
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(6, 75, 16),
        new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5 })
      );
      tower.position.set(tx, 37.5, -260);
      tower.castShadow = true;
      scene.add(tower);
    });
    const gantDeck = new THREE.Mesh(
      new THREE.BoxGeometry(110, 2.2, 20),
      new THREE.MeshStandardMaterial({ color: 0x991b1b })
    );
    gantDeck.position.set(-420, 18, -260);
    scene.add(gantDeck);

    // Mount Chiliad Peak at (-460, 0, -110)
    const chiliadMesh = new THREE.Mesh(
      new THREE.ConeGeometry(140, 115, 7),
      new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.95 })
    );
    chiliadMesh.position.set(-460, 55, -110);
    scene.add(chiliadMesh);

    // Bone County Area 69 Restricted Military Base at (215, 0, -340)
    const area69Bunker = new THREE.Mesh(
      new THREE.BoxGeometry(36, 8, 26),
      new THREE.MeshStandardMaterial({ color: 0x57534e })
    );
    area69Bunker.position.set(215, 4, -340);
    scene.add(area69Bunker);

    // Las Venturas — The Strip (Camel's Toe Pyramid & Four Dragons Casino) at (365, 0, -320)
    const lvPyramid = new THREE.Mesh(
      new THREE.ConeGeometry(38, 48, 4),
      new THREE.MeshPhysicalMaterial({
        color: 0x18181b,
        metalness: 0.85,
        roughness: 0.15,
        clearcoat: 1.0,
      })
    );
    lvPyramid.position.set(405, 24, -320);
    lvPyramid.rotation.y = Math.PI / 4;
    lvPyramid.castShadow = true;
    scene.add(lvPyramid);

    const fourDragons = new THREE.Mesh(
      new THREE.BoxGeometry(28, 46, 24),
      new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.4 })
    );
    fourDragons.position.set(325, 23, -320);
    fourDragons.castShadow = true;
    scene.add(fourDragons);

    // 8. Collectible Ballas Graffiti Tags to Spray Over ("Tagging Up Turf")
    const makeTagTexture = (sprayed: boolean) => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 128;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#27272a';
      ctx.fillRect(0, 0, 256, 128);
      ctx.font = 'bold 34px Impact, sans-serif';
      ctx.textAlign = 'center';
      if (sprayed) {
        ctx.fillStyle = '#22c55e';
        ctx.fillText('GROVE ST 4 LIFE', 128, 68);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeText('GROVE ST 4 LIFE', 128, 68);
      } else {
        ctx.fillStyle = '#a855f7';
        ctx.fillText('FRONT YARD BALLAS', 128, 68);
      }
      return new THREE.CanvasTexture(c);
    };

    const tagLocations: Array<[number, number]> = [
      [10, -14],
      [-32, 12],
      [48, 142],
      [45, -108],
      [-15, 92],
      [-85, 62],
    ];
    const graffitiTags: GraffitiTagInstance[] = tagLocations.map(([tx, tz], idx) => {
      const mat = new THREE.MeshBasicMaterial({
        map: makeTagTexture(false),
        side: THREE.DoubleSide,
      });
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 3.2, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x52525b })
      );
      wall.position.set(tx, 1.6, tz);
      wall.castShadow = true;
      scene.add(wall);

      const decal = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.3), mat);
      decal.position.set(tx, 1.7, tz + 0.28);
      scene.add(decal);

      return {
        id: `TAG_${idx + 1}`,
        x: tx,
        z: tz,
        sprayed: false,
        mesh: decal,
        material: mat,
      };
    });

    // 9. Build Playable Character CJ (Carl Johnson)
    const cjGroup = new THREE.Group();
    const cjSkinMat = new THREE.MeshStandardMaterial({ color: 0x6f452b, roughness: 0.65 });
    const cjHoodieMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
    const cjJeansMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.85 });

    const cjTorso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.15, 0.48), cjHoodieMat);
    cjTorso.position.y = 1.45;
    cjTorso.castShadow = true;
    cjGroup.add(cjTorso);

    const cjHead = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.58, 0.55), cjSkinMat);
    cjHead.position.y = 2.35;
    cjHead.castShadow = true;
    cjGroup.add(cjHead);

    const cjBandana = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.58), cjHoodieMat);
    cjBandana.position.y = 2.58;
    cjGroup.add(cjBandana);

    const cjLeftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.9, 0.36), cjJeansMat);
    cjLeftLeg.position.set(-0.22, 0.45, 0);
    cjLeftLeg.castShadow = true;
    cjGroup.add(cjLeftLeg);

    const cjRightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.9, 0.36), cjJeansMat);
    cjRightLeg.position.set(0.22, 0.45, 0);
    cjRightLeg.castShadow = true;
    cjGroup.add(cjRightLeg);

    const cjLeftArm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.28), cjHoodieMat);
    cjLeftArm.position.set(-0.58, 1.45, 0);
    cjGroup.add(cjLeftArm);

    const cjRightArm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.28), cjHoodieMat);
    cjRightArm.position.set(0.58, 1.45, 0.18);
    cjRightArm.rotation.x = -0.45;
    cjGroup.add(cjRightArm);

    const cjWeaponMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.18, 0.65),
      new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.8, roughness: 0.2 })
    );
    cjWeaponMesh.position.set(0.58, 1.45, 0.55);
    cjGroup.add(cjWeaponMesh);

    const jetpackGroup = new THREE.Group();
    const jpCylinderL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.95, 12),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 })
    );
    jpCylinderL.position.set(-0.22, 1.5, -0.36);
    jetpackGroup.add(jpCylinderL);
    const jpCylinderR = jpCylinderL.clone();
    jpCylinderR.position.set(0.22, 1.5, -0.36);
    jetpackGroup.add(jpCylinderR);
    const jpFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.26, 0.85, 10),
      new THREE.MeshBasicMaterial({ color: 0xf97316 })
    );
    jpFlame.rotation.x = Math.PI;
    jpFlame.position.set(0, 0.72, -0.36);
    jetpackGroup.add(jpFlame);
    jetpackGroup.visible = false;
    cjGroup.add(jetpackGroup);

    // Start CJ in the East-facing Grove Street Cul-de-Sac outside the Johnson House (40, 0, 4) facing West (-Math.PI/2)
    cjGroup.position.set(40, 0, 4);
    scene.add(cjGroup);

    // 10. Build Vehicle Factory
    const vehicles: SpawnedVehicleInstance[] = [];

    const createVehicleInstance = (
      vehicleId: string,
      x: number,
      z: number,
      heading = 0,
      isPoliceAI = false
    ): SpawnedVehicleInstance => {
      const handling =
        DEFAULT_HANDLING_TABLE[vehicleId] || DEFAULT_HANDLING_TABLE.GREENWOOD;
      const group = new THREE.Group();

      const bodyMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(handling.primaryColor),
        metalness: 0.65,
        roughness: 0.2,
        clearcoat: stateRef.current.tuning.pbrClearcoatIntensity,
        clearcoatRoughness: 0.08,
      });

      const secondaryMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(handling.secondaryColor),
        roughness: 0.35,
        metalness: 0.4,
      });

      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x0f172a,
        metalness: 0.1,
        roughness: 0.05,
        transmission: 0.4,
        transparent: true,
        opacity: 0.78,
      });

      const wheels: THREE.Object3D[] = [];
      let bodyMesh: THREE.Mesh;
      let sirenLightL: THREE.PointLight | undefined;
      let sirenLightR: THREE.PointLight | undefined;
      let rotorMain: THREE.Object3D | undefined;
      let turretGroup: THREE.Object3D | undefined;

      if (handling.category === 'bicycle' || handling.category === 'bike') {
        const isBicycle = handling.category === 'bicycle';
        bodyMesh = new THREE.Mesh(
          new THREE.BoxGeometry(isBicycle ? 0.32 : 0.65, isBicycle ? 0.75 : 0.9, isBicycle ? 1.85 : 2.3),
          bodyMaterial
        );
        bodyMesh.position.y = 0.85;
        bodyMesh.castShadow = true;
        group.add(bodyMesh);

        const bars = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 0.95, 8),
          secondaryMat
        );
        bars.rotation.z = Math.PI / 2;
        bars.position.set(0, 1.38, 0.65);
        group.add(bars);

        const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, isBicycle ? 0.12 : 0.26, 16);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
        [0.75, -0.75].forEach((wz) => {
          const w = new THREE.Mesh(wheelGeo, wheelMat);
          w.position.set(0, 0.42, wz);
          group.add(w);
          wheels.push(w);
        });
      } else if (handling.identifier === 'RHINO') {
        bodyMesh = new THREE.Mesh(
          new THREE.BoxGeometry(3.6, 1.45, 6.4),
          bodyMaterial
        );
        bodyMesh.position.y = 1.1;
        bodyMesh.castShadow = true;
        group.add(bodyMesh);

        turretGroup = new THREE.Group();
        const turretBox = new THREE.Mesh(
          new THREE.BoxGeometry(2.4, 0.95, 2.8),
          secondaryMat
        );
        turretBox.position.y = 2.15;
        turretGroup.add(turretBox);
        const cannon = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.16, 4.2, 12),
          secondaryMat
        );
        cannon.rotation.x = Math.PI / 2;
        cannon.position.set(0, 2.15, 2.8);
        turretGroup.add(cannon);
        group.add(turretGroup);
      } else if (handling.identifier === 'MAVERICK') {
        bodyMesh = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, 1.8, 4.6),
          bodyMaterial
        );
        bodyMesh.position.y = 1.5;
        bodyMesh.castShadow = true;
        group.add(bodyMesh);

        const tailBoom = new THREE.Mesh(
          new THREE.BoxGeometry(0.45, 0.5, 4.2),
          secondaryMat
        );
        tailBoom.position.set(0, 1.7, -3.8);
        group.add(tailBoom);

        rotorMain = new THREE.Mesh(
          new THREE.BoxGeometry(9.5, 0.08, 0.35),
          new THREE.MeshStandardMaterial({ color: 0x18181b })
        );
        rotorMain.position.set(0, 2.55, 0);
        group.add(rotorMain);
      } else if (handling.identifier === 'HYDRA') {
        bodyMesh = new THREE.Mesh(
          new THREE.ConeGeometry(1.35, 8.2, 6),
          bodyMaterial
        );
        bodyMesh.rotation.x = Math.PI / 2;
        bodyMesh.position.y = 1.35;
        bodyMesh.castShadow = true;
        group.add(bodyMesh);

        const wings = new THREE.Mesh(
          new THREE.BoxGeometry(7.6, 0.16, 2.6),
          secondaryMat
        );
        wings.position.set(0, 1.35, -0.5);
        group.add(wings);
      } else {
        const isSupercar = handling.category === 'supercar';
        const chassisH = isSupercar ? 0.68 : 0.86;
        bodyMesh = new THREE.Mesh(
          new THREE.BoxGeometry(2.25, chassisH, 4.85),
          bodyMaterial
        );
        bodyMesh.position.y = 0.72;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        group.add(bodyMesh);

        const cabin = new THREE.Mesh(
          new THREE.BoxGeometry(1.92, isSupercar ? 0.55 : 0.72, 2.35),
          handling.category === 'lowrider' ? secondaryMat : bodyMaterial
        );
        cabin.position.set(0, 0.72 + chassisH * 0.5 + 0.28, -0.25);
        cabin.castShadow = true;
        group.add(cabin);

        const windshield = new THREE.Mesh(
          new THREE.PlaneGeometry(1.78, 0.62),
          glassMat
        );
        windshield.position.set(0, 1.32, 0.94);
        windshield.rotation.x = -0.35;
        group.add(windshield);

        const hlMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
        const tlMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        [-0.78, 0.78].forEach((lx) => {
          const hl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.1), hlMat);
          hl.position.set(lx, 0.78, 2.43);
          group.add(hl);
          const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.1), tlMat);
          tl.position.set(lx, 0.78, -2.43);
          group.add(tl);
        });

        if (handling.hasSiren) {
          const barL = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.18, 0.28),
            new THREE.MeshBasicMaterial({ color: 0xef4444 })
          );
          barL.position.set(-0.35, 1.88, -0.2);
          group.add(barL);
          const barR = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.18, 0.28),
            new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
          );
          barR.position.set(0.35, 1.88, -0.2);
          group.add(barR);

          sirenLightL = new THREE.PointLight(0xef4444, 2.5, 18);
          sirenLightL.position.set(-0.4, 2.1, -0.2);
          group.add(sirenLightL);
          sirenLightR = new THREE.PointLight(0x3b82f6, 2.5, 18);
          sirenLightR.position.set(0.4, 2.1, -0.2);
          group.add(sirenLightR);
        }

        const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 16);
        wheelGeo.rotateZ(Math.PI / 2);
        const wheelMat = new THREE.MeshStandardMaterial({
          color: 0x18181b,
          roughness: 0.75,
        });
        const wheelPositions: Array<[number, number, number]> = [
          [-1.12, 0.42, 1.48],
          [1.12, 0.42, 1.48],
          [-1.12, 0.42, -1.48],
          [1.12, 0.42, -1.48],
        ];
        wheelPositions.forEach(([wx, wy, wz]) => {
          const w = new THREE.Mesh(wheelGeo, wheelMat);
          w.position.set(wx, wy, wz);
          group.add(w);
          wheels.push(w);
        });
      }

      const nitroFlame = new THREE.Mesh(
        new THREE.ConeGeometry(0.32, 1.4, 10),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      nitroFlame.rotation.x = -Math.PI / 2;
      nitroFlame.position.set(0, 0.55, -3.1);
      nitroFlame.visible = false;
      group.add(nitroFlame);

      group.position.set(x, 0, z);
      group.rotation.y = heading;
      scene.add(group);

      const inst: SpawnedVehicleInstance = {
        uid: `${vehicleId}_${Math.random().toString(36).slice(2, 7)}`,
        handling,
        group,
        bodyMesh,
        bodyMaterial,
        wheels,
        sirenLightL,
        sirenLightR,
        rotorMain,
        turretGroup,
        nitroFlame,
        speed: 0,
        steering: 0,
        heading,
        hp: 1000,
        hydraulicBounceVel: 0,
        hydraulicOffset: 0,
        isPoliceAI,
      };
      vehicles.push(inst);
      return inst;
    };

    // Spawn Vehicles in Authentic Grove Street Cul-de-Sac & Landmark Positions
    createVehicleInstance('BMX', 36, -4, -Math.PI / 2);         // BMX right outside CJ's house in Cul-de-Sac
    createVehicleInstance('GREENWOOD', 26, 20, -Math.PI / 2);   // Sweet's Greenwood in front of Sweet's House
    createVehicleInstance('PICADOR', 22, -20, -Math.PI / 2);    // Ryder's Picador in front of Ryder's House
    createVehicleInstance('SAVANNA', 12, 8, -Math.PI / 2);      // Cesar's Lowrider Savanna
    createVehicleInstance('SULTAN', -12, -6, Math.PI / 2);      // Sultan Tuner on Grove Street
    createVehicleInstance('INFERNUS', 365, -305, 0);            // Infernus Supercar on Las Venturas Strip
    createVehicleInstance('NRG500', 42, -8, -Math.PI / 2);      // NRG-500 Superbike
    createVehicleInstance('SANCHEZ', 74, -20, 0);               // Sanchez Dirtbike inside Storm Drain Canal!
    createVehicleInstance('COPCARLA', -32, 85, 0);              // LSPD Cruiser
    createVehicleInstance('TAXI', -32, -45, 0);                 // Los Santos Taxi
    createVehicleInstance('MAVERICK', -150, -65, 0);            // Maverick Helicopter near Downtown LS Tower
    createVehicleInstance('HYDRA', -120, 295, Math.PI / 2);     // Hydra VTOL Jet on LSIA Runway
    createVehicleInstance('RHINO', 215, -315, 0);               // Rhino Tank at Area 69

    // 11. Spawn Grove Street Families, Ballas Gang Members, & Pedestrians
    const npcs: NpcInstance[] = [];
    const spawnNpc = (
      faction: NpcInstance['faction'],
      x: number,
      z: number
    ): NpcInstance => {
      const g = new THREE.Group();
      const shirtColor =
        faction === 'GROVE'
          ? 0x16a34a
          : faction === 'BALLAS'
          ? 0x9333ea
          : faction === 'LSPD'
          ? 0x1e293b
          : 0xeab308;

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 1.1, 0.42),
        new THREE.MeshStandardMaterial({ color: shirtColor })
      );
      body.position.y = 1.35;
      body.castShadow = true;
      g.add(body);

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.5, 0.48),
        new THREE.MeshStandardMaterial({ color: 0x8d5524 })
      );
      head.position.y = 2.2;
      g.add(head);

      const legMat = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
      const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.8, 0.3), legMat);
      leftLeg.position.set(-0.18, 0.4, 0);
      g.add(leftLeg);
      const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.8, 0.3), legMat);
      rightLeg.position.set(0.18, 0.4, 0);
      g.add(rightLeg);

      g.position.set(x, 0, z);
      scene.add(g);

      const inst: NpcInstance = {
        uid: `NPC_${Math.random().toString(36).slice(2, 8)}`,
        faction,
        group: g,
        leftLeg,
        rightLeg,
        hp: 100,
        alive: true,
        walkAngle: Math.random() * Math.PI * 2,
        speed: faction === 'BALLAS' || faction === 'LSPD' ? 4.8 : 2.8,
      };
      npcs.push(inst);
      return inst;
    };

    spawnNpc('GROVE', 32, 12);
    spawnNpc('GROVE', 18, -8);
    spawnNpc('GROVE', 4, 6);

    spawnNpc('BALLAS', -12, 128);
    spawnNpc('BALLAS', 18, 115);
    spawnNpc('BALLAS', 45, -102);
    spawnNpc('BALLAS', 55, -122);
    spawnNpc('BALLAS', 45, 138);

    spawnNpc('CIV', -25, 48);
    spawnNpc('CIV', -145, -25);

    // 12. Mission Red Glowing Cylinder Marker (Outside Sweet's House at (22, 0, 14))
    const activeMissionMarker = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 2.8, 3.8, 28, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.58,
        side: THREE.DoubleSide,
      })
    );
    activeMissionMarker.position.set(22, 1.9, 14);
    scene.add(activeMissionMarker);

    // 13. Input & Physics State
    const keys: Record<string, boolean> = {};
    let playerHeading = -Math.PI / 2; // Facing West out of the Grove St Cul-de-Sac
    let playerVelY = 0;
    let isGrounded = true;
    let walkCycle = 0;
    let currentVehicle: SpawnedVehicleInstance | null = null;
    let cameraYawOffset = 0;
    let cameraPitch = 0.34;
    let isPointerDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    let activeMission: MissionDefinition | null = null;
    let activeStageIndex = 0;
    let subtitle: { speaker: string; text: string } | null = null;
    let gangWarActive = false;
    let gangWarWave = 1;
    let gangWarKillsLeft = 0;
    let lastResprayTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }
      const code = e.code;
      keys[code] = true;

      if (code === 'KeyF' || code === 'Enter') {
        toggleEnterExitVehicle();
      } else if (code === 'KeyH') {
        triggerHydraulics();
      } else if (code === 'ControlLeft' || code === 'ControlRight') {
        fireWeapon();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isPointerDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPointerDragging) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      cameraYawOffset -= dx * 0.0065;
      cameraPitch = Math.max(0.08, Math.min(1.15, cameraPitch + dy * 0.005));
    };

    const handleMouseUp = () => {
      isPointerDragging = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    const toggleEnterExitVehicle = () => {
      if (currentVehicle) {
        const exitX =
          currentVehicle.group.position.x -
          Math.cos(currentVehicle.heading) * 3.1;
        const exitZ =
          currentVehicle.group.position.z +
          Math.sin(currentVehicle.heading) * 3.1;
        cjGroup.position.set(exitX, Math.max(0, currentVehicle.group.position.y), exitZ);
        cjGroup.visible = true;
        currentVehicle = null;
        audioEngine.stopRadio();
        return;
      }

      let best: SpawnedVehicleInstance | null = null;
      let bestDist = 7.5;
      for (const v of vehicles) {
        const dist = v.group.position.distanceTo(cjGroup.position);
        if (dist < bestDist) {
          bestDist = dist;
          best = v;
        }
      }

      if (best) {
        currentVehicle = best;
        cjGroup.visible = false;
        cameraYawOffset = 0;
      }
    };

    const triggerHydraulics = () => {
      if (!currentVehicle) return;
      currentVehicle.hydraulicBounceVel = 7.5;
      audioEngine.playHydraulicBounce();
    };

    const fireWeapon = () => {
      const wep = stateRef.current.currentWeapon;
      audioEngine.playWeaponSound(
        currentVehicle?.handling.hasTurret ? 'TANK_CANNON' : wep.id
      );

      const origin = currentVehicle
        ? currentVehicle.group.position.clone().add(new THREE.Vector3(0, 1.5, 0))
        : cjGroup.position.clone().add(new THREE.Vector3(0, 1.6, 0));
      const heading = currentVehicle ? currentVehicle.heading : playerHeading;
      const forward = new THREE.Vector3(
        Math.sin(heading),
        0,
        Math.cos(heading)
      ).normalize();

      const tracerEnd = origin.clone().addScaledVector(forward, wep.range);
      const lineGeo = new THREE.BufferGeometry().setFromPoints([origin, tracerEnd]);
      const lineMat = new THREE.LineBasicMaterial({
        color: wep.id === 'SPRAYCAN' ? 0x22c55e : 0xfef08a,
      });
      const tracerLine = new THREE.Line(lineGeo, lineMat);
      scene.add(tracerLine);
      setTimeout(() => {
        scene.remove(tracerLine);
        lineGeo.dispose();
        lineMat.dispose();
      }, 95);

      for (const tag of graffitiTags) {
        if (!tag.sprayed) {
          const dist = Math.hypot(origin.x - tag.x, origin.z - tag.z);
          if (dist < 11) {
            tag.sprayed = true;
            tag.material.map = makeTagTexture(true);
            tag.material.needsUpdate = true;
            onUpdateStats((prev) => ({
              ...prev,
              respect: Math.min(1000, prev.respect + 20),
              cash: prev.cash + 500,
            }));
            onBannerNotification({
              type: 'TAG_SPRAYED',
              title: 'TAG SPRAYED!',
              subtitle: `Grove Street Families Turf Tag Claimed (+$500 & Respect +)`,
            });
          }
        }
      }

      for (const npc of npcs) {
        if (!npc.alive) continue;
        const toNpc = npc.group.position.clone().sub(origin);
        const dist = toNpc.length();
        if (dist < wep.range) {
          toNpc.normalize();
          if (toNpc.dot(forward) > 0.72 || dist < 4.5) {
            npc.hp -= currentVehicle?.handling.hasTurret ? 200 : wep.damage;
            if (npc.hp <= 0) {
              npc.alive = false;
              npc.group.rotation.x = -Math.PI / 2;
              npc.group.position.y = 0.25;

              if (npc.faction === 'BALLAS') {
                onUpdateStats((prev) => ({
                  ...prev,
                  cash: prev.cash + 250,
                  respect: Math.min(1000, prev.respect + 10),
                }));
                if (!gangWarActive) {
                  gangWarActive = true;
                  gangWarWave = 1;
                  gangWarKillsLeft = 3;
                  onBannerNotification({
                    type: 'GANG_WAR',
                    title: 'GANG WAR PROVOKED!',
                    subtitle: 'Eliminate the Ballas wave to claim Idlewood & Glen Park turf!',
                  });
                  for (let w = 0; w < 3; w++) {
                    spawnNpc(
                      'BALLAS',
                      origin.x + (Math.random() - 0.5) * 32,
                      origin.z + (Math.random() - 0.5) * 32
                    );
                  }
                } else {
                  gangWarKillsLeft = Math.max(0, gangWarKillsLeft - 1);
                  if (gangWarKillsLeft === 0) {
                    gangWarActive = false;
                    audioEngine.playMissionPassedFanfare();
                    onUpdateStats((prev) => ({
                      ...prev,
                      cash: prev.cash + 5000,
                      respect: Math.min(1000, prev.respect + 45),
                    }));
                    onBannerNotification({
                      type: 'MISSION_PASSED',
                      title: 'HOOD IS YOURS!',
                      subtitle: 'Grove Street Families now control this territory! +$5,000',
                    });
                  }
                }
              } else if (!stateRef.current.neverWanted) {
                onUpdateStats((prev) => ({
                  ...prev,
                  wantedStars: Math.min(6, prev.wantedStars + 1),
                }));
              }
            }
          }
        }
      }
    };

    const spawnVehicleNearPlayer = (vehicleId: string) => {
      const basePos = currentVehicle
        ? currentVehicle.group.position
        : cjGroup.position;
      const heading = currentVehicle ? currentVehicle.heading : playerHeading;
      const spawnX = basePos.x + Math.sin(heading) * 6.5;
      const spawnZ = basePos.z + Math.cos(heading) * 6.5;
      createVehicleInstance(vehicleId, spawnX, spawnZ, heading);
    };

    const teleportPlayer = (x: number, y: number, z: number) => {
      if (currentVehicle) {
        currentVehicle.group.position.set(x, y, z);
        currentVehicle.speed = 0;
      } else {
        cjGroup.position.set(x, y, z);
        playerVelY = 0;
      }
    };

    const startMissionById = (missionId: string) => {
      const m = GTA_SA_MISSIONS.find((item) => item.id === missionId);
      if (!m) return;
      activeMission = m;
      activeStageIndex = 0;
      const firstStage = m.stages[0];
      subtitle = firstStage.subtitleDialogue || null;
      activeMissionMarker.position.set(
        firstStage.targetPosition[0],
        1.9,
        firstStage.targetPosition[2]
      );
      activeMissionMarker.material.color.setHex(0xfacc15);
    };

    actionsRef.current = {
      spawnVehicleNearPlayer,
      teleportPlayer,
      startMissionById,
      fireWeapon,
      toggleEnterExitVehicle,
      triggerHydraulics,
    };

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / Math.max(1, container.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // 14. Main 60Hz Loop
    let animFrameId = 0;
    let lastTime = performance.now();
    let frameCounter = 0;
    let fpsAccumulator = 0;
    let currentFps = 60;
    let telemetryTimer = 0;

    const animate = (now: number) => {
      animFrameId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      frameCounter++;
      fpsAccumulator += dt;
      if (fpsAccumulator >= 0.5) {
        currentFps = Math.round(frameCounter / fpsAccumulator);
        frameCounter = 0;
        fpsAccumulator = 0;
      }

      const st = stateRef.current;

      const tc = interpolateTimeCycle(st.gameHour, st.weather, st.tuning);
      const skyColor = new THREE.Color(
        tc.skyBottom[0] / 255,
        tc.skyBottom[1] / 255,
        tc.skyBottom[2] / 255
      );
      scene.background = skyColor;
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(skyColor);
        scene.fog.density = 1.45 / Math.max(180, tc.farClip);
      }

      ambientLight.color.setRGB(
        tc.ambient[0] / 255,
        tc.ambient[1] / 255,
        tc.ambient[2] / 255
      );
      sunLight.color.setRGB(
        tc.directional[0] / 255,
        tc.directional[1] / 255,
        tc.directional[2] / 255
      );
      sunLight.intensity = tc.sunIntensity;

      const sunAngle = ((st.gameHour - 6) / 24) * Math.PI * 2;
      const sunX = Math.cos(sunAngle) * 280;
      const sunY = Math.max(14, Math.sin(sunAngle) * 220);
      const sunZ = -140;
      sunLight.position.set(sunX, sunY, sunZ);
      sunDisc.position.set(sunX * 1.4, Math.sin(sunAngle) * 300, sunZ * 1.4);
      (sunDisc.material as THREE.MeshBasicMaterial).color.setRGB(
        tc.sunCore[0] / 255,
        tc.sunCore[1] / 255,
        tc.sunCore[2] / 255
      );

      roadMaterial.roughness = Math.max(
        0.06,
        0.65 - st.tuning.roadWetnessReflections * 0.58
      );
      roadMaterial.metalness = 0.1 + st.tuning.roadWetnessReflections * 0.65;
      if (camera.fov !== st.tuning.fovDegrees) {
        camera.fov = st.tuning.fovDegrees;
        camera.updateProjectionMatrix();
      }

      const moveForward = keys['KeyW'] || keys['ArrowUp'];
      const moveBackward = keys['KeyS'] || keys['ArrowDown'];
      const turnLeft = keys['KeyA'] || keys['ArrowLeft'];
      const turnRight = keys['KeyD'] || keys['ArrowRight'];
      const jumpOrBrake = keys['Space'];
      const boostOrSprint = keys['ShiftLeft'] || keys['ShiftRight'];

      if (currentVehicle) {
        const h = currentVehicle.handling;
        const maxSpeedUnits = (h.fMaxVelocity / 3.6) * 0.85;
        const accel = h.fEngineAcceleration * 1.45;

        const nitroActive =
          boostOrSprint && (h.hasNitro || st.allCarsNitro);
        if (currentVehicle.nitroFlame) {
          currentVehicle.nitroFlame.visible = nitroActive;
        }

        if (moveForward) {
          currentVehicle.speed = Math.min(
            maxSpeedUnits * (nitroActive ? 1.45 : 1.0),
            currentVehicle.speed + accel * (nitroActive ? 2.1 : 1.0) * dt
          );
        } else if (moveBackward) {
          currentVehicle.speed = Math.max(
            -maxSpeedUnits * 0.42,
            currentVehicle.speed - accel * 1.2 * dt
          );
        } else {
          currentVehicle.speed *= Math.pow(0.35, dt);
          if (Math.abs(currentVehicle.speed) < 0.15) currentVehicle.speed = 0;
        }

        if (jumpOrBrake) {
          currentVehicle.speed *= Math.pow(0.04, dt);
        }

        const steerFactor =
          Math.min(1, Math.abs(currentVehicle.speed) / 4) *
          (currentVehicle.speed >= 0 ? 1 : -1);
        const turnRate = ((h.fSteeringLock * Math.PI) / 180) * 1.35;
        if (turnLeft) {
          currentVehicle.heading += turnRate * steerFactor * dt;
          currentVehicle.group.rotation.z = THREE.MathUtils.lerp(
            currentVehicle.group.rotation.z,
            -0.06 * steerFactor,
            0.15
          );
        } else if (turnRight) {
          currentVehicle.heading -= turnRate * steerFactor * dt;
          currentVehicle.group.rotation.z = THREE.MathUtils.lerp(
            currentVehicle.group.rotation.z,
            0.06 * steerFactor,
            0.15
          );
        } else {
          currentVehicle.group.rotation.z = THREE.MathUtils.lerp(
            currentVehicle.group.rotation.z,
            0,
            0.2
          );
        }

        const canFly = h.category === 'aircraft' || st.carsFly;
        if (canFly && (jumpOrBrake || Math.abs(currentVehicle.speed) > 16)) {
          if (jumpOrBrake) {
            currentVehicle.group.position.y = Math.min(
              165,
              currentVehicle.group.position.y + 18 * dt
            );
          } else if (keys['KeyC']) {
            currentVehicle.group.position.y = Math.max(
              0,
              currentVehicle.group.position.y - 18 * dt
            );
          }
        } else if (currentVehicle.group.position.y > 0 && currentVehicle.hydraulicOffset <= 0) {
          currentVehicle.group.position.y = Math.max(
            0,
            currentVehicle.group.position.y - 14 * dt
          );
        }

        if (currentVehicle.hydraulicBounceVel !== 0 || currentVehicle.hydraulicOffset > 0) {
          currentVehicle.hydraulicOffset += currentVehicle.hydraulicBounceVel * dt;
          currentVehicle.hydraulicBounceVel -= 26 * dt;
          if (currentVehicle.hydraulicOffset <= 0) {
            currentVehicle.hydraulicOffset = 0;
            currentVehicle.hydraulicBounceVel = 0;
          }
          currentVehicle.bodyMesh.position.y =
            0.72 + currentVehicle.hydraulicOffset * 0.45;
        }

        currentVehicle.group.position.x +=
          Math.sin(currentVehicle.heading) * currentVehicle.speed * dt;
        currentVehicle.group.position.z +=
          Math.cos(currentVehicle.heading) * currentVehicle.speed * dt;
        currentVehicle.group.rotation.y = currentVehicle.heading;

        const vehSpeed = currentVehicle.speed;
        currentVehicle.wheels.forEach((w) => {
          w.rotation.x += vehSpeed * dt * 1.8;
        });
        if (currentVehicle.rotorMain) {
          currentVehicle.rotorMain.rotation.y += dt * 18;
        }

        cjGroup.position.copy(currentVehicle.group.position);
        playerHeading = currentVehicle.heading;
      } else {
        jetpackGroup.visible = st.jetpackActive;
        const speed = boostOrSprint ? 15.5 : 9.2;

        if (turnLeft) playerHeading += 2.8 * dt;
        if (turnRight) playerHeading -= 2.8 * dt;

        let moveAmount = 0;
        if (moveForward) moveAmount = speed;
        else if (moveBackward) moveAmount = -speed * 0.65;

        cjGroup.position.x += Math.sin(playerHeading) * moveAmount * dt;
        cjGroup.position.z += Math.cos(playerHeading) * moveAmount * dt;
        cjGroup.rotation.y = playerHeading;

        if (st.jetpackActive) {
          if (jumpOrBrake) {
            cjGroup.position.y = Math.min(165, cjGroup.position.y + 18 * dt);
          } else if (cjGroup.position.y > 0) {
            cjGroup.position.y = Math.max(0, cjGroup.position.y - 8.5 * dt);
          }
        } else {
          if (jumpOrBrake && isGrounded) {
            playerVelY = st.megaJump ? 26.0 : 9.5;
            isGrounded = false;
          }
          if (!isGrounded || cjGroup.position.y > 0) {
            cjGroup.position.y += playerVelY * dt;
            playerVelY -= 24.0 * dt;
            if (cjGroup.position.y <= 0) {
              cjGroup.position.y = 0;
              playerVelY = 0;
              isGrounded = true;
            }
          }
        }

        if (Math.abs(moveAmount) > 0.1) {
          walkCycle += dt * (boostOrSprint ? 14 : 9);
          cjLeftLeg.rotation.x = Math.sin(walkCycle) * 0.65;
          cjRightLeg.rotation.x = -Math.sin(walkCycle) * 0.65;
          cjLeftArm.rotation.x = -Math.sin(walkCycle) * 0.45;
        } else {
          cjLeftLeg.rotation.x = 0;
          cjRightLeg.rotation.x = 0;
          cjLeftArm.rotation.x = 0;
        }
      }

      const activePos = currentVehicle
        ? currentVehicle.group.position
        : cjGroup.position;
      const distToPayNSpray = Math.hypot(activePos.x - -48, activePos.z - 151);
      if (distToPayNSpray < 7.5 && now - lastResprayTime > 6000) {
        lastResprayTime = now;
        if (currentVehicle) {
          currentVehicle.hp = 1000;
          const candyColors = [0x16a34a, 0xdc2626, 0x2563eb, 0xf59e0b, 0x9333ea, 0x06b6d4];
          const randomColor = candyColors[Math.floor(Math.random() * candyColors.length)];
          currentVehicle.bodyMaterial.color.setHex(randomColor);
        }
        onUpdateStats((prev) => ({
          ...prev,
          health: 100,
          wantedStars: 0,
          cash: Math.max(0, prev.cash - 100),
        }));
        audioEngine.playCheatActivated();
        onBannerNotification({
          type: 'RESPRAYED',
          title: 'PAY ’N’ SPRAY',
          subtitle: 'Engine Repaired, Custom Candy Coat Applied & Wanted Level Cleared!',
        });
      }

      activeMissionMarker.rotation.y += dt * 1.8;
      if (!activeMission) {
        const distToStart = Math.hypot(activePos.x - 22, activePos.z - 14);
        if (distToStart < 4.5) {
          startMissionById(GTA_SA_MISSIONS[0].id);
        }
      } else {
        const stage = activeMission.stages[activeStageIndex];
        if (stage) {
          const distToTarget = Math.hypot(
            activePos.x - stage.targetPosition[0],
            activePos.z - stage.targetPosition[2]
          );
          if (distToTarget < stage.radius) {
            if (activeStageIndex + 1 < activeMission.stages.length) {
              activeStageIndex++;
              const nextStage = activeMission.stages[activeStageIndex];
              subtitle = nextStage.subtitleDialogue || null;
              activeMissionMarker.position.set(
                nextStage.targetPosition[0],
                1.9,
                nextStage.targetPosition[2]
              );
              audioEngine.playCheatActivated();
            } else {
              const completed = activeMission;
              activeMission = null;
              activeStageIndex = 0;
              subtitle = null;
              activeMissionMarker.position.set(22, 1.9, 14);
              activeMissionMarker.material.color.setHex(0xef4444);
              audioEngine.playMissionPassedFanfare();
              onUpdateStats((prev) => ({
                ...prev,
                cash: prev.cash + completed.rewardCash,
                respect: Math.min(1000, prev.respect + completed.rewardRespect),
              }));
              onBannerNotification({
                type: 'MISSION_PASSED',
                title: 'MISSION PASSED!',
                subtitle: `${completed.title} — +$${completed.rewardCash.toLocaleString()} | RESPECT +`,
              });
            }
          }
        }
      }

      for (const npc of npcs) {
        if (!npc.alive) continue;
        if (npc.faction === 'BALLAS' && gangWarActive) {
          const dx = activePos.x - npc.group.position.x;
          const dz = activePos.z - npc.group.position.z;
          npc.walkAngle = Math.atan2(dx, dz);
        } else {
          npc.walkAngle += (Math.random() - 0.5) * dt * 0.8;
        }
        npc.group.position.x += Math.sin(npc.walkAngle) * npc.speed * dt;
        npc.group.position.z += Math.cos(npc.walkAngle) * npc.speed * dt;
        npc.group.rotation.y = npc.walkAngle;
        npc.leftLeg.rotation.x = Math.sin(now * 0.008) * 0.5;
        npc.rightLeg.rotation.x = -Math.sin(now * 0.008) * 0.5;
      }

      const sirenFlash = Math.floor(now / 180) % 2 === 0;
      for (const v of vehicles) {
        v.bodyMaterial.clearcoat = st.tuning.pbrClearcoatIntensity;
        if (v.sirenLightL && v.sirenLightR) {
          v.sirenLightL.intensity = sirenFlash ? 3.0 : 0.2;
          v.sirenLightR.intensity = sirenFlash ? 0.2 : 3.0;
        }
      }

      const camDist = currentVehicle
        ? currentVehicle.handling.category === 'aircraft' ||
          currentVehicle.handling.identifier === 'RHINO'
          ? 16.5
          : 11.2
        : 7.4;
      const camHeight = currentVehicle ? 4.2 : 3.1;
      const totalYaw = playerHeading + cameraYawOffset;

      const desiredCamX =
        activePos.x - Math.sin(totalYaw) * camDist * Math.cos(cameraPitch * 0.5);
      const desiredCamZ =
        activePos.z - Math.cos(totalYaw) * camDist * Math.cos(cameraPitch * 0.5);
      const desiredCamY = Math.max(
        1.4,
        activePos.y + camHeight + Math.sin(cameraPitch) * 3.5
      );

      camera.position.lerp(
        new THREE.Vector3(desiredCamX, desiredCamY, desiredCamZ),
        0.16
      );
      camera.lookAt(
        activePos.x,
        activePos.y + (currentVehicle ? 1.4 : 1.7),
        activePos.z
      );

      renderer.render(scene, camera);

      telemetryTimer += dt;
      if (telemetryTimer >= 0.066) {
        telemetryTimer = 0;
        const zone = getZoneAtPosition(activePos.x, activePos.z);

        let nearVehicleName: string | null = null;
        if (!currentVehicle) {
          for (const v of vehicles) {
            if (v.group.position.distanceTo(cjGroup.position) < 7.5) {
              nearVehicleName = v.handling.displayName;
              break;
            }
          }
        }

        const blips: WorldEntityBlip[] = [
          {
            id: 'BLIP_CJ_HOUSE',
            x: 52,
            z: 6,
            type: 'mission',
            label: 'CJ House (Grove St Cul-de-Sac)',
            color: '#22c55e',
            code: 'CJ',
          },
          {
            id: 'BLIP_ACTIVE_MISSION',
            x: activeMissionMarker.position.x,
            z: activeMissionMarker.position.z,
            type: 'mission',
            label: activeMission ? activeMission.title : 'Mission Marker (Sweet)',
            color: activeMission ? '#facc15' : '#ef4444',
            code: activeMission ? activeMission.blipCode : 'S',
          },
          {
            id: 'BLIP_PAYNSPRAY',
            x: -48,
            z: 151,
            type: 'paynspray',
            label: 'Idlewood Pay ’n’ Spray',
            color: '#38bdf8',
            code: 'PS',
          },
          {
            id: 'BLIP_CLUCKINBELL',
            x: 62,
            z: 168,
            type: 'cluckinbell',
            label: 'Cluckin’ Bell Drive-Thru',
            color: '#facc15',
            code: 'CB',
          },
        ];

        graffitiTags.forEach((t) => {
          if (!t.sprayed) {
            blips.push({
              id: t.id,
              x: t.x,
              z: t.z,
              type: 'tag',
              label: 'Ballas Graffiti Tag',
              color: '#a855f7',
            });
          }
        });

        vehicles.slice(0, 8).forEach((v) => {
          if (v !== currentVehicle) {
            blips.push({
              id: v.uid,
              x: v.group.position.x,
              z: v.group.position.z,
              type: 'vehicle',
              label: v.handling.displayName,
              color: '#94a3b8',
            });
          }
        });

        onTelemetry({
          fps: currentFps,
          playerX: Number(activePos.x.toFixed(1)),
          playerY: Number(activePos.y.toFixed(1)),
          playerZ: Number(activePos.z.toFixed(1)),
          headingRad: playerHeading,
          speedKmh: currentVehicle
            ? Math.round(Math.abs(currentVehicle.speed) * 3.6)
            : moveForward || moveBackward
            ? boostOrSprint
              ? 24
              : 14
            : 0,
          inVehicle: currentVehicle ? currentVehicle.handling : null,
          vehicleHealth: currentVehicle ? Math.round(currentVehicle.hp) : 1000,
          zoneName: zone.name,
          districtName: zone.district,
          controllingGang: zone.controllingGang,
          nearVehicleName,
          activeMission,
          activeStageIndex,
          subtitle,
          tagsSprayed: graffitiTags.filter((t) => t.sprayed).length,
          totalTags: graffitiTags.length,
          gangWarActive,
          gangWarWave,
          gangWarKillsLeft,
          blips,
        });
      }
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="relative w-full h-full cursor-grab active:cursor-grabbing"
      aria-label="GTA San Andreas 3D Viewport"
    />
  );
};
