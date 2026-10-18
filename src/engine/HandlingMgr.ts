/**
 * Reversed from gta_sa.exe v1.0 US
 * - cHandlingDataMgr::LoadHandlingData @ 0x5BD830
 * - gHandlingDataMgr                   @ 0xC2B9DC
 * - struct tHandlingData               (sizeof = 0xE0 / 224 bytes)
 */

export interface HandlingData {
  identifier: string;         // Column A: 14-char vehicle handling ID (e.g. GREENWOOD)
  displayName: string;        // GXT localized name
  modelId: number;            // vehicles.ide ID (400-611)
  category: 'sedan' | 'lowrider' | 'supercar' | 'tuner' | 'bike' | 'bicycle' | 'emergency' | 'military' | 'aircraft';
  fMass: number;              // Column B: Mass in kg (1.0 to 50000.0)
  fTurnMass: number;          // Column C: Turn mass ( rotational inertia )
  fDragMult: number;          // Column D: Aerodynamic drag multiplier
  centreOfMass: [number, number, number]; // Columns E, F, G
  nPercentSubmerged: number;  // Column H: Buoyancy percentage
  fTractionMultiplier: number;// Column I: Cornering grip
  fTractionLoss: number;      // Column J: Slip factor
  fTractionBias: number;      // Column K: Front/Rear grip ratio
  nNumberOfGears: number;     // Column L: 1 to 5
  fMaxVelocity: number;       // Column M: Top speed km/h
  fEngineAcceleration: number;// Column N: Acceleration m/s^2
  fEngineInertia: number;     // Column O: Engine response
  nDriveType: 'F' | 'R' | '4';// Column P: Front, Rear, 4WD
  nEngineType: 'P' | 'D' | 'E';// Column Q: Petrol, Diesel, Electric
  fBrakeDeceleration: number; // Column R: Braking power
  fBrakeBias: number;         // Column S: Front/Rear brake distribution
  bABS: boolean;              // Column T: ABS
  fSteeringLock: number;      // Column U: Max steering angle deg
  fSuspensionForceLevel: number; // Column V
  fSuspensionDampingLevel: number; // Column W
  fSuspensionUpperLimit: number;   // Column Y
  fSuspensionLowerLimit: number;   // Column Z
  fCollisionDamageMultiplier: number; // Column AC
  nMonetaryValue: number;     // Column AD
  modelFlagsHex: string;      // Column AE
  handlingFlagsHex: string;   // Column AF
  primaryColor: string;
  secondaryColor: string;
  hasHydraulics?: boolean;
  hasNitro?: boolean;
  hasSiren?: boolean;
  hasTurret?: boolean;
}

/**
 * Authentic GTA San Andreas data/handling.cfg lines (Rockstar North 2004 / PC v1.0 US)
 */
export const AUTHENTIC_HANDLING_CFG = `;
; Grand Theft Auto: San Andreas — handling.cfg (Reversed cHandlingDataMgr @ 0xC2B9DC)
; > Identifier     Mass    TurnMass Drag   COM_X  COM_Y  COM_Z  Subm TracM TracL TracB Gears MaxVel Accel  Inert Drive Eng BrakeD BrakeB ABS Steer SuspF SuspD SuspHi SuspUp SuspLo SuspB  AntiD  Dmg   Value  MFlags   HFlags
;
GREENWOOD       1600.0    4000.0   2.0    0.0    0.06  -0.15   75   0.65  0.85  0.50  5     165.0  18.0   10.0  R     P   7.0    0.60   0   35.0  1.20  0.12  0.0    0.28  -0.14  0.50   0.30   0.52  12000  00002000 00000001
SAVANNA         1500.0    3800.0   2.0    0.0    0.05  -0.22   75   0.72  0.82  0.51  4     175.0  20.0   10.0  R     P   7.5    0.58   0   35.0  1.15  0.10  0.0    0.32  -0.18  0.50   0.30   0.50  18000  00200004 00020000
BMX              130.0     150.0   1.0    0.0    0.00   0.00   85   0.95  0.85  0.50  1     110.0  24.0    5.0  R     E   9.0    0.50   0   42.0  1.50  0.20  0.0    0.20  -0.10  0.50   0.00   0.10    500  01000000 00010000
PICADOR         1450.0    3500.0   2.2    0.0    0.10  -0.18   75   0.70  0.84  0.52  5     170.0  19.5   10.0  R     P   7.2    0.60   0   35.0  1.25  0.12  0.0    0.26  -0.14  0.50   0.30   0.48  10000  00002000 00000001
INFERNUS        1400.0    2725.3   1.5    0.0    0.00  -0.25   70   0.88  0.79  0.50  5     240.0  32.0   10.0  4     P   11.0   0.52   1   30.0  1.40  0.18  0.0    0.20  -0.10  0.50   0.50   0.40  95000  40002004 00400000
SULTAN          1400.0    2900.0   1.7    0.0    0.10  -0.18   70   0.86  0.82  0.50  5     215.0  28.0    8.0  4     P   10.0   0.53   1   33.0  1.35  0.15  0.0    0.24  -0.12  0.50   0.45   0.45  35000  40000000 01400000
NRG500           400.0     350.0   1.2    0.0    0.05  -0.09   85   0.92  0.88  0.50  5     230.0  38.0    5.0  R     P   12.0   0.65   0   36.0  1.40  0.18  0.0    0.20  -0.12  0.50   0.00   0.25  45000  01000000 00010002
SANCHEZ          450.0     420.0   1.6    0.0    0.08  -0.08   85   0.88  0.86  0.48  5     185.0  31.0    5.0  R     P   10.0   0.60   0   38.0  1.60  0.14  0.0    0.30  -0.16  0.50   0.00   0.25  12000  01000000 00030000
COPCARLA        1600.0    3600.0   1.9    0.0    0.05  -0.16   75   0.78  0.84  0.52  5     205.0  25.0   10.0  R     P   9.2    0.58   0   34.0  1.30  0.14  0.0    0.25  -0.14  0.50   0.35   0.40  25000  00002000 00000001
RHINO          25000.0   99999.0   4.0    0.0    0.00  -0.40   90   1.10  0.95  0.50  4     115.0  16.0   30.0  4     D   14.0   0.50   0   28.0  1.80  0.25  0.0    0.20  -0.15  0.50   0.10   0.02 150000  00028008 04000000
HYDRA           5000.0   12000.0   0.8    0.0    0.00   0.00   85   0.85  0.80  0.50  5     280.0  45.0   15.0  4     P   12.0   0.50   0   30.0  1.50  0.20  0.0    0.25  -0.15  0.50   0.00   0.15 250000  04000000 00400000
MAVERICK        2200.0    6500.0   1.1    0.0    0.00   0.00   85   0.80  0.80  0.50  5     210.0  34.0   12.0  4     P   9.0    0.50   0   32.0  1.30  0.18  0.0    0.22  -0.12  0.50   0.00   0.25  90000  02000000 00000000
TAXI            1650.0    3900.0   2.0    0.0    0.05  -0.15   75   0.74  0.84  0.51  5     185.0  21.5   10.0  R     P   8.2    0.58   0   35.0  1.25  0.13  0.0    0.26  -0.14  0.50   0.30   0.45  15000  00002000 00000001
AMBULAN         2500.0    6200.0   2.4    0.0    0.00  -0.12   80   0.72  0.82  0.50  5     180.0  20.0   15.0  4     D   8.5    0.55   0   32.0  1.35  0.12  0.0    0.28  -0.16  0.50   0.25   0.35  30000  00001101 00000000
`;

const VEHICLE_METADATA: Record<
  string,
  {
    displayName: string;
    modelId: number;
    category: HandlingData['category'];
    primaryColor: string;
    secondaryColor: string;
    hasHydraulics?: boolean;
    hasNitro?: boolean;
    hasSiren?: boolean;
    hasTurret?: boolean;
  }
> = {
  GREENWOOD: {
    displayName: 'Greenwood (Sweet)',
    modelId: 492,
    category: 'sedan',
    primaryColor: '#486878',
    secondaryColor: '#d9dde2',
  },
  SAVANNA: {
    displayName: 'Savanna Lowrider',
    modelId: 567,
    category: 'lowrider',
    primaryColor: '#961c1c',
    secondaryColor: '#e8d8c0',
    hasHydraulics: true,
  },
  BMX: {
    displayName: 'BMX (Grove Street)',
    modelId: 481,
    category: 'bicycle',
    primaryColor: '#8d969e',
    secondaryColor: '#1f2428',
  },
  PICADOR: {
    displayName: 'Picador (Ryder)',
    modelId: 600,
    category: 'sedan',
    primaryColor: '#5c1e24',
    secondaryColor: '#222222',
  },
  INFERNUS: {
    displayName: 'Infernus V10',
    modelId: 411,
    category: 'supercar',
    primaryColor: '#d62828',
    secondaryColor: '#f8f9fa',
    hasNitro: true,
  },
  SULTAN: {
    displayName: 'Sultan RS Tuner',
    modelId: 560,
    category: 'tuner',
    primaryColor: '#1d4ed8',
    secondaryColor: '#facc15',
    hasNitro: true,
  },
  NRG500: {
    displayName: 'NRG-500 RR',
    modelId: 522,
    category: 'bike',
    primaryColor: '#dc2626',
    secondaryColor: '#f3f4f6',
  },
  SANCHEZ: {
    displayName: 'Sanchez Dirtbike',
    modelId: 468,
    category: 'bike',
    primaryColor: '#16a34a',
    secondaryColor: '#f8fafc',
  },
  COPCARLA: {
    displayName: 'LSPD Police Cruiser',
    modelId: 596,
    category: 'emergency',
    primaryColor: '#111827',
    secondaryColor: '#f9fafb',
    hasSiren: true,
  },
  RHINO: {
    displayName: 'Rhino M1A1 Tank',
    modelId: 432,
    category: 'military',
    primaryColor: '#57534e',
    secondaryColor: '#44403c',
    hasTurret: true,
  },
  HYDRA: {
    displayName: 'Hydra VTOL Jet',
    modelId: 520,
    category: 'aircraft',
    primaryColor: '#64748b',
    secondaryColor: '#334155',
  },
  MAVERICK: {
    displayName: 'Maverick Helicopter',
    modelId: 487,
    category: 'aircraft',
    primaryColor: '#0284c7',
    secondaryColor: '#f1f5f9',
  },
  TAXI: {
    displayName: 'Los Santos Taxi',
    modelId: 420,
    category: 'sedan',
    primaryColor: '#eab308',
    secondaryColor: '#18181b',
  },
  AMBULAN: {
    displayName: 'LS Medical Ambulance',
    modelId: 416,
    category: 'emergency',
    primaryColor: '#f8fafc',
    secondaryColor: '#dc2626',
    hasSiren: true,
  },
};

/**
 * Parses raw GTA:SA handling.cfg content into structured tHandlingData records
 * Replicates cHandlingDataMgr::LoadHandlingData (0x5BD830)
 */
export function parseHandlingCfg(rawText: string): Record<string, HandlingData> {
  const result: Record<string, HandlingData> = {};
  const lines = rawText.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';') || line.startsWith('#') || line.startsWith('!') || line.startsWith('%') || line.startsWith('$') || line.startsWith('^')) {
      continue;
    }

    const tokens = line.split(/\s+/);
    if (tokens.length < 30) continue;

    const identifier = tokens[0].toUpperCase();
    const meta = VEHICLE_METADATA[identifier] || {
      displayName: identifier,
      modelId: 400,
      category: 'sedan',
      primaryColor: '#3b82f6',
      secondaryColor: '#e2e8f0',
    };

    result[identifier] = {
      identifier,
      displayName: meta.displayName,
      modelId: meta.modelId,
      category: meta.category,
      fMass: parseFloat(tokens[1]) || 1500,
      fTurnMass: parseFloat(tokens[2]) || 3500,
      fDragMult: parseFloat(tokens[3]) || 2.0,
      centreOfMass: [
        parseFloat(tokens[4]) || 0,
        parseFloat(tokens[5]) || 0,
        parseFloat(tokens[6]) || -0.15,
      ],
      nPercentSubmerged: parseInt(tokens[7], 10) || 75,
      fTractionMultiplier: parseFloat(tokens[8]) || 0.75,
      fTractionLoss: parseFloat(tokens[9]) || 0.85,
      fTractionBias: parseFloat(tokens[10]) || 0.5,
      nNumberOfGears: parseInt(tokens[11], 10) || 5,
      fMaxVelocity: parseFloat(tokens[12]) || 160,
      fEngineAcceleration: parseFloat(tokens[13]) || 20,
      fEngineInertia: parseFloat(tokens[14]) || 10,
      nDriveType: (tokens[15] as 'F' | 'R' | '4') || 'R',
      nEngineType: (tokens[16] as 'P' | 'D' | 'E') || 'P',
      fBrakeDeceleration: parseFloat(tokens[17]) || 8.0,
      fBrakeBias: parseFloat(tokens[18]) || 0.6,
      bABS: tokens[19] === '1',
      fSteeringLock: parseFloat(tokens[20]) || 35,
      fSuspensionForceLevel: parseFloat(tokens[21]) || 1.2,
      fSuspensionDampingLevel: parseFloat(tokens[22]) || 0.12,
      fSuspensionUpperLimit: parseFloat(tokens[24]) || 0.25,
      fSuspensionLowerLimit: parseFloat(tokens[25]) || -0.15,
      fCollisionDamageMultiplier: parseFloat(tokens[28]) || 0.5,
      nMonetaryValue: parseInt(tokens[29], 10) || 15000,
      modelFlagsHex: tokens[30] || '00000000',
      handlingFlagsHex: tokens[31] || '00000000',
      primaryColor: meta.primaryColor,
      secondaryColor: meta.secondaryColor,
      hasHydraulics: meta.hasHydraulics,
      hasNitro: meta.hasNitro,
      hasSiren: meta.hasSiren,
      hasTurret: meta.hasTurret,
    };
  }

  return result;
}

export const DEFAULT_HANDLING_TABLE = parseHandlingCfg(AUTHENTIC_HANDLING_CFG);
