import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Code2,
  Cpu,
  Box,
  Compass,
  Car,
  Search,
  Navigation,
  Layers,
  CheckCircle2,
  FileCode,
  Database,
} from 'lucide-react';
import {
  loadRealGtaSaDataBundle,
  GROVE_ST_DFF_MANIFEST,
  type LoadedGtaSaDataBundle,
} from '../engine/RealGtaFileLoader';

interface ReverseEngineeringWorkbenchProps {
  isOpen: boolean;
  onClose: () => void;
  onTeleportToGtaCoords: (gtaX: number, gtaY: number, label: string) => void;
}

const DECOMPILED_CPP_SNIPPETS: Record<string, { title: string; addr: string; code: string }> = {
  ipl: {
    title: 'CFileLoader::LoadObjectInstance & LoadEntryExit (source/game_sa/FileLoader.cpp)',
    addr: '0x538090 / 0x5B8030',
    code: `// 0x538090 — Reconstructed from gta_sa.exe v1.0 US (gta-reversed)
CEntity* CFileLoader::LoadObjectInstance(CFileObjectInstance* objInstance, const char* modelName) {
    const auto& rot = objInstance->m_qRotation.imag;
    if (std::fabs(rot.x) > 0.05F || std::fabs(rot.y) > 0.05F) {
        objInstance->m_qRotation.imag = -rot; // Conjugate quaternion in IPL
        newEntity->AllocateStaticMatrix();
        newEntity->GetMatrix().SetRotate(objInstance->m_qRotation);
    } else {
        const auto fMult = rot.z < 0.0f ? 2.0f : -2.0f;
        const auto fHeading = std::acos(objInstance->m_qRotation.real) * fMult;
        newEntity->SetHeading(fHeading);
    }
    newEntity->SetPosn(objInstance->m_vecPosition);
    newEntity->SetAreaCode(static_cast<eAreaCodes>(objInstance->m_nAreaCode));
    newEntity->SetLodIndex(objInstance->m_nLodInstanceIndex);
    return newEntity;
}

// 0x5B8030 — IPL "enex" Interior Portal Parser
void CFileLoader::LoadEntryExit(const char* line) {
    sscanf(line, "%f %f %f %f %f %f %f %f %f %f %f %d %d %s %d %d %d %d",
        &enter.x, &enter.y, &enter.z, &entranceAngle, &range.x, &range.y, &unused,
        &exit.x, &exit.y, &exit.z, &exitAngle, &area, &flags, interiorName,
        &skyColor, &numOfPeds, &timeOn, &timeOff);
    CEntryExitManager::AddOne(enter.x, enter.y, enter.z, entranceAngle, range.x, range.y,
        unused, exit.x, exit.y, exit.z, exitAngle, area, flags, skyColor, timeOn, timeOff, numOfPeds, name);
}`,
  },
  dff: {
    title: 'RpClumpStreamRead & Rockstar ExtraVertColour Plugin (RenderWare 3.6.0.3)',
    addr: '0x74B420 / 0x0253F2F9',
    code: `// 0x74B420 — RenderWare 3.6.0.3 (0x1803FFFF) Binary Stream Reader
RpClump* RpClumpStreamRead(RwStream* stream) {
    // 0x0010 rwID_CLUMP -> 0x000E rwID_FRAMELIST (with 0x0253F2FE Frame Node Name)
    //                   -> 0x001A rwID_GEOMETRYLIST -> 0x000F rwID_GEOMETRY
    // Geometry Struct (0x0001):
    //   uint32 flags;          // rpGEOMETRYTRISTRIP (0x01) | rpGEOMETRYPOSITIONS (0x02)
    //                          // | rpGEOMETRYTEXTURED (0x04) | rpGEOMETRYPRELIT (0x08)
    //   uint32 numTriangles;
    //   uint32 numVertices;
    //   uint32 numMorphTargets;
    //   RwRGBA preLitLum[numVertices];        // Day baked vertex colors
    //   RwTexCoords texCoords[numUVs][numVertices];
    //   RpTriangle triangles[numTriangles];   // uint16 v2, v1, matId, v3
    //   RwSphere boundingSphere;              // float x, y, z, radius
    //   RwV3d vertices[numVertices];          // Local GTA (X=East, Y=North, Z=Up)
    // Extension (0x0003):
    //   0x050E rwID_BINMESHPLG                // Material split tristrip index buffers
    //   0x0253F2F9 ExtraVertColourPlugin      // Night baked vertex colors (CTimeCycle blend)
}`,
  },
  zones: {
    title: 'CTheZones::CreateZone, PointLiesWithinZone & CWaterLevel::LoadWaterLevel',
    addr: '0x572670 / 0x572270 / 0x6EAE80',
    code: `// 0x5384A0 — info.zon / map.zon Parser
void CFileLoader::LoadZone(const char* line) {
    char infoLabel[24], textLabel[12];
    int32 type, level;
    CVector min{}, max{};
    sscanf(line, "%s %d %f %f %f %f %f %f %d %s",
        infoLabel, &type, &min.x, &min.y, &min.z, &max.x, &max.y, &max.z, &level, textLabel);
    CTheZones::CreateZone(infoLabel, (eZoneType)type, min, max, (eLevelName)level, textLabel);
}

// 0x572270 — Exact 3D AABB Zone Membership Test
bool CTheZones::PointLiesWithinZone(const CVector* pPoint, CZone* pZone) {
    return (
        pZone->m_fX1 <= pPoint->x && pZone->m_fX2 >= pPoint->x &&
        pZone->m_fY1 <= pPoint->y && pZone->m_fY2 >= pPoint->y &&
        pZone->m_fZ1 <= pPoint->z && pZone->m_fZ2 >= pPoint->z
    );
}`,
  },
  ide: {
    title: 'CFileLoader::LoadVehicleObject & CVehicleModelInfo::LoadVehicleColours',
    addr: '0x5B6F30 / 0x5B6890 / 0x5BF750',
    code: `// 0x5B6F30 — vehicles.ide "cars" Section Loader
int32 CFileLoader::LoadVehicleObject(const char* line) {
    sscanf(line, "%d %s %s %s %s %s %s %s %d %d %x %d %f %f %d",
        &modelId, modelName, txdName, typeName, handlingId, gameName,
        animGroup, carClass, &freq, &flags, &compRules, &wheelId,
        &wheelScaleFront, &wheelScaleRear, &wheelUpgradeClass);
    CVehicleModelInfo* vmi = CModelInfo::AddVehicleModel(modelId);
    vmi->SetHandlingId(gHandlingDataMgr.GetHandlingId(handlingId));
    return modelId;
}

// 0x5B6890 — carcols.dat 127-Color RGB Table & Per-Vehicle Color Pairs
void CVehicleModelInfo::LoadVehicleColours() {
    // Section "col": R, G, B # index comment -> ms_vehicleColourTable[128]
    // Section "car": vehicleName, pri0, sec0, pri1, sec1, ...
}`,
  },
};

export const ReverseEngineeringWorkbench: React.FC<ReverseEngineeringWorkbenchProps> = ({
  isOpen,
  onClose,
  onTeleportToGtaCoords,
}) => {
  const [bundle, setBundle] = useState<LoadedGtaSaDataBundle | null>(null);
  const [activeTab, setActiveTab] = useState<'ipl' | 'dff' | 'zones' | 'ide'>('ipl');
  const [iplSubTab, setIplSubTab] = useState<'inst' | 'enex' | 'grge' | 'cars'>('inst');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDffFile, setSelectedDffFile] = useState<string>('carlshou1_lae2.dff');

  useEffect(() => {
    if (!isOpen) return;
    loadRealGtaSaDataBundle().then(setBundle);
  }, [isOpen]);

  const allIplInstances = useMemo(() => {
    if (!bundle) return [];
    return [
      ...bundle.lae2Stream0.instances,
      ...bundle.lae2Stream1.instances,
      ...bundle.lae2Stream2.instances,
      ...bundle.lae2Ipl.instances,
      ...bundle.laeIpl.instances,
    ];
  }, [bundle]);

  const allEnexes = useMemo(() => {
    if (!bundle) return [];
    return [
      ...bundle.lae2Ipl.enexes,
      ...bundle.laeIpl.enexes,
      ...bundle.intLaIpl.enexes,
    ];
  }, [bundle]);

  const allGarages = useMemo(() => {
    if (!bundle) return [];
    return [...bundle.lae2Ipl.garages, ...bundle.laeIpl.garages];
  }, [bundle]);

  const allCarGens = useMemo(() => {
    if (!bundle) return [];
    return [
      ...bundle.lae2Stream0.carGenerators,
      ...bundle.lae2Stream1.carGenerators,
      ...bundle.lae2Stream2.carGenerators,
    ];
  }, [bundle]);

  const filteredInstances = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = allIplInstances;
    if (!q) return list.slice(0, 140);
    return list
      .filter(
        (item) =>
          item.modelName.toLowerCase().includes(q) ||
          String(item.modelId).includes(q) ||
          item.sourceFile.toLowerCase().includes(q)
      )
      .slice(0, 140);
  }, [allIplInstances, searchQuery]);

  const filteredZones = useMemo(() => {
    if (!bundle) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return bundle.zones.slice(0, 150);
    return bundle.zones.filter(
      (z) =>
        z.name.toLowerCase().includes(q) ||
        z.gxtKey.toLowerCase().includes(q)
    );
  }, [bundle, searchQuery]);

  const selectedDff = bundle?.dffMeshes[selectedDffFile] ?? null;
  const selectedDffManifest = GROVE_ST_DFF_MANIFEST.find((m) => m.file === selectedDffFile);

  if (!isOpen) return null;

  const snippet = DECOMPILED_CPP_SNIPPETS[activeTab];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-5 select-none">
      <div className="w-full max-w-[1440px] h-[90vh] bg-[#0a0d12] border border-emerald-500/35 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-[#0f141c] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-white font-bold tracking-wider text-sm md:text-base uppercase">
                  GTA:SA v1.0 US — Reverse-Engineering Decompiler & Data Loader Workbench
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  41 REAL FILES LOADED (/gtasa-data/*)
                </span>
              </div>
              <p className="text-[11px] text-white/55 font-mono">
                Educational Clean-Room Decompilation (gta-reversed + RenderWare 3.6.0.3 Binary Stream Parser + Live 3D World Instantiator)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(
              [
                { id: 'ipl', label: 'CFileLoader (.IPL / ENEX)', icon: Layers },
                { id: 'dff', label: 'RenderWare .DFF 3D Meshes', icon: Box },
                { id: 'zones', label: 'info.zon & water.dat', icon: Compass },
                { id: 'ide', label: 'vehicles.ide / carcols / weapon.dat', icon: Car },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded text-xs font-mono flex items-center gap-1.5 border transition-colors ${
                    active
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}

            <button
              onClick={onClose}
              className="ml-2 p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-300 border border-white/10 transition-colors"
              title="Tutup [F2 / ESC]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary Metrics Bar */}
        <div className="px-4 py-2 bg-black/50 border-b border-white/10 grid grid-cols-2 sm:grid-cols-6 gap-2 text-[11px] font-mono">
          <div className="px-2.5 py-1 rounded bg-white/[0.03] border border-white/5 flex items-center justify-between">
            <span className="text-white/50">IPL Instances:</span>
            <span className="text-emerald-400 font-bold">{allIplInstances.length.toLocaleString()}</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-white/[0.03] border border-white/5 flex items-center justify-between">
            <span className="text-white/50">ENEX Portals:</span>
            <span className="text-amber-400 font-bold">{allEnexes.length}</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-white/[0.03] border border-white/5 flex items-center justify-between">
            <span className="text-white/50">info.zon Zones:</span>
            <span className="text-sky-400 font-bold">{bundle?.zones.length ?? 0}</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-white/[0.03] border border-white/5 flex items-center justify-between">
            <span className="text-white/50">water.dat Quads:</span>
            <span className="text-cyan-400 font-bold">{bundle?.waterPolygons.length ?? 0}</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-white/[0.03] border border-white/5 flex items-center justify-between">
            <span className="text-white/50">vehicles.ide / peds:</span>
            <span className="text-purple-400 font-bold">
              {bundle?.vehiclesIde.length ?? 0} / {bundle?.pedsIde.length ?? 0}
            </span>
          </div>
          <div className="px-2.5 py-1 rounded bg-white/[0.03] border border-white/5 flex items-center justify-between">
            <span className="text-white/50">Real .DFF Meshes:</span>
            <span className="text-emerald-300 font-bold">
              {bundle ? Object.keys(bundle.dffMeshes).length : 0} Loaded
            </span>
          </div>
        </div>

        {/* Main Split Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column: Decompiled C++ Source from gta-reversed */}
          <div className="lg:col-span-5 border-r border-white/10 flex flex-col overflow-hidden bg-[#070a0e]">
            <div className="px-3.5 py-2 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-300">
                <Code2 className="w-4 h-4" />
                <span className="truncate">{snippet.title}</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {snippet.addr}
              </span>
            </div>
            <pre className="flex-1 p-3.5 overflow-auto text-[11px] leading-relaxed font-mono text-emerald-100/90 selection:bg-emerald-500/30">
              {snippet.code}
            </pre>
            <div className="p-3 bg-emerald-950/20 border-t border-emerald-500/20 text-[11px] font-mono text-white/75 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>CATATAN REVERSE ENGINEERING (PEMBELAJARAN):</span>
              </div>
              <p className="text-white/65 leading-snug">
                Semua data di sebelah kanan di-parse secara langsung saat runtime dari file asli GTA: San Andreas
                (<code className="text-emerald-300">LAe2.ipl</code>, <code className="text-emerald-300">lae2_stream0..2.ipl</code>,{' '}
                <code className="text-emerald-300">info.zon</code>, <code className="text-emerald-300">water.dat</code>,{' '}
                <code className="text-emerald-300">vehicles.ide</code>, <code className="text-emerald-300">carcols.dat</code>, dan{' '}
                <code className="text-emerald-300">*.dff</code>) menggunakan algoritma dekompilasi{' '}
                <code className="text-amber-300">gta_sa.exe v1.0 US</code>.
              </p>
            </div>
          </div>

          {/* Right Column: Live Parsed Records & Interactive Teleport */}
          <div className="lg:col-span-7 flex flex-col overflow-hidden bg-[#0b0f16]">
            {activeTab === 'ipl' && (
              <>
                <div className="p-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        { id: 'inst', label: `inst (${allIplInstances.length})` },
                        { id: 'enex', label: `enex Portals (${allEnexes.length})` },
                        { id: 'grge', label: `grge Garages (${allGarages.length})` },
                        { id: 'cars', label: `cars Spawn (${allCarGens.length})` },
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.id}
                        onClick={() => setIplSubTab(st.id)}
                        className={`px-2.5 py-1 rounded text-xs font-mono border ${
                          iplSubTab === st.id
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari model (carl, sweet, ryd, gym, cluck)..."
                      className="w-full pl-8 pr-3 py-1 rounded bg-black/50 border border-white/15 text-xs font-mono text-white placeholder:text-white/35 focus:outline-none focus:border-emerald-500/60"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-3">
                  {iplSubTab === 'inst' && (
                    <table className="w-full text-left border-collapse text-[11px] font-mono">
                      <thead>
                        <tr className="border-b border-white/15 text-white/50">
                          <th className="py-1.5 px-2">ID</th>
                          <th className="py-1.5 px-2">Model Name</th>
                          <th className="py-1.5 px-2">Source IPL</th>
                          <th className="py-1.5 px-2">World Pos (X, Y, Z)</th>
                          <th className="py-1.5 px-2">Heading (0x538090)</th>
                          <th className="py-1.5 px-2 text-right">Aksi 3D</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredInstances.map((inst, idx) => (
                          <tr key={`${inst.sourceFile}-${inst.modelId}-${idx}`} className="hover:bg-white/[0.04]">
                            <td className="py-1.5 px-2 text-emerald-400">{inst.modelId}</td>
                            <td className="py-1.5 px-2 text-white font-semibold">{inst.modelName}</td>
                            <td className="py-1.5 px-2 text-white/50">{inst.sourceFile}</td>
                            <td className="py-1.5 px-2 text-sky-300">
                              ({inst.pos.x.toFixed(1)}, {inst.pos.y.toFixed(1)}, {inst.pos.z.toFixed(1)})
                            </td>
                            <td className="py-1.5 px-2 text-amber-300">{inst.headingDeg.toFixed(1)}°</td>
                            <td className="py-1.5 px-2 text-right">
                              <button
                                onClick={() => {
                                  onTeleportToGtaCoords(inst.pos.x, inst.pos.y, `${inst.modelName} (${inst.sourceFile})`);
                                  onClose();
                                }}
                                className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1"
                              >
                                <Navigation className="w-3 h-3" />
                                Teleport
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {iplSubTab === 'enex' && (
                    <table className="w-full text-left border-collapse text-[11px] font-mono">
                      <thead>
                        <tr className="border-b border-white/15 text-white/50">
                          <th className="py-1.5 px-2">Interior Key</th>
                          <th className="py-1.5 px-2">Source</th>
                          <th className="py-1.5 px-2">Enter Cone (X, Y, Z)</th>
                          <th className="py-1.5 px-2">Exit Target (X, Y, Z)</th>
                          <th className="py-1.5 px-2">Area ID</th>
                          <th className="py-1.5 px-2 text-right">Aksi 3D</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {allEnexes.map((enex, idx) => (
                          <tr key={`${enex.name}-${idx}`} className="hover:bg-white/[0.04]">
                            <td className="py-1.5 px-2 text-amber-400 font-bold">"{enex.name}"</td>
                            <td className="py-1.5 px-2 text-white/50">{enex.sourceFile}</td>
                            <td className="py-1.5 px-2 text-emerald-300">
                              ({enex.enterPos.x.toFixed(2)}, {enex.enterPos.y.toFixed(2)}, {enex.enterPos.z.toFixed(2)})
                            </td>
                            <td className="py-1.5 px-2 text-sky-300">
                              ({enex.exitPos.x.toFixed(2)}, {enex.exitPos.y.toFixed(2)}, {enex.exitPos.z.toFixed(2)})
                            </td>
                            <td className="py-1.5 px-2 text-purple-300">Int #{enex.interiorId}</td>
                            <td className="py-1.5 px-2 text-right">
                              {enex.enterPos.z < 500 && (
                                <button
                                  onClick={() => {
                                    onTeleportToGtaCoords(
                                      enex.enterPos.x,
                                      enex.enterPos.y,
                                      `ENEX "${enex.name}"`
                                    );
                                    onClose();
                                  }}
                                  className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1"
                                >
                                  <Navigation className="w-3 h-3" />
                                  Ke Pintu
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {iplSubTab === 'grge' && (
                    <table className="w-full text-left border-collapse text-[11px] font-mono">
                      <thead>
                        <tr className="border-b border-white/15 text-white/50">
                          <th className="py-1.5 px-2">Garage Name</th>
                          <th className="py-1.5 px-2">Type</th>
                          <th className="py-1.5 px-2">Corner P1 (X, Y, Z)</th>
                          <th className="py-1.5 px-2">Corner P2 (X, Y, Z)</th>
                          <th className="py-1.5 px-2 text-right">Aksi 3D</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {allGarages.map((g, idx) => (
                          <tr key={`${g.name}-${idx}`} className="hover:bg-white/[0.04]">
                            <td className="py-1.5 px-2 text-emerald-400 font-bold">{g.name}</td>
                            <td className="py-1.5 px-2 text-amber-300">
                              Type {g.garageType} ({g.name === 'cjsafe' ? 'Safehouse Garage' : g.name === 'sprLAe' ? "Pay 'n' Spray" : 'Mod / Bomb Garage'})
                            </td>
                            <td className="py-1.5 px-2 text-sky-300">
                              ({g.p1.x.toFixed(1)}, {g.p1.y.toFixed(1)}, {g.p1.z.toFixed(1)})
                            </td>
                            <td className="py-1.5 px-2 text-sky-300">
                              ({g.p2.x.toFixed(1)}, {g.p2.y.toFixed(1)}, {g.p2.z.toFixed(1)})
                            </td>
                            <td className="py-1.5 px-2 text-right">
                              <button
                                onClick={() => {
                                  onTeleportToGtaCoords(g.p1.x, g.p1.y, `Garage ${g.name}`);
                                  onClose();
                                }}
                                className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1"
                              >
                                <Navigation className="w-3 h-3" />
                                Teleport
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {iplSubTab === 'cars' && (
                    <table className="w-full text-left border-collapse text-[11px] font-mono">
                      <thead>
                        <tr className="border-b border-white/15 text-white/50">
                          <th className="py-1.5 px-2">Source</th>
                          <th className="py-1.5 px-2">Model ID</th>
                          <th className="py-1.5 px-2">World Pos (X, Y, Z)</th>
                          <th className="py-1.5 px-2">Angle</th>
                          <th className="py-1.5 px-2">Alarm / Lock %</th>
                          <th className="py-1.5 px-2 text-right">Aksi 3D</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {allCarGens.map((cg, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.04]">
                            <td className="py-1.5 px-2 text-white/60">{cg.sourceFile}</td>
                            <td className="py-1.5 px-2 text-emerald-400">
                              {cg.modelId === -1 ? 'Random Class (-1)' : `ID ${cg.modelId}`}
                            </td>
                            <td className="py-1.5 px-2 text-sky-300">
                              ({cg.pos.x.toFixed(1)}, {cg.pos.y.toFixed(1)}, {cg.pos.z.toFixed(1)})
                            </td>
                            <td className="py-1.5 px-2 text-amber-300">{cg.angle.toFixed(1)}°</td>
                            <td className="py-1.5 px-2 text-white/60">
                              {cg.alarmProb}% / {cg.lockProb}%
                            </td>
                            <td className="py-1.5 px-2 text-right">
                              <button
                                onClick={() => {
                                  onTeleportToGtaCoords(cg.pos.x, cg.pos.y, `CarGen (${cg.sourceFile})`);
                                  onClose();
                                }}
                                className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/40 inline-flex items-center gap-1"
                              >
                                <Navigation className="w-3 h-3" />
                                Teleport
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}

            {activeTab === 'dff' && (
              <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-mono text-white/80">Pilih File Binary .DFF (RenderWare 3.6.0.3):</span>
                  </div>
                  <select
                    value={selectedDffFile}
                    onChange={(e) => setSelectedDffFile(e.target.value)}
                    className="px-3 py-1.5 rounded bg-black/70 border border-emerald-500/40 text-xs font-mono text-emerald-300 focus:outline-none"
                  >
                    {GROVE_ST_DFF_MANIFEST.map((m) => (
                      <option key={m.file} value={m.file}>
                        {m.file} — {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDff ? (
                  <div className="flex-1 overflow-auto space-y-3 font-mono text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2.5 rounded bg-white/[0.03] border border-white/10">
                        <div className="text-[10px] text-white/45">RW VERSION STAMP</div>
                        <div className="text-emerald-400 font-bold mt-0.5">
                          0x{selectedDff.rwVersion.toString(16).toUpperCase()} (3.6.0.3)
                        </div>
                      </div>
                      <div className="p-2.5 rounded bg-white/[0.03] border border-white/10">
                        <div className="text-[10px] text-white/45">VERTICES / TRIANGLES</div>
                        <div className="text-sky-400 font-bold mt-0.5">
                          {selectedDff.numVertices.toLocaleString()} verts / {selectedDff.numTriangles.toLocaleString()} tris
                        </div>
                      </div>
                      <div className="p-2.5 rounded bg-white/[0.03] border border-white/10">
                        <div className="text-[10px] text-white/45">VERTEX LIGHTING</div>
                        <div className="text-amber-400 font-bold mt-0.5">
                          Day Prelit: {selectedDff.hasPrelit ? 'YES' : 'NO'} | Night: {selectedDff.hasNightColors ? 'YES' : 'NO'}
                        </div>
                      </div>
                      <div className="p-2.5 rounded bg-white/[0.03] border border-white/10">
                        <div className="text-[10px] text-white/45">BINARY SIZE</div>
                        <div className="text-purple-400 font-bold mt-0.5">
                          {(selectedDff.byteLength / 1024).toFixed(1)} KB ({selectedDff.materials.length} Materials)
                        </div>
                      </div>
                    </div>

                    {selectedDffManifest && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-emerald-300 font-bold">{selectedDffManifest.label}</div>
                          <div className="text-[11px] text-white/65">
                            Model ID: {selectedDffManifest.modelId} | IPL World Pos: ({selectedDffManifest.iplPos.x.toFixed(2)},{' '}
                            {selectedDffManifest.iplPos.y.toFixed(2)}, {selectedDffManifest.iplPos.z.toFixed(2)}) | Local Bounds: [
                            {selectedDff.localBounds.min.x.toFixed(1)}..{selectedDff.localBounds.max.x.toFixed(1)},{' '}
                            {selectedDff.localBounds.min.y.toFixed(1)}..{selectedDff.localBounds.max.y.toFixed(1)},{' '}
                            {selectedDff.localBounds.min.z.toFixed(1)}..{selectedDff.localBounds.max.z.toFixed(1)}]
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            onTeleportToGtaCoords(
                              selectedDffManifest.iplPos.x,
                              selectedDffManifest.iplPos.y,
                              selectedDffManifest.label
                            );
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 shrink-0"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Teleport ke Mesh 3D
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 rounded bg-white/[0.02] border border-white/10">
                        <div className="text-white/60 text-[11px] font-bold mb-2">
                          rwID_MATLIST (0x0008) — Texture Dictionary References ({selectedDff.materials.length}):
                        </div>
                        <div className="space-y-1 max-h-52 overflow-auto">
                          {selectedDff.materials.map((mat, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between px-2 py-1 rounded bg-black/40 border border-white/5 text-[11px]"
                            >
                              <span className="text-emerald-300">
                                Mat #{i}: <strong className="text-white">{mat.textureName || '(untextured)'}</strong>
                              </span>
                              <span className="text-white/50">
                                RGBA({mat.color.r},{mat.color.g},{mat.color.b},{mat.color.a})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 rounded bg-white/[0.02] border border-white/10">
                        <div className="text-white/60 text-[11px] font-bold mb-2">
                          Sample 3D Vertices & Prelit Colors (MorphTarget #0):
                        </div>
                        <div className="space-y-1 max-h-52 overflow-auto text-[11px]">
                          {Array.from({ length: Math.min(12, selectedDff.numVertices) }).map((_, i) => {
                            const vx = selectedDff.positions[i * 3];
                            const vy = selectedDff.positions[i * 3 + 1];
                            const vz = selectedDff.positions[i * 3 + 2];
                            const r = selectedDff.prelitColors ? selectedDff.prelitColors[i * 4] : 255;
                            const g = selectedDff.prelitColors ? selectedDff.prelitColors[i * 4 + 1] : 255;
                            const b = selectedDff.prelitColors ? selectedDff.prelitColors[i * 4 + 2] : 255;
                            return (
                              <div
                                key={i}
                                className="flex items-center justify-between px-2 py-1 rounded bg-black/40 border border-white/5"
                              >
                                <span className="text-sky-300">
                                  v[{i}]: ({vx.toFixed(2)}, {vy.toFixed(2)}, {vz.toFixed(2)})
                                </span>
                                <span className="flex items-center gap-1.5 text-white/60">
                                  <span
                                    className="w-3 h-3 rounded-sm border border-white/20 inline-block"
                                    style={{ backgroundColor: `rgb(${r},${g},${b})` }}
                                  />
                                  Prelit({r},{g},{b})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-white/40 font-mono text-xs">
                    Memuat binary stream .DFF...
                  </div>
                )}
              </div>
            )}

            {activeTab === 'zones' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 border-b border-white/10 flex items-center justify-between gap-2">
                  <div className="text-xs font-mono text-white/75 flex items-center gap-2">
                    <Database className="w-4 h-4 text-sky-400" />
                    <span>
                      {bundle?.zones.length ?? 0} Navigational Zones (<code className="text-sky-300">info.zon</code>) &{' '}
                      {bundle?.waterPolygons.length ?? 0} Water Quads (<code className="text-cyan-300">water.dat</code>)
                    </span>
                  </div>
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari zone (GAN, IWD, ELS, VIN, SFDWT)..."
                      className="w-full pl-8 pr-3 py-1 rounded bg-black/50 border border-white/15 text-xs font-mono text-white placeholder:text-white/35 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-3">
                  <table className="w-full text-left border-collapse text-[11px] font-mono">
                    <thead>
                      <tr className="border-b border-white/15 text-white/50">
                        <th className="py-1.5 px-2">Zone Label</th>
                        <th className="py-1.5 px-2">GXT Key</th>
                        <th className="py-1.5 px-2">Min AABB (X1, Y1, Z1)</th>
                        <th className="py-1.5 px-2">Max AABB (X2, Y2, Z2)</th>
                        <th className="py-1.5 px-2 text-right">Teleport</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredZones.map((z, idx) => {
                        const cx = (z.min.x + z.max.x) * 0.5;
                        const cy = (z.min.y + z.max.y) * 0.5;
                        return (
                          <tr key={`${z.name}-${idx}`} className="hover:bg-white/[0.04]">
                            <td className="py-1.5 px-2 text-sky-400 font-bold">{z.name}</td>
                            <td className="py-1.5 px-2 text-amber-300">{z.gxtKey}</td>
                            <td className="py-1.5 px-2 text-white/70">
                              ({z.min.x.toFixed(1)}, {z.min.y.toFixed(1)}, {z.min.z.toFixed(0)})
                            </td>
                            <td className="py-1.5 px-2 text-white/70">
                              ({z.max.x.toFixed(1)}, {z.max.y.toFixed(1)}, {z.max.z.toFixed(0)})
                            </td>
                            <td className="py-1.5 px-2 text-right">
                              <button
                                onClick={() => {
                                  onTeleportToGtaCoords(cx, cy, `Zone ${z.name} (${z.gxtKey})`);
                                  onClose();
                                }}
                                className="px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/35 text-sky-300 border border-sky-500/40 inline-flex items-center gap-1"
                              >
                                <Navigation className="w-3 h-3" />
                                Teleport ({cx.toFixed(0)}, {cy.toFixed(0)})
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'ide' && (
              <div className="flex-1 overflow-auto p-3 space-y-4 font-mono text-xs">
                {/* carcols.dat 127-color palette */}
                <div className="p-3 rounded bg-white/[0.02] border border-white/10">
                  <div className="text-white/80 font-bold mb-2">
                    carcols.dat — Official 127-Color Vehicle Palette (CVehicleModelInfo::LoadVehicleColours @ 0x5B6890):
                  </div>
                  <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
                    {bundle?.carcols.palette.slice(0, 72).map((sw) => (
                      <div
                        key={sw.index}
                        className="p-1 rounded bg-black/50 border border-white/10 flex flex-col items-center text-[9px]"
                        title={`#${sw.index}: ${sw.comment} (${sw.r},${sw.g},${sw.b})`}
                      >
                        <div
                          className="w-full h-4 rounded-sm border border-white/20 mb-0.5"
                          style={{ backgroundColor: sw.hex }}
                        />
                        <span className="text-white/70">#{sw.index}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* vehicles.ide table */}
                <div className="p-3 rounded bg-white/[0.02] border border-white/10">
                  <div className="text-white/80 font-bold mb-2">
                    vehicles.ide — Parsed Vehicle Definitions ({bundle?.vehiclesIde.length ?? 0} Vehicles):
                  </div>
                  <div className="max-h-48 overflow-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-white/15 text-white/50">
                          <th className="py-1 px-2">ID</th>
                          <th className="py-1 px-2">Model</th>
                          <th className="py-1 px-2">Type</th>
                          <th className="py-1 px-2">Handling ID</th>
                          <th className="py-1 px-2">Class</th>
                          <th className="py-1 px-2">Wheel Scale</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {bundle?.vehiclesIde.slice(0, 60).map((v) => (
                          <tr key={v.modelId} className="hover:bg-white/[0.04]">
                            <td className="py-1 px-2 text-emerald-400">{v.modelId}</td>
                            <td className="py-1 px-2 text-white font-semibold">{v.modelName}</td>
                            <td className="py-1 px-2 text-amber-300">{v.vehicleType}</td>
                            <td className="py-1 px-2 text-sky-300">{v.handlingId}</td>
                            <td className="py-1 px-2 text-purple-300">{v.vehicleClass}</td>
                            <td className="py-1 px-2 text-white/60">{v.wheelRadiusFront.toFixed(2)}m</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* weapon.dat table */}
                <div className="p-3 rounded bg-white/[0.02] border border-white/10">
                  <div className="text-white/80 font-bold mb-2">
                    weapon.dat — Parsed Firearm Ballistics (CWeaponInfo::LoadWeaponData @ 0x5BF750):
                  </div>
                  <div className="max-h-44 overflow-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-white/15 text-white/50">
                          <th className="py-1 px-2">Weapon</th>
                          <th className="py-1 px-2">Skill</th>
                          <th className="py-1 px-2">Damage</th>
                          <th className="py-1 px-2">Clip Ammo</th>
                          <th className="py-1 px-2">Target / Max Range</th>
                          <th className="py-1 px-2">Accuracy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {bundle?.weapons.map((w, i) => (
                          <tr key={`${w.weaponType}-${i}`} className="hover:bg-white/[0.04]">
                            <td className="py-1 px-2 text-amber-400 font-bold">{w.weaponType}</td>
                            <td className="py-1 px-2 text-white/70">
                              {w.skillLevel === 0 ? 'POOR' : w.skillLevel === 1 ? 'STD' : 'PRO/HITMAN'}
                            </td>
                            <td className="py-1 px-2 text-red-400 font-bold">{w.damage}</td>
                            <td className="py-1 px-2 text-emerald-300">{w.ammoClip}</td>
                            <td className="py-1 px-2 text-sky-300">
                              {w.targetRange}m / {w.weaponRange}m
                            </td>
                            <td className="py-1 px-2 text-purple-300">{w.accuracy.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
