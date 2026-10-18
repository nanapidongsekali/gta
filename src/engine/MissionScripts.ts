/**
 * Reversed from gta_sa.exe v1.0 US
 * - CRunningScript::Process     @ 0x469F00
 * - CTheZones::GetZoneInfo      @ 0x572180
 * - CGangWars::Update           @ 0x446610
 */

import { SAN_ANDREAS_ZONE_POLYGONS } from './SanAndreasMapData';

export interface MapZone {
  id: string;
  name: string;
  district: 'Los Santos' | 'San Fierro' | 'Las Venturas' | 'Countryside';
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  controllingGang: 'GROVE' | 'BALLAS' | 'VAGOS' | 'AZTECAS' | 'TRIADS' | 'MILITARY' | 'NEUTRAL';
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

export const SAN_ANDREAS_ZONES: MapZone[] = SAN_ANDREAS_ZONE_POLYGONS.map((z) => ({
  id: z.id,
  name: z.name,
  district: z.region,
  bounds: { minX: z.minX, maxX: z.maxX, minZ: z.minZ, maxZ: z.maxZ },
  controllingGang: z.gang,
  gangColor: z.turfColor,
}));

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
    startMarker: [22, 0, 14],
    rewardCash: 2500,
    rewardRespect: 15,
    description:
      'Ballas spotted you at the cemetery! Hop on the BMX or Greenwood, evade the Ballas drive-by through the Los Santos Storm Drain & Glen Park, and return to the Grove Street Cul-de-Sac.',
    stages: [
      {
        index: 0,
        objectiveText: 'Mount the ~y~BMX~w~ or ~b~Greenwood~w~ and drop into the ~y~Los Santos Storm Drain Canal~w~.',
        subtitleDialogue: {
          speaker: 'Sweet',
          text: 'CJ! Watch out, it is a Ballas car! Follow me through the Flood Control Channel!',
        },
        targetPosition: [76, 0, -35],
        radius: 15,
        requiredAction: 'REACH_MARKER',
      },
      {
        index: 1,
        objectiveText: 'Cut through ~p~Glen Park~w~ to shake the Ballas Sentinel.',
        subtitleDialogue: {
          speaker: 'Ryder',
          text: 'Keep pedaling CJ, you still know how to ride a bike or what?!',
        },
        targetPosition: [45, 0, -115],
        radius: 15,
        requiredAction: 'REACH_MARKER',
      },
      {
        index: 2,
        objectiveText: 'Return home to the ~g~Grove Street Cul-de-Sac~w~ in Ganton.',
        subtitleDialogue: {
          speaker: 'Big Smoke',
          text: 'Look at CJ go! Meet us back at the cul-de-sac, Carl!',
        },
        targetPosition: [28, 0, 0],
        radius: 15,
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
    startMarker: [16, 0, 14],
    rewardCash: 3500,
    rewardRespect: 25,
    description:
      'Take Sweet’s spray can and paint over purple Ballas graffiti tags across Ganton, Idlewood, and Glen Park to reclaim Grove Street Families turf.',
    stages: [
      {
        index: 0,
        objectiveText: 'Head to the ~g~Ganton Bridge Overpass~w~ and spray over the Ballas tag.',
        subtitleDialogue: {
          speaker: 'Sweet',
          text: 'We gotta put Grove Street Families back on the map, CJ. Hit these tags with green!',
        },
        targetPosition: [-32, 0, 12],
        radius: 14,
        requiredAction: 'REACH_MARKER',
      },
      {
        index: 1,
        objectiveText: 'Spray the second Ballas tag behind ~g~Willowfield Cluckin’ Bell~w~.',
        subtitleDialogue: {
          speaker: 'CJ',
          text: 'That is 1 down. Grove Street 4 Life!',
        },
        targetPosition: [48, 0, 142],
        radius: 14,
        requiredAction: 'REACH_MARKER',
      },
      {
        index: 2,
        objectiveText: 'Spray the final tag in ~g~Glen Park~w~ and return to ~y~Grove Street~w~.',
        subtitleDialogue: {
          speaker: 'Sweet',
          text: 'Nice work CJ! Now get back in the ride before the Ballas roll up.',
        },
        targetPosition: [45, 0, -108],
        radius: 15,
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
    startMarker: [8, 0, 16],
    rewardCash: 5000,
    rewardRespect: 30,
    description:
      'Drive Big Smoke, Sweet, and Ryder to Cluckin’ Bell in Willowfield ("Two Number 9s, a Number 9 Large..."), then intercept the Ballas Voodoo car heading for Grove Street!',
    stages: [
      {
        index: 0,
        objectiveText: 'Drive to the ~y~Cluckin’ Bell Drive-Thru~w~ in Willowfield.',
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
        targetPosition: [-32, 0, 95],
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
        targetPosition: [22, 0, 14],
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
    startMarker: [-38, 0, -10],
    rewardCash: 8000,
    rewardRespect: 35,
    description:
      'Grab the Savanna Lowrider, visit the Idlewood Pay ’n’ Spray for fresh candy paint, and show off your hydraulic suspension bounce at Unity Station in El Corona!',
    stages: [
      {
        index: 0,
        objectiveText: 'Pull into the ~y~Idlewood Pay ’n’ Spray~w~ to prep your Lowrider.',
        subtitleDialogue: {
          speaker: 'Cesar Vialpando',
          text: 'Show me what your coils can do, holmes! Meet us at the Unity Station lot.',
        },
        targetPosition: [-48, 0, 145],
        radius: 15,
        requiredAction: 'REACH_MARKER',
      },
      {
        index: 1,
        objectiveText: 'Hit the ~y~Unity Station Lowrider Meet~w~ in El Corona and press ~g~H~w~ to bounce your hydraulics!',
        subtitleDialogue: {
          speaker: 'CJ',
          text: 'Time to make this Savanna hop on three wheels.',
        },
        targetPosition: [-125, 0, 95],
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
    startMarker: [-18, 0, -18],
    rewardCash: 25000,
    rewardRespect: 50,
    description:
      'Infiltrate the Area 69 Military Base in Bone County (or type ROCKETMAN) and fly the Black Project Jetpack to the Downtown Los Santos Tower helipad!',
    stages: [
      {
        index: 0,
        objectiveText: 'Infiltrate ~r~Area 69 in Bone County~w~ (or type ~g~ROCKETMAN~w~) to acquire the Jetpack.',
        subtitleDialogue: {
          speaker: 'The Truth',
          text: 'The military calls it the Black Project, Carl. Sixty million dollars of taxpayer levitation!',
        },
        targetPosition: [215, 0, -340],
        radius: 22,
        requiredAction: 'REACH_MARKER',
      },
      {
        index: 1,
        objectiveText: 'Fly to the ~y~Downtown Los Santos Tower~w~ extraction point!',
        subtitleDialogue: {
          speaker: 'CJ',
          text: 'I can see all of Los Santos, San Fierro, and Las Venturas from up here!',
        },
        targetPosition: [-175, 0, -65],
        radius: 22,
        requiredAction: 'REACH_MARKER',
      },
    ],
  },
];
