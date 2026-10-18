/**
 * Reversed from gta_sa.exe v1.0 US
 * - CCheat::AddToCheatString @ 0x4384D0
 * - CKeyGen::GetKey          @ 0x53CF00 (JamCRC: CRC-32 without final XOR on reversed buffer)
 * - m_aCheatFunctions        @ 0x8A5B58
 * - m_aCheatHashKeys         @ 0x8A5CC8
 * - m_CheatString            @ 0x969110 (char[30], newest char shifted into index 0)
 * - m_aCheatsActive          @ 0x969130 (bool[92])
 */

export interface CheatDefinition {
  id: string;
  code: string;
  aliasPhrase?: string;
  jamCrcHash: number;
  exeAddress: string;
  methodName: string;
  description: string;
  category: 'player' | 'weapons' | 'vehicles' | 'wanted' | 'weather' | 'physics';
}

/**
 * Exact replica of CKeyGen::GetKey (0x53CF00) operating on CCheat::m_CheatString (0x969110).
 * In GTA:SA, each key press shifts m_CheatString right by 1 and writes the new char at [0],
 * so hashing the first N bytes of m_CheatString hashes the reversed typed sequence.
 */
export function computeGtaSaCheatJamCrc(input: string): number {
  const reversed = input.toUpperCase().split('').reverse().join('');
  let crc = 0xffffffff;
  for (let i = 0; i < reversed.length; i++) {
    crc ^= reversed.charCodeAt(i) & 0xff;
    for (let bit = 0; bit < 8; bit++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return crc >>> 0;
}

export const GTA_SA_CHEAT_TABLE: CheatDefinition[] = [
  {
    id: 'CHEAT_HEALTH_ARMOR_250K',
    code: 'HESOYAM',
    aliasPhrase: 'INEEDSOMEHELP',
    jamCrcHash: 0xeeccea2b,
    exeAddress: '0x438E40',
    methodName: 'CCheat::MoneyArmourHealthCheat',
    description: 'Full Health, 100% Armor, +$250,000 Cash & Repairs Current Vehicle',
    category: 'player',
  },
  {
    id: 'CHEAT_WEAPON_SET1',
    code: 'LXGIWYL',
    aliasPhrase: 'THUGSARMOURY',
    jamCrcHash: 0xde4b237d,
    exeAddress: '0x4385B0',
    methodName: 'CCheat::WeaponCheat1',
    description: 'Weapon Set 1 (9mm Pistol, Micro SMG, Shotgun, AK-47, Baseball Bat, Spray Can)',
    category: 'weapons',
  },
  {
    id: 'CHEAT_WEAPON_SET2',
    code: 'KJKSZPJ',
    aliasPhrase: 'PROFESSIONALSKIT',
    jamCrcHash: 0xb22a28d1,
    exeAddress: '0x438890',
    methodName: 'CCheat::WeaponCheat2',
    description: 'Weapon Set 2 (Desert Eagle, Tec-9, Sawnoff, M4 Carbine, Sniper, Katana)',
    category: 'weapons',
  },
  {
    id: 'CHEAT_WEAPON_SET3',
    code: 'UZUMYMW',
    aliasPhrase: 'NUTTERSTOYS',
    jamCrcHash: 0x5a783fae,
    exeAddress: '0x438B30',
    methodName: 'CCheat::WeaponCheat3',
    description: 'Weapon Set 3 (Minigun, Rocket Launcher, Combat Shotgun, SMG, Satchel Charges)',
    category: 'weapons',
  },
  {
    id: 'CHEAT_JETPACK',
    code: 'ROCKETMAN',
    aliasPhrase: 'YECGAA',
    jamCrcHash: 0x040cf761,
    exeAddress: '0x439600',
    methodName: 'CCheat::JetpackCheat',
    description: 'Equip Black Project Thruster Jetpack on CJ',
    category: 'player',
  },
  {
    id: 'CHEAT_INFINITE_HEALTH',
    code: 'BAGUVIX',
    aliasPhrase: 'CAINEMVHZC',
    jamCrcHash: 0x9a9c00bc,
    exeAddress: '0x4395B0',
    methodName: 'CCheat::HealthCheat',
    description: 'Toggle Bulletproof / Semi-God Mode',
    category: 'player',
  },
  {
    id: 'CHEAT_CLEAR_WANTED_LEVEL',
    code: 'ASNAEB',
    aliasPhrase: 'TURNDOWNTHEHEAT',
    jamCrcHash: 0x555fc201,
    exeAddress: '0x438F20',
    methodName: 'CCheat::WantedLevelDownCheat',
    description: 'Clear All Wanted Stars Immediately',
    category: 'wanted',
  },
  {
    id: 'CHEAT_WANTED_LEVEL_2STARS',
    code: 'OSRBLHH',
    aliasPhrase: 'TURNUPTHEHEAT',
    jamCrcHash: 0x42af1e28,
    exeAddress: '0x438E90',
    methodName: 'CCheat::WantedLevelUpCheat',
    description: 'Increase Wanted Level by +2 Stars',
    category: 'wanted',
  },
  {
    id: 'CHEAT_WANTED_LEVEL_6STARS',
    code: 'LJSPQK',
    aliasPhrase: 'BRINGITON',
    jamCrcHash: 0x76b13b72,
    exeAddress: '0x4396F0',
    methodName: 'CCheat::SixStarWantedCheat',
    description: 'Maximum 6-Star Wanted Level (Deploys Military & SWAT)',
    category: 'wanted',
  },
  {
    id: 'CHEAT_NEVER_WANTED',
    code: 'AEZAKMI',
    aliasPhrase: 'IDOASIPLEASE',
    jamCrcHash: 0xe1ef01ea,
    exeAddress: '0x4396C0',
    methodName: 'CCheat::NotWantedCheat',
    description: 'Toggle Never Wanted (LSPD Ignores All Crimes)',
    category: 'wanted',
  },
  {
    id: 'CHEAT_SPAWN_RHINO',
    code: 'AIWPRTON',
    aliasPhrase: 'TIMETOKICKASS',
    jamCrcHash: 0x43db914e,
    exeAddress: '0x43A4A0',
    methodName: 'CCheat::TankCheat',
    description: 'Spawn M1A1 Rhino Heavy Tank',
    category: 'vehicles',
  },
  {
    id: 'CHEAT_SPAWN_HYDRA',
    code: 'JUMPJET',
    aliasPhrase: 'JUMPJET',
    jamCrcHash: 0x8ded75bd,
    exeAddress: '0x43A530',
    methodName: 'CCheat::FlyboyCheat',
    description: 'Spawn Hydra VTOL Fighter Jet',
    category: 'vehicles',
  },
  {
    id: 'CHEAT_SPAWN_HOTRINGA',
    code: 'PDNEJOH',
    aliasPhrase: 'NOTFORPUBLICROADS',
    jamCrcHash: 0xd08a30fe,
    exeAddress: '0x43A4D0',
    methodName: 'CCheat::StockCar3Cheat',
    description: 'Spawn Hotring Racer / Infernus Supercar',
    category: 'vehicles',
  },
  {
    id: 'CHEAT_ALL_CARS_HAVE_NITRO',
    code: 'SPEEDFREAK',
    aliasPhrase: 'ALLCARSGOBOOM',
    jamCrcHash: 0xb07d3b32,
    exeAddress: '0x969165',
    methodName: 'CCheat::m_aCheatsActive[CHEAT_ALL_CARS_HAVE_NITRO]',
    description: 'All Vehicles Equipped with Infinite 10x Nitrous Oxide',
    category: 'physics',
  },
  {
    id: 'CHEAT_CARS_FLY',
    code: 'RIPAZHA',
    aliasPhrase: 'CHITTYCHITTYBANGBANG',
    jamCrcHash: 0xb2afe368,
    exeAddress: '0x969160',
    methodName: 'CCheat::m_aCheatsActive[CHEAT_CARS_FLY]',
    description: 'Toggle Flying Cars Aerodynamic Lift Physics',
    category: 'physics',
  },
  {
    id: 'CHEAT_MEGAJUMP',
    code: 'KANGAROO',
    aliasPhrase: 'LFGMHAL',
    jamCrcHash: 0x70164385,
    exeAddress: '0x96916C',
    methodName: 'CCheat::m_aCheatsActive[CHEAT_MEGAJUMP]',
    description: 'Toggle 10x Super Jump Height for CJ',
    category: 'physics',
  },
  {
    id: 'CHEAT_MAX_MUSCLE',
    code: 'BUFFMEUP',
    aliasPhrase: 'JYSDSOD',
    jamCrcHash: 0xd4966d59,
    exeAddress: '0x439150',
    methodName: 'CCheat::MuscleCheat',
    description: 'Maximum Muscle Stat (1000/1000)',
    category: 'player',
  },
  {
    id: 'CHEAT_STOP_GAME_CLOCK_ORANGE_SKY',
    code: 'OFVIAC',
    aliasPhrase: 'DONTTRYANDSTOPME',
    jamCrcHash: 0x5dad0087,
    exeAddress: '0x439540',
    methodName: 'CCheat::DuskCheat',
    description: 'Lock Clock at 21:00 Iconic Los Santos Orange Sunset Sky',
    category: 'weather',
  },
  {
    id: 'CHEAT_SUNNY_WEATHER',
    code: 'PLEASANTLYWARM',
    aliasPhrase: 'AFZLLQLL',
    jamCrcHash: 0x2a845345,
    exeAddress: '0x438F40',
    methodName: 'CCheat::SunnyWeatherCheat',
    description: 'Set Weather to Los Santos Clear Sunny Sky',
    category: 'weather',
  },
  {
    id: 'CHEAT_THUNDER_STORM',
    code: 'SCOTTISHSUMMER',
    aliasPhrase: 'MGHXYRM',
    jamCrcHash: 0x7f80b950,
    exeAddress: '0x439570',
    methodName: 'CCheat::StormCheat',
    description: 'Set Weather to Heavy Thunderstorm & Wet Road Reflections',
    category: 'weather',
  },
];

export class CheatBuffer {
  private buffer = '';
  private readonly maxLength = 30; // CCheat::CHEAT_STRING_SIZE = 30 at 0x969110
  private readonly minLength = 6;  // CCheat::CHEAT_MIN_HASH_SIZE = 6

  public pushKey(char: string): CheatDefinition | null {
    const clean = char.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!clean || clean.length !== 1) return null;

    this.buffer = (this.buffer + clean).slice(-this.maxLength);

    // Check from minLength (6) up to 25 chars just like CCheat::AddToCheatString (0x4384D0)
    for (let len = this.minLength; len <= Math.min(25, this.buffer.length); len++) {
      const candidate = this.buffer.slice(-len);
      const crc = computeGtaSaCheatJamCrc(candidate);
      for (const cheat of GTA_SA_CHEAT_TABLE) {
        if (
          cheat.code === candidate ||
          cheat.aliasPhrase === candidate ||
          cheat.jamCrcHash === crc
        ) {
          this.buffer = ''; // Clear buffer after match (0x969110[0] = 0)
          return cheat;
        }
      }
    }
    return null;
  }

  public getBuffer(): string {
    return this.buffer;
  }
}
