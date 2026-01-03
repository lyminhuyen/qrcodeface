export interface QRCodeImage {
  imgName: string;
  imgLocalName: string;
  url: string;
  imgBtn: string;
}

export interface QRCode {
  id: string;
  createTime: number;
  createDate: string;
  characterId: string;
  characterName: string;
  images: string[];
  qrCodes: QRCodeImage[];
  text: string;
}

export interface Character {
  id: string;
  name: string;
  nameCN: string;
  topicTag: string | null;
}

export interface QRCodesData {
  lastUpdated: string;
  totalCount: number;
  qrcodes: QRCode[];
}

export interface CharactersData {
  characters: Character[];
}
