import React, { useState } from 'react';
import {
  X,
  MapPin,
  Navigation,
  Layers,
  Grid,
  Compass,
} from 'lucide-react';
import {
  SAN_ANDREAS_BOOKMARKS,
  SAN_ANDREAS_ROAD_NETWORK,
  SAN_ANDREAS_ZONE_POLYGONS,
  SaBookmarkLocation,
  worldToCanonicalSaCoords,
} from '../engine/SanAndreasMapData';
import { TelemetrySnapshot } from './SanAndreasWorldCanvas';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  telemetry: TelemetrySnapshot;
  customWaypoint: [number, number] | null;
  onSetCustomWaypoint: (wp: [number, number] | null) => void;
  onTeleport: (x: number, y: number, z: number) => void;
}

export const FullScreenMapModal: React.FC<Props> = ({
  isOpen,
  onClose,
  telemetry,
  customWaypoint,
  onSetCustomWaypoint,
  onTeleport,
}) => {
  const [showGangTurf, setShowGangTurf] = useState(true);
  const [showZoneGrid, setShowZoneGrid] = useState(true);
  const [selectedBookmark, setSelectedBookmark] =
    useState<SaBookmarkLocation>(SAN_ANDREAS_BOOKMARKS[0]);

  if (!isOpen) return null;

  const playerSa = worldToCanonicalSaCoords(
    telemetry.playerX,
    telemetry.playerY,
    telemetry.playerZ
  );

  // Map SVG viewport covers engine X: [-540..540], Z: [-460..380]
  const viewMinX = -540;
  const viewMaxX = 540;
  const viewMinZ = -460;
  const viewMaxZ = 380;
  const viewW = viewMaxX - viewMinX;
  const viewH = viewMaxZ - viewMinZ;

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const worldX = Math.round(viewMinX + relX * viewW);
    const worldZ = Math.round(viewMinZ + relY * viewH);
    onSetCustomWaypoint([worldX, worldZ]);
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 sm:p-6 backdrop-blur-md">
      <div
        className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-zinc-950 text-zinc-100"
        style={{
          boxShadow:
            '0 24px 64px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.14)',
        }}
      >
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <Compass className="h-5 w-5 text-amber-400 stroke-[2]" />
            <div>
              <h2 className="text-base font-bold text-white">
                State of San Andreas — Cartographic Map (CMenuManager::DrawFrontEndMap @ 0x575B30)
              </h2>
              <p className="text-xs text-zinc-400 font-mono [font-variant-numeric:tabular-nums]">
                CJ Canonical Pos: SA ({playerSa[0]}, {playerSa[1]}, {playerSa[2]}) • Engine ({telemetry.playerX}, {telemetry.playerZ}) • Zone: {telemetry.zoneName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGangTurf((v) => !v)}
              className={`flex min-h-[38px] items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-[transform,background-color] duration-150 active:scale-[0.96] ${
                showGangTurf
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'bg-zinc-900 text-zinc-300 border border-white/10'
              }`}
            >
              <Layers className="h-3.5 w-3.5 stroke-[2]" />
              <span>Gang Turf Overlay (0x572440)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowZoneGrid((v) => !v)}
              className={`flex min-h-[38px] items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-[transform,background-color] duration-150 active:scale-[0.96] ${
                showZoneGrid
                  ? 'bg-amber-400 text-zinc-950'
                  : 'bg-zinc-900 text-zinc-300 border border-white/10'
              }`}
            >
              <Grid className="h-3.5 w-3.5 stroke-[2]" />
              <span>10×10 Zone Grid (0x572110)</span>
            </button>

            {customWaypoint && (
              <button
                type="button"
                onClick={() => onSetCustomWaypoint(null)}
                className="flex min-h-[38px] items-center gap-1.5 rounded-xl bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300 border border-red-500/30 transition-[transform] duration-150 active:scale-[0.96]"
              >
                <span>Clear Waypoint</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:bg-white/10 hover:text-white transition-[transform,background-color] duration-150 active:scale-[0.96]"
            >
              <X className="h-5 w-5 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Map Body: Interactive Vector Map Left + Bookmark Inspector Right */}
        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          {/* Interactive Vector Map Canvas */}
          <div className="relative flex-1 bg-[#1e3a5f] overflow-hidden">
            <svg
              viewBox={`${viewMinX} ${viewMinZ} ${viewW} ${viewH}`}
              onClick={handleSvgClick}
              className="h-full w-full cursor-crosshair select-none"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* 1. Ocean Background & Landmasses */}
              <rect
                x={viewMinX}
                y={viewMinZ}
                width={viewW}
                height={viewH}
                fill="#132e4a"
              />

              {/* Main Los Santos & Red County Landmass */}
              <polygon
                points="-260,-300 240,-300 240,260 50,365 -200,365 -380,220 -260,-300"
                fill="#2b3a2c"
                stroke="#475569"
                strokeWidth="2"
              />

              {/* San Fierro Peninsula & Mount Chiliad (West/North-West across San Fierro Bay) */}
              <polygon
                points="-525,-430 -275,-430 -285,75 -525,75"
                fill="#28362b"
                stroke="#475569"
                strokeWidth="2"
              />

              {/* Bone County Desert & Las Venturas (North-East) */}
              <polygon
                points="110,-445 525,-445 525,-175 110,-175"
                fill="#4a3b28"
                stroke="#64748b"
                strokeWidth="2"
              />

              {/* Glen Park Pond */}
              <circle cx={45} cy={-115} r={22} fill="#0284c7" />

              {/* 2. Optional 10x10 CTheZones::ZonesVisited Grid (0x572110) */}
              {showZoneGrid &&
                Array.from({ length: 10 }).map((_, idx) => {
                  const gx = viewMinX + (idx * viewW) / 10;
                  const gz = viewMinZ + (idx * viewH) / 10;
                  return (
                    <g key={idx}>
                      <line
                        x1={gx}
                        y1={viewMinZ}
                        x2={gx}
                        y2={viewMaxZ}
                        stroke="rgba(255,255,255,0.07)"
                        strokeWidth="1.5"
                      />
                      <line
                        x1={viewMinX}
                        y1={gz}
                        x2={viewMaxX}
                        y2={gz}
                        stroke="rgba(255,255,255,0.07)"
                        strokeWidth="1.5"
                      />
                    </g>
                  );
                })}

              {/* 3. Gang Territory Turf Zones (CTheZones::FillZonesWithGangColours @ 0x572440) */}
              {showGangTurf &&
                SAN_ANDREAS_ZONE_POLYGONS.map((zone) => (
                  <g key={zone.id}>
                    <rect
                      x={zone.minX}
                      y={zone.minZ}
                      width={zone.maxX - zone.minX}
                      height={zone.maxZ - zone.minZ}
                      fill={zone.turfColor}
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="1.2"
                    />
                    <text
                      x={(zone.minX + zone.maxX) / 2}
                      y={(zone.minZ + zone.maxZ) / 2}
                      fill="rgba(255,255,255,0.55)"
                      fontSize="11"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {zone.code}
                    </text>
                  </g>
                ))}

              {/* 4. Roads, Freeways, Storm Drain Canal, Airport Runway & Railroad */}
              {SAN_ANDREAS_ROAD_NETWORK.map((road) => {
                const pointsAttr = road.points
                  .map(([px, pz]) => `${px},${pz}`)
                  .join(' ');
                const strokeColor =
                  road.kind === 'canal'
                    ? '#0284c7'
                    : road.kind === 'freeway'
                    ? '#eab308'
                    : road.kind === 'runway'
                    ? '#94a3b8'
                    : road.kind === 'rail'
                    ? '#a16207'
                    : '#52525b';
                return (
                  <polyline
                    key={road.id}
                    points={pointsAttr}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={road.width * 0.45}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={road.kind === 'rail' ? '6 6' : undefined}
                  />
                );
              })}

              {/* Iconic East-Facing Grove Street Cul-de-Sac Ring at (28, 0) */}
              <circle
                cx={28}
                cy={0}
                r={15}
                fill="#27272a"
                stroke="#22c55e"
                strokeWidth="3"
              />
              <circle cx={28} cy={0} r={5} fill="#166534" />

              {/* 5. Active Waypoint Line */}
              {customWaypoint && (
                <g>
                  <line
                    x1={telemetry.playerX}
                    y1={telemetry.playerZ}
                    x2={customWaypoint[0]}
                    y2={customWaypoint[1]}
                    stroke="#ef4444"
                    strokeWidth="3"
                    strokeDasharray="8 6"
                  />
                  <circle
                    cx={customWaypoint[0]}
                    cy={customWaypoint[1]}
                    r={10}
                    fill="#ef4444"
                    stroke="#000000"
                    strokeWidth="3"
                  />
                </g>
              )}

              {/* 6. Landmark Blips */}
              {SAN_ANDREAS_BOOKMARKS.map((bm) => (
                <g
                  key={bm.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBookmark(bm);
                  }}
                  className="cursor-pointer"
                >
                  <rect
                    x={bm.worldPos[0] - 11}
                    y={bm.worldPos[2] - 11}
                    width={22}
                    height={22}
                    rx={5}
                    fill={bm.color}
                    stroke="#000"
                    strokeWidth="2.5"
                  />
                  <text
                    x={bm.worldPos[0]}
                    y={bm.worldPos[2] + 4}
                    textAnchor="middle"
                    fill="#09090b"
                    fontSize="10"
                    fontWeight="900"
                  >
                    {bm.iconCode}
                  </text>
                </g>
              ))}

              {/* 7. Live CJ Position Marker */}
              <g
                transform={`translate(${telemetry.playerX}, ${telemetry.playerZ}) rotate(${
                  (-telemetry.headingRad * 180) / Math.PI
                })`}
              >
                <circle r={12} fill="rgba(255,255,255,0.25)" />
                <polygon
                  points="0,-12 -8,10 8,10"
                  fill="#ffffff"
                  stroke="#000000"
                  strokeWidth="2.5"
                />
              </g>
            </svg>

            {/* Legend Overlay */}
            <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap items-center gap-2 rounded-xl bg-black/80 px-3.5 py-2 text-[11px] text-zinc-200 border border-white/10">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Grove St Families
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-purple-500" /> Ballas
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> Vagos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-cyan-400" /> Aztecas
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> SF Triads
              </span>
              <span className="text-zinc-400">• Click anywhere on map to set GPS Waypoint</span>
            </div>
          </div>

          {/* Right Sidebar: Selected District / Landmark & Fast Travel */}
          <div className="flex w-full lg:w-96 flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10 bg-zinc-950 p-5 overflow-y-auto">
            <div className="space-y-4">
              <div className="rounded-2xl bg-zinc-900 p-4 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className="rounded-md px-2 py-0.5 text-[11px] font-black text-zinc-950"
                    style={{ backgroundColor: selectedBookmark.color }}
                  >
                    {selectedBookmark.iconCode} • {selectedBookmark.zoneCode}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-400 [font-variant-numeric:tabular-nums]">
                    SA ({selectedBookmark.saCoords.join(', ')})
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  {selectedBookmark.name}
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {selectedBookmark.description}
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onTeleport(
                        selectedBookmark.worldPos[0],
                        selectedBookmark.worldPos[1],
                        selectedBookmark.worldPos[2]
                      );
                      onClose();
                    }}
                    className="flex flex-1 min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-zinc-950 transition-[transform,background-color] duration-150 hover:bg-emerald-400 active:scale-[0.96]"
                  >
                    <Navigation className="h-3.5 w-3.5 stroke-[2]" />
                    <span>Fast Travel Here</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onSetCustomWaypoint([
                        selectedBookmark.worldPos[0],
                        selectedBookmark.worldPos[2],
                      ])
                    }
                    className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-200 transition-[transform,background-color] duration-150 hover:bg-zinc-700 active:scale-[0.96]"
                  >
                    <MapPin className="h-3.5 w-3.5 text-red-400 stroke-[2]" />
                    <span>Pin GPS</span>
                  </button>
                </div>
              </div>

              {/* All 14 Landmarks across Los Santos, San Fierro & Las Venturas */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  All Reconstructed San Andreas Regions ({SAN_ANDREAS_BOOKMARKS.length})
                </h4>
                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {SAN_ANDREAS_BOOKMARKS.map((bm) => (
                    <button
                      key={bm.id}
                      type="button"
                      onClick={() => setSelectedBookmark(bm)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-[transform,background-color] duration-150 active:scale-[0.98] ${
                        selectedBookmark.id === bm.id
                          ? 'bg-white/15 text-white font-semibold'
                          : 'bg-zinc-900/70 text-zinc-300 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-black text-zinc-950"
                          style={{ backgroundColor: bm.color }}
                        >
                          {bm.iconCode}
                        </span>
                        <span className="truncate">{bm.name}</span>
                      </div>
                      <span className="ml-2 shrink-0 font-mono text-[10px] text-zinc-400 [font-variant-numeric:tabular-nums]">
                        {bm.region.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {customWaypoint && (
              <div className="mt-3 rounded-xl bg-red-500/15 p-3 border border-red-500/30 flex items-center justify-between">
                <div className="text-xs">
                  <div className="font-bold text-red-300">Active Custom GPS Pin</div>
                  <div className="font-mono text-[11px] text-zinc-300 [font-variant-numeric:tabular-nums]">
                    Engine ({customWaypoint[0]}, {customWaypoint[1]})
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onTeleport(customWaypoint[0], 0, customWaypoint[1]);
                    onClose();
                  }}
                  className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white transition-[transform] duration-150 active:scale-[0.96]"
                >
                  Teleport to Pin
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
