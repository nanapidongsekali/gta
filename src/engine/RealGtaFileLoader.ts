/**
 * GTA: San Andreas (gta_sa.exe v1.0 US) — Authentic File Loader & RenderWare Binary Parser
 * Reconstructed from gta-reversed (https://github.com/gta-reversed/gta-reversed):
 *   - CFileLoader::LoadObjectInstance (0x538090) — IPL `inst` section & quaternion conjugate heading math
 *   - CFileLoader::LoadEntryExit      (0x5B8030) — IPL `enex` interior portals (CEntryExitManager::AddOne @ 0x43FA50)
 *   - CFileLoader::LoadGarage         (0x5B4530) — IPL `grge` garages (CGarages::AddOne @ 0x4471E0)
 *   - CFileLoader::LoadCarGenerator   (0x537990) — IPL `cars` parked car generators (CTheCarGenerators @ 0x6F3F40)
 *   - CFileLoader::LoadZone           (0x5384A0) — ZON `zone` AABB definitions (CTheZones::CreateZone @ 0x572670)
 *   - CFileLoader::LoadObject         (0x5B3FB0) — IDE `objs` / `tobj` definitions
 *   - CFileLoader::LoadVehicleObject  (0x5B6F30) — IDE `cars` definitions (vehicles.ide)
 *   - CFileLoader::LoadPedObject      (0x5B7420) — IDE `peds` definitions (peds.ide)
 *   - CVehicleModelInfo::LoadVehicleColours (0x5B6890) — carcols.dat `col` & `car` sections
 *   - CWaterLevel::LoadWaterLevel     (0x6EAE80) — water.dat `processed` water quads/triangles
 *   - CWeaponInfo::LoadWeaponData     (0x5BF750) — weapon.dat `$` firearm & `£` melee tables
 *   - RpClumpStreamRead               (0x74B420) — RenderWare 3.6.0.3 (0x1803FFFF) .DFF geometry & prelit mesh parser
 */

export interface IplObjectInstance {
  modelId: number;
  modelName: string;
  interiorId: number;
  pos: { x: number; y: number; z: number };
  quat: { x: number; y: number; z: number; w: number };
  /** Conjugate quaternion applied by CFileLoader::LoadObjectInstance (0x538090): imag = -rot */
  engineQuat: { x: number; y: number; z: number; w: number };
  /** Heading in radians computed via CFileLoader::LoadObjectInstance: acos(qw) * (qz < 0 ? 2 : -2) */
  headingRad: number;
  headingDeg: number;
  lodIndex: number;
  sourceFile: string;
}

export interface IplEnexRecord {
  enterPos: { x: number; y: number; z: number };
  enterAngle: number;
  size: { x: number; y: number };
  exitPos: { x: number; y: number; z: number };
  exitAngle: number;
  interiorId: number;
  flags: number;
  name: string;
  skyColor: number;
  numPeds: number;
  timeOn: number;
  timeOff: number;
  sourceFile: string;
}

export interface IplGarageRecord {
  p1: { x: number; y: number; z: number };
  frontX: number;
  frontY: number;
  p2: { x: number; y: number; z: number };
  doorFlags: number;
  garageType: number;
  name: string;
  sourceFile: string;
}

export interface IplCarGeneratorRecord {
  pos: { x: number; y: number; z: number };
  angle: number;
  modelId: number;
  primaryColor: number;
  secondaryColor: number;
  forceSpawn: number;
  alarmProb: number;
  lockProb: number;
  minDelay: number;
  maxDelay: number;
  sourceFile: string;
}

export interface ParsedIplFile {
  sourceFile: string;
  instances: IplObjectInstance[];
  enexes: IplEnexRecord[];
  garages: IplGarageRecord[];
  carGenerators: IplCarGeneratorRecord[];
}

export interface IdeObjectRecord {
  modelId: number;
  modelName: string;
  txdName: string;
  drawDist: number;
  flags: number;
  sourceFile: string;
}

export interface IdeVehicleRecord {
  modelId: number;
  modelName: string;
  txdName: string;
  vehicleType: string;
  handlingId: string;
  gameName: string;
  animGroup: string;
  vehicleClass: string;
  frequency: number;
  wheelRadiusFront: number;
  wheelRadiusRear: number;
}

export interface IdePedRecord {
  modelId: number;
  modelName: string;
  txdName: string;
  defaultPedType: string;
  behaviorStat: string;
  animGroup: string;
  carsCanDriveMask: string;
  flags: string;
  animFile: string;
  radio1: number;
  radio2: number;
  voiceArchive: string;
  voice1: string;
  voice2: string;
}

export interface ZonRecord {
  name: string;
  type: number;
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
  islandLevel: number;
  gxtKey: string;
}

export interface CarColSwatch {
  index: number;
  r: number;
  g: number;
  b: number;
  hex: string;
  comment: string;
}

export interface WaterPolygonRecord {
  vertices: Array<{
    x: number;
    y: number;
    z: number;
    flowX: number;
    flowY: number;
    waveA: number;
    waveB: number;
  }>;
  flags: number;
}

export interface WeaponDatRecord {
  weaponType: string;
  fireType: string;
  targetRange: number;
  weaponRange: number;
  modelId1: number;
  modelId2: number;
  slot: number;
  animGroup: string;
  ammoClip: number;
  damage: number;
  skillLevel: number;
  accuracy: number;
  moveSpeed: number;
  flagsHex: string;
}

export interface ParsedDffMaterial {
  color: { r: number; g: number; b: number; a: number };
  textureName: string;
}

export interface ParsedDffMesh {
  fileName: string;
  byteLength: number;
  rwVersion: number;
  frameNames: string[];
  flags: number;
  numTriangles: number;
  numVertices: number;
  numUVs: number;
  hasPrelit: boolean;
  hasNightColors: boolean;
  hasNormals: boolean;
  boundingSphere: { x: number; y: number; z: number; radius: number };
  localBounds: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  materials: ParsedDffMaterial[];
  /** Flat Float32Array of length numVertices * 3 (GTA X, Y, Z) */
  positions: Float32Array;
  /** Flat Float32Array of length numVertices * 2 (u, v) */
  uvs: Float32Array | null;
  /** Flat Uint8Array of length numVertices * 4 (day prelit R, G, B, A) */
  prelitColors: Uint8Array | null;
  /** Flat Uint8Array of length numVertices * 4 (Rockstar 0x0253F2F9 night R, G, B, A) */
  nightColors: Uint8Array | null;
  /** Triangles: each entry is [v1, v2, v3, matId] */
  triangles: Array<[number, number, number, number]>;
}

/**
 * CFileLoader::LoadObjectInstance (0x538090)
 * Computes exact heading and conjugate quaternion from IPL `inst` line.
 */
export function computeIplRotation(
  qx: number,
  qy: number,
  qz: number,
  qw: number
): {
  engineQuat: { x: number; y: number; z: number; w: number };
  headingRad: number;
  headingDeg: number;
} {
  const clampedW = Math.max(-1, Math.min(1, qw));
  const fMult = qz < 0.0 ? 2.0 : -2.0;
  const headingRad = Math.acos(clampedW) * fMult;
  const headingDeg = (headingRad * 180) / Math.PI;
  return {
    engineQuat: { x: -qx, y: -qy, z: -qz, w: qw },
    headingRad,
    headingDeg,
  };
}

/**
 * Parses a GTA:SA text .IPL file (`inst`, `enex`, `grge`, `cars` sections).
 * Matches `CFileLoader::LoadScene` (0x5B8700).
 */
export function parseIplText(content: string, sourceFile = 'LAe2.ipl'): ParsedIplFile {
  const instances: IplObjectInstance[] = [];
  const enexes: IplEnexRecord[] = [];
  const garages: IplGarageRecord[] = [];
  const carGenerators: IplCarGeneratorRecord[] = [];

  let section: 'none' | 'inst' | 'enex' | 'grge' | 'cars' = 'none';
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const lower = line.toLowerCase();
    if (lower === 'end') {
      section = 'none';
      continue;
    }
    if (lower === 'inst') {
      section = 'inst';
      continue;
    }
    if (lower === 'enex') {
      section = 'enex';
      continue;
    }
    if (lower === 'grge') {
      section = 'grge';
      continue;
    }
    if (lower === 'cars') {
      section = 'cars';
      continue;
    }
    if (/^(cull|pick|jump|tcyc|auzo|occl|zone|path)$/.test(lower)) {
      section = 'none';
      continue;
    }

    const parts = line.split(/[\s,]+/).filter(Boolean);

    if (section === 'inst' && parts.length >= 11) {
      const modelId = parseInt(parts[0], 10);
      const modelName = parts[1];
      const interiorId = parseInt(parts[2], 10);
      const px = parseFloat(parts[3]);
      const py = parseFloat(parts[4]);
      const pz = parseFloat(parts[5]);
      const qx = parseFloat(parts[6]);
      const qy = parseFloat(parts[7]);
      const qz = parseFloat(parts[8]);
      const qw = parseFloat(parts[9]);
      const lodIndex = parseInt(parts[10], 10);

      if (!Number.isNaN(modelId) && !Number.isNaN(px)) {
        const { engineQuat, headingRad, headingDeg } = computeIplRotation(qx, qy, qz, qw);
        instances.push({
          modelId,
          modelName,
          interiorId,
          pos: { x: px, y: py, z: pz },
          quat: { x: qx, y: qy, z: qz, w: qw },
          engineQuat,
          headingRad,
          headingDeg,
          lodIndex,
          sourceFile,
        });
      }
    } else if (section === 'enex' && parts.length >= 18) {
      const enterX = parseFloat(parts[0]);
      const enterY = parseFloat(parts[1]);
      const enterZ = parseFloat(parts[2]);
      const enterAngle = parseFloat(parts[3]);
      const sizeX = parseFloat(parts[4]);
      const sizeY = parseFloat(parts[5]);
      // parts[6] is unused (always 8)
      const exitX = parseFloat(parts[7]);
      const exitY = parseFloat(parts[8]);
      const exitZ = parseFloat(parts[9]);
      const exitAngle = parseFloat(parts[10]);
      const interiorId = parseInt(parts[11], 10);
      const flags = parseInt(parts[12], 10);
      const name = parts[13].replace(/"/g, '');
      const skyColor = parseInt(parts[14], 10);
      const numPeds = parseInt(parts[15], 10);
      const timeOn = parseInt(parts[16], 10);
      const timeOff = parseInt(parts[17], 10);

      if (!Number.isNaN(enterX)) {
        enexes.push({
          enterPos: { x: enterX, y: enterY, z: enterZ },
          enterAngle,
          size: { x: sizeX, y: sizeY },
          exitPos: { x: exitX, y: exitY, z: exitZ },
          exitAngle,
          interiorId,
          flags,
          name,
          skyColor,
          numPeds,
          timeOn,
          timeOff,
          sourceFile,
        });
      }
    } else if (section === 'grge' && parts.length >= 11) {
      const p1x = parseFloat(parts[0]);
      const p1y = parseFloat(parts[1]);
      const p1z = parseFloat(parts[2]);
      const frontX = parseFloat(parts[3]);
      const frontY = parseFloat(parts[4]);
      const p2x = parseFloat(parts[5]);
      const p2y = parseFloat(parts[6]);
      const p2z = parseFloat(parts[7]);
      const doorFlags = parseInt(parts[8], 10);
      const garageType = parseInt(parts[9], 10);
      const name = parts[10].replace(/"/g, '');
      if (!Number.isNaN(p1x)) {
        garages.push({
          p1: { x: p1x, y: p1y, z: p1z },
          frontX,
          frontY,
          p2: { x: p2x, y: p2y, z: p2z },
          doorFlags,
          garageType,
          name,
          sourceFile,
        });
      }
    } else if (section === 'cars' && parts.length >= 12) {
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      const z = parseFloat(parts[2]);
      const angle = parseFloat(parts[3]);
      const modelId = parseInt(parts[4], 10);
      const primaryColor = parseInt(parts[5], 10);
      const secondaryColor = parseInt(parts[6], 10);
      const forceSpawn = parseInt(parts[7], 10);
      const alarmProb = parseInt(parts[8], 10);
      const lockProb = parseInt(parts[9], 10);
      const minDelay = parseInt(parts[10], 10);
      const maxDelay = parseInt(parts[11], 10);
      if (!Number.isNaN(x)) {
        carGenerators.push({
          pos: { x, y, z },
          angle,
          modelId,
          primaryColor,
          secondaryColor,
          forceSpawn,
          alarmProb,
          lockProb,
          minDelay,
          maxDelay,
          sourceFile,
        });
      }
    }
  }

  return { sourceFile, instances, enexes, garages, carGenerators };
}

/**
 * Parses GTA:SA `info.zon` / `map.zon` (`CFileLoader::LoadZone` @ 0x5384A0)
 */
export function parseZonText(content: string): ZonRecord[] {
  const zones: ZonRecord[] = [];
  let inZone = false;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.toLowerCase() === 'zone') {
      inZone = true;
      continue;
    }
    if (line.toLowerCase() === 'end') {
      inZone = false;
      continue;
    }
    if (!inZone) continue;

    const parts = line.split(/[\s,]+/).filter(Boolean);
    if (parts.length >= 10) {
      const name = parts[0];
      const type = parseInt(parts[1], 10);
      const minX = parseFloat(parts[2]);
      const minY = parseFloat(parts[3]);
      const minZ = parseFloat(parts[4]);
      const maxX = parseFloat(parts[5]);
      const maxY = parseFloat(parts[6]);
      const maxZ = parseFloat(parts[7]);
      const islandLevel = parseInt(parts[8], 10);
      const gxtKey = parts[9];
      if (!Number.isNaN(minX) && !Number.isNaN(maxX)) {
        zones.push({
          name,
          type,
          min: {
            x: Math.min(minX, maxX),
            y: Math.min(minY, maxY),
            z: Math.min(minZ, maxZ),
          },
          max: {
            x: Math.max(minX, maxX),
            y: Math.max(minY, maxY),
            z: Math.max(minZ, maxZ),
          },
          islandLevel,
          gxtKey,
        });
      }
    }
  }
  return zones;
}

/**
 * Parses `LAe.ide`, `LAe2.ide`, `vehicles.ide`, `peds.ide`
 */
export function parseIdeText(content: string, sourceFile = 'LAe2.ide'): {
  objects: IdeObjectRecord[];
  vehicles: IdeVehicleRecord[];
  peds: IdePedRecord[];
} {
  const objects: IdeObjectRecord[] = [];
  const vehicles: IdeVehicleRecord[] = [];
  const peds: IdePedRecord[] = [];

  let section: 'none' | 'objs' | 'tobj' | 'cars' | 'peds' = 'none';
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const lower = line.toLowerCase();
    if (lower === 'end') {
      section = 'none';
      continue;
    }
    if (lower === 'objs' || lower === 'tobj') {
      section = lower;
      continue;
    }
    if (lower === 'cars') {
      section = 'cars';
      continue;
    }
    if (lower === 'peds') {
      section = 'peds';
      continue;
    }
    if (/^(hier|anim|txdp|2dfx|weap|path)$/.test(lower)) {
      section = 'none';
      continue;
    }

    const parts = line.split(/[\s,]+/).filter(Boolean);
    if ((section === 'objs' || section === 'tobj') && parts.length >= 5) {
      const modelId = parseInt(parts[0], 10);
      const modelName = parts[1];
      const txdName = parts[2];
      const drawDist = parseFloat(parts[3]);
      const flags = parseInt(parts[4], 10);
      if (!Number.isNaN(modelId)) {
        objects.push({ modelId, modelName, txdName, drawDist, flags, sourceFile });
      }
    } else if (section === 'cars' && parts.length >= 11) {
      const modelId = parseInt(parts[0], 10);
      const modelName = parts[1];
      const txdName = parts[2];
      const vehicleType = parts[3];
      const handlingId = parts[4];
      const gameName = parts[5];
      const animGroup = parts[6];
      const vehicleClass = parts[7];
      const frequency = parseInt(parts[8], 10);
      const wheelRadiusFront = parts.length >= 14 ? parseFloat(parts[12]) : 0.7;
      const wheelRadiusRear = parts.length >= 14 ? parseFloat(parts[13]) : 0.7;
      if (!Number.isNaN(modelId)) {
        vehicles.push({
          modelId,
          modelName,
          txdName,
          vehicleType,
          handlingId,
          gameName,
          animGroup,
          vehicleClass,
          frequency,
          wheelRadiusFront,
          wheelRadiusRear,
        });
      }
    } else if (section === 'peds' && parts.length >= 14) {
      const modelId = parseInt(parts[0], 10);
      if (!Number.isNaN(modelId)) {
        peds.push({
          modelId,
          modelName: parts[1],
          txdName: parts[2],
          defaultPedType: parts[3],
          behaviorStat: parts[4],
          animGroup: parts[5],
          carsCanDriveMask: parts[6],
          flags: parts[7],
          animFile: parts[8],
          radio1: parseInt(parts[9], 10) || 0,
          radio2: parseInt(parts[10], 10) || 0,
          voiceArchive: parts[11],
          voice1: parts[12],
          voice2: parts[13],
        });
      }
    }
  }
  return { objects, vehicles, peds };
}

/**
 * Parses `carcols.dat` (`CVehicleModelInfo::LoadVehicleColours` @ 0x5B6890)
 */
export function parseCarcolsText(content: string): {
  palette: CarColSwatch[];
  vehicleColorPairs: Record<string, Array<[number, number]>>;
} {
  const palette: CarColSwatch[] = [];
  const vehicleColorPairs: Record<string, Array<[number, number]>> = {};

  let section: 'none' | 'col' | 'car' | 'car4' = 'none';
  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const lower = trimmed.toLowerCase();
    if (lower === 'end') {
      section = 'none';
      continue;
    }
    if (lower === 'col' || lower === 'car' || lower === 'car4') {
      section = lower;
      continue;
    }

    const [dataPart, commentPart] = trimmed.split('#');
    const parts = dataPart.trim().split(/[\s,]+/).filter(Boolean);
    if (section === 'col' && parts.length >= 3) {
      const r = parseInt(parts[0], 10);
      const g = parseInt(parts[1], 10);
      const b = parseInt(parts[2], 10);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        palette.push({
          index: palette.length,
          r,
          g,
          b,
          hex,
          comment: commentPart ? commentPart.trim() : `Color #${palette.length}`,
        });
      }
    } else if (section === 'car' && parts.length >= 3) {
      const carName = parts[0].toLowerCase();
      const pairs: Array<[number, number]> = [];
      for (let i = 1; i + 1 < parts.length; i += 2) {
        const c1 = parseInt(parts[i], 10);
        const c2 = parseInt(parts[i + 1], 10);
        if (!Number.isNaN(c1) && !Number.isNaN(c2)) {
          pairs.push([c1, c2]);
        }
      }
      vehicleColorPairs[carName] = pairs;
    }
  }

  return { palette, vehicleColorPairs };
}

/**
 * Parses `water.dat` (`CWaterLevel::LoadWaterLevel` @ 0x6EAE80)
 */
export function parseWaterDatText(content: string): WaterPolygonRecord[] {
  const polygons: WaterPolygonRecord[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.toLowerCase() === 'processed') continue;
    const nums = line.split(/\s+/).map(Number).filter((n) => !Number.isNaN(n));
    // Either 3 vertices (22 numbers: 3*7 + 1) or 4 vertices (29 numbers: 4*7 + 1)
    if (nums.length === 29 || nums.length === 22) {
      const numVerts = nums.length === 29 ? 4 : 3;
      const vertices = [];
      for (let i = 0; i < numVerts; i++) {
        const base = i * 7;
        vertices.push({
          x: nums[base],
          y: nums[base + 1],
          z: nums[base + 2],
          flowX: nums[base + 3],
          flowY: nums[base + 4],
          waveA: nums[base + 5],
          waveB: nums[base + 6],
        });
      }
      polygons.push({
        vertices,
        flags: nums[nums.length - 1],
      });
    }
  }
  return polygons;
}

/**
 * Parses `weapon.dat` (`CWeaponInfo::LoadWeaponData` @ 0x5BF750)
 */
export function parseWeaponDatText(content: string): WeaponDatRecord[] {
  const weapons: WeaponDatRecord[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    if (line.startsWith('$')) {
      const parts = line.slice(1).trim().split(/\s+/);
      if (parts.length >= 24) {
        weapons.push({
          weaponType: parts[0],
          fireType: parts[1],
          targetRange: parseFloat(parts[2]),
          weaponRange: parseFloat(parts[3]),
          modelId1: parseInt(parts[4], 10),
          modelId2: parseInt(parts[5], 10),
          slot: parseInt(parts[8], 10),
          animGroup: parts[9],
          ammoClip: parseInt(parts[10], 10),
          damage: parseInt(parts[11], 10),
          skillLevel: parseInt(parts[15], 10),
          accuracy: parseFloat(parts[17]),
          moveSpeed: parseFloat(parts[18]),
          flagsHex: parts[24] || '0',
        });
      }
    }
  }
  return weapons;
}

/**
 * Parses a real RenderWare 3.6.0.3 (0x1803FFFF) .DFF binary stream (`RpClumpStreamRead` @ 0x74B420)
 * and extracts full 3D vertex positions, triangles, UVs, materials, day prelit colors, and Rockstar night colors.
 */
export function parseRenderWareDffMesh(buffer: ArrayBuffer, fileName = 'carlshou1_lae2.dff'): ParsedDffMesh | null {
  if (buffer.byteLength < 24) return null;
  const dv = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  const rootType = dv.getUint32(0, true);
  const rootSize = dv.getUint32(4, true);
  const rwVersion = dv.getUint32(8, true);
  if (rootType !== 0x0010) return null; // Must be rwID_CLUMP

  const frameNames: string[] = [];
  const materials: ParsedDffMaterial[] = [];
  let geomStructOff = -1;
  let nightColorsOff = -1;
  let numVertices = 0;

  function readAscii(off: number, len: number): string {
    let s = '';
    for (let i = 0; i < len; i++) {
      const c = bytes[off + i];
      if (c === 0) break;
      if (c >= 32 && c < 127) s += String.fromCharCode(c);
    }
    return s.trim();
  }

  function parseMaterial(matStart: number, matEnd: number) {
    let color = { r: 220, g: 220, b: 220, a: 255 };
    let textureName = '';
    let o = matStart;
    while (o + 12 <= matEnd) {
      const t = dv.getUint32(o, true);
      const s = dv.getUint32(o + 4, true);
      if (t === 0x0001 && s >= 16) {
        // Material RpMaterial struct: flags(4), RGBA(4), unused(4), isTextured(4)
        color = {
          r: bytes[o + 12 + 4],
          g: bytes[o + 12 + 5],
          b: bytes[o + 12 + 6],
          a: bytes[o + 12 + 7],
        };
      } else if (t === 0x0006) {
        // rwID_TEXTURE: contains struct(0x01), string(0x02 textureName), string(0x02 maskName)
        let to = o + 12;
        const tend = o + 12 + s;
        while (to + 12 <= tend) {
          const tt = dv.getUint32(to, true);
          const ts = dv.getUint32(to + 4, true);
          if (tt === 0x0002 && !textureName) {
            textureName = readAscii(to + 12, ts);
          }
          to += 12 + ts;
        }
      }
      o += 12 + s;
    }
    materials.push({ color, textureName });
  }

  function walk(offset: number, end: number) {
    const safeEnd = Math.min(end, buffer.byteLength);
    while (offset + 12 <= safeEnd) {
      const type = dv.getUint32(offset, true);
      const size = dv.getUint32(offset + 4, true);
      if (size > safeEnd - offset) break;

      if (type === 0x0253f2fe) {
        // Rockstar Frame Node Name plugin
        const name = readAscii(offset + 12, size);
        if (name) frameNames.push(name);
      } else if (type === 0x000f) {
        // rwID_GEOMETRY — first child is 0x0001 (rwID_STRUCT)
        const childType = dv.getUint32(offset + 12, true);
        if (childType === 0x0001 && geomStructOff === -1) {
          geomStructOff = offset + 24;
        }
        walk(offset + 12, offset + 12 + size);
      } else if (type === 0x0007) {
        // rwID_MATERIAL
        parseMaterial(offset + 12, offset + 12 + size);
      } else if (type === 0x0253f2f9) {
        // Rockstar Extra Vert Colour Plugin (Night Vertex Colors)
        const magic = dv.getUint32(offset + 12, true);
        if (magic !== 0 && size >= 4) {
          nightColorsOff = offset + 16;
        }
      } else if ([0x0010, 0x000e, 0x001a, 0x0008, 0x0003].includes(type)) {
        walk(offset + 12, offset + 12 + size);
      }
      offset += 12 + size;
    }
  }

  walk(12, Math.min(12 + rootSize, buffer.byteLength));
  if (geomStructOff === -1) return null;

  const flags = dv.getUint32(geomStructOff, true);
  const numTriangles = dv.getUint32(geomStructOff + 4, true);
  numVertices = dv.getUint32(geomStructOff + 8, true);
  const numMorphTargets = dv.getUint32(geomStructOff + 12, true);
  if (numVertices <= 0 || numVertices > 65535 || numTriangles < 0 || numMorphTargets < 1) {
    return null;
  }

  let p = geomStructOff + 16;
  // If rwVersion < 0x34000, ambient/diffuse/specular floats follow (12 bytes), but GTA:SA is 0x1803FFFF (3.6.0.3)
  if ((rwVersion & 0xffff0000) === 0 && rwVersion < 0x34000) {
    p += 12;
  }

  const isNative = (flags & 0x01000000) !== 0;
  if (isNative) return null;

  const hasPrelit = (flags & 0x08) !== 0;
  const hasNormals = (flags & 0x10) !== 0;
  let numUVs = (flags >> 16) & 0xff;
  if (numUVs === 0) {
    if (flags & 0x80) numUVs = 2;
    else if (flags & 0x04) numUVs = 1;
  }

  let prelitColors: Uint8Array | null = null;
  if (hasPrelit) {
    if (p + numVertices * 4 > buffer.byteLength) return null;
    prelitColors = new Uint8Array(buffer.slice(p, p + numVertices * 4));
    p += numVertices * 4;
  }

  let uvs: Float32Array | null = null;
  if (numUVs > 0) {
    if (p + numUVs * numVertices * 8 > buffer.byteLength) return null;
    uvs = new Float32Array(numVertices * 2);
    for (let i = 0; i < numVertices; i++) {
      uvs[i * 2] = dv.getFloat32(p + i * 8, true);
      uvs[i * 2 + 1] = dv.getFloat32(p + i * 8 + 4, true);
    }
    p += numUVs * numVertices * 8;
  }

  if (p + numTriangles * 8 > buffer.byteLength) return null;
  const triangles: Array<[number, number, number, number]> = [];
  for (let i = 0; i < numTriangles; i++) {
    const v2 = dv.getUint16(p + i * 8, true);
    const v1 = dv.getUint16(p + i * 8 + 2, true);
    const matId = dv.getUint16(p + i * 8 + 4, true);
    const v3 = dv.getUint16(p + i * 8 + 6, true);
    if (v1 < numVertices && v2 < numVertices && v3 < numVertices) {
      triangles.push([v1, v2, v3, matId]);
    }
  }
  p += numTriangles * 8;

  if (p + 24 > buffer.byteLength) return null;
  const bsX = dv.getFloat32(p, true);
  const bsY = dv.getFloat32(p + 4, true);
  const bsZ = dv.getFloat32(p + 8, true);
  const bsR = dv.getFloat32(p + 12, true);
  p += 24;

  if (p + numVertices * 12 > buffer.byteLength) return null;
  const positions = new Float32Array(numVertices * 3);
  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;

  for (let i = 0; i < numVertices; i++) {
    const vx = dv.getFloat32(p + i * 12, true);
    const vy = dv.getFloat32(p + i * 12 + 4, true);
    const vz = dv.getFloat32(p + i * 12 + 8, true);
    positions[i * 3] = vx;
    positions[i * 3 + 1] = vy;
    positions[i * 3 + 2] = vz;
    if (vx < minX) minX = vx;
    if (vx > maxX) maxX = vx;
    if (vy < minY) minY = vy;
    if (vy > maxY) maxY = vy;
    if (vz < minZ) minZ = vz;
    if (vz > maxZ) maxZ = vz;
  }

  let nightColors: Uint8Array | null = null;
  if (nightColorsOff !== -1 && nightColorsOff + numVertices * 4 <= buffer.byteLength) {
    nightColors = new Uint8Array(buffer.slice(nightColorsOff, nightColorsOff + numVertices * 4));
  }

  return {
    fileName,
    byteLength: buffer.byteLength,
    rwVersion,
    frameNames,
    flags,
    numTriangles,
    numVertices,
    numUVs,
    hasPrelit,
    hasNightColors: nightColors !== null,
    hasNormals,
    boundingSphere: { x: bsX, y: bsY, z: bsZ, radius: bsR },
    localBounds: {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
    },
    materials,
    positions,
    uvs,
    prelitColors,
    nightColors,
    triangles,
  };
}

/**
 * Maps authentic Rockstar North texture names from `LAe2` / `LAe` `.txd` dictionaries
 * to physically representative base RGB surface colors (which are then multiplied
 * with the baked RenderWare prelit / night vertex colors in the .DFF mesh).
 */
export function resolveRockstarTextureTint(texName: string): [number, number, number] {
  const lower = texName.toLowerCase();
  if (lower.includes('grass') || lower.includes('bush')) return [0.34, 0.49, 0.25];
  if (lower.includes('tarmac') || lower.includes('road') || lower.includes('stopline')) return [0.24, 0.25, 0.27];
  if (lower.includes('concrete') || lower.includes('pave') || lower.includes('sidew')) return [0.62, 0.60, 0.56];
  if (lower.includes('shingle') || lower.includes('roof')) return [0.36, 0.28, 0.23];
  if (lower.includes('brickred') || lower.includes('brick')) return [0.64, 0.33, 0.26];
  if (lower.includes('peeling') || lower.includes('comptwall26') || lower.includes('tancolum')) return [0.78, 0.73, 0.62];
  if (lower.includes('comptwall27') || lower.includes('sweets')) return [0.74, 0.78, 0.72];
  if (lower.includes('wood') || lower.includes('gable') || lower.includes('chipboard')) return [0.58, 0.46, 0.34];
  if (lower.includes('cluck') || lower.includes('fastfood')) return [0.85, 0.72, 0.24];
  if (lower.includes('yello')) return [0.82, 0.74, 0.38];
  if (lower.includes('windo') || lower.includes('win')) return [0.32, 0.42, 0.52];
  if (lower.includes('door')) return [0.46, 0.34, 0.24];
  return [0.76, 0.74, 0.70];
}

export interface LoadedGtaSaDataBundle {
  zones: ZonRecord[];
  mapZones: ZonRecord[];
  laeIpl: ParsedIplFile;
  lae2Ipl: ParsedIplFile;
  lae2Stream0: ParsedIplFile;
  lae2Stream1: ParsedIplFile;
  lae2Stream2: ParsedIplFile;
  intLaIpl: ParsedIplFile;
  laeIdeObjects: IdeObjectRecord[];
  lae2IdeObjects: IdeObjectRecord[];
  vehiclesIde: IdeVehicleRecord[];
  pedsIde: IdePedRecord[];
  carcols: {
    palette: CarColSwatch[];
    vehicleColorPairs: Record<string, Array<[number, number]>>;
  };
  waterPolygons: WaterPolygonRecord[];
  weapons: WeaponDatRecord[];
  dffMeshes: Record<string, ParsedDffMesh>;
}

let cachedBundlePromise: Promise<LoadedGtaSaDataBundle> | null = null;

export const GROVE_ST_DFF_MANIFEST: Array<{
  file: string;
  modelName: string;
  modelId: number;
  iplPos: { x: number; y: number; z: number };
  iplQuat: { x: number; y: number; z: number; w: number };
  category: 'building' | 'road' | 'ground' | 'interior';
  label: string;
}> = [
  {
    file: 'carlshou1_lae2.dff',
    modelName: 'carlshou1_LAe2',
    modelId: 17697,
    iplPos: { x: 2494.26563, y: -1696.21094, z: 17.05469 },
    iplQuat: { x: 0, y: 0, z: -1, w: 0 },
    category: 'building',
    label: "Carl's House (Johnson House — 2494.27, -1696.21)",
  },
  {
    file: 'cjsaveg.dff',
    modelName: 'cjsaveg',
    modelId: 17950,
    iplPos: { x: 2505.47656, y: -1695.28906, z: 14.69531 },
    iplQuat: { x: 0, y: 0, z: 0, w: 1 },
    category: 'building',
    label: "CJ's Safehouse Garage (cjsafe — 2505.48, -1695.29)",
  },
  {
    file: 'cjgaragedoor.dff',
    modelName: 'cjgaragedoor',
    modelId: 17951,
    iplPos: { x: 2505.52344, y: -1690.99219, z: 14.32813 },
    iplQuat: { x: 0, y: 0, z: 0, w: 1 },
    category: 'building',
    label: "CJ's Safehouse Garage Door (2505.52, -1690.99)",
  },
  {
    file: 'sweetshou1_lae2.dff',
    modelName: 'sweetshou1_LAe2',
    modelId: 17698,
    iplPos: { x: 2529.89063, y: -1677.66406, z: 16.72656 },
    iplQuat: { x: 0, y: 0, z: 0, w: 1 },
    category: 'building',
    label: "Sweet's House (2529.89, -1677.66)",
  },
  {
    file: 'sweetsdoor_lae2.dff',
    modelName: 'sweetsdoor_LAe2',
    modelId: 17566,
    iplPos: { x: 2520.73438, y: -1673.83594, z: 15.54688 },
    iplQuat: { x: 0, y: 0, z: 0, w: 1 },
    category: 'building',
    label: "Sweet's House Front Door (2520.73, -1673.84)",
  },
  {
    file: 'rydhou01_lae2.dff',
    modelName: 'rydhou01_LAe2',
    modelId: 17573,
    iplPos: { x: 2457.83594, y: -1695.9375, z: 14.28906 },
    iplQuat: { x: 0, y: 0, z: 0.70711, w: 0.70711 },
    category: 'building',
    label: "Ryder's House (2457.84, -1695.94)",
  },
  {
    file: 'mcstraps_lae2.dff',
    modelName: 'LODmcstraps_LAe2',
    modelId: 17770,
    iplPos: { x: 2485.90625, y: -1639.328125, z: 16.953125 },
    iplQuat: { x: 0, y: 0, z: 0.70710677, w: 0.70710677 },
    category: 'building',
    label: "OG Loc's / North Grove St House (2485.91, -1639.33)",
  },
  {
    file: 'pawnshp_lae2.dff',
    modelName: 'Pawnshp_lae2',
    modelId: 17521,
    iplPos: { x: 2502.01563, y: -1714.20313, z: 16.02344 },
    iplQuat: { x: 0, y: 0, z: 0, w: 1 },
    category: 'building',
    label: 'Ganton South Block / Pawn Shop (2502.02, -1714.20)',
  },
  {
    file: 'scumgym1_lae.dff',
    modelName: 'scumgym1_LAe',
    modelId: 17515,
    iplPos: { x: 2260.0, y: -1707.73438, z: 17.17188 },
    iplQuat: { x: 0, y: 0, z: 0, w: 1 },
    category: 'building',
    label: 'Ganton Gym (2260.00, -1707.73)',
  },
  {
    file: 'barberblock1_lae.dff',
    modelName: 'BarberBlock1_LAe',
    modelId: 17517,
    iplPos: { x: 2265.64063, y: -1677.91406, z: 17.59375 },
    iplQuat: { x: 0, y: 0, z: 0, w: 1 },
    category: 'building',
    label: "Old Reece's Barber & Binco Block (2265.64, -1677.91)",
  },
  {
    file: 'cluckinbell1_lae.dff',
    modelName: 'cluckinbell1_LAe',
    modelId: 17534,
    iplPos: { x: 2402.3125, y: -1503.59375, z: 28.99219 },
    iplQuat: { x: 0, y: 0, z: 0, w: 1 },
    category: 'building',
    label: "Cluckin' Bell East Los Santos (2402.31, -1503.59)",
  },
  {
    file: 'hubbridge1_lae2.dff',
    modelName: 'LOD1hubridge1_LAe',
    modelId: 17762,
    iplPos: { x: 2351.570313, y: -1596.070313, z: 22.125 },
    iplQuat: { x: 0, y: 0, z: 0, w: 1 },
    category: 'building',
    label: 'Ganton Overpass Bridge (2351.57, -1596.07)',
  },
  {
    file: 'market1_lae.dff',
    modelName: 'market1_lae',
    modelId: 17520,
    iplPos: { x: 2497.76563, y: -1762.39063, z: 15.625 },
    iplQuat: { x: 0, y: 0, z: 0, w: 1 },
    category: 'building',
    label: 'Ganton South Market 1 (2497.77, -1762.39)',
  },
  {
    file: 'market2_lae.dff',
    modelName: 'market2_lae',
    modelId: 17519,
    iplPos: { x: 2450.875, y: -1757.398438, z: 16.0 },
    iplQuat: { x: 0, y: 0, z: 0, w: 1 },
    category: 'building',
    label: 'Ganton South Market 2 (2450.88, -1757.40)',
  },
  {
    file: 'lae2_roads89.dff',
    modelName: 'Lae2_roads89',
    modelId: 17613,
    iplPos: { x: 2489.29688, y: -1668.5, z: 12.29688 },
    iplQuat: { x: 0, y: 0, z: 0, w: 1 },
    category: 'road',
    label: 'Grove Street Cul-de-Sac Road Mesh (2489.30, -1668.50)',
  },
  {
    file: 'copcarla.dff',
    modelName: 'copcarla',
    modelId: 596,
    iplPos: { x: 2478.0, y: -1660.0, z: 12.5 },
    iplQuat: { x: 0, y: 0, z: 0, w: 1 },
    category: 'building',
    label: 'LSPD Police Cruiser .DFF (copcarla — ID 596)',
  },
  {
    file: 'grass0_1.dff',
    modelName: 'grass0_1',
    modelId: 1,
    iplPos: { x: 2495.0, y: -1688.0, z: 12.3 },
    iplQuat: { x: 0, y: 0, z: 0, w: 1 },
    category: 'ground',
    label: 'Procedural Grass Clump .DFF (grass0_1)',
  },
];

/**
 * Fetches and parses the real GTA:SA files from `/gtasa-data/` in the browser.
 */
export async function loadRealGtaSaDataBundle(): Promise<LoadedGtaSaDataBundle> {
  if (cachedBundlePromise) return cachedBundlePromise;

  cachedBundlePromise = (async () => {
    const fetchText = async (file: string) => {
      try {
        const res = await fetch(`/gtasa-data/${file}`);
        if (!res.ok) return '';
        return await res.text();
      } catch {
        return '';
      }
    };

    const [
      infoZonText,
      mapZonText,
      laeIplText,
      lae2IplText,
      stream0Text,
      stream1Text,
      stream2Text,
      intLaIplText,
      laeIdeText,
      lae2IdeText,
      vehiclesIdeText,
      pedsIdeText,
      carcolsText,
      waterDatText,
      weaponDatText,
    ] = await Promise.all([
      fetchText('info.zon'),
      fetchText('map.zon'),
      fetchText('LAe.ipl'),
      fetchText('LAe2.ipl'),
      fetchText('lae2_stream0.ipl'),
      fetchText('lae2_stream1.ipl'),
      fetchText('lae2_stream2.ipl'),
      fetchText('int_LA.ipl'),
      fetchText('LAe.ide'),
      fetchText('LAe2.ide'),
      fetchText('vehicles.ide'),
      fetchText('peds.ide'),
      fetchText('carcols.dat'),
      fetchText('water.dat'),
      fetchText('weapon.dat'),
    ]);

    const dffMeshes: Record<string, ParsedDffMesh> = {};
    await Promise.all(
      GROVE_ST_DFF_MANIFEST.map(async (entry) => {
        try {
          const res = await fetch(`/gtasa-data/${entry.file}`);
          if (!res.ok) return;
          const buf = await res.arrayBuffer();
          const parsed = parseRenderWareDffMesh(buf, entry.file);
          if (parsed) {
            dffMeshes[entry.file] = parsed;
          }
        } catch {
          // ignore network errors in headless tests
        }
      })
    );

    return {
      zones: parseZonText(infoZonText),
      mapZones: parseZonText(mapZonText),
      laeIpl: parseIplText(laeIplText, 'LAe.ipl'),
      lae2Ipl: parseIplText(lae2IplText, 'LAe2.ipl'),
      lae2Stream0: parseIplText(stream0Text, 'lae2_stream0.ipl'),
      lae2Stream1: parseIplText(stream1Text, 'lae2_stream1.ipl'),
      lae2Stream2: parseIplText(stream2Text, 'lae2_stream2.ipl'),
      intLaIpl: parseIplText(intLaIplText, 'int_LA.ipl'),
      laeIdeObjects: parseIdeText(laeIdeText, 'LAe.ide').objects,
      lae2IdeObjects: parseIdeText(lae2IdeText, 'LAe2.ide').objects,
      vehiclesIde: parseIdeText(vehiclesIdeText, 'vehicles.ide').vehicles,
      pedsIde: parseIdeText(pedsIdeText, 'peds.ide').peds,
      carcols: parseCarcolsText(carcolsText),
      waterPolygons: parseWaterDatText(waterDatText),
      weapons: parseWeaponDatText(weaponDatText),
      dffMeshes,
    };
  })();

  return cachedBundlePromise;
}
