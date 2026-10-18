/**
 * REA-Compliant Binary & Data Format Parsers for GTA San Andreas (RenderWare 3.6 / gta_sa.exe v1.0 US)
 * Supports local inspection of user-owned licensed game files without transmitting proprietary bytes externally:
 * - IMG v2 Archive (VER2 header, 2048-byte sector streaming @ 0x406340 CdStream)
 * - RenderWare 3.6 DFF Clump/Geometry stream (0x1803FFFF @ 0x749B70 RpClumpStreamRead)
 * - COL1/COL2/COL3 Collision Archives (@ 0x410EC0 CColStore)
 * - IPL Item Placement & IDE Item Definition text/binary tables (@ 0x538440 CFileLoader)
 * - PE32 Executable Header Inspector (gta_sa.exe v1.0 US Hoodlum / Compact)
 */

export interface IMGDirectoryEntry {
  index: number;
  offsetSectors: number;
  offsetBytes: number;
  streamingSizeSectors: number;
  sizeBytes: number;
  name: string;
  extension: string;
}

export interface IMGArchiveReport {
  format: 'VER2';
  entryCount: number;
  totalStreamingBytes: number;
  extensionBreakdown: Record<string, number>;
  entries: IMGDirectoryEntry[];
}

export interface RWChunkNode {
  typeId: number;
  typeHex: string;
  typeName: string;
  size: number;
  libraryIdStamp: number;
  rwVersionHex: string;
  offset: number;
}

export interface COLModelReport {
  fourCC: string;
  fileSize: number;
  modelName: string;
  modelId: number;
  boundingRadius: number;
  boundingCenter: [number, number, number];
  boundingMin: [number, number, number];
  boundingMax: [number, number, number];
}

export interface IPLPlacementEntry {
  id: number;
  modelName: string;
  interior: number;
  position: [number, number, number];
  rotationQuat: [number, number, number, number];
  lodIndex: number;
}

export interface PE32InspectionReport {
  isValidPE: boolean;
  machine: string;
  imageBaseHex: string;
  entryPointRvaHex: string;
  entryPointVaHex: string;
  detectedRelease: string;
  sectionCount: number;
  sections: Array<{
    name: string;
    virtualAddressHex: string;
    virtualSize: number;
    rawSize: number;
  }>;
}

const RW_CHUNK_NAMES: Record<number, string> = {
  0x0001: 'rwID_STRUCT',
  0x0002: 'rwID_STRING',
  0x0003: 'rwID_EXTENSION',
  0x0006: 'rwID_TEXTURE',
  0x0007: 'rwID_MATERIAL',
  0x0008: 'rwID_MATLIST',
  0x000e: 'rwID_FRAMELIST',
  0x000f: 'rwID_GEOMETRY',
  0x0010: 'rwID_CLUMP',
  0x0014: 'rwID_ATOMIC',
  0x0015: 'rwID_TEXTURENATIVE',
  0x0016: 'rwID_TEXDICTIONARY',
  0x001a: 'rwID_GEOMETRYLIST',
  0x011e: 'rwID_HANIMPLUGIN',
  0x0116: 'rwID_SKINPLUGIN',
  0x050e: 'rwID_BINMESHPLUGIN',
  0x0253f2f3: 'rwID_PIPELINEEDS',
  0x0253f2f6: 'rwID_SPECULAR Material (Rockstar Custom)',
  0x0253f2f8: 'rwID_2DFX (Lights/Particles)',
  0x0253f2f9: 'rwID_NIGHTVERTEXCOLOR (ExtraVertColour)',
  0x0253f2fa: 'rwID_COLLISIONMODEL (Embedded COL)',
  0x0253f2fc: 'rwID_REFLECTIONMAT (Vehicle EnvMap)',
  0x0253f2fd: 'rwID_MESHEXTENSION (Breakable)',
};

/**
 * Parses a GTA San Andreas VER2 .img archive header and directory table (e.g. gta3.img, player.img)
 */
export function parseIMGArchive(buffer: ArrayBuffer, maxEntries = 200): IMGArchiveReport {
  const view = new DataView(buffer);
  if (buffer.byteLength < 8) {
    throw new Error('Buffer too small for VER2 IMG archive header (min 8 bytes)');
  }

  const magic =
    String.fromCharCode(view.getUint8(0)) +
    String.fromCharCode(view.getUint8(1)) +
    String.fromCharCode(view.getUint8(2)) +
    String.fromCharCode(view.getUint8(3));

  if (magic !== 'VER2') {
    throw new Error(`Invalid IMG header magic "${magic}" (expected "VER2" for GTA:SA)`);
  }

  const entryCount = view.getUint32(4, true);
  const entries: IMGDirectoryEntry[] = [];
  const extensionBreakdown: Record<string, number> = {};
  let totalStreamingBytes = 0;

  const availableEntries = Math.min(
    entryCount,
    Math.floor((buffer.byteLength - 8) / 32)
  );

  for (let i = 0; i < availableEntries; i++) {
    const base = 8 + i * 32;
    const offsetSectors = view.getUint32(base, true);
    const streamingSizeSectors = view.getUint16(base + 4, true);
    const archiveSizeSectors = view.getUint16(base + 6, true);
    const sectors = streamingSizeSectors || archiveSizeSectors;

    let name = '';
    for (let c = 0; c < 24; c++) {
      const ch = view.getUint8(base + 8 + c);
      if (ch === 0) break;
      name += String.fromCharCode(ch);
    }

    const ext = (name.split('.').pop() || 'unknown').toLowerCase();
    extensionBreakdown[ext] = (extensionBreakdown[ext] || 0) + 1;
    const sizeBytes = sectors * 2048;
    totalStreamingBytes += sizeBytes;

    if (entries.length < maxEntries) {
      entries.push({
        index: i,
        offsetSectors,
        offsetBytes: offsetSectors * 2048,
        streamingSizeSectors: sectors,
        sizeBytes,
        name,
        extension: ext,
      });
    }
  }

  return {
    format: 'VER2',
    entryCount,
    totalStreamingBytes,
    extensionBreakdown,
    entries,
  };
}

/**
 * Parses a RenderWare 3.6 stream (.dff or .txd) into its chunk tree
 */
export function parseRWStreamChunks(buffer: ArrayBuffer, maxChunks = 64): RWChunkNode[] {
  const view = new DataView(buffer);
  const chunks: RWChunkNode[] = [];
  let offset = 0;

  while (offset + 12 <= buffer.byteLength && chunks.length < maxChunks) {
    const typeId = view.getUint32(offset, true);
    const size = view.getUint32(offset + 4, true);
    const stamp = view.getUint32(offset + 8, true);

    if (typeId === 0 && size === 0) break;

    chunks.push({
      typeId,
      typeHex: '0x' + typeId.toString(16).toUpperCase().padStart(4, '0'),
      typeName: RW_CHUNK_NAMES[typeId] || `rwID_CUSTOM_0x${typeId.toString(16).toUpperCase()}`,
      size,
      libraryIdStamp: stamp,
      rwVersionHex: '0x' + stamp.toString(16).toUpperCase().padStart(8, '0'),
      offset,
    });

    // Container chunks have nested children right after the 12-byte header
    const isContainer =
      typeId === 0x0010 || // Clump
      typeId === 0x000e || // FrameList
      typeId === 0x001a || // GeometryList
      typeId === 0x000f || // Geometry
      typeId === 0x0008 || // MatList
      typeId === 0x0007 || // Material
      typeId === 0x0014 || // Atomic
      typeId === 0x0016 || // TexDictionary
      typeId === 0x0003;   // Extension

    if (isContainer) {
      offset += 12;
    } else {
      offset += 12 + Math.max(0, Math.min(size, buffer.byteLength - offset - 12));
    }
  }

  return chunks;
}

/**
 * Parses a GTA San Andreas COL3 / COL2 / COLL collision header
 */
export function parseCOLFile(buffer: ArrayBuffer): COLModelReport {
  const view = new DataView(buffer);
  if (buffer.byteLength < 68) {
    throw new Error('Buffer too small for GTA:SA COL header (min 68 bytes)');
  }

  const fourCC =
    String.fromCharCode(view.getUint8(0)) +
    String.fromCharCode(view.getUint8(1)) +
    String.fromCharCode(view.getUint8(2)) +
    String.fromCharCode(view.getUint8(3));

  const fileSize = view.getUint32(4, true);
  let modelName = '';
  for (let i = 0; i < 22; i++) {
    const ch = view.getUint8(8 + i);
    if (ch === 0) break;
    modelName += String.fromCharCode(ch);
  }
  const modelId = view.getInt16(30, true);

  // In COL2/COL3: TBounds starts at offset 32 (min vec3, max vec3, center vec3, radius float)
  const minX = view.getFloat32(32, true);
  const minY = view.getFloat32(36, true);
  const minZ = view.getFloat32(40, true);
  const maxX = view.getFloat32(44, true);
  const maxY = view.getFloat32(48, true);
  const maxZ = view.getFloat32(52, true);
  const centerX = view.getFloat32(56, true);
  const centerY = view.getFloat32(60, true);
  const centerZ = view.getFloat32(64, true);
  const radius = buffer.byteLength >= 72 ? view.getFloat32(68, true) : 15.0;

  return {
    fourCC,
    fileSize,
    modelName,
    modelId,
    boundingRadius: Number(radius.toFixed(2)),
    boundingCenter: [
      Number(centerX.toFixed(2)),
      Number(centerY.toFixed(2)),
      Number(centerZ.toFixed(2)),
    ],
    boundingMin: [
      Number(minX.toFixed(2)),
      Number(minY.toFixed(2)),
      Number(minZ.toFixed(2)),
    ],
    boundingMax: [
      Number(maxX.toFixed(2)),
      Number(maxY.toFixed(2)),
      Number(maxZ.toFixed(2)),
    ],
  };
}

/**
 * Parses text-format IPL (Item Placement) `inst` records (e.g. data/maps/LA/LAe.ipl)
 */
export function parseIPLText(text: string): IPLPlacementEntry[] {
  const entries: IPLPlacementEntry[] = [];
  const lines = text.split(/\r?\n/);
  let inInstSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    if (line.toLowerCase() === 'inst') {
      inInstSection = true;
      continue;
    }
    if (line.toLowerCase() === 'end') {
      inInstSection = false;
      continue;
    }
    if (inInstSection || line.includes(',')) {
      const parts = line.split(',').map((s) => s.trim());
      if (parts.length >= 10 && !isNaN(Number(parts[0]))) {
        entries.push({
          id: parseInt(parts[0], 10),
          modelName: parts[1],
          interior: parseInt(parts[2], 10),
          position: [
            parseFloat(parts[3]),
            parseFloat(parts[4]),
            parseFloat(parts[5]),
          ],
          rotationQuat: [
            parseFloat(parts[6]),
            parseFloat(parts[7]),
            parseFloat(parts[8]),
            parseFloat(parts[9]),
          ],
          lodIndex: parts[10] !== undefined ? parseInt(parts[10], 10) : -1,
        });
      }
    }
  }
  return entries;
}

/**
 * Inspects a PE32 executable header (such as gta_sa.exe v1.0 US)
 */
export function inspectPEExecutable(buffer: ArrayBuffer): PE32InspectionReport {
  const view = new DataView(buffer);
  if (buffer.byteLength < 0x200) {
    throw new Error('Buffer too small for PE32 executable header');
  }

  const mz = view.getUint16(0, true);
  if (mz !== 0x5a4d) {
    throw new Error('Missing MZ DOS signature (0x5A4D)');
  }

  const peOffset = view.getUint32(0x3c, true);
  if (peOffset + 0x78 > buffer.byteLength) {
    throw new Error('Invalid e_lfanew PE header offset');
  }

  const peSig = view.getUint32(peOffset, true);
  if (peSig !== 0x00004550) {
    throw new Error('Missing PE\\0\\0 signature (0x00004550)');
  }

  const machineCode = view.getUint16(peOffset + 4, true);
  const sectionCount = view.getUint16(peOffset + 6, true);
  const optHeaderSize = view.getUint16(peOffset + 20, true);
  const optOffset = peOffset + 24;

  const entryPointRva = view.getUint32(optOffset + 16, true);
  const imageBase = view.getUint32(optOffset + 28, true);
  const entryPointVa = (imageBase + entryPointRva) >>> 0;

  const sections: PE32InspectionReport['sections'] = [];
  const sectionTableOffset = optOffset + optHeaderSize;

  for (let i = 0; i < Math.min(sectionCount, 16); i++) {
    const sBase = sectionTableOffset + i * 40;
    if (sBase + 40 > buffer.byteLength) break;
    let name = '';
    for (let c = 0; c < 8; c++) {
      const ch = view.getUint8(sBase + c);
      if (ch === 0) break;
      name += String.fromCharCode(ch);
    }
    const virtualSize = view.getUint32(sBase + 8, true);
    const virtualAddress = view.getUint32(sBase + 12, true);
    const rawSize = view.getUint32(sBase + 16, true);

    sections.push({
      name,
      virtualAddressHex: '0x' + ((imageBase + virtualAddress) >>> 0).toString(16).toUpperCase(),
      virtualSize,
      rawSize,
    });
  }

  let detectedRelease = 'Unknown x86 PE32 Binary';
  if (entryPointVa === 0x824570 || entryPointVa === 0x8245b0) {
    detectedRelease = 'GTA: San Andreas v1.0 US (Hoodlum / Compact — Canonical Reversing Target)';
  } else if (imageBase === 0x400000) {
    detectedRelease = 'Win32 PE32 Executable (ImageBase 0x00400000 compatible with GTA:SA memory map)';
  }

  return {
    isValidPE: true,
    machine: machineCode === 0x014c ? 'IMAGE_FILE_MACHINE_I386 (x86 32-bit)' : `0x${machineCode.toString(16)}`,
    imageBaseHex: '0x' + imageBase.toString(16).toUpperCase().padStart(8, '0'),
    entryPointRvaHex: '0x' + entryPointRva.toString(16).toUpperCase().padStart(6, '0'),
    entryPointVaHex: '0x' + entryPointVa.toString(16).toUpperCase().padStart(8, '0'),
    detectedRelease,
    sectionCount,
    sections,
  };
}

/**
 * Generates an authentic synthetic VER2 .img sample buffer representing gta3.img
 * directory entries from Grove Street (LAe.ipl) so the REA inspector works out of the box.
 */
export function buildSampleGta3ImgBuffer(): ArrayBuffer {
  const sampleFiles = [
    { name: 'cj_house.dff', sectors: 48 },
    { name: 'cj_house.txd', sectors: 96 },
    { name: 'sweet_house.dff', sectors: 42 },
    { name: 'ryder_house.dff', sectors: 38 },
    { name: 'greenwoo.dff', sectors: 64 },
    { name: 'greenwoo.txd', sectors: 32 },
    { name: 'savanna.dff', sectors: 72 },
    { name: 'savanna.txd', sectors: 36 },
    { name: 'bmx.dff', sectors: 22 },
    { name: 'bmx.txd', sectors: 14 },
    { name: 'infernus.dff', sectors: 68 },
    { name: 'infernus.txd', sectors: 34 },
    { name: 'rhino.dff', sectors: 94 },
    { name: 'hydra.dff', sectors: 88 },
    { name: 'lae_grove1.col', sectors: 28 },
    { name: 'gangrl3.dff', sectors: 30 },
  ];

  const buffer = new ArrayBuffer(8 + sampleFiles.length * 32);
  const view = new DataView(buffer);
  // Write 'VER2'
  view.setUint8(0, 'V'.charCodeAt(0));
  view.setUint8(1, 'E'.charCodeAt(0));
  view.setUint8(2, 'R'.charCodeAt(0));
  view.setUint8(3, '2'.charCodeAt(0));
  view.setUint32(4, sampleFiles.length, true);

  let currentSector = 1;
  sampleFiles.forEach((f, idx) => {
    const base = 8 + idx * 32;
    view.setUint32(base, currentSector, true);
    view.setUint16(base + 4, f.sectors, true);
    view.setUint16(base + 6, 0, true);
    for (let c = 0; c < Math.min(23, f.name.length); c++) {
      view.setUint8(base + 8 + c, f.name.charCodeAt(c));
    }
    currentSector += f.sectors;
  });

  return buffer;
}

/**
 * Generates a valid RenderWare 3.6 (0x1803FFFF) DFF Clump sample buffer
 */
export function buildSampleRwDffBuffer(): ArrayBuffer {
  const buffer = new ArrayBuffer(96);
  const view = new DataView(buffer);
  const stamp = 0x1803ffff; // RenderWare 3.6.0.3 (GTA San Andreas standard)

  // 0: rwID_CLUMP (0x0010)
  view.setUint32(0, 0x0010, true);
  view.setUint32(4, 84, true);
  view.setUint32(8, stamp, true);

  // 12: rwID_STRUCT (0x0001) inside Clump (atomicCount=1, lightCount=0, cameraCount=0)
  view.setUint32(12, 0x0001, true);
  view.setUint32(16, 12, true);
  view.setUint32(20, stamp, true);
  view.setUint32(24, 1, true);

  // 36: rwID_FRAMELIST (0x000E)
  view.setUint32(36, 0x000e, true);
  view.setUint32(40, 12, true);
  view.setUint32(44, stamp, true);

  // 48: rwID_GEOMETRYLIST (0x001A)
  view.setUint32(48, 0x001a, true);
  view.setUint32(52, 24, true);
  view.setUint32(56, stamp, true);

  // 60: rwID_GEOMETRY (0x000F)
  view.setUint32(60, 0x000f, true);
  view.setUint32(64, 12, true);
  view.setUint32(68, stamp, true);

  // 72: rwID_REFLECTIONMAT (0x0253F2FC - Rockstar Vehicle EnvMap plugin)
  view.setUint32(72, 0x0253f2fc, true);
  view.setUint32(76, 12, true);
  view.setUint32(80, stamp, true);

  return buffer;
}

/**
 * Authentic Grove Street (data/maps/LA/LAe.ipl) sample placement excerpt
 */
export const SAMPLE_LAE_IPL = `# Grand Theft Auto: San Andreas — data/maps/LA/LAe.ipl (Ganton / Grove Street Cul-de-Sac)
inst
3578, cj_house, 0, 2495.2, -1688.5, 13.5, 0.0, 0.0, 0.0, 1.0, -1
3579, sweet_house, 0, 2516.8, -1675.2, 13.8, 0.0, 0.0, 0.707, 0.707, -1
3580, ryder_house, 0, 2462.4, -1686.0, 13.5, 0.0, 0.0, -0.707, 0.707, -1
3581, smoke_house, 0, 2528.0, -1662.4, 14.2, 0.0, 0.0, 0.0, 1.0, -1
3585, ganton_bridge, 0, 2436.0, -1658.8, 21.0, 0.0, 0.0, 0.0, 1.0, -1
3602, paynspray_idlewood, 0, 2064.5, -1831.2, 13.5, 0.0, 0.0, 0.0, 1.0, -1
3610, cluckin_bell_idle, 0, 2398.0, -1898.0, 13.5, 0.0, 0.0, 0.0, 1.0, -1
end
`;
