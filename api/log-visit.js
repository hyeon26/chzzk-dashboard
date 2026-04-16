export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if(req.method === 'OPTIONS') return res.status(200).end();

  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['x-real-ip'] || 'unknown';
    const country = req.headers['x-vercel-ip-country'] || 'unknown';
    const city = req.headers['x-vercel-ip-city'] ? decodeURIComponent(req.headers['x-vercel-ip-city']) : 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const referer = req.headers['referer'] || '';
    const { page = '/' } = req.query;

    const FIREBASE_PROJECT = 'firstandsecond-b449c';
    const FIREBASE_API_KEY = 'AIzaSyCe3izM-r1ljlhO5YKyBe_3jEHvXxHy7Yw';

    const now = new Date();
    const data = {
      fields: {
        ip:        { stringValue: ip },
        country:   { stringValue: country },
        city:      { stringValue: city },
        userAgent: { stringValue: userAgent },
        page:      { stringValue: page },
        referer:   { stringValue: referer },
        time:      { stringValue: now.toISOString() },
        createdAt: { timestampValue: now.toISOString() }
      }
    };

    await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/visitLogs?key=${FIREBASE_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
    );

    res.status(200).json({ ok: true });
  } catch(e) {
    res.status(200).json({ ok: false, error: e.message });
  }
}
