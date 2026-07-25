import AdminClient from './AdminClient';
import charactersData from '@/data/characters.json';
import { loadAllQRCodes } from '@/lib/qrcodes/data.server';
import type { CharactersData } from '@/types';

export default async function AdminPage() {
  const qrcodes = await loadAllQRCodes();
  const characters = (charactersData as CharactersData).characters;
  return <AdminClient initialQRCodes={qrcodes} characters={characters} />;
}
