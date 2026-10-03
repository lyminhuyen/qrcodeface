import { toggleFavoriteAction } from '@/app/actions';
import { getAdapter } from '@/lib/adapter';

export const dynamic = 'force-dynamic';
const TEST_QR_ID = 'evaluation-qr-001';

export default async function FavoritesPage() {
  const adapter = await getAdapter();
  const result = await adapter.listFavorites();
  const active = result.ok && result.data?.some((favorite) => favorite.qrcodeId === TEST_QR_ID);
  return <><section className="hero"><div className="eyebrow">Ownership contract</div><h1>Favorites</h1><p>Only the current session owner may read or mutate these rows.</p></section><section className="card"><h2>Test QR</h2><p><code>{TEST_QR_ID}</code></p><form action={toggleFavoriteAction}><input type="hidden" name="qrcodeId" value={TEST_QR_ID} /><input type="hidden" name="desired" value={active ? 'false' : 'true'} /><button type="submit">{active ? 'Remove Favorite' : 'Add Favorite'}</button></form>{!result.ok && <div className="message danger">{result.message}</div>}</section></>;
}
