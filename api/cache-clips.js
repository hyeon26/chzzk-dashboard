import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCe3izM-r1ljlhO5YKyBe_3jEHvXxHy7Yw',
  authDomain: 'firstandsecond-b449c.firebaseapp.com',
  projectId: 'firstandsecond-b449c',
  storageBucket: 'firstandsecond-b449c.firebasestorage.app',
  messagingSenderId: '794631097887',
  appId: '1:794631097887:web:e03fe5f49915f4c741cf2a'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const CHANNEL_ID = '48070f8882233efa7aee52519fee8fca';
  const API_KEY = process.env.YOUTUBE_API_KEY;

  const headers = {
    'User-Agent': 'Mozilla/5.0',
    'Referer': 'https://chzzk.naver.com/',
    'Origin': 'https://chzzk.naver.com',
  };

  try {
    // 치지직 전체 클립 수집
    const chzzkClips = [];
    let nextUID = null;
    do {
      const url = nextUID
        ? `https://api.chzzk.naver.com/service/v1/channels/${CHANNEL_ID}/clips?orderType=RECENT&size=50&clipUID=${nextUID}`
        : `https://api.chzzk.naver.com/service/v1/channels/${CHANNEL_ID}/clips?orderType=RECENT&size=50`;
      const data = await fetch(url, { headers }).then(r => r.json());
      (data?.content?.data || []).forEach(c => chzzkClips.push({
        type: 'chzzk', id: c.clipUID, title: c.clipTitle,
        thumb: c.thumbnailImageUrl || null, duration: c.duration,
        views: c.readCount, date: c.createdDate, adult: c.adult || false
      }));
      nextUID = data?.content?.page?.next?.clipUID || null;
    } while (nextUID);

    // 유튜브 채널 ID
    const chRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=_brother-siste&key=${API_KEY}`
    ).then(r => r.json());
    const ytChannelId = chRes?.items?.[0]?.id;

    // 유튜브 쇼츠 수집
    const ytRaw = [];
    let pageToken = null;
    if (ytChannelId) {
      do {
        const url = new URL('https://www.googleapis.com/youtube/v3/search');
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('channelId', ytChannelId);
        url.searchParams.set('type', 'video');
        url.searchParams.set('videoDuration', 'short');
        url.searchParams.set('order', 'date');
        url.searchParams.set('maxResults', '50');
        url.searchParams.set('key', API_KEY);
        if (pageToken) url.searchParams.set('pageToken', pageToken);
        const data = await fetch(url.toString()).then(r => r.json());
        ytRaw.push(...(data?.items || []));
        pageToken = data?.nextPageToken || null;
      } while (pageToken);
    }

    // 유튜브 조회수
    const viewsMap = {};
    for (let i = 0; i < ytRaw.length; i += 50) {
      const ids = ytRaw.slice(i, i + 50).map(v => v.id.videoId).join(',');
      const statsData = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${API_KEY}`
      ).then(r => r.json());
      (statsData?.items || []).forEach(v => {
        viewsMap[v.id] = parseInt(v.statistics?.viewCount || 0);
      });
    }

    const ytItems = ytRaw.map(v => ({
      type: 'youtube', id: v.id.videoId, title: v.snippet.title,
      thumb: v.snippet.thumbnails?.medium?.url || null,
      duration: null, views: viewsMap[v.id.videoId] || 0,
      date: v.snippet.publishedAt, adult: false
    }));

    // 날짜순 정렬
    const all = [...chzzkClips, ...ytItems].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Firebase SDK로 청크 저장
    const CHUNK_SIZE = 500;
    const chunks = [];
    for (let i = 0; i < all.length; i += CHUNK_SIZE) {
      chunks.push(all.slice(i, i + CHUNK_SIZE));
    }

    for (let i = 0; i < chunks.length; i++) {
      await setDoc(doc(db, 'clipCache', `chunk_${i}`), {
        clips: chunks[i],
        updatedAt: new Date().toISOString()
      });
    }

    // 메타 저장
    await setDoc(doc(db, 'clipCache', 'meta'), {
      total: all.length,
      chunks: chunks.length,
      updatedAt: new Date().toISOString()
    });

    res.status(200).json({ success: true, total: all.length, chunks: chunks.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
