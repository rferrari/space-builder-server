import axios from 'axios';
import dotenv from 'dotenv';
import { scoreImage } from './websearch-test'; // Reuse your existing scoring logic

dotenv.config();

const BING_API_KEY = process.env.BING_API_KEY!;
const BING_ENDPOINT = 'https://api.bing.microsoft.com/v7.0/images/search';

export async function bingImageSearch(query: string): Promise<{ url: string; score: number }[]> {
  if (!BING_API_KEY) throw new Error('BING_API_KEY is missing from environment');

  try {
    const { data } = await axios.get(BING_ENDPOINT, {
      params: {
        q: query,
        count: 30,
        safeSearch: 'Moderate',
        imageType: 'Photo',
      },
      headers: {
        'Ocp-Apim-Subscription-Key': BING_API_KEY,
      },
    });

    const seen = new Map<string, number>();

    const results = (data.value || []).map((item: any) => {
      const url = item.contentUrl;
      const score = scoreImage(url, query, seen);
      return { url, score };
    });

    return results
      .filter(item => item.score >= 1)
      .sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('❌ Bing image search failed:', error.message);
    return [];
  }
}
