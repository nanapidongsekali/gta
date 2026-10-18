import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  SanAndreasWorldCanvas,
  TelemetrySnapshot,
  WeaponSlot,
} from './components/SanAndreasWorldCanvas';
import { GtaHud } from './components/GtaHud';
import { StudioDrawers } from './components/StudioDrawers';
import {
  DEFAULT_GRAPHICS_TUNING,
  GraphicsModeId,
  GraphicsTuningConfig,
  WeatherPresetId,
} from './engine/TimeCycle';
import { CheatBuffer, CheatDefinition } from './engine/CheatSystem';
import {
  audioEngine,
  GTA_SA_RADIO_STATIONS,
} from './engine/AudioEngine';

const INITIAL_WEAPONS: WeaponSlot[] = [
  {
    id: 'UNARMED',
    name: 'Fist',
    clipAmmo: 1,
    totalAmmo: 1,
    damage: 25,
    range: 4.5,
  },
  {
    id: 'SPRAYCAN',
    name: 'Spray Can',
    clipAmmo: 500,
    totalAmmo: 999,
    damage: 15,
    range: 9.0,
  },
  {
    id: 'PISTOL',
    name: '9mm Colt 45',
    clipAmmo: 17,
    totalAmmo: 180,
    damage: 35,
    range: 45.0,
  },
  {
    id: 'MICRO_UZI',
    name: 'Micro SMG',
    clipAmmo: 50,
    totalAmmo: 350,
    damage: 28,
    range: 42.0,
  },
  {
    id: 'SHOTGUN',
    name: 'Pump Shotgun',
    clipAmmo: 8,
    totalAmmo: 96,
    damage: 85,
    range: 28.0,
  },
  {
    id: 'AK47',
    name: 'AK-47 Rifle',
    clipAmmo: 30,
    totalAmmo: 300,
    damage: 45,
    range: 65.0,
  },
  {
    id: 'RPG',
    name: 'Rocket RPG',
    clipAmmo: 1,
    totalAmmo: 20,
    damage: 250,
    range: 90.0,
  },
];

export function App() {
  // Core GTA:SA Player Vital Stats (CPlayerInfo @ 0xB7CD98)
  const [stats, setStats] = useState({
    health: 100,
    armor: 50,
    cash: 350, // Iconic starting cash in Los Santos after Tenpenny drops CJ off in Alley
    respect: 120,
    muscle: 350,
    stamina: 420,
    wantedStars: 0,
  });

  // TimeCycle & Remastered Graphics Tuning State
  const [gameHour, setGameHour] = useState<number>(18.5); // Golden hour sunset on Grove Street
  const [clockLocked, setClockLocked] = useState<boolean>(false);
  const [weather, setWeather] = useState<WeatherPresetId>('EXTRASUNNY_LA');
  const [tuning, setTuning] = useState<GraphicsTuningConfig>(
    DEFAULT_GRAPHICS_TUNING
  );

  // Active Cheat Flags (m_aCheatsActive @ 0x969130)
  const [neverWanted, setNeverWanted] = useState(false);
  const [godMode, setGodMode] = useState(false);
  const [jetpackActive, setJetpackActive] = useState(false);
  const [megaJump, setMegaJump] = useState(false);
  const [carsFly, setCarsFly] = useState(false);
  const [allCarsNitro, setAllCarsNitro] = useState(false);

  // Weapons & Radio
  const [weapons] = useState<WeaponSlot[]>(INITIAL_WEAPONS);
  const [weaponIdx, setWeaponIdx] = useState<number>(1); // Start with Spray Can / 9mm ready
  const [stationIdx, setStationIdx] = useState<number>(0);
  const [muted, setMuted] = useState<boolean>(false);

  // UI Drawers & Notifications
  const [activeDrawer, setActiveDrawer] = useState<
    'NONE' | 'GRAPHICS' | 'CHEATS' | 'VEHICLES' | 'MISSIONS' | 'STUDIO_REA'
  >('NONE');
  const [cheatToast, setCheatToast] = useState<{
    code: string;
    description: string;
  } | null>(null);
  const [banner, setBanner] = useState<{
    type:
      | 'MISSION_PASSED'
      | 'WASTED'
      | 'BUSTED'
      | 'GANG_WAR'
      | 'RESPRAYED'
      | 'TAG_SPRAYED';
    title: string;
    subtitle: string;
  } | null>(null);

  // Imperative Dispatch Nonces to 3D World Canvas
  const [spawnRequest, setSpawnRequest] = useState<{
    vehicleId: string;
    nonce: number;
  } | null>(null);
  const [teleportRequest, setTeleportRequest] = useState<{
    x: number;
    y: number;
    z: number;
    nonce: number;
  } | null>(null);
  const [missionStartRequest, setMissionStartRequest] = useState<{
    missionId: string;
    nonce: number;
  } | null>(null);
  const [triggerActionRequest, setTriggerActionRequest] = useState<{
    action: 'FIRE' | 'ENTER_EXIT' | 'HYDRAULICS' | 'NITRO';
    nonce: number;
  } | null>(null);

  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>({
    fps: 60,
    playerX: 0,
    playerY: 0,
    playerZ: -34,
    headingRad: 0,
    speedKmh: 0,
    inVehicle: null,
    vehicleHealth: 1000,
    zoneName: 'Ganton (Grove Street)',
    districtName: 'Los Santos',
    controllingGang: 'GROVE',
    nearVehicleName: 'BMX (Grove Street)',
    activeMission: null,
    activeStageIndex: 0,
    subtitle: {
      speaker: 'Carl Johnson (CJ)',
      text: 'Grove Street — Home. At least it was before I fucked everything up.',
    },
    tagsSprayed: 0,
    totalTags: 6,
    gangWarActive: false,
    gangWarWave: 1,
    gangWarKillsLeft: 0,
    blips: [],
  });

  const cheatBufferRef = useRef(new CheatBuffer());

  const showBanner = useCallback(
    (b: {
      type:
        | 'MISSION_PASSED'
        | 'WASTED'
        | 'BUSTED'
        | 'GANG_WAR'
        | 'RESPRAYED'
        | 'TAG_SPRAYED';
      title: string;
      subtitle: string;
    }) => {
      setBanner(b);
      setTimeout(() => {
        setBanner((current) => (current === b ? null : current));
      }, 4200);
    },
    []
  );

  // Execute a matched GTA:SA Cheat Definition (CCheat::ApplyCheat @ 0x438370)
  const executeCheat = useCallback((cheat: CheatDefinition) => {
    audioEngine.playCheatActivated();
    setCheatToast({ code: cheat.code, description: cheat.description });
    setTimeout(() => {
      setCheatToast(null);
    }, 3600);

    switch (cheat.id) {
      case 'CHEAT_HEALTH_ARMOR_250K':
        setStats((prev) => ({
          ...prev,
          health: 100,
          armor: 100,
          cash: prev.cash + 250000,
        }));
        break;
      case 'CHEAT_WEAPON_SET1':
        setWeaponIdx(2);
        break;
      case 'CHEAT_WEAPON_SET2':
        setWeaponIdx(5);
        break;
      case 'CHEAT_WEAPON_SET3':
        setWeaponIdx(6);
        break;
      case 'CHEAT_JETPACK':
        setJetpackActive((prev) => !prev);
        break;
      case 'CHEAT_INFINITE_HEALTH':
        setGodMode((prev) => !prev);
        break;
      case 'CHEAT_CLEAR_WANTED_LEVEL':
        setStats((prev) => ({ ...prev, wantedStars: 0 }));
        break;
      case 'CHEAT_WANTED_LEVEL_2STARS':
        setStats((prev) => ({
          ...prev,
          wantedStars: Math.min(6, prev.wantedStars + 2),
        }));
        break;
      case 'CHEAT_WANTED_LEVEL_6STARS':
        setStats((prev) => ({ ...prev, wantedStars: 6 }));
        break;
      case 'CHEAT_NEVER_WANTED':
        setNeverWanted((prev) => !prev);
        setStats((prev) => ({ ...prev, wantedStars: 0 }));
        break;
      case 'CHEAT_SPAWN_RHINO':
        setSpawnRequest({ vehicleId: 'RHINO', nonce: Date.now() });
        break;
      case 'CHEAT_SPAWN_HYDRA':
        setSpawnRequest({ vehicleId: 'HYDRA', nonce: Date.now() });
        break;
      case 'CHEAT_SPAWN_HOTRINGA':
        setSpawnRequest({ vehicleId: 'INFERNUS', nonce: Date.now() });
        break;
      case 'CHEAT_ALL_CARS_HAVE_NITRO':
        setAllCarsNitro((prev) => !prev);
        break;
      case 'CHEAT_CARS_FLY':
        setCarsFly((prev) => !prev);
        break;
      case 'CHEAT_MEGAJUMP':
        setMegaJump((prev) => !prev);
        break;
      case 'CHEAT_MAX_MUSCLE':
        setStats((prev) => ({ ...prev, muscle: 1000 }));
        break;
      case 'CHEAT_STOP_GAME_CLOCK_ORANGE_SKY':
        setGameHour(21.0);
        setClockLocked(true);
        setWeather('ORANGE_SUNSET_21');
        break;
      case 'CHEAT_SUNNY_WEATHER':
        setClockLocked(false);
        setWeather('EXTRASUNNY_LA');
        break;
      case 'CHEAT_THUNDER_STORM':
        setWeather('RAINY_LA');
        setTuning((prev) => ({ ...prev, roadWetnessReflections: 0.92 }));
        break;
      default:
        break;
    }
  }, []);

  // Global Keyboard Listener for Cheat Codes, Weapon Cycle (Q/E), & Radio (R)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
          document.activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }

      if (e.code === 'KeyQ') {
        setWeaponIdx((prev) => (prev - 1 + weapons.length) % weapons.length);
      } else if (e.code === 'KeyE') {
        setWeaponIdx((prev) => (prev + 1) % weapons.length);
      } else if (e.code === 'KeyR') {
        setStationIdx((prev) => {
          const next = (prev + 1) % GTA_SA_RADIO_STATIONS.length;
          audioEngine.startRadio(GTA_SA_RADIO_STATIONS[next]);
          return next;
        });
      }

      if (e.key.length === 1 && /^[a-zA-Z0-9]$/.test(e.key)) {
        const matched = cheatBufferRef.current.pushKey(e.key);
        if (matched) {
          executeCheat(matched);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [executeCheat, weapons.length]);

  // Game Clock Progression (1 GTA minute = 1 real second unless locked by OFVIAC)
  useEffect(() => {
    if (clockLocked) return;
    const id = window.setInterval(() => {
      setGameHour((h) => (h + 0.015) % 24);
    }, 1000);
    return () => clearInterval(id);
  }, [clockLocked]);

  const handleQuickSwitchGraphicsMode = (mode: GraphicsModeId) => {
    setTuning((prev) => ({
      ...prev,
      mode,
      pbrClearcoatIntensity:
        mode === 'remastered_next' ? 1.1 : mode === 'pc_1_0' ? 0.35 : 0.15,
      roadWetnessReflections:
        mode === 'remastered_next' ? 0.42 : 0.05,
      ps2RadiosityWarmth:
        mode === 'ps2_2004' ? 0.9 : mode === 'remastered_next' ? 0.45 : 0.05,
    }));
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black select-none">
      {/* 3D WebGL2 World Canvas */}
      <SanAndreasWorldCanvas
        gameHour={gameHour}
        weather={weather}
        tuning={tuning}
        health={stats.health}
        armor={stats.armor}
        cash={stats.cash}
        respect={stats.respect}
        muscle={stats.muscle}
        stamina={stats.stamina}
        wantedStars={stats.wantedStars}
        neverWanted={neverWanted}
        godMode={godMode}
        jetpackActive={jetpackActive}
        megaJump={megaJump}
        carsFly={carsFly}
        allCarsNitro={allCarsNitro}
        currentWeapon={weapons[weaponIdx]}
        spawnRequest={spawnRequest}
        teleportRequest={teleportRequest}
        missionStartRequest={missionStartRequest}
        triggerActionRequest={triggerActionRequest}
        onUpdateStats={setStats}
        onBannerNotification={showBanner}
        onTelemetry={setTelemetry}
      />

      {/* Authentic GTA:SA HUD & Rotating Radar */}
      <GtaHud
        telemetry={telemetry}
        gameHour={gameHour}
        health={stats.health}
        armor={stats.armor}
        cash={stats.cash}
        respect={stats.respect}
        muscle={stats.muscle}
        stamina={stats.stamina}
        wantedStars={stats.wantedStars}
        neverWanted={neverWanted}
        godMode={godMode}
        jetpackActive={jetpackActive}
        currentWeapon={weapons[weaponIdx]}
        weapons={weapons}
        onCycleWeapon={(dir) =>
          setWeaponIdx((prev) => (prev + dir + weapons.length) % weapons.length)
        }
        cheatToast={cheatToast}
        banner={banner}
        graphicsMode={tuning.mode}
        onQuickSwitchGraphicsMode={handleQuickSwitchGraphicsMode}
        activeDrawer={activeDrawer}
        onSetActiveDrawer={setActiveDrawer}
        currentStation={GTA_SA_RADIO_STATIONS[stationIdx]}
        onCycleRadio={() => {
          const next = (stationIdx + 1) % GTA_SA_RADIO_STATIONS.length;
          setStationIdx(next);
          audioEngine.startRadio(GTA_SA_RADIO_STATIONS[next]);
        }}
        muted={muted}
        onToggleMute={() => {
          const next = !muted;
          setMuted(next);
          audioEngine.setMuted(next);
        }}
        onTriggerAction={(action) =>
          setTriggerActionRequest({ action, nonce: Date.now() })
        }
      />

      {/* Studio Engineering, Graphics Tuner, Cheat Deck, Spawner & REA Binary Lab Drawers */}
      <StudioDrawers
        activeDrawer={activeDrawer}
        onClose={() => setActiveDrawer('NONE')}
        gameHour={gameHour}
        onChangeGameHour={setGameHour}
        weather={weather}
        onChangeWeather={setWeather}
        tuning={tuning}
        onChangeTuning={setTuning}
        onSpawnVehicle={(vehicleId) =>
          setSpawnRequest({ vehicleId, nonce: Date.now() })
        }
        onTeleport={(x, y, z) =>
          setTeleportRequest({ x, y, z, nonce: Date.now() })
        }
        onExecuteCheat={executeCheat}
        onStartMission={(missionId) =>
          setMissionStartRequest({ missionId, nonce: Date.now() })
        }
      />
    </main>
  );
}
export default App;
