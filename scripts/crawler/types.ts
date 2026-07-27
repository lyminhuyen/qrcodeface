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

export interface MediaItem {
  name: string;
  url: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface UserInfo {
  user: { uid: string; nick: string; icon: string };
}

export type UserInfoMap = Record<string, UserInfo>;

export interface Feed {
  id: string;
  uid: string;
  createTime: number;
  content: string;
  topicInfoList?: { topicName: string }[];
  attributeInfoList?: {
    type: string;
    externalData?: { importQrCodeData?: { imgList?: QRCodeImage[] } };
  }[];
  record?: {
    commentCount?: number;
  };
}

export interface ParsedQRCode {
  id: string;
  userId?: string;
  createTime: number;
  createDate: string;
  characterId: string;
  characterName: string;
  images: string[];
  qrCodes: QRCodeImage[];
  text: string;
  userName: string;
  userAvatar: string;
}

export interface Character {
  id: string;
  names: { en: string; zh: string; vi: string };
  topicTag: string | null;
  aliases?: string[];
}
