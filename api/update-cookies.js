export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if(req.method === 'OPTIONS') return res.status(200).end();
  if(req.method !== 'POST') return res.status(405).end();

  const { nidAut, nidSes } = req.body || {};
  if(!nidAut || !nidSes) return res.status(400).json({ error: 'missing values' });

  const FIREBASE_PROJECT = 'firstandsecond-b449c';
  const FIREBASE_API_KEY = 'AIzaSyCe3izM-r1ljlhO5YKyBe_3jEHvXxHy7Yw';

  try {
    await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/config/chzzkCookies?key=${FIREBASE_API_KEY}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            NID_AUT: { stringValue: nidAut },
            NID_SES: { stringValue: nidSes },
            updatedAt: { stringValue: new Date().toISOString() }
          }
        })
      }
    );
    res.status(200).json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
