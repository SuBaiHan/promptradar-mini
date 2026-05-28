import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  Check,
  ClipboardList,
  Copy,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Library,
  Link as LinkIcon,
  Plus,
  Radar,
  Save,
  Search,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

const PROMPTS_STORAGE_KEY = 'promptradar-mini-prompts';
const RADAR_STORAGE_KEY = 'promptradar-mini-radar-items';
const YOUTUBE_SETTINGS_STORAGE_KEY = 'promptradar-mini-youtube-settings';
const YOUTUBE_SEARCH_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';

const sceneOptions = [
  '写作',
  '翻译',
  '编程',
  '图片生成',
  '视频生成',
  '办公',
  '学习',
  '资料查询',
  '其他',
];

const platformOptions = [
  'YouTube',
  'B站',
  '抖音',
  '小红书',
  '知乎',
  '网页',
  '其他',
];

const radarStatuses = ['未处理', '值得收藏', '已忽略', '已收藏'];
const difficultyOptions = ['低', '中', '高'];

const defaultYoutubeSettings = {
  apiKey: '',
  query: '',
  maxResults: 10,
  order: 'relevance',
};

const blankPrompt = {
  title: '',
  scene: '写作',
  content: '',
  tags: '',
  note: '',
  favorite: false,
};

const blankRadarDraft = {
  title: '',
  platform: '网页',
  url: '',
  keyword: '',
  summary: '',
  valueScore: 3,
  difficulty: '中',
  useCase: '',
  discoveredDate: getTodayDate(),
};

const starterPrompts = [
  {
    id: 'starter-1',
    title: '产品需求拆解助手',
    scene: '办公',
    content:
      '你是一名资深产品经理。请把下面的需求拆解为用户故事、核心流程、边界情况、验收标准和第一版优先级，并指出需要进一步确认的问题。',
    tags: ['产品', '需求', 'PRD'],
    note: '适合把模糊想法整理成第一版需求文档。',
    favorite: true,
    createdAt: '2026-05-28T00:00:00.000Z',
    updatedAt: '2026-05-28T00:00:00.000Z',
  },
  {
    id: 'starter-2',
    title: '代码审查清单',
    scene: '编程',
    content:
      '请以代码审查者的视角检查下面的改动，优先指出潜在 bug、可维护性风险、性能问题和缺失测试，并给出简洁修改建议。',
    tags: ['研发', 'review', '质量'],
    note: '适合提交前做一次轻量自查。',
    favorite: false,
    createdAt: '2026-05-28T00:00:00.000Z',
    updatedAt: '2026-05-28T00:00:00.000Z',
  },
];

const radarSeeds = [
  {
    title: '会议纪要到行动清单',
    platform: '网页',
    url: '',
    keyword: '会议纪要 自动整理',
    summary:
      '把会议纪要整理为关键结论、待办事项、负责人、截止时间、风险点和下次会议建议。',
    valueScore: 4,
    difficulty: '低',
    useCase: '办公',
  },
  {
    title: '社媒内容变体生成器',
    platform: '网页',
    url: '',
    keyword: '社媒文案 多版本生成',
    summary:
      '基于同一主题生成多条不同风格的社媒文案，适合做内容方向探索。',
    valueScore: 4,
    difficulty: '中',
    useCase: '写作',
  },
  {
    title: '学习路线规划师',
    platform: '知乎',
    url: '',
    keyword: '14 天学习计划',
    summary:
      '把宽泛学习目标拆成每天的学习目标、练习任务、验收方式和复盘问题。',
    valueScore: 5,
    difficulty: '低',
    useCase: '学习',
  },
  {
    title: '用户访谈问题生成',
    platform: '网页',
    url: '',
    keyword: '用户访谈 提纲',
    summary:
      '围绕产品假设生成 30 分钟访谈提纲，包含破冰、行为问题、追问和反诱导表达。',
    valueScore: 4,
    difficulty: '中',
    useCase: '资料查询',
  },
  {
    title: '长文结构诊断',
    platform: '小红书',
    url: '',
    keyword: '文章结构 诊断',
    summary:
      '检查文章草稿的结构问题、论证跳跃、重复段落和读者困惑点，并输出更清晰的大纲。',
    valueScore: 5,
    difficulty: '中',
    useCase: '写作',
  },
  {
    title: '轻量竞品分析',
    platform: '网页',
    url: '',
    keyword: '竞品分析 表格',
    summary:
      '基于人工收集的竞品信息，整理目标用户、核心功能、定价、差异化和可借鉴机会。',
    valueScore: 4,
    difficulty: '高',
    useCase: '办公',
  },
];

const navItems = [
  { id: 'library', label: '我的提示词库', icon: Library },
  { id: 'radar', label: '每日提示词雷达', icon: Radar },
];

function createId(prefix = 'item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const date = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

function parseTags(value = '') {
  return value
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatTags(tags) {
  return Array.isArray(tags) ? tags.join(', ') : '';
}

function inferScene(prompt) {
  const value = prompt.scene || prompt.category || '';
  const sceneMap = {
    产品: '办公',
    研发: '编程',
    效率: '办公',
    商业: '办公',
    客服: '办公',
    研究: '资料查询',
    提示词: '其他',
  };

  if (sceneOptions.includes(value)) {
    return value;
  }

  return sceneMap[value] || '其他';
}

function mapUseCaseToScene(useCase = '') {
  const value = useCase.trim();

  if (sceneOptions.includes(value)) {
    return value;
  }

  const matchers = [
    ['写作', ['写作', '文章', '文案', '编辑', '润色']],
    ['翻译', ['翻译', '双语', '本地化']],
    ['编程', ['编程', '代码', '研发', '开发', '调试']],
    ['图片生成', ['图片', '图像', '绘画', '海报', 'midjourney', 'stable diffusion']],
    ['视频生成', ['视频', '剪辑', '分镜', '短视频']],
    ['办公', ['办公', '会议', '表格', '汇报', '邮件', '项目']],
    ['学习', ['学习', '课程', '复习', '计划']],
    ['资料查询', ['查询', '资料', '研究', '搜索', '信息']],
  ];
  const lowerValue = value.toLowerCase();
  const found = matchers.find(([, keywords]) =>
    keywords.some((keyword) => lowerValue.includes(keyword.toLowerCase())),
  );

  return found?.[0] || '其他';
}

function normalizePrompt(prompt) {
  const now = new Date().toISOString();
  const createdAt = prompt.createdAt || now;

  return {
    id: prompt.id || createId('prompt'),
    title: prompt.title || '未命名提示词',
    scene: inferScene(prompt),
    content: prompt.content || '',
    tags: Array.isArray(prompt.tags) ? prompt.tags : parseTags(prompt.tags),
    note: prompt.note || '',
    favorite: Boolean(prompt.favorite),
    createdAt,
    updatedAt: prompt.updatedAt || createdAt,
  };
}

function normalizePlatform(value) {
  return platformOptions.includes(value) ? value : '其他';
}

function normalizeDifficulty(value) {
  return difficultyOptions.includes(value) ? value : '中';
}

function normalizeScore(value) {
  const score = Number(value);
  if (Number.isNaN(score)) {
    return 3;
  }
  return Math.min(5, Math.max(1, Math.round(score)));
}

function normalizeYoutubeSettings(settings = {}) {
  const maxResults = Number(settings.maxResults);
  const order = ['relevance', 'date'].includes(settings.order)
    ? settings.order
    : 'relevance';

  return {
    apiKey: settings.apiKey || '',
    query: settings.query || '',
    maxResults: Number.isNaN(maxResults)
      ? 10
      : Math.min(25, Math.max(1, Math.round(maxResults))),
    order,
  };
}

function readStorageItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function loadYoutubeSettings() {
  try {
    const saved = readStorageItem(YOUTUBE_SETTINGS_STORAGE_KEY);
    if (!saved) {
      return defaultYoutubeSettings;
    }

    return normalizeYoutubeSettings(JSON.parse(saved));
  } catch {
    return defaultYoutubeSettings;
  }
}

function normalizeDate(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return getTodayDate();
}

function truncateText(value = '', maxLength = 120) {
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function getReadableYoutubeError(error, status) {
  const reason = error?.errors?.[0]?.reason || error?.reason || '';
  const message = error?.message || '';

  if (['quotaExceeded', 'dailyLimitExceeded'].includes(reason)) {
    return 'YouTube API 配额不足，本次搜索没有完成。请稍后再试，或检查 Google Cloud 配额。';
  }

  if (['keyInvalid', 'badRequest'].includes(reason)) {
    return 'YouTube API Key 无效，请检查是否复制完整，或在 Google Cloud 中重新生成。';
  }

  if (['accessNotConfigured', 'projectBlocked'].includes(reason)) {
    return '请求被 YouTube 拒绝，请确认已在 Google Cloud 中启用 YouTube Data API v3。';
  }

  if (
    ['forbidden', 'ipRefererBlocked', 'refererNotAllowedMapError'].includes(
      reason,
    ) ||
    status === 403 ||
    message.toLowerCase().includes('api key')
  ) {
    return '请求被 YouTube 拒绝，请检查 API Key 权限、来源限制或 API 配额设置。';
  }

  if (reason === 'rateLimitExceeded' || reason === 'userRateLimitExceeded') {
    return '请求过于频繁或配额受限，请稍后再手动搜索。';
  }

  return 'YouTube 搜索失败，请检查网络、API Key 和关键词后再试。';
}

function loadPrompts() {
  try {
    const saved = readStorageItem(PROMPTS_STORAGE_KEY);
    if (!saved) {
      return starterPrompts.map(normalizePrompt);
    }

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.map(normalizePrompt) : [];
  } catch {
    return starterPrompts.map(normalizePrompt);
  }
}

function buildDailyRadarItems() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayIndex = Math.floor((now - start) / 86400000);
  const today = getTodayDate();

  return Array.from({ length: 3 }, (_, index) => {
    const seed = radarSeeds[(dayIndex + index * 2) % radarSeeds.length];
    const createdAt = new Date().toISOString();

    return {
      id: `daily-${today}-${index}`,
      ...seed,
      status: '未处理',
      discoveredDate: today,
      createdAt,
      updatedAt: createdAt,
    };
  });
}

function normalizeRadarItem(item) {
  const now = new Date().toISOString();
  const createdAt = item.createdAt || now;
  const platform = item.platform || item.sourcePlatform || '其他';
  const url = item.url || item.link || '';
  const keyword = item.keyword || item.searchKeyword || '';
  const status = radarStatuses.includes(item.status) ? item.status : '未处理';

  return {
    id: item.id || createId('radar'),
    title: item.title || '未命名雷达内容',
    platform: normalizePlatform(platform),
    url,
    keyword,
    summary: item.summary || item.signal || item.content || '',
    valueScore: normalizeScore(item.valueScore),
    difficulty: normalizeDifficulty(item.difficulty),
    useCase: item.useCase || '',
    discoveredDate: normalizeDate(item.discoveredDate),
    status,
    createdAt,
    updatedAt: item.updatedAt || createdAt,
  };
}

function loadRadarItems() {
  try {
    const saved = readStorageItem(RADAR_STORAGE_KEY);
    if (!saved) {
      return buildDailyRadarItems().map(normalizeRadarItem);
    }

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.map(normalizeRadarItem) : [];
  } catch {
    return buildDailyRadarItems().map(normalizeRadarItem);
  }
}

function formatFullPromptCard(prompt) {
  return [
    `标题：${prompt.title || ''}`,
    `场景：${prompt.scene || ''}`,
    `标签：${formatTags(prompt.tags)}`,
    `提示词：${prompt.content || ''}`,
    `备注：${prompt.note || ''}`,
  ].join('\n');
}

function formatRadarAsPromptContent(item) {
  return [
    '请基于以下雷达来源内容，提炼可执行的 AI 提示词或工作流：',
    '',
    `标题：${item.title}`,
    `来源平台：${item.platform || '未填写'}`,
    `搜索关键词：${item.keyword || '未填写'}`,
    `适用场景：${item.useCase || '未填写'}`,
    `使用难度：${item.difficulty || '未填写'}`,
    `推荐价值评分：${item.valueScore || 3}/5`,
    `内容摘要：${item.summary || '未填写'}`,
    `链接：${item.url || '未填写'}`,
  ].join('\n');
}

function escapeMarkdown(value = '') {
  return String(value).replace(/```/g, '\\`\\`\\`');
}

function buildMarkdownExport(prompts) {
  const lines = [
    '# PromptRadar Mini 提示词库导出',
    '',
    `导出时间：${new Date().toLocaleString('zh-CN')}`,
    `提示词数量：${prompts.length}`,
    '',
  ];

  prompts.forEach((prompt, index) => {
    lines.push(`## ${index + 1}. ${prompt.title}`);
    lines.push('');
    lines.push(`- 场景：${prompt.scene}`);
    lines.push(`- 标签：${formatTags(prompt.tags) || '无'}`);
    lines.push(`- 收藏：${prompt.favorite ? '是' : '否'}`);
    lines.push(`- 更新时间：${formatDate(prompt.updatedAt)}`);
    lines.push('');
    lines.push('### 提示词');
    lines.push('');
    lines.push('```text');
    lines.push(escapeMarkdown(prompt.content));
    lines.push('```');
    lines.push('');
    lines.push('### 备注');
    lines.push('');
    lines.push(prompt.note ? escapeMarkdown(prompt.note) : '无');
    lines.push('');
  });

  return lines.join('\n');
}

function escapeCsvCell(value = '') {
  const text = String(value).replace(/"/g, '""');
  return `"${text}"`;
}

function buildCsvExport(prompts) {
  const headers = [
    '标题',
    '场景',
    '标签',
    '提示词',
    '备注',
    '收藏',
    '创建时间',
    '更新时间',
  ];
  const rows = prompts.map((prompt) => [
    prompt.title,
    prompt.scene,
    formatTags(prompt.tags),
    prompt.content,
    prompt.note,
    prompt.favorite ? '是' : '否',
    formatDate(prompt.createdAt),
    formatDate(prompt.updatedAt),
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n');

  return `\uFEFF${csv}`;
}

function buildDailySummary(items, date) {
  const groups = items.reduce((result, item) => {
    const key = item.platform || '其他';
    return {
      ...result,
      [key]: [...(result[key] || []), item],
    };
  }, {});
  const lines = [
    `# PromptRadar Mini 今日雷达摘要`,
    '',
    `日期：${date}`,
    `内容数量：${items.length}`,
    '',
  ];

  Object.entries(groups).forEach(([platform, groupItems]) => {
    lines.push(`## ${platform}`);
    lines.push('');
    groupItems.forEach((item, index) => {
      lines.push(`### ${index + 1}. ${item.title}`);
      lines.push('');
      lines.push(`- 链接：${item.url || '未填写'}`);
      lines.push(`- 推荐价值评分：${item.valueScore}/5`);
      lines.push(`- 状态：${item.status}`);
      lines.push('');
      lines.push(escapeMarkdown(item.summary || '无摘要'));
      lines.push('');
    });
  });

  return lines.join('\n');
}

function downloadTextFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatDate(value) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleString('zh-CN', {
    hour12: false,
  });
}

function sortByUpdatedAtDesc(items) {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0),
  );
}

function sortRadarItems(items, sortMode) {
  const sorted = [...items];

  if (sortMode === 'scoreDesc') {
    return sorted.sort(
      (a, b) =>
        b.valueScore - a.valueScore ||
        new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0),
    );
  }

  if (sortMode === 'scoreAsc') {
    return sorted.sort(
      (a, b) =>
        a.valueScore - b.valueScore ||
        new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0),
    );
  }

  if (sortMode === 'dateDesc') {
    return sorted.sort(
      (a, b) =>
        b.discoveredDate.localeCompare(a.discoveredDate) ||
        new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0),
    );
  }

  return sortByUpdatedAtDesc(sorted);
}

function parseBatchImport(text, existingItems) {
  const existingUrls = new Set(
    existingItems
      .map((item) => item.url.trim().toLowerCase())
      .filter(Boolean),
  );
  const existingTitles = new Set(
    existingItems.map((item) => item.title.trim().toLowerCase()).filter(Boolean),
  );

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [rawTitle, rawPlatform, rawUrl, rawKeyword, rawSummary] = line
        .split('|')
        .map((part) => part.trim());
      const title = rawTitle || `未命名来源 ${index + 1}`;
      const platform = normalizePlatform(rawPlatform || '其他');
      const url = rawUrl || '';
      const keyword = rawKeyword || '';
      const summary = rawSummary || '';
      const warnings = [];

      if (url && existingUrls.has(url.toLowerCase())) {
        warnings.push('可能重复：已有相同链接');
      }
      if (title && existingTitles.has(title.toLowerCase())) {
        warnings.push('可能重复：已有相同标题');
      }
      if (rawPlatform && platform === '其他' && rawPlatform !== '其他') {
        warnings.push('平台不在选项内，已设为其他');
      }

      return {
        importKey: `batch-${Date.now()}-${index}`,
        title,
        platform,
        url,
        keyword,
        summary,
        valueScore: 3,
        difficulty: '中',
        useCase: '',
        discoveredDate: getTodayDate(),
        status: '未处理',
        warnings,
      };
    });
}

function normalizeDailyPromptData(data) {
  if (!data || !Array.isArray(data.items)) {
    return {
      generatedAt: '',
      keywords: [],
      count: 0,
      items: [],
    };
  }

  const items = data.items
    .filter((item) => item?.url && item?.title)
    .map((item) => ({
      id: item.id || item.url,
      title: item.title || '未命名推荐',
      platform: item.platform || 'YouTube',
      url: item.url || '',
      keyword: item.keyword || '',
      summary: item.summary || '',
      channelTitle: item.channelTitle || '',
      publishedAt: item.publishedAt || '',
      discoveredDate: normalizeDate(item.discoveredDate),
      valueScore: normalizeScore(item.valueScore),
      difficulty: normalizeDifficulty(item.difficulty),
      useCase: item.useCase || '待整理',
      status: radarStatuses.includes(item.status) ? item.status : '未处理',
      source: item.source || 'auto-youtube',
    }));

  return {
    generatedAt: data.generatedAt || '',
    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    count: Number.isFinite(Number(data.count)) ? Number(data.count) : items.length,
    items,
  };
}

export default function App() {
  const [activePage, setActivePage] = useState('library');
  const [prompts, setPrompts] = useState(loadPrompts);
  const [radarItems, setRadarItems] = useState(loadRadarItems);
  const [draft, setDraft] = useState(blankPrompt);
  const [radarDraft, setRadarDraft] = useState(blankRadarDraft);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState('');
  const [sceneFilter, setSceneFilter] = useState('全部');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [radarStatusFilter, setRadarStatusFilter] = useState('全部');
  const [radarPlatformFilter, setRadarPlatformFilter] = useState('全部');
  const [radarDateFilter, setRadarDateFilter] = useState('');
  const [radarSortMode, setRadarSortMode] = useState('updatedDesc');
  const [radarQuery, setRadarQuery] = useState('');
  const [batchText, setBatchText] = useState('');
  const [batchPreview, setBatchPreview] = useState([]);
  const [dailySummary, setDailySummary] = useState('');
  const [youtubeSettings, setYoutubeSettings] = useState(loadYoutubeSettings);
  const [showYoutubeKey, setShowYoutubeKey] = useState(false);
  const [youtubeResults, setYoutubeResults] = useState([]);
  const [youtubeLoading, setYoutubeLoading] = useState(false);
  const [youtubeError, setYoutubeError] = useState('');
  const [autoDailyData, setAutoDailyData] = useState(null);
  const [autoDailyLoading, setAutoDailyLoading] = useState(true);
  const [autoDailyError, setAutoDailyError] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    writeStorageItem(PROMPTS_STORAGE_KEY, JSON.stringify(prompts));
  }, [prompts]);

  useEffect(() => {
    writeStorageItem(RADAR_STORAGE_KEY, JSON.stringify(radarItems));
  }, [radarItems]);

  useEffect(() => {
    writeStorageItem(
      YOUTUBE_SETTINGS_STORAGE_KEY,
      JSON.stringify(normalizeYoutubeSettings(youtubeSettings)),
    );
  }, [youtubeSettings]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let active = true;

    async function loadDailyPrompts() {
      setAutoDailyLoading(true);
      setAutoDailyError('');

      try {
        const response = await fetch('/daily-prompts.json', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('daily-prompts-missing');
        }

        const data = normalizeDailyPromptData(await response.json());

        if (active) {
          setAutoDailyData(data);
        }
      } catch {
        if (active) {
          setAutoDailyData(null);
          setAutoDailyError('暂无自动推荐数据，可先使用手动搜索');
        }
      } finally {
        if (active) {
          setAutoDailyLoading(false);
        }
      }
    }

    loadDailyPrompts();

    return () => {
      active = false;
    };
  }, []);

  const filteredPrompts = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    return sortByUpdatedAtDesc(prompts).filter((prompt) => {
      const matchesScene =
        sceneFilter === '全部' || prompt.scene === sceneFilter;
      const matchesFavorite = !favoriteOnly || prompt.favorite;
      const searchable = [
        prompt.title,
        prompt.content,
        prompt.note,
        ...(prompt.tags || []),
      ]
        .join(' ')
        .toLowerCase();
      const matchesKeyword = !keyword || searchable.includes(keyword);

      return matchesScene && matchesFavorite && matchesKeyword;
    });
  }, [favoriteOnly, prompts, query, sceneFilter]);

  const filteredRadarItems = useMemo(() => {
    const keyword = radarQuery.trim().toLowerCase();
    const filtered = radarItems.filter((item) => {
      const matchesStatus =
        radarStatusFilter === '全部' || item.status === radarStatusFilter;
      const matchesPlatform =
        radarPlatformFilter === '全部' || item.platform === radarPlatformFilter;
      const matchesDate =
        !radarDateFilter || item.discoveredDate === radarDateFilter;
      const searchable = [item.title, item.summary, item.keyword, item.useCase]
        .join(' ')
        .toLowerCase();
      const matchesKeyword = !keyword || searchable.includes(keyword);

      return matchesStatus && matchesPlatform && matchesDate && matchesKeyword;
    });

    return sortRadarItems(filtered, radarSortMode);
  }, [
    radarDateFilter,
    radarItems,
    radarPlatformFilter,
    radarQuery,
    radarSortMode,
    radarStatusFilter,
  ]);

  const todayRadarItems = useMemo(() => {
    const today = getTodayDate();
    return sortRadarItems(
      radarItems.filter((item) => item.discoveredDate === today),
      'scoreDesc',
    );
  }, [radarItems]);

  const stats = useMemo(() => {
    const scenes = new Set(prompts.map((prompt) => prompt.scene));
    const favorites = prompts.filter((prompt) => prompt.favorite).length;

    return {
      total: prompts.length,
      scenes: scenes.size,
      favorites,
    };
  }, [prompts]);

  function resetForm() {
    setDraft(blankPrompt);
    setEditingId(null);
  }

  function showToast(message) {
    setToast(message);
  }

  function updateYoutubeSettings(updater) {
    setYoutubeSettings((current) =>
      normalizeYoutubeSettings(
        typeof updater === 'function' ? updater(current) : updater,
      ),
    );
  }

  async function copyText(text, feedbackId, message) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }

    setCopiedId(feedbackId);
    showToast(message);
    window.setTimeout(() => setCopiedId(''), 1400);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const title = draft.title.trim();
    const content = draft.content.trim();

    if (!title || !content) {
      showToast('请先填写标题和提示词正文');
      return;
    }

    const existing = prompts.find((prompt) => prompt.id === editingId);
    const now = new Date().toISOString();
    const nextPrompt = {
      id: editingId || createId('prompt'),
      title,
      scene: draft.scene,
      content,
      tags: parseTags(draft.tags),
      note: draft.note.trim(),
      favorite: draft.favorite,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    setPrompts((current) => {
      if (editingId) {
        return current.map((prompt) =>
          prompt.id === editingId ? nextPrompt : prompt,
        );
      }

      return [nextPrompt, ...current];
    });

    showToast(editingId ? '提示词已更新' : '提示词已添加');
    resetForm();
  }

  function startEdit(prompt) {
    setDraft({
      title: prompt.title,
      scene: prompt.scene,
      content: prompt.content,
      tags: formatTags(prompt.tags),
      note: prompt.note,
      favorite: prompt.favorite,
    });
    setEditingId(prompt.id);
    setActivePage('library');
  }

  function deletePrompt(id) {
    setPrompts((current) => current.filter((prompt) => prompt.id !== id));
    if (editingId === id) {
      resetForm();
    }
    showToast('提示词已删除');
  }

  function toggleFavorite(id) {
    const now = new Date().toISOString();
    setPrompts((current) =>
      current.map((prompt) =>
        prompt.id === id
          ? {
              ...prompt,
              favorite: !prompt.favorite,
              updatedAt: now,
            }
          : prompt,
      ),
    );
  }

  function copyPromptBody(prompt) {
    copyText(prompt.content, `${prompt.id}-body`, '已复制提示词正文');
  }

  function copyPromptCard(prompt) {
    copyText(formatFullPromptCard(prompt), `${prompt.id}-card`, '已复制完整卡片');
  }

  function exportPrompts(format) {
    const sortedPrompts = sortByUpdatedAtDesc(prompts);

    if (!sortedPrompts.length) {
      showToast('暂无数据');
      window.alert('暂无数据');
      return;
    }

    if (format === 'markdown') {
      downloadTextFile(
        'promptradar-mini-library.md',
        buildMarkdownExport(sortedPrompts),
        'text/markdown;charset=utf-8',
      );
      showToast('Markdown 已导出');
      return;
    }

    downloadTextFile(
      'promptradar-mini-library.csv',
      buildCsvExport(sortedPrompts),
      'text/csv;charset=utf-8',
    );
    showToast('CSV 已导出');
  }

  function handleRadarSubmit(event) {
    event.preventDefault();

    const title = radarDraft.title.trim();
    const platform = radarDraft.platform;

    if (!title || !platform) {
      showToast('请先填写标题和来源平台');
      return;
    }

    const now = new Date().toISOString();
    setRadarItems((current) => [
      normalizeRadarItem({
        id: createId('radar'),
        title,
        platform,
        url: radarDraft.url.trim(),
        keyword: radarDraft.keyword.trim(),
        summary: radarDraft.summary.trim(),
        valueScore: radarDraft.valueScore,
        difficulty: radarDraft.difficulty,
        useCase: radarDraft.useCase.trim(),
        discoveredDate: radarDraft.discoveredDate || getTodayDate(),
        status: '未处理',
        createdAt: now,
        updatedAt: now,
      }),
      ...current,
    ]);
    setRadarDraft({ ...blankRadarDraft, discoveredDate: getTodayDate() });
    showToast(radarDraft.url.trim() ? '雷达内容已添加' : '未填写来源链接，已保存');
  }

  async function searchYouTube() {
    const apiKey = youtubeSettings.apiKey.trim();
    const queryText = youtubeSettings.query.trim();

    if (!apiKey) {
      setYoutubeError('YouTube API Key 为空，请先填写后再搜索。');
      showToast('请先填写 YouTube API Key');
      return;
    }

    if (!queryText) {
      setYoutubeError('搜索关键词为空，请输入你想查找的提示词主题。');
      showToast('请先填写搜索关键词');
      return;
    }

    const maxResults = Math.min(
      25,
      Math.max(1, Number(youtubeSettings.maxResults) || 10),
    );
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      q: queryText,
      maxResults: String(maxResults),
      order: youtubeSettings.order,
      key: apiKey,
    });

    setYoutubeLoading(true);
    setYoutubeError('');
    setYoutubeResults([]);

    try {
      const response = await fetch(`${YOUTUBE_SEARCH_ENDPOINT}?${params}`);
      let data = null;

      try {
        data = await response.json();
      } catch {
        throw new Error('invalid-json');
      }

      if (!response.ok || data?.error) {
        setYoutubeError(getReadableYoutubeError(data?.error, response.status));
        return;
      }

      const results = (Array.isArray(data.items) ? data.items : [])
        .filter((item) => item?.id?.videoId && item?.snippet)
        .map((item) => {
          const snippet = item.snippet;
          const videoId = item.id.videoId;

          return {
            id: videoId,
            title: snippet.title || '未命名视频',
            channelTitle: snippet.channelTitle || '未知频道',
            publishedAt: snippet.publishedAt || '',
            url: `https://www.youtube.com/watch?v=${videoId}`,
            keyword: queryText,
            summary: truncateText(snippet.description || ''),
            platform: 'YouTube',
          };
        });

      if (!results.length) {
        setYoutubeError('没有找到相关 YouTube 视频，请换一个关键词再试。');
        return;
      }

      setYoutubeResults(results);
      showToast(`已找到 ${results.length} 条 YouTube 结果`);
    } catch {
      setYoutubeError('网络请求失败，请检查网络连接后再手动搜索。');
    } finally {
      setYoutubeLoading(false);
    }
  }

  function saveYouTubeResultToRadar(result) {
    const url = result.url.trim().toLowerCase();
    const alreadySaved = radarItems.some(
      (item) => item.url.trim().toLowerCase() === url,
    );

    if (alreadySaved) {
      showToast('这条视频已存在于每日雷达');
      return;
    }

    const now = new Date().toISOString();
    setRadarItems((current) => [
      normalizeRadarItem({
        id: createId('radar'),
        title: result.title,
        platform: 'YouTube',
        url: result.url,
        keyword: result.keyword,
        summary: result.summary,
        valueScore: 3,
        difficulty: '中',
        useCase: '待整理',
        discoveredDate: getTodayDate(),
        status: '未处理',
        createdAt: now,
        updatedAt: now,
      }),
      ...current,
    ]);

    setRadarPlatformFilter('全部');
    setRadarStatusFilter('全部');
    setRadarDateFilter('');
    setRadarQuery('');
    setRadarSortMode('updatedDesc');
    showToast('已保存到每日雷达');
  }

  function saveAutoRecommendationToRadar(item) {
    const url = item.url.trim().toLowerCase();
    const alreadySaved = radarItems.some(
      (radarItem) => radarItem.url.trim().toLowerCase() === url,
    );

    if (alreadySaved) {
      showToast('这条自动推荐已存在于每日雷达');
      return;
    }

    const now = new Date().toISOString();
    setRadarItems((current) => [
      normalizeRadarItem({
        id: createId('radar'),
        title: item.title,
        platform: item.platform || 'YouTube',
        url: item.url,
        keyword: item.keyword,
        summary: item.summary,
        valueScore: item.valueScore || 3,
        difficulty: item.difficulty || '中',
        useCase: item.useCase || '待整理',
        discoveredDate: item.discoveredDate || getTodayDate(),
        status: '未处理',
        createdAt: now,
        updatedAt: now,
      }),
      ...current,
    ]);

    setRadarPlatformFilter('全部');
    setRadarStatusFilter('全部');
    setRadarDateFilter('');
    setRadarQuery('');
    setRadarSortMode('updatedDesc');
    showToast('已保存自动推荐到每日雷达');
  }

  function updateRadarStatus(id, status) {
    const now = new Date().toISOString();
    setRadarItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              updatedAt: now,
            }
          : item,
      ),
    );
  }

  function deleteRadarItem(id) {
    setRadarItems((current) => current.filter((item) => item.id !== id));
    showToast('雷达内容已删除');
  }

  function previewBatchImport() {
    const preview = parseBatchImport(batchText, radarItems);
    if (!preview.length) {
      showToast('请先粘贴要导入的内容');
      return;
    }

    setBatchPreview(preview);
    showToast(`已生成 ${preview.length} 条预览`);
  }

  function confirmBatchImport() {
    if (!batchPreview.length) {
      showToast('请先生成导入预览');
      return;
    }

    const now = new Date().toISOString();
    const imported = batchPreview.map((item) =>
      normalizeRadarItem({
        ...item,
        id: createId('radar'),
        createdAt: now,
        updatedAt: now,
      }),
    );

    setRadarItems((current) => [...imported, ...current]);
    setBatchText('');
    setBatchPreview([]);
    showToast(`已导入 ${imported.length} 条雷达内容`);
  }

  function generateDailySummary() {
    const today = getTodayDate();
    if (!todayRadarItems.length) {
      setDailySummary('');
      showToast('暂无今日雷达内容');
      window.alert('暂无今日雷达内容');
      return '';
    }

    const summary = buildDailySummary(todayRadarItems, today);
    setDailySummary(summary);
    showToast('今日摘要已生成');
    return summary;
  }

  function copyDailySummary() {
    const summary = dailySummary || generateDailySummary();
    if (!summary) {
      return;
    }
    copyText(summary, 'daily-summary', '已复制今日摘要');
  }

  function exportDailySummary() {
    const summary = dailySummary || generateDailySummary();
    if (!summary) {
      return;
    }
    downloadTextFile(
      `promptradar-daily-summary-${getTodayDate()}.md`,
      summary,
      'text/markdown;charset=utf-8',
    );
    showToast('今日摘要 Markdown 已导出');
  }

  function transferRadarToPrompt(item) {
    const alreadySaved = prompts.some(
      (prompt) =>
        prompt.title === item.title &&
        prompt.note.trim().toLowerCase() === item.summary.trim().toLowerCase(),
    );
    const now = new Date().toISOString();

    if (!alreadySaved) {
      setPrompts((current) => [
        {
          id: createId('prompt'),
          title: item.title,
          scene: mapUseCaseToScene(item.useCase),
          content: formatRadarAsPromptContent(item),
          tags: parseTags(
            ['雷达', item.platform, item.keyword].filter(Boolean).join(', '),
          ),
          note: item.summary || '',
          favorite: true,
          createdAt: now,
          updatedAt: now,
        },
        ...current,
      ]);
    }

    setRadarItems((current) =>
      current.map((radarItem) =>
        radarItem.id === item.id
          ? {
              ...radarItem,
              status: '已收藏',
              updatedAt: now,
            }
          : radarItem,
      ),
    );
    showToast(alreadySaved ? '已标记为已收藏' : '已转入提示词库');
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="PromptRadar Mini">
        <div className="brand">
          <div className="brand-mark">
            <Radar size={22} aria-hidden="true" />
          </div>
          <div>
            <p>PromptRadar</p>
            <strong>Mini</strong>
          </div>
        </div>

        <nav className="nav-tabs" aria-label="主页面">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={activePage === item.id ? 'nav-tab active' : 'nav-tab'}
                type="button"
                onClick={() => setActivePage(item.id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="side-note">
          <Sparkles size={18} aria-hidden="true" />
          <span>本地保存，无需登录</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">PromptRadar Mini V0.5</p>
            <h1>
              {activePage === 'library' ? '我的提示词库' : '每日提示词雷达'}
            </h1>
          </div>
          <div className="stat-strip" aria-label="提示词库统计">
            <Stat value={stats.total} label="提示词" />
            <Stat value={stats.scenes} label="场景" />
            <Stat value={stats.favorites} label="收藏" />
          </div>
        </header>

        {activePage === 'library' ? (
          <LibraryPage
            copiedId={copiedId}
            draft={draft}
            editingId={editingId}
            favoriteOnly={favoriteOnly}
            filteredPrompts={filteredPrompts}
            onCancel={resetForm}
            onChange={setDraft}
            onCopyCard={copyPromptCard}
            onCopyContent={copyPromptBody}
            onDelete={deletePrompt}
            onEdit={startEdit}
            onExport={exportPrompts}
            onSubmit={handleSubmit}
            onToggleFavorite={toggleFavorite}
            query={query}
            sceneFilter={sceneFilter}
            setFavoriteOnly={setFavoriteOnly}
            setQuery={setQuery}
            setSceneFilter={setSceneFilter}
          />
        ) : (
          <RadarPage
            batchPreview={batchPreview}
            batchText={batchText}
            autoDailyData={autoDailyData}
            autoDailyError={autoDailyError}
            autoDailyLoading={autoDailyLoading}
            copiedId={copiedId}
            dailySummary={dailySummary}
            draft={radarDraft}
            filteredItems={filteredRadarItems}
            onBatchTextChange={setBatchText}
            onChange={setRadarDraft}
            onConfirmBatchImport={confirmBatchImport}
            onCopyDailySummary={copyDailySummary}
            onDelete={deleteRadarItem}
            onExportDailySummary={exportDailySummary}
            onGenerateDailySummary={generateDailySummary}
            onPreviewBatchImport={previewBatchImport}
            onStatusChange={updateRadarStatus}
            onSubmit={handleRadarSubmit}
            onTransfer={transferRadarToPrompt}
            query={radarQuery}
            setDateFilter={setRadarDateFilter}
            setPlatformFilter={setRadarPlatformFilter}
            setQuery={setRadarQuery}
            setSortMode={setRadarSortMode}
            setStatusFilter={setRadarStatusFilter}
            dateFilter={radarDateFilter}
            platformFilter={radarPlatformFilter}
            sortMode={radarSortMode}
            statusFilter={radarStatusFilter}
            todayCount={todayRadarItems.length}
            onSearchYouTube={searchYouTube}
            onSaveYouTubeResult={saveYouTubeResultToRadar}
            onSaveAutoRecommendation={saveAutoRecommendationToRadar}
            setShowYoutubeKey={setShowYoutubeKey}
            setYoutubeSettings={updateYoutubeSettings}
            showYoutubeKey={showYoutubeKey}
            youtubeError={youtubeError}
            youtubeLoading={youtubeLoading}
            youtubeResults={youtubeResults}
            youtubeSettings={youtubeSettings}
          />
        )}
      </section>

      {toast ? <div className="toast">{toast}</div> : null}
    </main>
  );
}

function Stat({ value, label }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function LibraryPage({
  copiedId,
  draft,
  editingId,
  favoriteOnly,
  filteredPrompts,
  onCancel,
  onChange,
  onCopyCard,
  onCopyContent,
  onDelete,
  onEdit,
  onExport,
  onSubmit,
  onToggleFavorite,
  query,
  sceneFilter,
  setFavoriteOnly,
  setQuery,
  setSceneFilter,
}) {
  return (
    <div className="page-grid">
      <form className="editor-panel" onSubmit={onSubmit}>
        <div className="section-heading">
          <BookOpen size={20} aria-hidden="true" />
          <h2>{editingId ? '编辑提示词' : '新增提示词'}</h2>
        </div>

        <label>
          <span>标题</span>
          <input
            value={draft.title}
            onChange={(event) =>
              onChange((current) => ({ ...current, title: event.target.value }))
            }
            placeholder="例如：日报总结助手"
            required
          />
        </label>

        <label>
          <span>场景</span>
          <select
            value={draft.scene}
            onChange={(event) =>
              onChange((current) => ({ ...current, scene: event.target.value }))
            }
          >
            {sceneOptions.map((scene) => (
              <option key={scene} value={scene}>
                {scene}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>提示词正文</span>
          <textarea
            value={draft.content}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                content: event.target.value,
              }))
            }
            placeholder="写下你想复用的 AI 提示词"
            required
            rows={9}
          />
        </label>

        <label>
          <span>标签</span>
          <input
            value={draft.tags}
            onChange={(event) =>
              onChange((current) => ({ ...current, tags: event.target.value }))
            }
            placeholder="用逗号分隔，例如：写作, 总结"
          />
        </label>

        <label>
          <span>备注</span>
          <textarea
            className="note-input"
            value={draft.note}
            onChange={(event) =>
              onChange((current) => ({ ...current, note: event.target.value }))
            }
            placeholder="记录使用场景、变量说明或效果评价"
            rows={4}
          />
        </label>

        <label className="check-row">
          <input
            checked={draft.favorite}
            type="checkbox"
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                favorite: event.target.checked,
              }))
            }
          />
          <span>加入收藏</span>
        </label>

        <div className="form-actions">
          <button className="primary-button" type="submit">
            {editingId ? <Save size={18} /> : <Plus size={18} />}
            <span>{editingId ? '保存修改' : '添加到库'}</span>
          </button>
          {editingId ? (
            <button className="ghost-button" type="button" onClick={onCancel}>
              <X size={18} />
              <span>取消</span>
            </button>
          ) : null}
        </div>
      </form>

      <section className="library-panel">
        <div className="toolbar stackable">
          <div className="search-box">
            <Search size={18} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题、正文、标签或备注"
            />
          </div>

          <div className="export-actions" aria-label="导出提示词库">
            <button
              className="secondary-button"
              type="button"
              onClick={() => onExport('markdown')}
            >
              <Download size={18} />
              <span>导出 MD</span>
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => onExport('csv')}
            >
              <Download size={18} />
              <span>导出 CSV</span>
            </button>
          </div>
        </div>

        <div className="filter-bar" aria-label="提示词筛选">
          <div className="filter-select">
            <Filter size={17} aria-hidden="true" />
            <select
              value={sceneFilter}
              onChange={(event) => setSceneFilter(event.target.value)}
              aria-label="按场景筛选"
            >
              <option value="全部">全部场景</option>
              {sceneOptions.map((scene) => (
                <option key={scene} value={scene}>
                  {scene}
                </option>
              ))}
            </select>
          </div>

          <button
            className={favoriteOnly ? 'filter-chip active' : 'filter-chip'}
            type="button"
            onClick={() => setFavoriteOnly((value) => !value)}
          >
            <Star size={16} />
            <span>只看收藏</span>
          </button>
        </div>

        <div className="prompt-list">
          {filteredPrompts.length ? (
            filteredPrompts.map((prompt) => (
              <PromptCard
                key={prompt.id}
                copiedId={copiedId}
                onCopyCard={() => onCopyCard(prompt)}
                onCopyContent={() => onCopyContent(prompt)}
                onDelete={() => onDelete(prompt.id)}
                onEdit={() => onEdit(prompt)}
                onToggleFavorite={() => onToggleFavorite(prompt.id)}
                prompt={prompt}
              />
            ))
          ) : (
            <div className="empty-state">
              <Search size={30} aria-hidden="true" />
              <strong>没有匹配的提示词</strong>
              <span>换个关键词或筛选条件，也可以先添加一个新的提示词。</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PromptCard({
  copiedId,
  onCopyCard,
  onCopyContent,
  onDelete,
  onEdit,
  onToggleFavorite,
  prompt,
}) {
  return (
    <article className="prompt-card">
      <div className="card-topline">
        <div className="card-meta">
          <span>{prompt.scene}</span>
          {prompt.favorite ? <span className="favorite-badge">已收藏</span> : null}
        </div>
        <div className="card-tools">
          <button
            className={prompt.favorite ? 'icon-button active' : 'icon-button'}
            type="button"
            onClick={onToggleFavorite}
            title={prompt.favorite ? '取消收藏' : '收藏提示词'}
            aria-label={prompt.favorite ? '取消收藏' : '收藏提示词'}
          >
            <Star size={17} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={onCopyContent}
            title="复制提示词正文"
            aria-label="复制提示词正文"
          >
            {copiedId === `${prompt.id}-body` ? (
              <Check size={17} />
            ) : (
              <Copy size={17} />
            )}
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={onCopyCard}
            title="复制完整卡片"
            aria-label="复制完整卡片"
          >
            {copiedId === `${prompt.id}-card` ? (
              <Check size={17} />
            ) : (
              <ClipboardList size={17} />
            )}
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={onEdit}
            title="编辑提示词"
            aria-label="编辑提示词"
          >
            <Edit3 size={17} />
          </button>
          <button
            className="icon-button danger"
            type="button"
            onClick={onDelete}
            title="删除提示词"
            aria-label="删除提示词"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
      <h3>{prompt.title}</h3>
      <p className="prompt-content">{prompt.content}</p>
      {prompt.note ? <p className="note-content">{prompt.note}</p> : null}
      <TagRow tags={prompt.tags} />
      <p className="updated-at">更新时间：{formatDate(prompt.updatedAt)}</p>
    </article>
  );
}

function RadarPage({
  autoDailyData,
  autoDailyError,
  autoDailyLoading,
  batchPreview,
  batchText,
  copiedId,
  dailySummary,
  dateFilter,
  draft,
  filteredItems,
  onBatchTextChange,
  onChange,
  onConfirmBatchImport,
  onCopyDailySummary,
  onDelete,
  onExportDailySummary,
  onGenerateDailySummary,
  onPreviewBatchImport,
  onStatusChange,
  onSubmit,
  onTransfer,
  platformFilter,
  query,
  setDateFilter,
  setPlatformFilter,
  setQuery,
  setSortMode,
  setStatusFilter,
  sortMode,
  statusFilter,
  todayCount,
  onSearchYouTube,
  onSaveAutoRecommendation,
  onSaveYouTubeResult,
  setShowYoutubeKey,
  setYoutubeSettings,
  showYoutubeKey,
  youtubeError,
  youtubeLoading,
  youtubeResults,
  youtubeSettings,
}) {
  return (
    <div className="radar-layout">
      <section className="radar-overview">
        <div>
          <p className="eyebrow">今日发现</p>
          <h2>收集提示词线索，评分筛选，再转入你的本地提示词库</h2>
        </div>
        <div className="radar-pulse" aria-hidden="true">
          <Radar size={42} />
        </div>
      </section>

      <div className="radar-workbench">
        <form className="radar-form" onSubmit={onSubmit}>
          <div className="section-heading">
            <Plus size={20} aria-hidden="true" />
            <h2>新增雷达内容</h2>
          </div>

          <label>
            <span>标题</span>
            <input
              value={draft.title}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="例如：ChatGPT 高效写作提示词"
              required
            />
          </label>

          <div className="form-row">
            <label>
              <span>来源平台</span>
              <select
                required
                value={draft.platform}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    platform: event.target.value,
                  }))
                }
              >
                {platformOptions.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>发现日期</span>
              <input
                type="date"
                value={draft.discoveredDate}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    discoveredDate: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <label>
            <span>来源链接</span>
            <input
              value={draft.url}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  url: event.target.value,
                }))
              }
              placeholder="可留空"
            />
          </label>

          <div className="form-row">
            <label>
              <span>搜索关键词</span>
              <input
                value={draft.keyword}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    keyword: event.target.value,
                  }))
                }
                placeholder="例如：AI 写作"
              />
            </label>
            <label>
              <span>适用场景</span>
              <input
                value={draft.useCase}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    useCase: event.target.value,
                  }))
                }
                placeholder="例如：写作 / 办公 / 图片生成"
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              <span>推荐价值评分</span>
              <select
                value={draft.valueScore}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    valueScore: Number(event.target.value),
                  }))
                }
              >
                {[1, 2, 3, 4, 5].map((score) => (
                  <option key={score} value={score}>
                    {score} 分
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>使用难度</span>
              <select
                value={draft.difficulty}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    difficulty: event.target.value,
                  }))
                }
              >
                {difficultyOptions.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            <span>内容摘要</span>
            <textarea
              className="note-input"
              value={draft.summary}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  summary: event.target.value,
                }))
              }
              placeholder="简要记录这个来源的价值"
              rows={4}
            />
          </label>

          <button className="primary-button" type="submit">
            <Plus size={18} />
            <span>添加到雷达</span>
          </button>

          <div className="form-divider" />

          <div className="section-heading">
            <Upload size={20} aria-hidden="true" />
            <h2>批量导入</h2>
          </div>
          <label>
            <span>多行内容</span>
            <textarea
              className="batch-input"
              value={batchText}
              onChange={(event) => onBatchTextChange(event.target.value)}
              placeholder="标题 | 平台 | 链接 | 关键词 | 简要说明"
              rows={7}
            />
          </label>
          <div className="form-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={onPreviewBatchImport}
            >
              <FileText size={18} />
              <span>预览导入</span>
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={onConfirmBatchImport}
            >
              <Check size={18} />
              <span>确认导入</span>
            </button>
          </div>
          {batchPreview.length ? (
            <div className="batch-preview">
              {batchPreview.map((item) => (
                <div className="preview-row" key={item.importKey}>
                  <strong>{item.title}</strong>
                  <span>
                    {item.platform} / {item.keyword || '无关键词'}
                  </span>
                  {item.warnings.length ? (
                    <em>{item.warnings.join('；')}</em>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </form>

        <section className="radar-list-panel">
          <AutoDailyRecommendationsPanel
            data={autoDailyData}
            error={autoDailyError}
            loading={autoDailyLoading}
            onSave={onSaveAutoRecommendation}
          />

          <div className="youtube-panel">
            <div className="section-heading">
              <Search size={20} aria-hidden="true" />
              <h2>YouTube 手动搜索</h2>
            </div>
            <p className="helper-copy">
              API Key 只保存在当前浏览器 localStorage 中，清理浏览器数据可能丢失。YouTube
              search.list 每次请求会消耗 API 配额，请只在需要时手动搜索。
            </p>

            <div className="youtube-settings-grid">
              <label className="api-key-field">
                <span>YouTube API Key</span>
                <div className="password-row">
                  <input
                    autoComplete="off"
                    type={showYoutubeKey ? 'text' : 'password'}
                    value={youtubeSettings.apiKey}
                    onChange={(event) =>
                      setYoutubeSettings((current) => ({
                        ...current,
                        apiKey: event.target.value,
                      }))
                    }
                    placeholder="粘贴你的 YouTube Data API Key"
                  />
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => setShowYoutubeKey((value) => !value)}
                    title={showYoutubeKey ? '隐藏 API Key' : '显示 API Key'}
                    aria-label={showYoutubeKey ? '隐藏 API Key' : '显示 API Key'}
                  >
                    {showYoutubeKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              <label>
                <span>搜索关键词</span>
                <input
                  value={youtubeSettings.query}
                  onChange={(event) =>
                    setYoutubeSettings((current) => ({
                      ...current,
                      query: event.target.value,
                    }))
                  }
                  placeholder="例如：ChatGPT prompt engineering"
                />
              </label>

              <label>
                <span>每次搜索结果数量</span>
                <input
                  max="25"
                  min="1"
                  type="number"
                  value={youtubeSettings.maxResults}
                  onChange={(event) =>
                    setYoutubeSettings((current) => ({
                      ...current,
                      maxResults: event.target.value,
                    }))
                  }
                />
              </label>

              <label>
                <span>排序方式</span>
                <select
                  value={youtubeSettings.order}
                  onChange={(event) =>
                    setYoutubeSettings((current) => ({
                      ...current,
                      order: event.target.value,
                    }))
                  }
                >
                  <option value="relevance">relevance</option>
                  <option value="date">date</option>
                </select>
              </label>
            </div>

            <button
              className="primary-button"
              disabled={youtubeLoading}
              type="button"
              onClick={onSearchYouTube}
            >
              <Search size={18} />
              <span>{youtubeLoading ? '搜索中...' : '搜索 YouTube'}</span>
            </button>

            {youtubeError ? (
              <div className="error-message" role="status">
                {youtubeError}
              </div>
            ) : null}

            {youtubeResults.length ? (
              <div className="youtube-results" aria-label="YouTube 搜索结果">
                {youtubeResults.map((result) => (
                  <article className="youtube-result-card" key={result.id}>
                    <div className="card-topline">
                      <div className="card-meta">
                        <span>YouTube</span>
                        <span>{result.channelTitle}</span>
                      </div>
                    </div>
                    <h3>{result.title}</h3>
                    <p className="signal-copy">
                      {result.summary || '该视频没有可用简介。'}
                    </p>
                    <div className="radar-facts">
                      <span>关键词：{result.keyword}</span>
                      <span>
                        发布时间：
                        {result.publishedAt
                          ? new Date(result.publishedAt).toLocaleString('zh-CN', {
                              hour12: false,
                            })
                          : '未知'}
                      </span>
                    </div>
                    <a
                      className="radar-link"
                      href={result.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <LinkIcon size={16} aria-hidden="true" />
                      <span>{result.url}</span>
                    </a>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => onSaveYouTubeResult(result)}
                    >
                      <Save size={18} />
                      <span>保存到雷达</span>
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
          </div>

          <div className="summary-panel">
            <div>
              <p className="eyebrow">今日摘要</p>
              <h2>{todayCount} 条今日雷达内容</h2>
            </div>
            <div className="summary-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={onGenerateDailySummary}
              >
                <Sparkles size={18} />
                <span>生成今日摘要</span>
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={onCopyDailySummary}
                title="复制今日摘要"
                aria-label="复制今日摘要"
              >
                {copiedId === 'daily-summary' ? (
                  <Check size={18} />
                ) : (
                  <Copy size={18} />
                )}
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={onExportDailySummary}
                title="导出今日摘要 Markdown"
                aria-label="导出今日摘要 Markdown"
              >
                <Download size={18} />
              </button>
            </div>
            {dailySummary ? (
              <pre className="summary-output">{dailySummary}</pre>
            ) : null}
          </div>

          <div className="toolbar stackable radar-toolbar">
            <div className="search-box">
              <Search size={18} aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索标题、摘要、关键词或适用场景"
              />
            </div>
            <div className="filter-select">
              <Filter size={17} aria-hidden="true" />
              <select
                value={platformFilter}
                onChange={(event) => setPlatformFilter(event.target.value)}
                aria-label="按平台筛选"
              >
                <option value="全部">全部平台</option>
                {platformOptions.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-select">
              <CalendarDays size={17} aria-hidden="true" />
              <input
                aria-label="按发现日期筛选"
                type="date"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              />
            </div>
            <div className="filter-select">
              <Star size={17} aria-hidden="true" />
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value)}
                aria-label="排序"
              >
                <option value="updatedDesc">最近更新</option>
                <option value="scoreDesc">评分高到低</option>
                <option value="scoreAsc">评分低到高</option>
                <option value="dateDesc">发现日期新到旧</option>
              </select>
            </div>
          </div>

          <div className="filter-bar radar-filter" aria-label="雷达状态筛选">
            <span className="filter-label">状态</span>
            {['全部', ...radarStatuses].map((status) => (
              <button
                key={status}
                className={
                  statusFilter === status ? 'filter-chip active' : 'filter-chip'
                }
                type="button"
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="radar-grid">
            {filteredItems.length ? (
              filteredItems.map((item) => (
                <RadarCard
                  item={item}
                  key={item.id}
                  onDelete={() => onDelete(item.id)}
                  onStatusChange={(status) => onStatusChange(item.id, status)}
                  onTransfer={() => onTransfer(item)}
                />
              ))
            ) : (
              <div className="empty-state full-row">
                <Radar size={30} aria-hidden="true" />
                <strong>当前筛选下暂无雷达内容</strong>
                <span>调整筛选条件，或手动新增一条来源内容。</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function AutoDailyRecommendationsPanel({ data, error, loading, onSave }) {
  const items = data?.items || [];

  return (
    <div className="auto-panel">
      <div className="section-heading">
        <Sparkles size={20} aria-hidden="true" />
        <h2>每日自动推荐</h2>
      </div>

      {loading ? (
        <p className="helper-copy">正在读取每日自动推荐...</p>
      ) : null}

      {!loading && error ? (
        <div className="empty-inline" role="status">
          {error}
        </div>
      ) : null}

      {!loading && data ? (
        <div className="auto-meta">
          <span>生成时间：{data.generatedAt ? formatDate(data.generatedAt) : '未知'}</span>
          <span>推荐数量：{data.count}</span>
          <span>
            关键词：
            {data.keywords.length ? data.keywords.join(' / ') : '未配置'}
          </span>
        </div>
      ) : null}

      {!loading && data && !items.length ? (
        <div className="empty-inline">暂无自动推荐数据，可先使用手动搜索</div>
      ) : null}

      {items.length ? (
        <div className="auto-results" aria-label="每日自动推荐列表">
          {items.map((item) => (
            <article className="auto-result-card" key={`${item.url}-${item.keyword}`}>
              <div className="card-topline">
                <div className="card-meta">
                  <span>{item.platform}</span>
                  {item.channelTitle ? <span>{item.channelTitle}</span> : null}
                </div>
              </div>
              <h3>{item.title}</h3>
              <p className="signal-copy">{item.summary || '暂无摘要'}</p>
              <div className="radar-facts">
                <span>关键词：{item.keyword || '未填写'}</span>
                <span>
                  发布时间：
                  {item.publishedAt
                    ? new Date(item.publishedAt).toLocaleString('zh-CN', {
                        hour12: false,
                      })
                    : '未知'}
                </span>
              </div>
              <a
                className="radar-link"
                href={item.url}
                target="_blank"
                rel="noreferrer"
              >
                <LinkIcon size={16} aria-hidden="true" />
                <span>{item.url}</span>
              </a>
              <button
                className="secondary-button"
                type="button"
                onClick={() => onSave(item)}
              >
                <Save size={18} />
                <span>保存到雷达</span>
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RadarCard({ item, onDelete, onStatusChange, onTransfer }) {
  return (
    <article className="radar-card">
      <div className="card-topline">
        <div className="card-meta">
          <span>{item.platform}</span>
          <span className={`status-badge status-${item.status}`}>
            {item.status}
          </span>
        </div>
        <button
          className="icon-button danger"
          type="button"
          onClick={onDelete}
          title="删除雷达内容"
          aria-label="删除雷达内容"
        >
          <Trash2 size={17} />
        </button>
      </div>
      <h3>{item.title}</h3>
      <p className="signal-copy">{item.summary || '暂无摘要'}</p>

      <div className="radar-facts" aria-label="雷达内容信息">
        <span>关键词：{item.keyword || '未填写'}</span>
        <span>评分：{item.valueScore}/5</span>
        <span>难度：{item.difficulty}</span>
        <span>场景：{item.useCase || '未填写'}</span>
        <span>发现：{item.discoveredDate}</span>
      </div>

      {item.url ? (
        <a className="radar-link" href={item.url} target="_blank" rel="noreferrer">
          <LinkIcon size={16} aria-hidden="true" />
          <span>{item.url}</span>
        </a>
      ) : (
        <div className="radar-detail">
          <LinkIcon size={16} aria-hidden="true" />
          <span>未填写来源链接</span>
        </div>
      )}

      <div className="radar-card-controls">
        <label>
          <span>状态</span>
          <select
            value={item.status}
            onChange={(event) => onStatusChange(event.target.value)}
          >
            {radarStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <button
          className={
            item.status === '已收藏' ? 'secondary-button saved' : 'secondary-button'
          }
          disabled={item.status === '已收藏'}
          type="button"
          onClick={onTransfer}
        >
          {item.status === '已收藏' ? <Check size={18} /> : <Save size={18} />}
          <span>{item.status === '已收藏' ? '已转入' : '转入提示词库'}</span>
        </button>
      </div>
    </article>
  );
}

function TagRow({ tags }) {
  if (!tags?.length) {
    return null;
  }

  return (
    <div className="tag-row">
      {tags.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
}
