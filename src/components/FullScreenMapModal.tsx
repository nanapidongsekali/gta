import React, { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Navigation,
  Layers,
  Grid,
  Compass,
  ZoomIn,
  Eye,
  Cpu,
} from 'lucide-react';
import {
  SAN_ANDREAS_BOOKMARKS,
  SAN_ANDREAS_ZONE_POLYGONS,
  SaBookmarkLocation,
  worldToCanonicalSaCoords,
  canonicalSaToWorldCoords,
} from '../engine/SanAndreasMapData';
import {
  loadRealGtaSaDataBundle,
  type LoadedGtaSaDataBundle,
} from '../engine/RealGtaFileLoader';
import { TelemetrySnapshot } from './SanAndreasWorldCanvas';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  telemetry: TelemetrySnapshot;
  customWaypoint: [number, number] | null;
  onSetCustomWaypoint: (wp: [number, number] | null) => void;
  onTeleport: (x: number, y: number, z: number) => void;
}

type MapLayerMode = 'RADAR' | 'SATELLITE' | 'WIREFRAME';
type ZoomPreset = 'FULL_STATE' | 'LOS_SANTOS' | 'GROVE_ST';

const ZOOM_VIEWBOXES: Record<
  ZoomPreset,
  { minX: number; minY: number; width: number; height: number; label: string }
> = {
  FULL_STATE: {
    minX: -3000,
    minY: -3000,
    width: 6000,
    height: 6000,
    label: '1x Full San Andreas [-3000..3000]',
  },
  LOS_SANTOS: {
    minX: 100,
    minY: 500,
    width: 2900,
    height: 2450,
    label: '2.5x Los Santos Metro',
  },
  GROVE_ST: {
    minX: 1950,
    minY: 1100,
    width: 950,
    height: 850,
    label: '6x Ganton & Grove St (LAe2.ipl)',
  },
};

export const FullScreenMapModal: React.FC<Props> = ({
  isOpen,
  onClose,
  telemetry,
  customWaypoint,
  onSetCustomWaypoint,
  onTeleport,
}) => {
  const [mapMode, setMapMode] = useState<MapLayerMode>('RADAR');
  const [zoomPreset, setZoomPreset] = useState<ZoomPreset>('FULL_STATE');
  const [showGangTurf, setShowGangTurf] = useState(true);
  const [showZoneGrid, setShowZoneGrid] = useState(true);
  const [showRealInfoZon, setShowRealInfoZon] = useState(true);
  const [showRealIplEnex, setShowRealIplEnex] = useState(true);
  const [selectedBookmark, setSelectedBookmark] = useState<SaBookmarkLocation>(
    SAN_ANDREAS_BOOKMARKS[0]
  );
  const [realBundle, setRealBundle] = useState<LoadedGtaSaDataBundle | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadRealGtaSaDataBundle().then(setRealBundle);
  }, [isOpen]);

  if (!isOpen) return null;

  const playerSa = worldToCanonicalSaCoords(
    telemetry.playerX,
    telemetry.playerY,
    telemetry.playerZ
  );
  const playerSvgX = playerSa[0];
  const playerSvgY = -playerSa[1];

  const waypointSa = customWaypoint
    ? worldToCanonicalSaCoords(customWaypoint[0], 0, customWaypoint[1])
    : null;

  const vb = ZOOM_VIEWBOXES[zoomPreset];

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const saX = vb.minX + relX * vb.width;
    const saY = -(vb.minY + relY * vb.height);
    const [worldX, , worldZ] = canonicalSaToWorldCoords(saX, saY, 13.5);
    onSetCustomWaypoint([worldX, worldZ]);
  };

  const markerScale = zoomPreset === 'GROVE_ST' ? 0.32 : zoomPreset === 'LOS_SANTOS' ? 0.65 : 1;

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-3 sm:p-5 backdrop-blur-md">
      <div
        className="flex h-[90vh] w-full max-w-[1440px] flex-col overflow-hidden rounded-2xl bg-zinc-950 text-zinc-100"
        style={{
          boxShadow:
            '0 24px 64px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.14)',
        }}
      >
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3 bg-zinc-900/70">
          <div className="flex items-center gap-3">
            <Compass className="h-5 w-5 text-amber-400 stroke-[2]" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">
                  State of San Andreas — Official Cartographic Map (CMenuManager::DrawFrontEndMap @ 0x575B30)
                </h2>
                <span className="hidden md:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  radar00..143 + info.zon ({realBundle?.zones.length ?? 356} Zones) + water.dat
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono [font-variant-numeric:tabular-nums]">
                CJ Canonical Pos: SA ({playerSa[0]}, {playerSa[1]}, {playerSa[2]}) • Engine ({telemetry.playerX}, {telemetry.playerZ}) • Zone: {telemetry.zoneName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Map Render Mode Switcher */}
            {(
              [
                { id: 'RADAR', label: 'Radar Asli (radar00..143)' },
                { id: 'SATELLITE', label: 'Satellite 3D (2048px)' },
                { id: 'WIREFRAME', label: 'RE Wireframe (water.dat + IPL)' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMapMode(m.id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold transition-colors ${
                  mapMode === m.id
                    ? 'bg-emerald-500 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-300 border border-white/10 hover:bg-zinc-800'
                }`}
              >
                {m.label}
              </button>
            ))}

            {/* Zoom Presets */}
            {(
              [
                { id: 'FULL_STATE', label: '1x Full Map' },
                { id: 'LOS_SANTOS', label: '2.5x Los Santos' },
                { id: 'GROVE_ST', label: '6x Grove St' },
              ] as const
            ).map((zp) => (
              <button
                key={zp.id}
                type="button"
                onClick={() => setZoomPreset(zp.id)}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-mono transition-colors ${
                  zoomPreset === zp.id
                    ? 'bg-sky-500 text-zinc-950 font-bold'
                    : 'bg-zinc-900 text-zinc-300 border border-white/10 hover:bg-zinc-800'
                }`}
              >
                <ZoomIn className="w-3 h-3" />
                {zp.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowGangTurf((v) => !v)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                showGangTurf
                  ? 'bg-purple-500/30 text-purple-200 border border-purple-400/50'
                  : 'bg-zinc-900 text-zinc-400 border border-white/10'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Turf (0x572440)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRealInfoZon((v) => !v)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                showRealInfoZon
                  ? 'bg-amber-400/25 text-amber-300 border border-amber-400/50'
                  : 'bg-zinc-900 text-zinc-400 border border-white/10'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" />
              <span>info.zon + ENEX</span>
            </button>

            <button
              type="button"
              onClick={() => setShowZoneGrid((v) => !v)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                showZoneGrid
                  ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50'
                  : 'bg-zinc-900 text-zinc-400 border border-white/10'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              <span>10×10 Grid</span>
            </button>

            {customWaypoint && (
              <button
                type="button"
                onClick={() => onSetCustomWaypoint(null)}
                className="rounded-lg bg-red-500/20 px-2.5 py-1.5 text-xs font-semibold text-red-300 border border-red-500/30"
              >
                Clear Waypoint
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Map Body: Interactive Canonical [-3000..3000] Map Left + Bookmark & IPL Inspector Right */}
        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
          <div className="relative flex-1 bg-[#4b6884] overflow-hidden flex items-center justify-center">
            <svg
              viewBox={`${vb.minX} ${vb.minY} ${vb.width} ${vb.height}`}
              onClick={handleSvgClick}
              className="h-full w-full cursor-crosshair select-none"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Base Ocean Background */}
              <rect x={-3000} y={-3000} width={6000} height={6000} fill="#446482" />

              {/* 1. Authentic GTA:SA Radar Tile Map (radar00..radar143) or Orthographic 3D Satellite Render */}
              {mapMode === 'RADAR' && (
                <image
                  href="/gtasa-data/full_map.webp"
                  x={-3000}
                  y={-3000}
                  width={6000}
                  height={6000}
                  preserveAspectRatio="none"
                />
              )}
              {mapMode === 'SATELLITE' && (
                <image
                  href="/gtasa-data/map_satellite_2048.jpg"
                  x={-3000}
                  y={-3000}
                  width={6000}
                  height={6000}
                  preserveAspectRatio="none"
                />
              )}

              {/* 2. RE Wireframe Mode: Real water.dat Quads (CWaterLevel::LoadWaterLevel @ 0x6EAE80) */}
              {mapMode === 'WIREFRAME' && realBundle && (
                <g>
                  <rect x={-3000} y={-3000} width={6000} height={6000} fill="#0c131d" />
                  {realBundle.waterPolygons.map((wp, idx) => {
                    const pts = wp.vertices.map((v) => `${v.x},${-v.y}`).join(' ');
                    return (
                      <polygon
                        key={idx}
                        points={pts}
                        fill="rgba(14, 165, 233, 0.28)"
                        stroke="rgba(56, 189, 248, 0.55)"
                        strokeWidth={4 * markerScale}
                      />
                    );
                  })}
                </g>
              )}

              {/* 3. Real Parsed info.zon Navigational Zone AABBs (CFileLoader::LoadZone @ 0x5384A0) */}
              {(showRealInfoZon || mapMode === 'WIREFRAME') &&
                realBundle?.zones
                  .filter((z) => z.type === 0 && z.max.x - z.min.x < 1200)
                  .map((z, idx) => {
                    const zx = z.min.x;
                    const zy = -z.max.y;
                    const zw = z.max.x - z.min.x;
                    const zh = z.max.y - z.min.y;
                    return (
                      <g key={`${z.name}-${idx}`}>
                        <rect
                          x={zx}
                          y={zy}
                          width={zw}
                          height={zh}
                          fill={mapMode === 'WIREFRAME' ? 'rgba(16, 185, 129, 0.08)' : 'none'}
                          stroke={
                            mapMode === 'WIREFRAME'
                              ? 'rgba(52, 211, 153, 0.55)'
                              : 'rgba(255, 255, 255, 0.22)'
                          }
                          strokeWidth={3.5 * markerScale}
                          strokeDasharray={`${14 * markerScale} ${8 * markerScale}`}
                        />
                        {(zoomPreset !== 'FULL_STATE' || zw > 320) && (
                          <text
                            x={zx + zw / 2}
                            y={zy + zh / 2}
                            fill="rgba(255,255,255,0.75)"
                            fontSize={24 * markerScale}
                            fontWeight="700"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            {z.name}
                          </text>
                        )}
                      </g>
                    );
                  })}

              {/* 4. Gang Territory Turf Overlay (CTheZones::FillZonesWithGangColours @ 0x572440) */}
              {showGangTurf &&
                SAN_ANDREAS_ZONE_POLYGONS.filter((z) => z.gang !== 'NEUTRAL').map((zone) => {
                  const [saX1, saY1] = worldToCanonicalSaCoords(zone.minX, 0, zone.minZ);
                  const [saX2, saY2] = worldToCanonicalSaCoords(zone.maxX, 0, zone.maxZ);
                  const minX = Math.min(saX1, saX2);
                  const maxX = Math.max(saX1, saX2);
                  const minSvgY = Math.min(-saY1, -saY2);
                  const maxSvgY = Math.max(-saY1, -saY2);
                  return (
                    <g key={zone.id}>
                      <rect
                        x={minX}
                        y={minSvgY}
                        width={maxX - minX}
                        height={maxSvgY - minSvgY}
                        fill={zone.turfColor}
                        fillOpacity={0.32}
                        stroke={zone.turfColor}
                        strokeWidth={6 * markerScale}
                      />
                    </g>
                  );
                })}

              {/* 5. 10x10 CTheZones::ZonesVisited Grid (0x572110: [-3000..+3000] in 600-unit cells) */}
              {showZoneGrid &&
                Array.from({ length: 11 }).map((_, idx) => {
                  const coord = -3000 + idx * 600;
                  return (
                    <g key={idx}>
                      <line
                        x1={coord}
                        y1={-3000}
                        x2={coord}
                        y2={3000}
                        stroke="rgba(255,255,255,0.16)"
                        strokeWidth={4 * markerScale}
                      />
                      <line
                        x1={-3000}
                        y1={coord}
                        x2={3000}
                        y2={coord}
                        stroke="rgba(255,255,255,0.16)"
                        strokeWidth={4 * markerScale}
                      />
                    </g>
                  );
                })}

              {/* 6. Real LAe2.ipl / LAe.ipl Building Footprints & ENEX Yellow Portals */}
              {showRealIplEnex && realBundle && (
                <g>
                  {/* Real LAe2_stream0..2 + LAe2.ipl instances when zoomed in or wireframe */}
                  {(zoomPreset !== 'FULL_STATE' || mapMode === 'WIREFRAME') &&
                    [
                      ...realBundle.lae2Stream0.instances,
                      ...realBundle.lae2Stream1.instances,
                      ...realBundle.lae2Stream2.instances,
                    ].map((inst, idx) => (
                      <circle
                        key={`inst-${idx}`}
                        cx={inst.pos.x}
                        cy={-inst.pos.y}
                        r={6 * markerScale}
                        fill="#34d399"
                        fillOpacity={0.75}
                      >
                        <title>
                          {inst.modelName} (ID {inst.modelId}) @ ({inst.pos.x.toFixed(1)}, {inst.pos.y.toFixed(1)}, {inst.pos.z.toFixed(1)})
                        </title>
                      </circle>
                    ))}

                  {/* Real ENEX Interior Entrance Cones from LAe2.ipl & LAe.ipl */}
                  {[...realBundle.lae2Ipl.enexes, ...realBundle.laeIpl.enexes]
                    .filter((e) => e.enterPos.z < 500)
                    .map((enex, idx) => (
                      <g key={`enex-${idx}`}>
                        <polygon
                          points={`${enex.enterPos.x},${-enex.enterPos.y - 26 * markerScale} ${
                            enex.enterPos.x - 22 * markerScale
                          },${-enex.enterPos.y + 18 * markerScale} ${
                            enex.enterPos.x + 22 * markerScale
                          },${-enex.enterPos.y + 18 * markerScale}`}
                          fill="#facc15"
                          stroke="#000000"
                          strokeWidth={5 * markerScale}
                        >
                          <title>
                            ENEX "{enex.name}" ({enex.sourceFile}) @ ({enex.enterPos.x.toFixed(1)},{' '}
                            {enex.enterPos.y.toFixed(1)}, {enex.enterPos.z.toFixed(1)})
                          </title>
                        </polygon>
                        {zoomPreset === 'GROVE_ST' && (
                          <text
                            x={enex.enterPos.x}
                            y={-enex.enterPos.y - 34 * markerScale}
                            fill="#fde047"
                            fontSize={22 * markerScale}
                            fontWeight="900"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            {enex.name}
                          </text>
                        )}
                      </g>
                    ))}
                </g>
              )}

              {/* 7. Canonical Bookmarks (14 Key Locations across Los Santos, San Fierro, Las Venturas) */}
              {SAN_ANDREAS_BOOKMARKS.map((bm) => {
                const bx = bm.saCoords[0];
                const by = -bm.saCoords[1];
                const isSelected = selectedBookmark.id === bm.id;
                const r = (isSelected ? 48 : 36) * markerScale;
                return (
                  <g
                    key={bm.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBookmark(bm);
                    }}
                    className="cursor-pointer"
                  >
                    <rect
                      x={bx - r}
                      y={by - r}
                      width={r * 2}
                      height={r * 2}
                      rx={10 * markerScale}
                      fill={bm.color}
                      stroke={isSelected ? '#ffffff' : '#09090b'}
                      strokeWidth={(isSelected ? 10 : 6) * markerScale}
                    />
                    <text
                      x={bx}
                      y={by + 12 * markerScale}
                      fill="#09090b"
                      fontSize={30 * markerScale}
                      fontWeight="900"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {bm.iconCode}
                    </text>
                  </g>
                );
              })}

              {/* 8. Custom GPS Waypoint Pin & Route Line */}
              {waypointSa && (
                <g>
                  <line
                    x1={playerSvgX}
                    y1={playerSvgY}
                    x2={waypointSa[0]}
                    y2={-waypointSa[1]}
                    stroke="#ef4444"
                    strokeWidth={12 * markerScale}
                    strokeDasharray={`${28 * markerScale} ${18 * markerScale}`}
                  />
                  <circle
                    cx={waypointSa[0]}
                    cy={-waypointSa[1]}
                    r={42 * markerScale}
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth={10 * markerScale}
                  />
                </g>
              )}

              {/* 9. CJ Live Position & Heading Arrow */}
              <g
                transform={`translate(${playerSvgX}, ${playerSvgY}) rotate(${
                  (-telemetry.headingRad * 180) / Math.PI
                })`}
              >
                <circle
                  cx={0}
                  cy={0}
                  r={52 * markerScale}
                  fill="rgba(34, 197, 94, 0.28)"
                  stroke="#22c55e"
                  strokeWidth={6 * markerScale}
                />
                <polygon
                  points={`0,${-48 * markerScale} ${-32 * markerScale},${36 * markerScale} 0,${
                    18 * markerScale
                  } ${32 * markerScale},${36 * markerScale}`}
                  fill="#ffffff"
                  stroke="#09090b"
                  strokeWidth={8 * markerScale}
                />
              </g>
            </svg>

            {/* Bottom-Left Map Legend Overlay */}
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl bg-zinc-950/90 px-3.5 py-2.5 text-xs backdrop-blur-md border border-white/10">
              <p className="font-bold text-zinc-200 mb-1.5 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>CRadar & CTheZones Authentic Legend ([-3000..+3000])</span>
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-zinc-300">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                  <span>Grove St Families (GANTON)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-purple-500" />
                  <span>Front Yard Ballas (IDLEWD)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
                  <span>Los Santos Vagos (ELS)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-yellow-300" />
                  <span>Yellow Triangle = ENEX Portal</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Fast-Travel & Real IPL/ZON Inspector */}
          <div className="flex w-full lg:w-96 flex-col border-t lg:border-t-0 lg:border-l border-white/10 bg-zinc-900/60">
            <div className="border-b border-white/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                Selected Destination
              </p>
              <h3 className="mt-0.5 text-base font-bold text-white">
                {selectedBookmark.name}
              </h3>
              <p className="mt-0.5 text-xs text-zinc-400 font-mono">
                {selectedBookmark.region} • Zone: {selectedBookmark.zoneCode} • SA (
                {selectedBookmark.saCoords[0]}, {selectedBookmark.saCoords[1]},{' '}
                {selectedBookmark.saCoords[2]})
              </p>
              <p className="mt-2 text-xs text-zinc-300 leading-relaxed">
                {selectedBookmark.description}
              </p>

              <div className="mt-3 flex gap-2">
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
                  className="flex flex-1 min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-bold text-zinc-950 transition-transform active:scale-[0.97] hover:bg-emerald-400"
                >
                  <Navigation className="h-3.5 w-3.5 stroke-[2.2]" />
                  <span>Teleport CJ Here</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSetCustomWaypoint([
                      selectedBookmark.worldPos[0],
                      selectedBookmark.worldPos[2],
                    ])
                  }
                  className="flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-100 border border-white/10 hover:bg-zinc-700"
                >
                  <MapPin className="h-3.5 w-3.5 text-red-400" />
                  <span>GPS Pin</span>
                </button>
              </div>
            </div>

            {/* Scrollable List of 14 Canonical San Andreas Locations */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                All San Andreas Fast-Travel Bookmarks (14)
              </p>
              {SAN_ANDREAS_BOOKMARKS.map((bm) => {
                const active = selectedBookmark.id === bm.id;
                return (
                  <button
                    key={bm.id}
                    type="button"
                    onClick={() => setSelectedBookmark(bm)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                      active
                        ? 'bg-white/12 text-white ring-1 ring-amber-400/50'
                        : 'text-zinc-300 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-black text-zinc-950"
                        style={{ backgroundColor: bm.color }}
                      >
                        {bm.iconCode}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{bm.name}</p>
                        <p className="truncate text-[10px] text-zinc-400 font-mono">
                          {bm.zoneCode} • SA ({bm.saCoords[0]}, {bm.saCoords[1]})
                        </p>
                      </div>
                    </div>
                    <span className="ml-2 shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-zinc-300">
                      {bm.region.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
