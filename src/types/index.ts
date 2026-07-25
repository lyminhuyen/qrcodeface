export interface QRCodeImage {
  imgName: string;
  imgLocalName?: string;
  url?: string;
  imgBtn: string;
  imgUrl?: string;
  errmsg?: string;
  source?: 'feed-attribute' | 'author-comment';
  sourceCommentId?: string;
}

export interface QRCode {
  id: string;
  userId?: string;
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
  names: { en: string; zh: string; vi: string };
  topicTag: string | null;
  aliases?: string[];
}

export function getCharacterName(character: Character, locale: 'vi' | 'en' | 'zh'): string {
  const name = character.names[locale];
  // Fallback: vi → en, zh → en, empty → en
  if (!name) return character.names.en;
  return name;
}

export interface QRCodesData {
  lastUpdated: string;
  source?: string;
  totalCount: number;
  qrcodes: QRCode[];
}

export interface CharactersData {
  characters: Character[];
}

export interface GeneratedAuthor {
  key: string;
  userId?: string;
  userName: string;
  userAvatar: string;
  postCount: number;
  latestPostTime: number;
  commentQrCount: number;
}

export interface GeneratedAuthorsData {
  lastUpdated: string;
  totalCount: number;
  identifiedCount: number;
  authors: GeneratedAuthor[];
}
