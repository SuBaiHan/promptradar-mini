import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const YOUTUBE_SEARCH_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';
const MAX_RESULTS_PER_KEYWORD = 5;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const keywordsPath = path.join(rootDir, 'config', 'youtube-keywords.json');
const outputPath = path.join(rootDir, 'public', 'daily-prompts.json');

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function truncateText(value = '', maxLength = 120) {
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function getReadableApiError(error, status) {
  const reason = error?.errors?.[0]?.reason || error?.reason || '';

  if (['quotaExceeded', 'dailyLimitExceeded'].includes(reason)) {
    return 'YouTube API quota is not enough for today.';
  }

  if (['keyInvalid', 'badRequest'].includes(reason)) {
    return 'YouTube API key is invalid or the request is malformed.';
  }

  if (['accessNotConfigured', 'projectBlocked'].includes(reason)) {
    return 'YouTube Data API v3 is not enabled or the project is blocked.';
  }

  if (reason === 'rateLimitExceeded' || reason === 'userRateLimitExceeded') {
    return 'YouTube API rate limit was reached.';
  }

  if (status === 403 || reason === 'forbidden') {
    return 'YouTube API request was rejected. Check API restrictions and quota.';
  }

  return 'YouTube API request failed.';
}

async function readKeywords() {
  const raw = await readFile(keywordsPath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error('config/youtube-keywords.json must be an array of strings.');
  }

  const keywords = parsed
    .map((keyword) => String(keyword).trim())
    .filter(Boolean);

  if (!keywords.length) {
    throw new Error('config/youtube-keywords.json does not contain keywords.');
  }

  return keywords.slice(0, 10);
}

async function searchKeyword(keyword, apiKey) {
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    q: keyword,
    maxResults: String(MAX_RESULTS_PER_KEYWORD),
    order: 'relevance',
    key: apiKey,
  });
  const response = await fetch(`${YOUTUBE_SEARCH_ENDPOINT}?${params}`);
  const data = await response.json().catch(() => null);

  if (!response.ok || data?.error) {
    throw new Error(getReadableApiError(data?.error, response.status));
  }

  return (Array.isArray(data.items) ? data.items : [])
    .filter((item) => item?.id?.videoId && item?.snippet)
    .map((item) => {
      const videoId = item.id.videoId;
      const snippet = item.snippet;
      const url = `https://www.youtube.com/watch?v=${videoId}`;

      return {
        id: videoId,
        title: snippet.title || 'Untitled video',
        platform: 'YouTube',
        url,
        keyword,
        summary: truncateText(snippet.description || ''),
        channelTitle: snippet.channelTitle || '',
        publishedAt: snippet.publishedAt || '',
        discoveredDate: getTodayDate(),
        valueScore: 3,
        difficulty: '中',
        useCase: '待整理',
        status: '未处理',
        source: 'auto-youtube',
      };
    });
}

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    console.error('Missing YOUTUBE_API_KEY. Add it as a GitHub Actions secret.');
    process.exit(1);
  }

  const keywords = await readKeywords();
  const allItems = [];

  for (const keyword of keywords) {
    console.log(`Searching YouTube for keyword: ${keyword}`);
    const items = await searchKeyword(keyword, apiKey);
    allItems.push(...items);
  }

  const seenUrls = new Set();
  const dedupedItems = allItems.filter((item) => {
    if (seenUrls.has(item.url)) {
      return false;
    }
    seenUrls.add(item.url);
    return true;
  });

  const output = {
    generatedAt: new Date().toISOString(),
    keywords,
    count: dedupedItems.length,
    items: dedupedItems,
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${dedupedItems.length} items to public/daily-prompts.json.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Daily YouTube fetch failed.');
  process.exit(1);
});
