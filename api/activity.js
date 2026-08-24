const API_BASE = 'https://testnet.vibevibe.fun/api/v1/chains/46630/launches';

export default async function handler(request, response) {
  const address = request.query.address;
  if (typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return response.status(400).json({ error: 'Invalid contract address' });
  }

  try {
    const upstream = await fetch(`${API_BASE}/${address}/activity?limit=8`);
    const payload = await upstream.json();
    return response.status(upstream.status).json(payload);
  } catch {
    return response.status(502).json({ error: 'Activity data is temporarily unavailable' });
  }
}
