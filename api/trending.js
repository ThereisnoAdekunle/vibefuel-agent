const API_URL = 'https://testnet.vibevibe.fun/api/v1/chains/46630/launches?limit=24';

export default async function handler(_request, response) {
  try {
    const upstream = await fetch(API_URL);
    const payload = await upstream.json();
    if (!upstream.ok || payload.error || !payload.data?.items) {
      return response.status(upstream.status || 502).json({ error: 'Trending data is temporarily unavailable' });
    }

    const items = payload.data.items
      .filter((item) => item.moderation?.visibility === 'VISIBLE')
      .sort((left, right) => {
        const leftVolume = BigInt(left.analytics?.volume5mWei ?? 0);
        const rightVolume = BigInt(right.analytics?.volume5mWei ?? 0);
        return rightVolume > leftVolume ? 1 : rightVolume < leftVolume ? -1 : 0;
      })
      .slice(0, 4)
      .map((item) => ({
        name: item.name,
        symbol: item.symbol,
        tokenAddress: item.tokenAddress,
        lifecycle: item.curve?.lifecycle,
        volume5mWei: item.analytics?.volume5mWei ?? '0',
        priceChange5mBps: item.analytics?.priceChange5mBps ?? '0',
      }));

    return response.status(200).json({ data: { items } });
  } catch {
    return response.status(502).json({ error: 'Trending data is temporarily unavailable' });
  }
}
