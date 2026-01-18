export interface QRCodeImage {
  imgName: string;
  imgLocalName?: string;
  url: string;
  imgBtn: string;
  imgUrl?: string;
  errmsg?: string;
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
  userName?: string;
  userAvatar?: string;
}

export interface Character {
  id: string;
  name: string;
  nameEN?: string;
  nameVI?: string;
  nameCN: string;
  topicTag: string | null;
}

export function getCharacterName(character: Character, locale: 'vi' | 'en' | 'zh'): string {
  if (locale === 'zh') return character.nameCN;
  if (locale === 'vi') return character.nameVI || character.nameEN || character.name;
  return character.nameEN || character.name;
}

export interface QRCodesData {
  lastUpdated: string;
  totalCount: number;
  qrcodes: QRCode[];
}

export interface CharactersData {
  characters: Character[];
}
