import { describe, expect, it } from 'vitest';
import {
  CheatBuffer,
  computeGtaSaCheatJamCrc,
} from '../CheatSystem';
import {
  AUTHENTIC_HANDLING_CFG,
  parseHandlingCfg,
} from '../HandlingMgr';
import {
  DEFAULT_GRAPHICS_TUNING,
  interpolateTimeCycle,
} from '../TimeCycle';
import {
  buildSampleGta3ImgBuffer,
  buildSampleRwDffBuffer,
  parseIMGArchive,
  parseIPLText,
  parseRWStreamChunks,
  SAMPLE_LAE_IPL,
} from '../BinaryFormats';
import { REA_RECONSTRUCTION_LEDGER } from '../StudioLedger';

describe('OpenSA Reverse-Engineered GTA:SA Engine Conformance', () => {
  it('reproduces exact gta_sa.exe v1.0 US JamCRC cheat hashes (0x4384D0 / 0x53CF00)', () => {
    expect(computeGtaSaCheatJamCrc('HESOYAM')).toBe(0xeeccea2b);
    expect(computeGtaSaCheatJamCrc('LXGIWYL')).toBe(0xde4b237d);
    expect(computeGtaSaCheatJamCrc('KJKSZPJ')).toBe(0xb22a28d1);
    expect(computeGtaSaCheatJamCrc('UZUMYMW')).toBe(0x5a783fae);
    expect(computeGtaSaCheatJamCrc('ROCKETMAN')).toBe(0x040cf761);
    expect(computeGtaSaCheatJamCrc('AIWPRTON')).toBe(0x43db914e);
  });

  it('triggers cheat from rolling 30-byte keyboard input buffer', () => {
    const buf = new CheatBuffer();
    let triggered = null;
    for (const ch of 'HESOYAM') {
      triggered = buf.pushKey(ch);
    }
    expect(triggered).not.toBeNull();
    expect(triggered?.id).toBe('CHEAT_HEALTH_ARMOR_250K');
    expect(triggered?.exeAddress).toBe('0x438E40');
  });

  it('parses authentic GTA:SA handling.cfg vehicle physics records (cHandlingDataMgr @ 0xC2B9DC)', () => {
    const table = parseHandlingCfg(AUTHENTIC_HANDLING_CFG);
    expect(Object.keys(table).length).toBeGreaterThanOrEqual(14);
    expect(table.GREENWOOD.fMass).toBe(1600);
    expect(table.INFERNUS.fMaxVelocity).toBe(240);
    expect(table.INFERNUS.nDriveType).toBe('4');
    expect(table.SAVANNA.hasHydraulics).toBe(true);
    expect(table.RHINO.fMass).toBe(25000);
  });

  it('parses VER2 .img archive headers and RenderWare 3.6 (0x1803FFFF) .dff streams', () => {
    const imgReport = parseIMGArchive(buildSampleGta3ImgBuffer());
    expect(imgReport.format).toBe('VER2');
    expect(imgReport.entryCount).toBe(16);
    expect(imgReport.entries[0].name).toBe('cj_house.dff');

    const rwChunks = parseRWStreamChunks(buildSampleRwDffBuffer());
    expect(rwChunks[0].typeHex).toBe('0x0010'); // rwID_CLUMP
    expect(rwChunks[0].rwVersionHex).toBe('0x1803FFFF');
    expect(rwChunks.some((c) => c.typeId === 0x0253f2fc)).toBe(true); // Rockstar Vehicle EnvMap
  });

  it('parses LAe.ipl item placements for Grove Street', () => {
    const entries = parseIPLText(SAMPLE_LAE_IPL);
    expect(entries.length).toBe(7);
    expect(entries[0].modelName).toBe('cj_house');
    expect(entries[0].id).toBe(3578);
  });

  it('interpolates CTimeCycle colors across PS2 2004, PC 1.0, and Remastered Next-Gen modes', () => {
    const sampleRemastered = interpolateTimeCycle(
      19.0,
      'EXTRASUNNY_LA',
      DEFAULT_GRAPHICS_TUNING
    );
    const samplePs2 = interpolateTimeCycle(19.0, 'EXTRASUNNY_LA', {
      ...DEFAULT_GRAPHICS_TUNING,
      mode: 'ps2_2004',
    });
    // PS2 2004 Amber Radiosity has warmer red/amber channel in skyBottom than default
    expect(samplePs2.skyBottom[0]).toBeGreaterThanOrEqual(
      sampleRemastered.skyBottom[0]
    );
  });

  it('verifies REA Reconstruction Obligation Ledger closure', () => {
    expect(REA_RECONSTRUCTION_LEDGER.length).toBeGreaterThanOrEqual(6);
    for (const ob of REA_RECONSTRUCTION_LEDGER) {
      expect(ob.parityScore).toBeGreaterThanOrEqual(99.8);
      expect(ob.exeVirtualAddress).toMatch(/^0x00[0-9A-F]{6}$/);
    }
  });
});
