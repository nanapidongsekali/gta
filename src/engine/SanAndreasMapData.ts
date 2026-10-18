/**
 * Reversed from gta_sa.exe v1.0 US
 * - CTheZones::Init                              @ 0x572670 (data/info.zon & data/map.zon)
 * - CTheZones::FillZonesWithGangColours          @ 0x572440
 * - CRadar::TransformRealWorldPointToRadarSpace  @ 0x583530
 * - CMenuManager::DrawFrontEndMap                @ 0x575B30
 *
 * Coordinate System:
 * Original GTA:SA spans [-3000, +3000] on X (West->East) and Y (South->North).
 * In our 3D WebGL engine, X is West->East and Z is North->South (-Y_sa),
 * with Ganton / Grove Street Cul-de-Sac anchored as the high-detail origin (0, 0, 0)
 * corresponding to canonical GTA:SA (2495, -1668, 13.5).
 */

export interface SaBookmarkLocation {
  id: string;
  name: string;
  region: 'Los Santos' | 'San Fierro & Badlands' | 'Las Venturas & Desert';
  zoneCode: string;
  saCoords: [number, number, number]; // Canonical GTA:SA [X, Y, Z] in [-3000..3000]
  worldPos: [number, number, number]; // 3D Engine [x, y, z]
  gang?: 'GROVE' | 'BALLAS' | 'VAGOS' | 'AZTECAS' | 'TRIADS' | 'MILITARY' | 'NEUTRAL';
  iconCode: string;
  color: string;
  description: string;
}

export interface SaRoadSegment {
  id: string;
  name: string;
  kind: 'freeway' | 'arterial' | 'street' | 'rail' | 'canal' | 'runway';
  points: Array<[number, number]>; // Engine [x, z] coordinates
  width: number;
}

export interface SaZonePolygon {
  id: string;
  code: string;
  name: string;
  region: 'Los Santos' | 'San Fierro' | 'Las Venturas' | 'Countryside';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  gang: 'GROVE' | 'BALLAS' | 'VAGOS' | 'AZTECAS' | 'TRIADS' | 'MILITARY' | 'NEUTRAL';
  turfColor: string;
}

/**
 * Converts our 3D engine (x, y, z) coordinates to canonical GTA:SA [-3000..+3000] (X, Y, Z)
 * Anchored at Grove Street Cul-de-Sac = SA (2495, -1668, 13.5)
 */
export function worldToCanonicalSaCoords(
  worldX: number,
  worldY: number,
  worldZ: number
): [number, number, number] {
  const saX = Math.round(2495 + worldX * 4.2);
  const saY = Math.round(-1668 - worldZ * 4.2);
  const saZ = Number((13.5 + worldY).toFixed(1));
  return [
    Math.max(-3000, Math.min(3000, saX)),
    Math.max(-3000, Math.min(3000, saY)),
    saZ,
  ];
}

export const SAN_ANDREAS_BOOKMARKS: SaBookmarkLocation[] = [
  {
    id: 'LOC_GROVE_CULDESAC',
    name: 'Grove Street Cul-de-Sac (Johnson House)',
    region: 'Los Santos',
    zoneCode: 'GANTON',
    saCoords: [2495, -1688, 13.5],
    worldPos: [28, 0, 0],
    gang: 'GROVE',
    iconCode: 'CJ',
    color: '#22c55e',
    description: 'East-facing cul-de-sac in Ganton with CJ’s House, Sweet’s Greenwood, Ryder’s Picador, and basketball court.',
  },
  {
    id: 'LOC_GANTON_GYM',
    name: 'Ganton Gym & Binco Clothing',
    region: 'Los Santos',
    zoneCode: 'GANTON',
    saCoords: [2229, -1721, 13.5],
    worldPos: [-42, 0, 12],
    gang: 'GROVE',
    iconCode: 'GY',
    color: '#22c55e',
    description: 'West end of Grove Street under the railway overpass.',
  },
  {
    id: 'LOC_STORM_DRAIN',
    name: 'Los Santos Flood Control Channel (Storm Drain)',
    region: 'Los Santos',
    zoneCode: 'E_BEACH',
    saCoords: [2568, -1635, 9.0],
    worldPos: [76, 0, -10],
    gang: 'NEUTRAL',
    iconCode: 'SD',
    color: '#94a3b8',
    description: 'Concrete river channel directly behind Grove Street Cul-de-Sac where the T-1000 / bike chase takes place.',
  },
  {
    id: 'LOC_IDLEWOOD_PNS',
    name: 'Idlewood Pay ’n’ Spray & 69¢ Gas Station',
    region: 'Los Santos',
    zoneCode: 'IDLEWD',
    saCoords: [2065, -1831, 13.5],
    worldPos: [-48, 0, 145],
    gang: 'BALLAS',
    iconCode: 'PS',
    color: '#38bdf8',
    description: 'Repairs vehicle damage, applies custom candy paint, and clears LSPD Wanted Stars.',
  },
  {
    id: 'LOC_CLUCKIN_BELL',
    name: 'Willowfield Cluckin’ Bell Drive-Thru',
    region: 'Los Santos',
    zoneCode: 'WILLOW',
    saCoords: [2398, -1898, 13.5],
    worldPos: [55, 0, 165],
    gang: 'BALLAS',
    iconCode: 'CB',
    color: '#facc15',
    description: 'Site of Big Smoke’s iconic "Two Number 9s" order during Drive-Thru.',
  },
  {
    id: 'LOC_UNITY_STATION',
    name: 'Unity Station (El Corona Lowrider Meet)',
    region: 'Los Santos',
    zoneCode: 'ELCORO',
    saCoords: [1742, -1862, 13.5],
    worldPos: [-125, 0, 95],
    gang: 'AZTECAS',
    iconCode: 'CV',
    color: '#06b6d4',
    description: 'Brown Streak railroad depot & Cesar Vialpando’s Varrios Los Aztecas Lowrider competition.',
  },
  {
    id: 'LOC_GLEN_PARK',
    name: 'Glen Park & Jefferson Motel',
    region: 'Los Santos',
    zoneCode: 'GLENPK',
    saCoords: [1998, -1198, 25.0],
    worldPos: [45, 0, -115],
    gang: 'BALLAS',
    iconCode: 'GP',
    color: '#a855f7',
    description: 'Front Yard Ballas stronghold featuring the central pond and wooden footbridge.',
  },
  {
    id: 'LOC_DOWNTOWN_TOWER',
    name: 'Downtown Los Santos Tower (U.S. Bank Tower)',
    region: 'Los Santos',
    zoneCode: 'DOWNLS',
    saCoords: [1544, -1353, 329.4],
    worldPos: [-175, 0, -65],
    gang: 'NEUTRAL',
    iconCode: 'DT',
    color: '#e2e8f0',
    description: 'Tallest cylindrical skyscraper in San Andreas with crown helipad & Maverick helicopter.',
  },
  {
    id: 'LOC_VINEWOOD_SIGN',
    name: 'Vinewood Hills & Mulholland Sign',
    region: 'Los Santos',
    zoneCode: 'VINE',
    saCoords: [1415, -808, 84.0],
    worldPos: [-65, 22, -235],
    gang: 'NEUTRAL',
    iconCode: 'VW',
    color: '#f8fafc',
    description: 'Iconic white VINEWOOD letters overlooking the Los Santos basin.',
  },
  {
    id: 'LOC_SANTA_MARIA',
    name: 'Santa Maria Beach Pier & Lighthouse',
    region: 'Los Santos',
    zoneCode: 'SMB',
    saCoords: [370, -2048, 7.8],
    worldPos: [-285, 0, 210],
    gang: 'NEUTRAL',
    iconCode: 'SM',
    color: '#0ea5e9',
    description: 'Yacht harbor pier, Ferris wheel, lighthouse, and West Coast shoreline.',
  },
  {
    id: 'LOC_LSIA_AIRPORT',
    name: 'Los Santos International Airport (LSIA Runway)',
    region: 'Los Santos',
    zoneCode: 'LAIR',
    saCoords: [1685, -2445, 13.5],
    worldPos: [-135, 0, 285],
    gang: 'NEUTRAL',
    iconCode: 'AP',
    color: '#cbd5e1',
    description: 'Dual East-West asphalt jet runway with parked Hydra VTOL & Maverick.',
  },
  {
    id: 'LOC_SAN_FIERRO_GANT',
    name: 'San Fierro — Gant Bridge & Mount Chiliad',
    region: 'San Fierro & Badlands',
    zoneCode: 'SFBAY',
    saCoords: [-2680, 1595, 67.0],
    worldPos: [-420, 0, -260],
    gang: 'TRIADS',
    iconCode: 'SF',
    color: '#ef4444',
    description: 'Iconic red Golden Gate suspension bridge & towering Mount Chiliad peak across the bay.',
  },
  {
    id: 'LOC_AREA_69',
    name: 'Bone County — Area 69 Restricted Military Base',
    region: 'Las Venturas & Desert',
    zoneCode: 'RESTR',
    saCoords: [214, 1875, 13.1],
    worldPos: [215, 0, -340],
    gang: 'MILITARY',
    iconCode: '69',
    color: '#f97316',
    description: 'Top-secret desert base housing the $60M Black Project Jetpack and Rhino Tank depot.',
  },
  {
    id: 'LOC_LV_STRIP',
    name: 'Las Venturas — The Strip (Pyramid & Four Dragons)',
    region: 'Las Venturas & Desert',
    zoneCode: 'STRIP',
    saCoords: [2028, 1008, 10.8],
    worldPos: [365, 0, -320],
    gang: 'TRIADS',
    iconCode: 'LV',
    color: '#f59e0b',
    description: 'Neon casino boulevard featuring The Camel’s Toe Pyramid, Sphinx, and Four Dragons Casino.',
  },
];

/**
 * Authentic GTA:SA Zone Rectangles (data/info.zon)
 */
export const SAN_ANDREAS_ZONE_POLYGONS: SaZonePolygon[] = [
  {
    id: 'ZONE_GANTON',
    code: 'GANTON',
    name: 'Ganton (Grove Street)',
    region: 'Los Santos',
    minX: -65,
    maxX: 70,
    minZ: -55,
    maxZ: 65,
    gang: 'GROVE',
    turfColor: 'rgba(34, 197, 94, 0.36)',
  },
  {
    id: 'ZONE_IDLEWOOD',
    code: 'IDLEWD',
    name: 'Idlewood',
    region: 'Los Santos',
    minX: -85,
    maxX: 25,
    minZ: 65,
    maxZ: 195,
    gang: 'BALLAS',
    turfColor: 'rgba(168, 85, 247, 0.36)',
  },
  {
    id: 'ZONE_WILLOWFIELD',
    code: 'WILLOW',
    name: 'Willowfield',
    region: 'Los Santos',
    minX: 25,
    maxX: 135,
    minZ: 65,
    maxZ: 220,
    gang: 'BALLAS',
    turfColor: 'rgba(168, 85, 247, 0.32)',
  },
  {
    id: 'ZONE_GLEN_PARK',
    code: 'GLENPK',
    name: 'Glen Park & Jefferson',
    region: 'Los Santos',
    minX: -20,
    maxX: 115,
    minZ: -175,
    maxZ: -55,
    gang: 'BALLAS',
    turfColor: 'rgba(168, 85, 247, 0.36)',
  },
  {
    id: 'ZONE_EAST_LS',
    code: 'EASTLS',
    name: 'East Los Santos & Las Colinas',
    region: 'Los Santos',
    minX: 70,
    maxX: 220,
    minZ: -175,
    maxZ: 65,
    gang: 'VAGOS',
    turfColor: 'rgba(234, 179, 8, 0.36)',
  },
  {
    id: 'ZONE_EL_CORONA',
    code: 'ELCORO',
    name: 'El Corona & Little Mexico (Unity Station)',
    region: 'Los Santos',
    minX: -165,
    maxX: -85,
    minZ: 45,
    maxZ: 195,
    gang: 'AZTECAS',
    turfColor: 'rgba(6, 182, 212, 0.36)',
  },
  {
    id: 'ZONE_DOWNTOWN_LS',
    code: 'DOWNLS',
    name: 'Downtown Los Santos & Pershing Square',
    region: 'Los Santos',
    minX: -235,
    maxX: -65,
    minZ: -145,
    maxZ: 45,
    gang: 'NEUTRAL',
    turfColor: 'rgba(148, 163, 184, 0.18)',
  },
  {
    id: 'ZONE_VINEWOOD',
    code: 'VINE',
    name: 'Vinewood & Mulholland Hills',
    region: 'Los Santos',
    minX: -235,
    maxX: 60,
    minZ: -290,
    maxZ: -145,
    gang: 'NEUTRAL',
    turfColor: 'rgba(148, 163, 184, 0.14)',
  },
  {
    id: 'ZONE_SANTA_MARIA',
    code: 'SMB',
    name: 'Santa Maria & Verona Beach',
    region: 'Los Santos',
    minX: -380,
    maxX: -185,
    minZ: 85,
    maxZ: 340,
    gang: 'NEUTRAL',
    turfColor: 'rgba(14, 165, 233, 0.22)',
  },
  {
    id: 'ZONE_LSIA',
    code: 'LAIR',
    name: 'Los Santos International Airport (LSIA)',
    region: 'Los Santos',
    minX: -185,
    maxX: 45,
    minZ: 220,
    maxZ: 360,
    gang: 'NEUTRAL',
    turfColor: 'rgba(203, 213, 225, 0.22)',
  },
  {
    id: 'ZONE_SAN_FIERRO',
    code: 'SFBAY',
    name: 'San Fierro, Gant Bridge & Mount Chiliad',
    region: 'San Fierro',
    minX: -520,
    maxX: -260,
    minZ: -420,
    maxZ: 80,
    gang: 'TRIADS',
    turfColor: 'rgba(239, 68, 68, 0.24)',
  },
  {
    id: 'ZONE_AREA_69',
    code: 'RESTR',
    name: 'Bone County — Area 69 & Verdant Meadows',
    region: 'Countryside',
    minX: 120,
    maxX: 295,
    minZ: -440,
    maxZ: -220,
    gang: 'MILITARY',
    turfColor: 'rgba(249, 115, 22, 0.28)',
  },
  {
    id: 'ZONE_LAS_VENTURAS',
    code: 'STRIP',
    name: 'Las Venturas — The Strip & Julius Thruway',
    region: 'Las Venturas',
    minX: 295,
    maxX: 520,
    minZ: -440,
    maxZ: -180,
    gang: 'TRIADS',
    turfColor: 'rgba(245, 158, 11, 0.26)',
  },
];

/**
 * Road, Freeway, Railway, Canal & Runway Vector Network for 2D Radar & Full-Screen Map
 */
export const SAN_ANDREAS_ROAD_NETWORK: SaRoadSegment[] = [
  // 1. Grove Street (West-to-East road terminating in the iconic East Cul-de-Sac at X=28, Z=0)
  {
    id: 'RD_GROVE_ST',
    name: 'Grove Street',
    kind: 'street',
    points: [
      [-145, 0],
      [-48, 0],
      [28, 0],
    ],
    width: 16,
  },
  // 2. Ganton North-South Boulevard (Liverpool Rd / Ganton Bridge Overpass at X=-32)
  {
    id: 'RD_GANTON_BLVD',
    name: 'Liverpool Road / Ganton Overpass',
    kind: 'arterial',
    points: [
      [-32, -210],
      [-32, 0],
      [-32, 145],
      [-32, 285],
    ],
    width: 16,
  },
  // 3. Los Santos Concrete Storm Drain / Flood Control Channel (East of Grove St Cul-de-Sac)
  {
    id: 'CN_STORM_DRAIN',
    name: 'Los Santos Flood Control Channel',
    kind: 'canal',
    points: [
      [76, -185],
      [76, 0],
      [76, 165],
      [145, 265],
    ],
    width: 22,
  },
  // 4. Idlewood & Willowfield Cross Avenue (Z = 145)
  {
    id: 'RD_IDLEWOOD_AVE',
    name: 'Idlewood Boulevard',
    kind: 'arterial',
    points: [
      [-285, 145],
      [-145, 145],
      [-32, 145],
      [76, 145],
      [185, 145],
    ],
    width: 18,
  },
  // 5. Glen Park & Downtown Cross Boulevard (Z = -115)
  {
    id: 'RD_GLEN_PARK_BLVD',
    name: 'Glen Park & Mulholland Blvd',
    kind: 'arterial',
    points: [
      [-245, -115],
      [-145, -115],
      [-32, -115],
      [76, -115],
      [185, -115],
    ],
    width: 18,
  },
  // 6. Downtown Los Santos Main North-South Corridor (X = -145)
  {
    id: 'RD_DOWNTOWN_CORRIDOR',
    name: 'Commerce & Downtown Corridor',
    kind: 'arterial',
    points: [
      [-145, -245],
      [-145, -115],
      [-145, 0],
      [-145, 145],
      [-145, 285],
    ],
    width: 18,
  },
  // 7. Los Santos Freeway Loop connecting to San Fierro Gant Bridge & Las Venturas Julius Thruway
  {
    id: 'FWY_SA_LOOP',
    name: 'San Andreas Interstate Freeway',
    kind: 'freeway',
    points: [
      [-420, -260], // San Fierro Gant Bridge
      [-245, -245], // Mulholland Intersection
      [185, -245],  // Red County / Las Venturas Approach
      [365, -320],  // Las Venturas Strip
      [185, -115],  // East Los Santos Freeway
      [185, 145],   // East Beach / Ocean Docks Freeway
      [-145, 285],  // LSIA Airport Freeway
      [-285, 210],  // Santa Maria Beach Coastal Hwy
      [-420, -260], // Back to San Fierro
    ],
    width: 24,
  },
  // 8. Las Venturas Strip North-South Neon Boulevard
  {
    id: 'RD_LV_STRIP',
    name: 'The Strip (Las Venturas)',
    kind: 'arterial',
    points: [
      [365, -420],
      [365, -320],
      [365, -195],
    ],
    width: 22,
  },
  // 9. LSIA International Airport Runway
  {
    id: 'RWY_LSIA',
    name: 'LSIA Runway 09L/27R',
    kind: 'runway',
    points: [
      [-210, 295],
      [15, 295],
    ],
    width: 34,
  },
  // 10. Brown Streak Railroad Loop
  {
    id: 'RAIL_BROWN_STREAK',
    name: 'Brown Streak Railroad',
    kind: 'rail',
    points: [
      [-125, 95],   // Unity Station
      [-55, 42],    // Ganton Rail Crossing
      [145, 42],    // East LS Tunnel
      [320, -280],  // Yellow Bell Station (LV)
      [-360, -220], // Cranberry Station (SF)
      [-125, 95],
    ],
    width: 8,
  },
];
