/**
 * QR Converter Types
 * Naraka: Bladepoint face data format
 */

export interface HairParamData {
  [key: string]: {
    [key: string]: number[];
  };
}

export interface HairData {
  HeroID: number;
  HairID: number;
  Version: number;
  BaseLevelID: number;
  ParamData: HairParamData;
}

export interface RawNarakaData {
  faceData: number[];  // 658 facial parameters
  hairData: HairData;
}

export interface ConvertResult {
  success: boolean;
  qrDataUrl?: string;  // base64 data URL for download
  error?: string;
}
