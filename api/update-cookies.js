export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if(req.method === 'OPTIONS') return res.status(200).end();
  if(req.method !== 'POST') return res.status(405).end();

  const { nidAut, nidSes } = req.body || {};
  if(!nidAut || !nidSes) return res.status(400).json({ error: 'missing values' });

  const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN;
  const PROJECT_ID = process.env.VERCEL_PROJECT_ID;

  if(!VERCEL_TOKEN || !PROJECT_ID) {
    return res.status(500).json({ error: 'Vercel 환경변수 미설정 (VERCEL_API_TOKEN, VERCEL_PROJECT_ID)' });
  }

  try {
    // 기존 환경변수 가져오기
    const listRes = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env`, {
      headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` }
    });
    const listData = await listRes.json();
    const envs = listData.envs || [];

    // NID_AUT, NID_SES 업데이트 또는 생성
    for(const [key, value] of [['CHZZK_NID_AUT', nidAut], ['CHZZK_NID_SES', nidSes]]) {
      const existing = envs.find(e => e.key === key);
      if(existing) {
        // 업데이트
        await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${existing.id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ value, target: ['production'] })
        });
      } else {
        // 새로 생성
        await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value, type: 'encrypted', target: ['production'] })
        });
      }
    }

    // 재배포 트리거
    await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'firstandsecond', gitSource: { type: 'github', repoId: process.env.VERCEL_REPO_ID, ref: 'main' } })
    });

    res.status(200).json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
