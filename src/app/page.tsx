import Gallery from '@/components/Gallery';
import qrcodesData from '@/data/qrcodes/index.json';
import charactersData from '@/data/characters.json';
import { QRCodesData, CharactersData } from '@/types';

export default function Home() {
  const qrcodes = (qrcodesData as QRCodesData).qrcodes;
  const characters = (charactersData as CharactersData).characters;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                QRCode Face Gallery
              </h1>
              <p className="text-sm text-gray-500">
                Naraka: Bladepoint Face Codes
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>{qrcodes.length} QR codes</p>
              <p>
                Last updated:{' '}
                {new Date((qrcodesData as QRCodesData).lastUpdated).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Gallery */}
      <Gallery qrcodes={qrcodes} characters={characters} />
    </div>
  );
}
