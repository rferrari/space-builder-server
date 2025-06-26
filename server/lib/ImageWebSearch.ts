import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';

import { Reset, Blue, Green, Red, Cyan, Gray, Yellow } from '../../server/lib/colors';
// import { bingImageSearch } from './bingSearch';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function extractImagesFromPage(url: string): Promise<string[]> {
  try {
    const { data, headers } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 8000,
    });

    if (!headers['content-type']?.includes('text/html')) return [];

    const $ = cheerio.load(data);
    const images: string[] = [];

    $('img').each((_, el) => {
      let src = $(el).attr('src') || '';
      if (src.startsWith('//')) src = 'https:' + src;
      else if (src.startsWith('/')) src = new URL(src, url).href;
      else if (!src.startsWith('http')) src = new URL(src, url).href;

      if (/\.(jpg|jpeg|png|svg)$/i.test(src)) {
        images.push(src);
      }
    });

    console.log(`🔍 Found ${$('img').length} <img> tags, extracted ${images.length} valid images`);
    return images;
  } catch {
    console.warn(`⚠️ Failed to extract from ${url}`);
    return [];
  }
}

export function scoreImage(url: string, query: string, seen: Map<string, number>): number {
  let score = 0;
  const urlLower = url.toLowerCase();
  const filename = urlLower.split('/').pop() || '';
  const baseName = filename.replace(/\.[a-z0-9]+$/, '');
  const isLogoQuery = query.toLowerCase().includes('logo');

  if (urlLower.includes('thumb') || urlLower.includes('small') || urlLower.includes('icon') || urlLower.includes('sprite')) score -= 2;
  if (/\/\d{1,3}px-/.test(urlLower)) score -= 2;

  if (urlLower.includes('large') || urlLower.includes('xlarge') || urlLower.includes('original') || urlLower.includes('hires')) score += 2;

  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) score += 2;
  else if (filename.endsWith('.png') || filename.endsWith('.webp')) score += 1;
  else if (filename.endsWith('.svg')) score += isLogoQuery ? 1 : -1;

  seen.set(baseName, (seen.get(baseName) || 0) + 1);
  if (seen.get(baseName)! > 1) score -= 1;

  if (filename.includes('logo')) score += isLogoQuery ? 2 : -2;
  if (filename.includes('banner') || filename.includes('icon')) score -= 1;
  if (/\d{3,}/.test(filename)) score += 1;

  if (urlLower.match(/\b(tui|roy|konrad|wothe|vermeer|fitzharris|gallery|photo|artwork|print)\b/)) score += 2;

  const cleanedQuery = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['the', 'and', 'with', 'from', 'for', 'of'].includes(w));

  const tokens = filename.split(/[^a-z0-9]+/);
  let matchCount = 0;

  for (const word of cleanedQuery) {
    const singular = word.replace(/s$/, '');
    if (tokens.includes(word) || tokens.includes(singular)) {
      matchCount++;
      score += 2;
    }
  }

  if (matchCount > 1) score += 1;

  return score;
}

async function extractImagesFromText(text: string): Promise<string[]> {
  const urlRegex = /https?:\/\/[^\s)\]]+/g;
  const links = [...text.matchAll(urlRegex)].map(m => m[0]);
  const allImages: string[] = [];

  const results = await Promise.allSettled(
    links.map(link => extractImagesFromPage(link).then(images => ({ link, images })))
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { link, images } = result.value;
      if (images.length) {
        console.log(`🔗 ${link} → 🖼️ Found ${images.length} image(s)`);
        allImages.push(...images);
      } else {
        console.warn(`🔗 ${link} → ❌ No valid images found`);
      }
    } else {
      console.warn(`⚠️ Failed to extract from link due to error`);
    }
  }

  console.log(`\n🎯 Total images extracted: ${allImages.length}`);
  return allImages;
}

export async function imageResearcher(prompt: string): Promise<{
  mediaJson: string;
  validMedia: any[];
  invalidMedia: any[];
}> {
  const research = await client.responses.create({
    model: 'gpt-4.1',
    tools: [{ type: 'web_search_preview' }],
    tool_choice: { type: 'web_search_preview' },
    input: `Find and return great websites links about main subject from this query: "${prompt}".`,
  });

  const outputText = research.output_text || '';
  console.log(outputText);
  
  const extractedUrls = await extractImagesFromText(outputText);
  const seen = new Map<string, number>();

  const validMedia = extractedUrls.map(url => {
    const score = scoreImage(url, prompt, seen);
    return {
      type: 'image',
      info: 'Extracted from page',
      url,
      score: typeof score === 'number' && !isNaN(score) ? score : -9999,
    };
  });

  if (validMedia.length === 0) {
    console.warn('⚠️ No valid media to score.');
    return {
      mediaJson: '[]',
      validMedia: [],
      invalidMedia: [],
    };
  }

  const scores = validMedia.map(m => m.score);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const cutoff = minScore + (maxScore - minScore) * 0.4;

  validMedia.forEach(img =>
    console.log(`${img.score >= cutoff ? "✅" : "❌"} ${img.score} - ${img.url}`)
  );

  const sorted = validMedia
    .filter(img => img.score >= cutoff && img.score >= 0)
    .sort((a, b) => b.score - a.score);

  console.log(`\n${Yellow}🔢 Scored and sorted image list:${Reset}`);
  sorted.forEach(item => console.log(`${Green}${item.score} - ${item.url}${Reset}`));

  return {
    mediaJson: JSON.stringify(sorted, null, 2),
    validMedia: sorted,
    invalidMedia: [],
  };
}

// async function testSingleQuery() {
//   console.log(`${Cyan}🧪 Testing Researcher with Single Query${Reset}\n`);

//   const userMessage: BotChatMessage = {
//     name: 'TestUser',
//     message: 'Create a simple space with a welcome message about Nouns DAO',
//     clientId: 1,
//     type: 'user_message',
//     spaceContext: '{}',
//   };

//   console.log(`${Gray}Query: "${userMessage.message}"${Reset}\n`);
//   console.log(`${Blue}🚀 Starting researcher...${Reset}\n`);

//   try {
//     const startTime = Date.now();
//     const result = await imageResearcher(userMessage.message);
//     const endTime = Date.now();

//     console.log(`\n${Green}✅ Completed in ${((endTime - startTime) / 1000).toFixed(2)}s${Reset}\n`);
//   } catch (error) {
//     console.error(`${Red}❌ Error: ${error}${Reset}`);
//   }
// }

// testSingleQuery().catch(console.error);
