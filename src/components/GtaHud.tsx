import React from 'react';
import {
  Crosshair,
  Radio,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  Cpu,
  Terminal,
  Car,
  Compass,
  Zap,
  Map,
} from 'lucide-react';
import { TelemetrySnapshot, WeaponSlot } from './SanAndreasWorldCanvas';
import { GraphicsModeId } from '../engine/TimeCycle';
import { RadioStationInfo } from '../engine/AudioEngine';
import {
  SAN_ANDREAS_ROAD_NETWORK,
  worldToCanonicalSaCoords,
} from '../engine/SanAndreasMapData';

interface Props {
  telemetry: TelemetrySnapshot;
  gameHour: number;
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
  currentWeapon: WeaponSlot;
  weapons: WeaponSlot[];
  onCycleWeapon: (dir: 1 | -1) => void;
  cheatToast: { code: string; description: string } | null;
  banner: {
    type: 'MISSION_PASSED' | 'WASTED' | 'BUSTED' | 'GANG_WAR' | 'RESPRAYED' | 'TAG_SPRAYED';
    title: string;
    subtitle: string;
  } | null;
  graphicsMode: GraphicsModeId;
  onQuickSwitchGraphicsMode: (mode: GraphicsModeId) => void;
  activeDrawer: 'NONE' | 'GRAPHICS' | 'CHEATS' | 'VEHICLES' | 'MISSIONS' | 'STUDIO_REA';
  onSetActiveDrawer: (
    drawer: 'NONE' | 'GRAPHICS' | 'CHEATS' | 'VEHICLES' | 'MISSIONS' | 'STUDIO_REA'
  ) => void;
  onOpenFullMap: () => void;
  customWaypoint: [number, number] | null;
  currentStation: RadioStationInfo;
  onCycleRadio: () => void;
  muted: boolean;
  onToggleMute: () => void;
  onTriggerAction: (action: 'FIRE' | 'ENTER_EXIT' | 'HYDRAULICS' | 'NITRO') => void;
}

export const GtaHud: React.FC<Props> = ({
  telemetry,
  gameHour,
  health,
  armor,
  cash,
  respect,
  muscle,
  wantedStars,
  neverWanted,
  godMode,
  jetpackActive,
  currentWeapon,
  onCycleWeapon,
  cheatToast,
  banner,
  graphicsMode,
  onQuickSwitchGraphicsMode,
  activeDrawer,
  onSetActiveDrawer,
  onOpenFullMap,
  customWaypoint,
  currentStation,
  onCycleRadio,
  muted,
  onToggleMute,
  onTriggerAction,
}) => {
  const hours = Math.floor(((gameHour % 24) + 24) % 24);
  const minutes = Math.floor((gameHour % 1) * 60);
  const clockStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const cashStr = `$${String(Math.max(0, Math.floor(cash))).padStart(8, '0')}`;
  const saCoords = worldToCanonicalSaCoords(
    telemetry.playerX,
    telemetry.playerY,
    telemetry.playerZ
  );

  const renderGxtFormattedText = (raw: string) => {
    const parts = raw.split(/(~[ygpbwr]~)/g);
    let currentColor = 'text-zinc-100';
    return parts.map((part, idx) => {
      if (part === '~y~') {
        currentColor = 'text-amber-400 font-semibold';
        return null;
      }
      if (part === '~g~') {
        currentColor = 'text-emerald-400 font-semibold';
        return null;
      }
      if (part === '~p~') {
        currentColor = 'text-purple-400 font-semibold';
        return null;
      }
      if (part === '~b~') {
        currentColor = 'text-sky-400 font-semibold';
        return null;
      }
      if (part === '~r~') {
        currentColor = 'text-red-400 font-semibold';
        return null;
      }
      if (part === '~w~') {
        currentColor = 'text-zinc-100';
        return null;
      }
      return (
        <span key={idx} className={currentColor}>
          {part}
        </span>
      );
    });
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-6">
      {/* TOP BAR */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3 max-w-2xl">
          <div
            className="pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-2xl bg-zinc-950/85 p-1.5 backdrop-blur-md"
            style={{
              boxShadow:
                '0 12px 32px -4px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            }}
          >
            <button
              type="button"
              onClick={onOpenFullMap}
              className="flex min-h-[40px] items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 px-3.5 py-2 text-xs font-bold text-emerald-300 transition-[transform,background-color] duration-150 hover:bg-emerald-500/30 active:scale-[0.96]"
            >
              <Map className="h-4 w-4 stroke-[2]" />
              <span>Full Map [M]</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onSetActiveDrawer(activeDrawer === 'GRAPHICS' ? 'NONE' : 'GRAPHICS')
              }
              className={`flex min-h-[40px] items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.96] ${
                activeDrawer === 'GRAPHICS'
                  ? 'bg-amber-500 text-zinc-950'
                  : 'text-zinc-200 hover:bg-white/10'
              }`}
            >
              <Sparkles className="h-4 w-4 stroke-[2]" />
              <span>Graphics Tuner</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onSetActiveDrawer(activeDrawer === 'VEHICLES' ? 'NONE' : 'VEHICLES')
              }
              className={`flex min-h-[40px] items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.96] ${
                activeDrawer === 'VEHICLES'
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'text-zinc-200 hover:bg-white/10'
              }`}
            >
              <Car className="h-4 w-4 stroke-[2]" />
              <span>Vehicles & Handling</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onSetActiveDrawer(activeDrawer === 'CHEATS' ? 'NONE' : 'CHEATS')
              }
              className={`flex min-h-[40px] items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.96] ${
                activeDrawer === 'CHEATS'
                  ? 'bg-purple-500 text-zinc-950'
                  : 'text-zinc-200 hover:bg-white/10'
              }`}
            >
              <Terminal className="h-4 w-4 stroke-[2]" />
              <span>Cheats (JamCRC)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onSetActiveDrawer(activeDrawer === 'MISSIONS' ? 'NONE' : 'MISSIONS')
              }
              className={`flex min-h-[40px] items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.96] ${
                activeDrawer === 'MISSIONS'
                  ? 'bg-red-500 text-white'
                  : 'text-zinc-200 hover:bg-white/10'
              }`}
            >
              <Compass className="h-4 w-4 stroke-[2]" />
              <span>Missions (SCM)</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onSetActiveDrawer(
                  activeDrawer === 'STUDIO_REA' ? 'NONE' : 'STUDIO_REA'
                )
              }
              className={`flex min-h-[40px] items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.96] ${
                activeDrawer === 'STUDIO_REA'
                  ? 'bg-sky-500 text-zinc-950'
                  : 'text-zinc-200 hover:bg-white/10'
              }`}
            >
              <Cpu className="h-4 w-4 stroke-[2]" />
              <span>Studio & REA Lab</span>
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              title={muted ? 'Unmute Audio Engine' : 'Mute Audio Engine'}
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl text-zinc-300 transition-[transform,background-color] duration-150 hover:bg-white/10 active:scale-[0.96]"
            >
              {muted ? (
                <VolumeX className="h-4 w-4 stroke-[1.75]" />
              ) : (
                <Volume2 className="h-4 w-4 stroke-[1.75] text-emerald-400" />
              )}
            </button>
          </div>

          <div
            className="pointer-events-auto inline-flex self-start items-center gap-1 rounded-xl bg-zinc-950/80 p-1 backdrop-blur-md"
            style={{
              boxShadow: '0 4px 16px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08)',
            }}
          >
            <span className="px-2.5 text-[11px] font-medium text-zinc-400">
              Render Pipeline:
            </span>
            {(
              [
                { id: 'ps2_2004', label: 'PS2 2004 (Amber Radiosity)' },
                { id: 'pc_1_0', label: 'PC v1.0 (2005)' },
                { id: 'remastered_next', label: 'Remastered Next-Gen (PBR)' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onQuickSwitchGraphicsMode(preset.id)}
                className={`min-h-[32px] rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.96] ${
                  graphicsMode === preset.id
                    ? 'bg-amber-400 text-zinc-950'
                    : 'text-zinc-300 hover:bg-white/10'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {cheatToast && (
            <div
              className="w-72 rounded-lg bg-black/85 px-4 py-3 text-zinc-100"
              style={{
                boxShadow: '0 8px 24px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.14)',
              }}
            >
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Cheat activated ({cheatToast.code})
              </div>
              <div className="mt-0.5 text-xs leading-snug text-zinc-200">
                {cheatToast.description}
              </div>
            </div>
          )}

          {telemetry.activeMission && (
            <div
              className="max-w-md rounded-xl bg-zinc-950/85 px-4 py-3 backdrop-blur-md"
              style={{
                boxShadow: '0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(250, 204, 21, 0.28)',
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Mission: {telemetry.activeMission.title}
                </span>
                <span className="font-mono text-[10px] text-zinc-400 [font-variant-numeric:tabular-nums]">
                  SCM {telemetry.activeMission.scmOffsetHex}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed">
                {renderGxtFormattedText(
                  telemetry.activeMission.stages[telemetry.activeStageIndex]?.objectiveText ||
                    ''
                )}
              </p>
            </div>
          )}
        </div>

        {/* Top-Right Vital HUD */}
        <div
          className="pointer-events-auto flex flex-col items-end gap-2 rounded-2xl bg-zinc-950/75 p-3.5 backdrop-blur-md"
          style={{
            boxShadow:
              '0 12px 32px -4px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => onCycleWeapon(1)}
              title="Click to cycle weapon (or press Q/E)"
              className="group relative flex h-16 w-16 flex-col items-center justify-between rounded-xl border-2 border-zinc-300/80 bg-zinc-900/90 p-1.5 transition-[transform,border-color] duration-150 hover:border-amber-400 active:scale-[0.96]"
            >
              <Crosshair className="h-6 w-6 text-amber-400 stroke-[2]" />
              <span className="text-[10px] font-bold uppercase tracking-tight text-zinc-100">
                {currentWeapon.name}
              </span>
              <span className="font-mono text-[10px] font-semibold text-zinc-300 [font-variant-numeric:tabular-nums]">
                {currentWeapon.id === 'UNARMED'
                  ? 'FIST'
                  : `${currentWeapon.clipAmmo}-${currentWeapon.totalAmmo}`}
              </span>
            </button>

            <div className="flex flex-col items-end gap-1.5">
              <div
                className="font-pricedown text-3xl font-black tracking-wider text-zinc-100 [font-variant-numeric:tabular-nums]"
                style={{
                  textShadow:
                    '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
                }}
              >
                {clockStr}
              </div>

              <div className="h-3 w-36 overflow-hidden rounded-sm border-2 border-black bg-zinc-800">
                <div
                  className="h-full bg-zinc-100 transition-[width] duration-150"
                  style={{ width: `${Math.min(100, Math.max(0, armor))}%` }}
                />
              </div>

              <div className="h-3.5 w-36 overflow-hidden rounded-sm border-2 border-black bg-red-950">
                <div
                  className="h-full bg-red-600 transition-[width] duration-150"
                  style={{ width: `${Math.min(100, Math.max(0, health))}%` }}
                />
              </div>
            </div>
          </div>

          <div
            className="font-pricedown text-3xl font-black tracking-wider text-[#36882c] [font-variant-numeric:tabular-nums]"
            style={{
              textShadow:
                '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
            }}
          >
            {cashStr}
          </div>

          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5, 6].map((starIdx) => {
              const active = starIdx <= wantedStars && !neverWanted;
              return (
                <Star
                  key={starIdx}
                  className={`h-5 w-5 transition-[transform,color] duration-150 ${
                    active
                      ? 'fill-amber-400 text-black stroke-[1.75] scale-110'
                      : 'fill-zinc-900/60 text-zinc-700 stroke-[1.5]'
                  }`}
                />
              );
            })}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center justify-end gap-1.5 text-[11px] font-semibold [font-variant-numeric:tabular-nums]">
            <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-emerald-300">
              Respect {respect}/1000
            </span>
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-amber-300">
              Muscle {muscle}
            </span>
            <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-zinc-300">
              Tags {telemetry.tagsSprayed}/{telemetry.totalTags}
            </span>
            <span className="rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-emerald-400">
              {telemetry.fps} FPS
            </span>
            {godMode && (
              <span className="rounded-md bg-purple-500/30 px-2 py-0.5 text-purple-200">
                BAGUVIX
              </span>
            )}
            {jetpackActive && (
              <span className="rounded-md bg-orange-500/30 px-2 py-0.5 text-orange-200">
                JETPACK
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CENTER OVERLAY */}
      {banner && (
        <div className="pointer-events-none flex flex-col items-center justify-center text-center">
          <div
            className={`font-pricedown text-5xl sm:text-6xl font-black uppercase tracking-wider ${
              banner.type === 'WASTED' || banner.type === 'GANG_WAR'
                ? 'text-red-500'
                : banner.type === 'RESPRAYED'
                ? 'text-sky-400'
                : 'text-amber-400'
            }`}
            style={{
              textShadow:
                '-3px -3px 0 #000, 3px -3px 0 #000, -3px 3px 0 #000, 3px 3px 0 #000, 0 12px 30px rgba(0,0,0,0.9)',
            }}
          >
            {banner.title}
          </div>
          <div
            className="mt-2 rounded-xl bg-black/80 px-5 py-2 text-base font-bold text-zinc-100"
            style={{
              boxShadow: '0 8px 24px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.12)',
            }}
          >
            {banner.subtitle}
          </div>
        </div>
      )}

      {/* BOTTOM BAR */}
      <div className="flex items-end justify-between gap-4">
        {/* Bottom-Left: Authentic Rotating Cartographic Radar (CRadar::DrawRadarMap @ 0x586880) */}
        <div className="flex items-end gap-3">
          <div
            onClick={onOpenFullMap}
            title="Click to open Full-Screen San Andreas Map [M]"
            className={`pointer-events-auto cursor-pointer relative h-44 w-44 sm:h-48 sm:w-48 rounded-full border-4 ${
              telemetry.gangWarActive
                ? 'border-red-500 animate-pulse'
                : 'border-zinc-900'
            } bg-[#1c2b21] overflow-hidden transition-[transform] duration-150 active:scale-[0.96]`}
            style={{
              boxShadow:
                '0 12px 32px rgba(0,0,0,0.85), inset 0 0 24px rgba(0,0,0,0.75), 0 0 0 2px rgba(255,255,255,0.22)',
            }}
          >
            {/* Gang Territory Color Tint */}
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                background:
                  telemetry.controllingGang === 'GROVE'
                    ? 'radial-gradient(circle, #22c55e 0%, transparent 75%)'
                    : telemetry.controllingGang === 'BALLAS'
                    ? 'radial-gradient(circle, #a855f7 0%, transparent 75%)'
                    : telemetry.controllingGang === 'VAGOS'
                    ? 'radial-gradient(circle, #eab308 0%, transparent 75%)'
                    : 'radial-gradient(circle, #38bdf8 0%, transparent 75%)',
              }}
            />

            {/* Real-Time Rotating Vector Cartography centered on CJ */}
            <svg
              viewBox={`${telemetry.playerX - 135} ${telemetry.playerZ - 135} 270 270`}
              className="absolute inset-0 h-full w-full"
              style={{
                transform: `rotate(${(telemetry.headingRad * 180) / Math.PI}deg)`,
              }}
            >
              {/* Glen Park Pond on Radar */}
              <circle cx={45} cy={-115} r={22} fill="#0284c7" />

              {/* Roads, Freeways, Storm Drain Canal & Rail */}
              {SAN_ANDREAS_ROAD_NETWORK.map((road) => {
                const pointsAttr = road.points
                  .map(([px, pz]) => `${px},${pz}`)
                  .join(' ');
                const strokeColor =
                  road.kind === 'canal'
                    ? '#0284c7'
                    : road.kind === 'freeway'
                    ? '#eab308'
                    : road.kind === 'rail'
                    ? '#a16207'
                    : '#71717a';
                return (
                  <polyline
                    key={road.id}
                    points={pointsAttr}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={road.width * 0.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}

              {/* Iconic East-Facing Grove Street Cul-de-Sac Ring at (28, 0) */}
              <circle
                cx={28}
                cy={0}
                r={18}
                fill="#3f3f46"
                stroke="#22c55e"
                strokeWidth="3.5"
              />
              <circle cx={28} cy={0} r={6.5} fill="#15803d" />

              {/* Custom GPS Waypoint Line */}
              {customWaypoint && (
                <g>
                  <line
                    x1={telemetry.playerX}
                    y1={telemetry.playerZ}
                    x2={customWaypoint[0]}
                    y2={customWaypoint[1]}
                    stroke="#ef4444"
                    strokeWidth="4"
                    strokeDasharray="7 5"
                  />
                  <circle
                    cx={customWaypoint[0]}
                    cy={customWaypoint[1]}
                    r={9}
                    fill="#ef4444"
                    stroke="#000"
                    strokeWidth="3"
                  />
                </g>
              )}
            </svg>

            {/* Clamped Edge & Interior Blips */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                transform: `rotate(${(telemetry.headingRad * 180) / Math.PI}deg)`,
              }}
            >
              {telemetry.blips.map((b) => {
                const dx = (b.x - telemetry.playerX) * 0.55;
                const dz = (b.z - telemetry.playerZ) * 0.55;
                const clampedDist = Math.min(76, Math.hypot(dx, dz));
                const angle = Math.atan2(dx, -dz);
                const rx = Math.sin(angle) * clampedDist;
                const ry = -Math.cos(angle) * clampedDist;

                return (
                  <div
                    key={b.id}
                    title={b.label}
                    className="absolute left-1/2 top-1/2 flex h-4 w-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-sm text-[9px] font-black text-zinc-950 shadow"
                    style={{
                      backgroundColor: b.color,
                      transform: `translate(calc(-50% + ${rx}px), calc(-50% + ${ry}px)) rotate(${-(
                        (telemetry.headingRad * 180) /
                        Math.PI
                      )}deg)`,
                    }}
                  >
                    {b.code || ''}
                  </div>
                );
              })}
            </div>

            {/* North 'N' Radar Pin */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 rounded bg-black px-1.5 py-0.5 text-[10px] font-black text-white shadow">
              N
            </div>

            {/* Center Player Arrow */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div
                className="h-0 w-0"
                style={{
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderBottom: '12px solid #ffffff',
                  filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))',
                }}
              />
            </div>

            {/* Canonical GTA:SA Coordinates Readout */}
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded bg-black/80 px-2 py-0.5 font-mono text-[9px] text-emerald-300 [font-variant-numeric:tabular-nums]">
              SA {saCoords[0]}, {saCoords[1]}
            </div>
          </div>

          {/* Quick Action Tactile Controls */}
          <div className="pointer-events-auto hidden md:flex flex-col gap-1.5">
            {telemetry.nearVehicleName && !telemetry.inVehicle && (
              <button
                type="button"
                onClick={() => onTriggerAction('ENTER_EXIT')}
                className="flex min-h-[40px] items-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-zinc-950 shadow-lg transition-[transform,background-color] duration-150 hover:bg-emerald-400 active:scale-[0.96]"
              >
                <Car className="h-4 w-4 stroke-[2]" />
                <span>Enter {telemetry.nearVehicleName} [F]</span>
              </button>
            )}
            {telemetry.inVehicle && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onTriggerAction('ENTER_EXIT')}
                  className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-zinc-900/90 px-3 py-2 text-xs font-semibold text-zinc-100 border border-white/10 transition-[transform,background-color] duration-150 hover:bg-zinc-800 active:scale-[0.96]"
                >
                  <span>Exit Vehicle [F]</span>
                </button>
                <button
                  type="button"
                  onClick={() => onTriggerAction('HYDRAULICS')}
                  className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-amber-500/90 px-3 py-2 text-xs font-bold text-zinc-950 transition-[transform,background-color] duration-150 hover:bg-amber-400 active:scale-[0.96]"
                >
                  <Zap className="h-3.5 w-3.5 stroke-[2]" />
                  <span>Hydraulics [H]</span>
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => onTriggerAction('FIRE')}
              className="flex min-h-[40px] items-center gap-2 rounded-xl bg-zinc-900/90 px-3.5 py-2 text-xs font-semibold text-zinc-200 border border-white/10 transition-[transform,background-color] duration-150 hover:bg-zinc-800 active:scale-[0.96]"
            >
              <Crosshair className="h-4 w-4 text-red-400 stroke-[2]" />
              <span>Fire / Spray Tag [Ctrl]</span>
            </button>
          </div>
        </div>

        {/* Bottom-Center: Dialogue Subtitles & Controls Hint Bar */}
        <div className="flex flex-col items-center gap-2 max-w-lg text-center">
          {telemetry.subtitle && (
            <div
              className="rounded-xl bg-black/85 px-4 py-2.5 text-sm text-zinc-100"
              style={{
                boxShadow: '0 8px 24px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.12)',
              }}
            >
              <span className="font-bold text-emerald-400">
                {telemetry.subtitle.speaker}:{' '}
              </span>
              <span>{telemetry.subtitle.text}</span>
            </div>
          )}

          <div
            className="pointer-events-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl bg-zinc-950/80 px-4 py-2 text-[11px] text-zinc-300 backdrop-blur-md"
            style={{
              boxShadow: '0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)',
            }}
          >
            <span>
              <strong className="text-white">WASD</strong> Move/Drive
            </span>
            <span>•</span>
            <span>
              <strong className="text-emerald-400">M</strong> Full Map & GPS
            </span>
            <span>•</span>
            <span>
              <strong className="text-white">F</strong> Enter/Exit Car
            </span>
            <span>•</span>
            <span>
              <strong className="text-white">Space</strong> Jump/Handbrake
            </span>
            <span>•</span>
            <span>
              <strong className="text-white">Shift</strong> Sprint/Nitro
            </span>
            <span>•</span>
            <span>
              <strong className="text-amber-400">Type HESOYAM</strong> Cheats
            </span>
          </div>
        </div>

        {/* Bottom-Right: Radio, Speedometer & Zone Callout */}
        <div className="flex flex-col items-end gap-2 text-right">
          <button
            type="button"
            onClick={onCycleRadio}
            className="pointer-events-auto flex min-h-[40px] items-center gap-2 rounded-xl bg-zinc-950/85 px-3.5 py-2 text-xs font-semibold text-zinc-200 backdrop-blur-md transition-[transform,background-color] duration-150 hover:bg-zinc-900 active:scale-[0.96]"
            style={{
              boxShadow: '0 8px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)',
            }}
          >
            <Radio
              className="h-4 w-4 stroke-[2]"
              style={{ color: currentStation.accentColor }}
            />
            <div className="text-left">
              <div
                className="text-xs font-bold leading-none"
                style={{ color: currentStation.accentColor }}
              >
                {currentStation.name}
              </div>
              <div className="mt-0.5 text-[10px] text-zinc-400">
                {currentStation.freqMhz} • {currentStation.dj}
              </div>
            </div>
          </button>

          {telemetry.inVehicle && (
            <div
              className="rounded-xl bg-zinc-950/85 px-4 py-2.5 backdrop-blur-md"
              style={{
                boxShadow: '0 8px 24px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.1)',
              }}
            >
              <div className="font-bankgothic text-lg font-extrabold italic tracking-wide text-sky-300">
                {telemetry.inVehicle.displayName}
              </div>
              <div className="mt-0.5 flex items-baseline justify-end gap-1.5 font-mono [font-variant-numeric:tabular-nums]">
                <span className="text-2xl font-black text-white">
                  {telemetry.speedKmh}
                </span>
                <span className="text-xs font-semibold text-zinc-400">KM/H</span>
                <span className="ml-2 text-xs text-emerald-400">
                  {telemetry.inVehicle.nDriveType}WD • {telemetry.inVehicle.fMass}kg
                </span>
              </div>
            </div>
          )}

          <div className="pr-1">
            <div
              className="font-diploma text-2xl sm:text-3xl font-bold tracking-wide text-amber-300"
              style={{
                textShadow:
                  '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
              }}
            >
              {telemetry.zoneName}
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-zinc-300">
              {telemetry.districtName} •{' '}
              <span
                className={
                  telemetry.controllingGang === 'GROVE'
                    ? 'text-emerald-400'
                    : telemetry.controllingGang === 'BALLAS'
                    ? 'text-purple-400'
                    : 'text-amber-400'
                }
              >
                {telemetry.controllingGang} TERRITORY
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
