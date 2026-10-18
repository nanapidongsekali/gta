/**
 * Reversed from gta_sa.exe v1.0 US
 * - CRunningScript::Process     @ 0x469F00
 * - CTheZones::GetZoneInfo      @ 0x572180
 * - CGangWars::Update           @ 0x446610
 */

export interface MapZone {
  id: string;
  name: string;
  district: 'Los Santos' | 'San Fierro' | 'Las Venturas';
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  controllingGang: 'GROVE' | 'BALLAS' | 'VAGOS' | 'NEUTRAL';
  gangColor: string;
}

export interface MissionStage {
  index: number;
  objectiveText: string;
  subtitleDialogue?: { speaker: string; text: string };
  targetPosition: [number, number, number];
  radius: number;
  requiredAction?: 'REACH_MARKER' | 'ENTER_VEHICLE' | 'SPRAY_TAG' | 'HYDRAULIC_HOP' | 'EQUIP_JETPACK';
}

export interface MissionDefinition {
  id: string;
  code: string;
  title: string;
  giver: 'Sweet' | 'Big Smoke' | 'Ryder' | 'Cesar Vialpando' | 'The Truth';
  blipCode: 'S' | 'BS' | 'R' | 'CV' | 'TT';
  scmOffsetHex: string;
  startMarker: [number, number, number];
  rewardCash: number;
  rewardRespect: number;
  description: string;
  stages: MissionStage[];
}

export const SAN_ANDREAS_ZONES: MapZone[] = [
  {
    id: 'GANTON',
    name: 'Ganton (Grove Street)',
    district: 'Los Santos',
    bounds: { minX: -95, maxX: 95, minZ: -95, maxZ: 95 },
    controllingGang: 'GROVE',
    gangColor: '#22c55e',
  },
  {
    id: 'IDLEWOOD',
    name: 'Idlewood',
    district: 'Los Santos',
    bounds: { minX: -95, maxX: 120, minZ: 95, maxZ: 280 },
    controllingGang: 'BALLAS',
    gangColor: '#a855f7',
  },
  {
    id: 'GLEN_PARK',
    name: 'Glen Park',
    district: 'Los Santos',
    bounds: { minX: 95, maxX: 290, minZ: -120, maxZ: 95 },
    controllingGang: 'BALLAS',
    gangColor: '#a855f7',
  },
  {
    id: 'EAST_LS',
    name: 'East Los Santos',
    district: 'Los Santos',
    bounds: { minX: 95, maxX: 300, minZ: 95, maxZ: 280 },
    controllingGang: 'VAGOS',
    gangColor: '#eab308',
  },
  {
    id: 'DOWNTOWN_LS',
    name: 'Downtown Los Santos',
    district: 'Los Santos',
    bounds: { minX: -320, maxX: -95, minZ: -160, maxZ: 120 },
    controllingGang: 'NEUTRAL',
    gangColor: '#64748b',
  },
  {
    id: 'VINEWOOD',
    name: 'Vinewood Hills',
    district: 'Los Santos',
    bounds: { minX: -280, maxX: 260, minZ: -380, maxZ: -95 },
    controllingGang: 'NEUTRAL',
    gangColor: '#64748b',
  },
  {
    id: 'SANTA_MARIA',
    name: 'Santa Maria Beach',
    district: 'Los Santos',
    bounds: { minX: -420, maxX: -95, minZ: 120, maxZ: 380 },
    controllingGang: 'NEUTRAL',
    gangColor: '#0ea5e9',
  },
  {
    id: 'LAS_VENTURAS',
    name: 'Las Venturas & Area 69',
    district: 'Las Venturas',
    bounds: { minX: 240, maxX: 460, minZ: -420, maxZ: -120 },
    controllingGang: 'NEUTRAL',
    gangColor: '#f59e0b',
  },
];

export function getZoneAtPosition(x: number, z: number): MapZone {
  for (const zone of SAN_ANDREAS_ZONES) {
    if (
      x >= zone.bounds.minX &&
      x <= zone.bounds.maxX &&
      z >= zone.bounds.minZ &&
      z <= zone.bounds.maxZ
    ) {
      return zone;
    }
  }
  return SAN_ANDREAS_ZONES[0];
}

export const GTA_SA_MISSIONS: MissionDefinition[] = [
  {
    id: 'MISSION_SWEET_KENDL',
    code: 'INTRO_2',
    title: 'Sweet & Kendl',
    giver: 'Sweet',
    blipCode: 'S',
    scmOffsetHex: '0x0002B410',
    startMarker: [24, 0, -14],
    rewardCash: 2500,
    rewardRespect: 15,
    description:
      'Ballas spotted you at the cemetery! Hop on the BMX or Greenwood, evade the Ballas drive-by through Glen Park & Idlewood, and return safely to Grove Street.',
    stages: [
      {
        index: 0,
        objectiveText: 'Mount the ~y~BMX~w~ or ~b~Greenwood~w~ and ride out to the ~y~Glen Park Bridge~w~.',
        subtitleDialogue: {
          speaker: 'Sweet',
          text: 'CJ! Watch out, it is a Ballas car! Split up and meet back on Grove Street!',
        },
        targetPosition: [145, 0, -25],
        radius: 14,
        requiredAction: 'REACH_MARKER',
      },
      {
        index: 1,
        objectiveText: 'Cut through the ~y~Idlewood Gas Station~w~ checkpoint to lose the Ballas tail.',
        subtitleDialogue: {
          speaker: 'Ryder',
          text: 'Keep pedaling CJ, you still know how to ride a bike or what?!',
        },
        targetPosition: [10, 0, 155],
        radius: 14,
        requiredAction: 'REACH_MARKER',
      },
      {
        index: 2,
        objectiveText: 'Return home to the ~y~Grove Street Cul-de-Sac~w~.',
        subtitleDialogue: {
          speaker: 'Big Smoke',
          text: 'Look at CJ go! Meet us back at the cul-de-sac, Carl!',
        },
        targetPosition: [0, 0, -24],
        radius: 14,
        requiredAction: 'REACH_MARKER',
      },
    ],
  },
  {
    id: 'MISSION_TAGGING_UP_TURF',
    code: 'SWEET_1',
    title: 'Tagging Up Turf',
    giver: 'Sweet',
    blipCode: 'S',
    scmOffsetHex: '0x000348C0',
    startMarker: [34, 0, -8],
    rewardCash: 3500,
    rewardRespect: 25,
    description:
      'Take Sweet’s spray can and paint over 3 purple Ballas graffiti tags across Ganton and Idlewood to reclaim Grove Street Families respect.',
    stages: [
      {
        index: 0,
        objectiveText: 'Head to the ~g~Ganton Bridge Wall~w~ and spray over the Ballas tag (~y~Click / Ctrl~w~ or approach).',
        subtitleDialogue: {
          speaker: 'Sweet',
          text: 'We gotta put Grove Street Families back on the map, CJ. Hit these tags with green!',
        },
        targetPosition: [-52, 0, 12],
        radius: 12,
        requiredAction: 'REACH_MARKER',
      },
      {
        index: 1,
        objectiveText: 'Spray the second Ballas tag behind ~g~Idlewood Cluckin’ Bell~w~.',
        subtitleDialogue: {
          speaker: 'CJ',
          text: 'That is 1 down. Grove Street 4 Life!',
        },
        targetPosition: [48, 0, 142],
        radius: 12,
        requiredAction: 'REACH_MARKER',
      },
      {
        index: 2,
        objectiveText: 'Spray the final tag in ~g~Glen Park~w~ and return to ~y~Grove Street~w~.',
        subtitleDialogue: {
          speaker: 'Sweet',
          text: 'Nice work CJ! Now get back in the ride before the Ballas roll up.',
        },
        targetPosition: [128, 0, 32],
        radius: 13,
        requiredAction: 'REACH_MARKER',
      },
    ],
  },
  {
    id: 'MISSION_DRIVE_THRU',
    code: 'SMOKE_2',
    title: 'Drive-Thru',
    giver: 'Big Smoke',
    blipCode: 'BS',
    scmOffsetHex: '0x00041F20',
    startMarker: [42, 0, 18],
    rewardCash: 5000,
    rewardRespect: 30,
    description:
      'Drive Big Smoke, Sweet, and Ryder to Cluckin’ Bell in Idlewood ("Two Number 9s, a Number 9 Large..."), then intercept the Ballas car heading for Grove Street!',
    stages: [
      {
        index: 0,
        objectiveText: 'Drive to the ~y~Cluckin’ Bell Drive-Thru~w~ in Idlewood.',
        subtitleDialogue: {
          speaker: 'Big Smoke',
          text: 'I’ll have two number 9s, a number 9 large, a number 6 with extra dip, a number 7, two number 45s, one with cheese, and a large soda.',
        },
        targetPosition: [55, 0, 165],
        radius: 15,
        requiredAction: 'REACH_MARKER',
      },
      {
        index: 1,
        objectiveText: 'Intercept the ~p~Ballas Voodoo~w~ at the ~y~Idlewood Intersection~w~ before they reach Grove Street!',
        subtitleDialogue: {
          speaker: 'Sweet',
          text: 'They are heading for Grove Street! Cut them off CJ, Smoke is still eating!',
        },
        targetPosition: [-15, 0, 95],
        radius: 15,
        requiredAction: 'REACH_MARKER',
      },
      {
        index: 2,
        objectiveText: 'Drop the homies back off at ~y~Sweet’s House on Grove Street~w~.',
        subtitleDialogue: {
          speaker: 'Big Smoke',
          text: 'Man, my food got cold... except the dip. Good driving, Carl!',
        },
        targetPosition: [18, 0, -18],
        radius: 14,
        requiredAction: 'REACH_MARKER',
      },
    ],
  },
  {
    id: 'MISSION_CESAR_LOWRIDER',
    code: 'CESAR_1',
    title: 'Cesar Vialpando (Lowrider Meet)',
    giver: 'Cesar Vialpando',
    blipCode: 'CV',
    scmOffsetHex: '0x000589A0',
    startMarker: [-32, 0, -10],
    rewardCash: 8000,
    rewardRespect: 35,
    description:
      'Grab the Savanna Lowrider, visit the Idlewood Pay ’n’ Spray for fresh candy paint, and show off your hydraulic suspension bounce at the Unity Station meet!',
    stages: [
      {
        index: 0,
        objectiveText: 'Pull into the ~y~Idlewood Pay ’n’ Spray~w~ to prep your Lowrider.',
        subtitleDialogue: {
          speaker: 'Cesar Vialpando',
          text: 'Show me what your coils can do, holmes! Meet us at the station lot.',
        },
        targetPosition: [-48, 0, 145],
        radius: 15,
        requiredAction: 'REACH_MARKER',
      },
      {
        index: 1,
        objectiveText: 'Hit the ~y~Unity Station Lowrider Meet~w~ and press ~g~H~w~ to bounce your hydraulics!',
        subtitleDialogue: {
          speaker: 'CJ',
          text: 'Time to make this Savanna hop on three wheels.',
        },
        targetPosition: [-125, 0, 65],
        radius: 16,
        requiredAction: 'REACH_MARKER',
      },
    ],
  },
  {
    id: 'MISSION_BLACK_PROJECT',
    code: 'TRUTH_5',
    title: 'Black Project ($60,000,000 Jetpack)',
    giver: 'The Truth',
    blipCode: 'TT',
    scmOffsetHex: '0x0008E110',
    startMarker: [-18, 0, -32],
    rewardCash: 25000,
    rewardRespect: 50,
    description:
      'Infiltrate the Area 69 / Las Venturas perimeter or trigger the Black Project Jetpack and fly to the top of the Downtown Los Santos Tower helipad!',
    stages: [
      {
        index: 0,
        objectiveText: 'Reach the ~y~Black Project Jetpack Extraction Point~w~ (or type ~g~ROCKETMAN~w~) and ascend!',
        subtitleDialogue: {
          speaker: 'The Truth',
          text: 'The military calls it the Black Project, Carl. Sixty million dollars of taxpayer levitation!',
        },
        targetPosition: [-175, 0, -45],
        radius: 18,
        requiredAction: 'REACH_MARKER',
      },
    ],
  },
];
