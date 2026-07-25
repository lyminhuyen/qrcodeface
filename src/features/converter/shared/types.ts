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
  faceData: number[];
  hairData: HairData;
}

export interface ConvertResult {
  success: boolean;
  qrDataUrl?: string;
  error?: string;
}
