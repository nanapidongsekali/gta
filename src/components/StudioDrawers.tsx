import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Car,
  Terminal,
  Compass,
  Cpu,
  Upload,
  CheckCircle2,
  MapPin,
  FileCode2,
  Play,
  Sun,
  CloudRain,
  Sunset,
  Wind,
} from 'lucide-react';
import {
  GraphicsTuningConfig,
  WeatherPresetId,
} from '../engine/TimeCycle';
import {
  AUTHENTIC_HANDLING_CFG,
  DEFAULT_HANDLING_TABLE,
  parseHandlingCfg,
} from '../engine/HandlingMgr';
import {
  GTA_SA_CHEAT_TABLE,
  CheatDefinition,
  computeGtaSaCheatJamCrc,
} from '../engine/CheatSystem';
import { GTA_SA_MISSIONS } from '../engine/MissionScripts';
import {
  REA_RECONSTRUCTION_LEDGER,
  STUDIO_ROSTER,
} from '../engine/StudioLedger';
import {
  buildSampleGta3ImgBuffer,
  buildSampleRwDffBuffer,
  inspectPEExecutable,
  parseCOLFile,
  parseIMGArchive,
  parseIPLText,
  parseRWStreamChunks,
  SAMPLE_LAE_IPL,
} from '../engine/BinaryFormats';

interface Props {
  activeDrawer: 'NONE' | 'GRAPHICS' | 'CHEATS' | 'VEHICLES' | 'MISSIONS' | 'STUDIO_REA';
  onClose: () => void;
  gameHour: number;
  onChangeGameHour: (h: number) => void;
  weather: WeatherPresetId;
  onChangeWeather: (w: WeatherPresetId) => void;
  tuning: GraphicsTuningConfig;
  onChangeTuning: (t: GraphicsTuningConfig) => void;
  onSpawnVehicle: (vehicleId: string) => void;
  onTeleport: (x: number, y: number, z: number) => void;
  onExecuteCheat: (cheat: CheatDefinition) => void;
  onStartMission: (missionId: string) => void;
}

export const StudioDrawers: React.FC<Props> = ({
  activeDrawer,
  onClose,
  gameHour,
  onChangeGameHour,
  weather,
  onChangeWeather,
  tuning,
  onChangeTuning,
  onSpawnVehicle,
  onTeleport,
  onExecuteCheat,
  onStartMission,
}) => {
  const [crcProbeInput, setCrcProbeInput] = useState('HESOYAM');
  const [studioTab, setStudioTab] = useState<'ROSTER' | 'LEDGER' | 'BINARY_LAB'>('ROSTER');
  const [binaryLabOutput, setBinaryLabOutput] = useState<string>(() => {
    const imgReport = parseIMGArchive(buildSampleGta3ImgBuffer());
    const dffChunks = parseRWStreamChunks(buildSampleRwDffBuffer());
    return JSON.stringify(
      {
        status: 'REA_LOCAL_VERIFIER_READY',
        authority: 'shipped-artifact (client-side zero-upload)',
        sample_gta3_img_header: imgReport,
        sample_renderware_3_6_dff_chunks: dffChunks,
      },
      null,
      2
    );
  });

  if (activeDrawer === 'NONE') return null;

  const computedProbeHash = computeGtaSaCheatJamCrc(crcProbeInput);
  const matchedCheat = GTA_SA_CHEAT_TABLE.find(
    (c) =>
      c.jamCrcHash === computedProbeHash ||
      c.code === crcProbeInput.toUpperCase().trim()
  );

  const handleLocalFileInspect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (ext === 'cfg') {
        const text = await file.text();
        const parsed = parseHandlingCfg(text);
        setBinaryLabOutput(
          JSON.stringify(
            {
              fileName: file.name,
              byteSize: file.size,
              format: 'GTA:SA cHandlingDataMgr (handling.cfg)',
              vehicleCount: Object.keys(parsed).length,
              sampleRecords: Object.values(parsed).slice(0, 5),
            },
            null,
            2
          )
        );
      } else if (ext === 'ipl' || ext === 'ide' || ext === 'dat') {
        const text = await file.text();
        const placements = parseIPLText(text);
        setBinaryLabOutput(
          JSON.stringify(
            {
              fileName: file.name,
              byteSize: file.size,
              format: 'GTA:SA Item Placement / Definition Table',
              parsedEntriesCount: placements.length,
              entries: placements.slice(0, 12),
            },
            null,
            2
          )
        );
      } else {
        const buf = await file.arrayBuffer();
        if (ext === 'img') {
          const report = parseIMGArchive(buf, 50);
          setBinaryLabOutput(JSON.stringify({ fileName: file.name, ...report }, null, 2));
        } else if (ext === 'dff' || ext === 'txd') {
          const chunks = parseRWStreamChunks(buf, 40);
          setBinaryLabOutput(
            JSON.stringify(
              {
                fileName: file.name,
                byteSize: file.size,
                format: 'RenderWare 3.6 Binary Stream (0x1803FFFF)',
                chunks,
              },
              null,
              2
            )
          );
        } else if (ext === 'col') {
          const col = parseCOLFile(buf);
          setBinaryLabOutput(JSON.stringify({ fileName: file.name, ...col }, null, 2));
        } else if (ext === 'exe') {
          const pe = inspectPEExecutable(buf);
          setBinaryLabOutput(JSON.stringify({ fileName: file.name, ...pe }, null, 2));
        } else {
          setBinaryLabOutput(
            JSON.stringify(
              {
                fileName: file.name,
                byteSize: file.size,
                note: 'Loaded binary buffer locally. Supported deep parsers: .img (VER2), .dff/.txd (RenderWare 3.6), .col (COL3), .ipl/.ide, handling.cfg, gta_sa.exe (PE32).',
              },
              null,
              2
            )
          );
        }
      }
    } catch (err) {
      setBinaryLabOutput(
        JSON.stringify(
          {
            error: err instanceof Error ? err.message : String(err),
            fileName: file.name,
          },
          null,
          2
        )
      );
    }
  };

  return (
    <div className="pointer-events-auto fixed inset-y-0 left-0 z-30 flex items-center p-4 sm:p-6">
      {/* Outer panel uses rounded-3xl (24px) with p-5 (20px), inner cards use rounded-xl (12px) for concentric harmony */}
      <div
        className="flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-zinc-950/95 text-zinc-100 backdrop-blur-xl"
        style={{
          boxShadow:
            '0 24px 64px -12px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.12)',
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2.5">
            {activeDrawer === 'GRAPHICS' && (
              <>
                <Sparkles className="h-5 w-5 text-amber-400 stroke-[2]" />
                <div>
                  <h2 className="text-base font-bold text-white">
                    RenderWare Next — Graphics & TimeCycle Tuner
                  </h2>
                  <p className="text-xs text-zinc-400">
                    CTimeCycle (0x55FEC0) • CPostEffects::Radiosity (0x702080) • PBR Clearcoat
                  </p>
                </div>
              </>
            )}
            {activeDrawer === 'VEHICLES' && (
              <>
                <Car className="h-5 w-5 text-emerald-400 stroke-[2]" />
                <div>
                  <h2 className="text-base font-bold text-white">
                    Vehicle Spawner, Fast Travel & handling.cfg Physics
                  </h2>
                  <p className="text-xs text-zinc-400">
                    cHandlingDataMgr (0xC2B9DC) • sizeof(tHandlingData) = 0xE0
                  </p>
                </div>
              </>
            )}
            {activeDrawer === 'CHEATS' && (
              <>
                <Terminal className="h-5 w-5 text-purple-400 stroke-[2]" />
                <div>
                  <h2 className="text-base font-bold text-white">
                    CCheat Deck & JamCRC Hash Verifier (0x4384D0)
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Type directly on keyboard during gameplay or trigger below
                  </p>
                </div>
              </>
            )}
            {activeDrawer === 'MISSIONS' && (
              <>
                <Compass className="h-5 w-5 text-red-400 stroke-[2]" />
                <div>
                  <h2 className="text-base font-bold text-white">
                    Main.scm Storyline Mission Selector (CRunningScript @ 0x469F00)
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Launch Los Santos & Area 69 missions with authentic GXT objectives
                  </p>
                </div>
              </>
            )}
            {activeDrawer === 'STUDIO_REA' && (
              <>
                <Cpu className="h-5 w-5 text-sky-400 stroke-[2]" />
                <div>
                  <h2 className="text-base font-bold text-white">
                    OpenSA Game Studio Command & REA Binary Lab
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Engineering Leadership • Obligation Ledger • Private Licensed Asset Loader
                  </p>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-[transform,background-color,color] duration-150 hover:bg-white/10 hover:text-white active:scale-[0.96]"
          >
            <X className="h-5 w-5 stroke-[2]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. GRAPHICS TUNER DRAWER */}
          {activeDrawer === 'GRAPHICS' && (
            <div className="space-y-5">
              {/* Pipeline Mode Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(
                  [
                    {
                      id: 'ps2_2004',
                      title: 'PS2 Original (2004)',
                      desc: 'Warm dual-pass Amber Radiosity & classic 2004 Los Santos smog haze.',
                    },
                    {
                      id: 'pc_1_0',
                      title: 'PC v1.0 US (2005)',
                      desc: 'Clean RenderWare 3.6 neutral color balance & crisp stencil look.',
                    },
                    {
                      id: 'remastered_next',
                      title: 'Remastered Next-Gen',
                      desc: 'PBR metallic clearcoat paint, wet road reflections & ACES Filmic.',
                    },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onChangeTuning({ ...tuning, mode: m.id })}
                    className={`flex flex-col items-start rounded-xl p-3.5 text-left transition-[transform,background-color,border-color] duration-150 active:scale-[0.96] border ${
                      tuning.mode === m.id
                        ? 'border-amber-400 bg-amber-500/15'
                        : 'border-white/10 bg-zinc-900/70 hover:bg-zinc-900'
                    }`}
                  >
                    <span className="text-xs font-bold text-white">{m.title}</span>
                    <span className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                      {m.desc}
                    </span>
                  </button>
                ))}
              </div>

              {/* Weather Presets */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  CTimeCycle Weather Preset (0xB7C3C8)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {(
                    [
                      { id: 'EXTRASUNNY_LA', label: 'Extra Sunny LA', icon: Sun },
                      { id: 'SUNNY_LA', label: 'Sunny Smog', icon: Sun },
                      { id: 'ORANGE_SUNSET_21', label: '21:00 Orange Sky', icon: Sunset },
                      { id: 'RAINY_LA', label: 'Thunderstorm', icon: CloudRain },
                      { id: 'SANDSTORM_DESERT', label: 'LV Sandstorm', icon: Wind },
                    ] as const
                  ).map((w) => {
                    const Icon = w.icon;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => onChangeWeather(w.id)}
                        className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition-[transform,background-color] duration-150 active:scale-[0.96] ${
                          weather === w.id
                            ? 'bg-amber-400 text-zinc-950'
                            : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 stroke-[2]" />
                        <span>{w.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-zinc-900/75 p-4 border border-white/10">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-zinc-300">Time of Day (ms_nGameClockHours)</span>
                    <span className="font-mono text-amber-400 [font-variant-numeric:tabular-nums]">
                      {String(Math.floor(gameHour)).padStart(2, '0')}:
                      {String(Math.floor((gameHour % 1) * 60)).padStart(2, '0')}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={23.9}
                    step={0.1}
                    value={gameHour}
                    onChange={(e) => onChangeGameHour(parseFloat(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-zinc-300">PBR Vehicle Clearcoat Gloss</span>
                    <span className="font-mono text-amber-400 [font-variant-numeric:tabular-nums]">
                      {Math.round(tuning.pbrClearcoatIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.05}
                    value={tuning.pbrClearcoatIntensity}
                    onChange={(e) =>
                      onChangeTuning({
                        ...tuning,
                        pbrClearcoatIntensity: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-amber-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-zinc-300">Wet Asphalt Road Reflections</span>
                    <span className="font-mono text-amber-400 [font-variant-numeric:tabular-nums]">
                      {Math.round(tuning.roadWetnessReflections * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={tuning.roadWetnessReflections}
                    onChange={(e) =>
                      onChangeTuning({
                        ...tuning,
                        roadWetnessReflections: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-amber-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-zinc-300">PS2 Radiosity Golden Warmth</span>
                    <span className="font-mono text-amber-400 [font-variant-numeric:tabular-nums]">
                      {Math.round(tuning.ps2RadiosityWarmth * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={tuning.ps2RadiosityWarmth}
                    onChange={(e) =>
                      onChangeTuning({
                        ...tuning,
                        ps2RadiosityWarmth: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-amber-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-zinc-300">LOD Draw Distance Multiplier</span>
                    <span className="font-mono text-amber-400 [font-variant-numeric:tabular-nums]">
                      {tuning.drawDistanceMultiplier.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1.0}
                    max={4.0}
                    step={0.1}
                    value={tuning.drawDistanceMultiplier}
                    onChange={(e) =>
                      onChangeTuning({
                        ...tuning,
                        drawDistanceMultiplier: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-amber-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium mb-1">
                    <span className="text-zinc-300">Widescreen Field of View (FOV)</span>
                    <span className="font-mono text-amber-400 [font-variant-numeric:tabular-nums]">
                      {tuning.fovDegrees}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={55}
                    max={90}
                    step={1}
                    value={tuning.fovDegrees}
                    onChange={(e) =>
                      onChangeTuning({
                        ...tuning,
                        fovDegrees: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full accent-amber-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. VEHICLES & HANDLING.CFG DRAWER */}
          {activeDrawer === 'VEHICLES' && (
            <div className="space-y-5">
              {/* Fast Travel Landmarks */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  San Andreas Landmark Fast-Travel Teleporter
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: 'Grove St Cul-de-Sac', x: 0, y: 0, z: -28 },
                    { label: 'Idlewood Pay ’n’ Spray', x: -48, y: 0, z: 138 },
                    { label: 'Cluckin’ Bell Drive-Thru', x: 52, y: 0, z: 158 },
                    { label: 'Glen Park Pond', x: 135, y: 0, z: 12 },
                    { label: 'Downtown LS Tower', x: -155, y: 0, z: -45 },
                    { label: 'Santa Maria Beach', x: -205, y: 0, z: 185 },
                  ].map((loc) => (
                    <button
                      key={loc.label}
                      type="button"
                      onClick={() => {
                        onTeleport(loc.x, loc.y, loc.z);
                        onClose();
                      }}
                      className="flex min-h-[40px] items-center gap-2 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-200 border border-white/10 transition-[transform,background-color] duration-150 hover:bg-zinc-800 active:scale-[0.96]"
                    >
                      <MapPin className="h-3.5 w-3.5 text-emerald-400 stroke-[2]" />
                      <span className="truncate">{loc.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Vehicle Spawner Grid */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                  Spawn Authentic Vehicle (cHandlingDataMgr @ 0xC2B9DC)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {Object.values(DEFAULT_HANDLING_TABLE).map((v) => (
                    <button
                      key={v.identifier}
                      type="button"
                      onClick={() => {
                        onSpawnVehicle(v.identifier);
                        onClose();
                      }}
                      className="flex items-center justify-between rounded-xl bg-zinc-900/90 p-3 text-left border border-white/10 transition-[transform,background-color,border-color] duration-150 hover:border-emerald-400/60 hover:bg-zinc-900 active:scale-[0.96]"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full border border-white/30"
                            style={{ backgroundColor: v.primaryColor }}
                          />
                          <span className="text-xs font-bold text-white">
                            {v.displayName}
                          </span>
                          <span className="font-mono text-[10px] text-zinc-400">
                            ID {v.modelId}
                          </span>
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-zinc-400 [font-variant-numeric:tabular-nums]">
                          {v.fMaxVelocity} km/h • {v.fMass} kg • {v.nDriveType}WD •{' '}
                          {v.nNumberOfGears} Gears
                        </div>
                      </div>
                      <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                        Spawn
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Raw handling.cfg excerpt */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Active data/handling.cfg Table
                </h3>
                <pre className="max-h-36 overflow-x-auto rounded-xl bg-black/80 p-3 font-mono text-[10px] text-emerald-300 border border-white/10">
                  {AUTHENTIC_HANDLING_CFG.trim()}
                </pre>
              </div>
            </div>
          )}

          {/* 3. CHEAT DECK & JAMCRC HASH VERIFIER */}
          {activeDrawer === 'CHEATS' && (
            <div className="space-y-4">
              {/* Interactive JamCRC Hash Calculator */}
              <div className="rounded-2xl bg-zinc-900/90 p-4 border border-purple-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                    CKeyGen::GetKey (0x53CF00) Live JamCRC Hash Probe
                  </span>
                  <span className="font-mono text-xs text-zinc-400">
                    m_aCheatHashKeys @ 0x8A5CC8
                  </span>
                </div>
                <div className="mt-2.5 flex items-center gap-2">
                  <input
                    type="text"
                    value={crcProbeInput}
                    onChange={(e) => setCrcProbeInput(e.target.value)}
                    placeholder="Type any GTA:SA cheat code (e.g. HESOYAM)..."
                    className="flex-1 rounded-xl bg-black/80 px-3.5 py-2 font-mono text-sm uppercase text-white border border-white/15 focus:border-purple-400 focus:outline-none"
                  />
                  <div className="rounded-xl bg-black/80 px-3.5 py-2 font-mono text-xs text-amber-400 border border-white/10 [font-variant-numeric:tabular-nums]">
                    0x{computedProbeHash.toString(16).toUpperCase().padStart(8, '0')}
                  </div>
                </div>
                {matchedCheat && (
                  <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-300">
                    <span>
                      Matched <strong>{matchedCheat.methodName}</strong> ({matchedCheat.exeAddress})
                    </span>
                    <button
                      type="button"
                      onClick={() => onExecuteCheat(matchedCheat)}
                      className="rounded-md bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-zinc-950 transition-[transform] duration-150 active:scale-[0.96]"
                    >
                      Trigger Now
                    </button>
                  </div>
                )}
              </div>

              {/* All Cheats List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {GTA_SA_CHEAT_TABLE.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onExecuteCheat(c)}
                    className="flex flex-col justify-between rounded-xl bg-zinc-900/85 p-3 text-left border border-white/10 transition-[transform,background-color,border-color] duration-150 hover:border-purple-400/60 hover:bg-zinc-900 active:scale-[0.96]"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono text-xs font-black text-amber-400">
                        {c.code}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400 [font-variant-numeric:tabular-nums]">
                        0x{c.jamCrcHash.toString(16).toUpperCase().padStart(8, '0')}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-zinc-200">
                      {c.description}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                      <span>{c.methodName}</span>
                      <span>{c.exeAddress}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. MISSIONS (MAIN.SCM) DRAWER */}
          {activeDrawer === 'MISSIONS' && (
            <div className="space-y-3">
              {GTA_SA_MISSIONS.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-zinc-900/90 p-4 border border-white/10"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-400 font-mono text-xs font-black text-zinc-950">
                        {m.blipCode}
                      </span>
                      <h3 className="text-sm font-bold text-white">{m.title}</h3>
                      <span className="font-mono text-[11px] text-zinc-400">
                        SCM {m.scmOffsetHex}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-zinc-300">
                      {m.description}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] font-semibold [font-variant-numeric:tabular-nums]">
                      <span className="text-emerald-400">
                        Reward: +${m.rewardCash.toLocaleString()}
                      </span>
                      <span className="text-amber-400">
                        Respect +{m.rewardRespect}
                      </span>
                      <span className="text-zinc-400">
                        {m.stages.length} Checkpoints
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onStartMission(m.id);
                      onClose();
                    }}
                    className="flex min-h-[40px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-red-500 px-4 py-2 text-xs font-bold text-white transition-[transform,background-color] duration-150 hover:bg-red-400 active:scale-[0.96]"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Start Mission</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 5. STUDIO & REA REVERSE-ENGINEERING LAB */}
          {activeDrawer === 'STUDIO_REA' && (
            <div className="space-y-4">
              {/* Sub-navigation tabs */}
              <div className="flex items-center gap-1.5 rounded-xl bg-zinc-900 p-1 border border-white/10">
                {(
                  [
                    { id: 'ROSTER', label: 'Studio Engineering Roster' },
                    { id: 'LEDGER', label: 'REA Obligation Ledger (gta_sa.exe)' },
                    { id: 'BINARY_LAB', label: 'Private Licensed Asset Inspector' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setStudioTab(t.id)}
                    className={`flex-1 min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.96] ${
                      studioTab === t.id
                        ? 'bg-sky-500 text-zinc-950'
                        : 'text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {studioTab === 'ROSTER' && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-sky-500/10 p-3.5 border border-sky-500/25 text-xs text-sky-200 leading-relaxed">
                    <strong>OpenSA Studio Division:</strong> Operating as a full game engineering organization overseeing clean-room reconstruction of <code>gta_sa.exe</code> v1.0 US with 99.9% behavioral parity and Next-Gen RenderWare visual tuning for private, non-commercial use.
                  </div>
                  {STUDIO_ROSTER.map((member) => (
                    <div
                      key={member.id}
                      className="rounded-xl bg-zinc-900/90 p-3.5 border border-white/10 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-white">
                            {member.roleTitle}
                          </span>
                          <span className="ml-2 text-xs text-sky-400 font-medium">
                            — {member.callsign}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          {member.signOffStatus}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {member.technicalBrief}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {member.ownedSubsystems.map((sub) => (
                          <span
                            key={sub}
                            className="rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-zinc-400 border border-white/5"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {studioTab === 'LEDGER' && (
                <div className="space-y-3">
                  {REA_RECONSTRUCTION_LEDGER.map((ob) => (
                    <div
                      key={ob.obligationId}
                      className="rounded-xl bg-zinc-900/90 p-4 border border-white/10 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-sky-400">
                            {ob.obligationId}
                          </span>
                          <h4 className="text-sm font-bold text-white">
                            {ob.subsystemName}
                          </h4>
                        </div>
                        <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 font-mono text-xs font-bold text-emerald-300 [font-variant-numeric:tabular-nums]">
                          {ob.parityScore.toFixed(1)}% Parity • {ob.exeVirtualAddress}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400">
                        Symbol: <span className="text-zinc-200">{ob.originalSymbol}</span> • Data:{' '}
                        <span className="text-zinc-200">{ob.dataSegmentAddress}</span>
                      </div>
                      <p className="text-xs text-zinc-300">
                        <strong className="text-zinc-100">Original (2004):</strong>{' '}
                        {ob.originalBehavior}
                      </p>
                      <p className="text-xs text-emerald-300">
                        <strong>Remastered Tuning (2026):</strong>{' '}
                        {ob.remasteredEnhancement}
                      </p>
                      <pre className="overflow-x-auto rounded-lg bg-black/85 p-2.5 font-mono text-[10px] text-amber-300 border border-white/10">
                        {ob.decompiledSnippet}
                      </pre>
                    </div>
                  ))}
                </div>
              )}

              {studioTab === 'BINARY_LAB' && (
                <div className="space-y-3.5">
                  <div className="rounded-xl bg-zinc-900/90 p-4 border border-white/10 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400">
                          Private Licensed Game File Inspector (100% Client-Side)
                        </h4>
                        <p className="mt-1 text-xs text-zinc-300 leading-relaxed">
                          Drop any file from your licensed local copy of{' '}
                          <code>GTA San Andreas</code> (<code>gta3.img</code>,{' '}
                          <code>.dff</code>, <code>.txd</code>, <code>.col</code>,{' '}
                          <code>LAe.ipl</code>, <code>handling.cfg</code>, or{' '}
                          <code>gta_sa.exe</code>) to inspect its binary chunks and headers locally without uploading private files.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl bg-sky-500 px-3.5 py-2 text-xs font-bold text-zinc-950 transition-[transform,background-color] duration-150 hover:bg-sky-400 active:scale-[0.96]">
                        <Upload className="h-4 w-4 stroke-[2]" />
                        <span>Inspect Local GTA:SA File</span>
                        <input
                          type="file"
                          onChange={handleLocalFileInspect}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          const imgReport = parseIMGArchive(buildSampleGta3ImgBuffer());
                          setBinaryLabOutput(JSON.stringify(imgReport, null, 2));
                        }}
                        className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 transition-[transform,background-color] duration-150 hover:bg-zinc-700 active:scale-[0.96]"
                      >
                        <FileCode2 className="h-3.5 w-3.5 text-amber-400" />
                        <span>Sample VER2 gta3.img</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const chunks = parseRWStreamChunks(buildSampleRwDffBuffer());
                          setBinaryLabOutput(JSON.stringify(chunks, null, 2));
                        }}
                        className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 transition-[transform,background-color] duration-150 hover:bg-zinc-700 active:scale-[0.96]"
                      >
                        <FileCode2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Sample RenderWare 3.6 .dff</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const ipl = parseIPLText(SAMPLE_LAE_IPL);
                          setBinaryLabOutput(JSON.stringify(ipl, null, 2));
                        }}
                        className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 transition-[transform,background-color] duration-150 hover:bg-zinc-700 active:scale-[0.96]"
                      >
                        <FileCode2 className="h-3.5 w-3.5 text-purple-400" />
                        <span>Sample Grove St LAe.ipl</span>
                      </button>
                    </div>
                  </div>

                  <pre className="max-h-72 overflow-auto rounded-xl bg-black/90 p-4 font-mono text-[11px] text-emerald-300 border border-white/10">
                    {binaryLabOutput}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
