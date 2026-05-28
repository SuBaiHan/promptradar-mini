import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Check,
  ClipboardList,
  Copy,
  Download,
  Edit3,
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
  X,
} from 'lucide-react';

const PROMPTS_STORAGE_KEY = 'promptradar-mini-prompts';
const RADAR_STORAGE_KEY = 'promptradar-mini-radar-items';

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

const radarStatuses = ['未处理', '值得收藏', '已忽略', '已收藏'];

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
  sourcePlatform: '',
  link: '',
  searchKeyword: '',
  summary: '',
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
    sourcePlatform: 'PromptRadar 精选',
    link: '',
    searchKeyword: '会议纪要 自动整理',
    summary:
      '把会议纪要整理为关键结论、待办事项、负责人、截止时间、风险点和下次会议建议。',
  },
  {
    title: '社媒内容变体生成器',
    sourcePlatform: 'PromptRadar 精选',
    link: '',
    searchKeyword: '社媒文案 多版本生成',
    summary:
      '基于同一主题生成多条不同风格的社媒文案，适合做内容方向探索。',
  },
  {
    title: '学习路线规划师',
    sourcePlatform: 'PromptRadar 精选',
    link: '',
    searchKeyword: '14 天学习计划',
    summary:
      '把宽泛学习目标拆成每天的学习目标、练习任务、验收方式和复盘问题。',
  },
  {
    title: '用户访谈问题生成',
    sourcePlatform: 'PromptRadar 精选',
    link: '',
    searchKeyword: '用户访谈 提纲',
    summary:
      '围绕产品假设生成 30 分钟访谈提纲，包含破冰、行为问题、追问和反诱导表达。',
  },
  {
    title: '长文结构诊断',
    sourcePlatform: 'PromptRadar 精选',
    link: '',
    searchKeyword: '文章结构 诊断',
    summary:
      '检查文章草稿的结构问题、论证跳跃、重复段落和读者困惑点，并输出更清晰的大纲。',
  },
  {
    title: '轻量竞品分析',
    sourcePlatform: 'PromptRadar 精选',
    link: '',
    searchKeyword: '竞品分析 表格',
    summary:
      '基于人工收集的竞品信息，整理目标用户、核心功能、定价、差异化和可借鉴机会。',
  },
];

const navItems = [
  { id: 'library', label: '我的提示词库', icon: Library },
  { id: 'radar', label: '每日提示词雷达', icon: Radar },
];

function createId(prefix = 'item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function loadPrompts() {
  try {
    const saved = localStorage.getItem(PROMPTS_STORAGE_KEY);
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

  return Array.from({ length: 3 }, (_, index) => {
    const seed = radarSeeds[(dayIndex + index * 2) % radarSeeds.length];
    const createdAt = new Date().toISOString();

    return {
      id: `daily-${dayIndex}-${index}`,
      ...seed,
      status: '未处理',
      createdAt,
      updatedAt: createdAt,
    };
  });
}

function normalizeRadarItem(item) {
  const now = new Date().toISOString();
  const createdAt = item.createdAt || now;
  const status = radarStatuses.includes(item.status) ? item.status : '未处理';

  return {
    id: item.id || createId('radar'),
    title: item.title || '未命名雷达内容',
    sourcePlatform: item.sourcePlatform || '手动记录',
    link: item.link || '',
    searchKeyword: item.searchKeyword || item.keyword || '',
    summary: item.summary || item.signal || item.content || '',
    status,
    createdAt,
    updatedAt: item.updatedAt || createdAt,
  };
}

function loadRadarItems() {
  try {
    const saved = localStorage.getItem(RADAR_STORAGE_KEY);
    if (!saved) {
      return buildDailyRadarItems();
    }

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.map(normalizeRadarItem) : [];
  } catch {
    return buildDailyRadarItems();
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
    `来源平台：${item.sourcePlatform || '未填写'}`,
    `搜索关键词：${item.searchKeyword || '未填写'}`,
    `简要说明：${item.summary || '未填写'}`,
    `链接：${item.link || '未填写'}`,
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
  const [copiedId, setCopiedId] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(prompts));
  }, [prompts]);

  useEffect(() => {
    localStorage.setItem(RADAR_STORAGE_KEY, JSON.stringify(radarItems));
  }, [radarItems]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

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
    return sortByUpdatedAtDesc(radarItems).filter(
      (item) => radarStatusFilter === '全部' || item.status === radarStatusFilter,
    );
  }, [radarItems, radarStatusFilter]);

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
    const summary = radarDraft.summary.trim();

    if (!title || !summary) {
      showToast('请先填写雷达标题和简要说明');
      return;
    }

    const now = new Date().toISOString();
    setRadarItems((current) => [
      {
        id: createId('radar'),
        title,
        sourcePlatform: radarDraft.sourcePlatform.trim() || '手动记录',
        link: radarDraft.link.trim(),
        searchKeyword: radarDraft.searchKeyword.trim(),
        summary,
        status: '未处理',
        createdAt: now,
        updatedAt: now,
      },
      ...current,
    ]);
    setRadarDraft(blankRadarDraft);
    showToast('雷达内容已添加');
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

  function transferRadarToPrompt(item) {
    const alreadySaved = prompts.some(
      (prompt) =>
        prompt.title === item.title &&
        prompt.note.includes(`来源平台：${item.sourcePlatform || '未填写'}`),
    );
    const now = new Date().toISOString();

    if (!alreadySaved) {
      setPrompts((current) => [
        {
          id: createId('prompt'),
          title: item.title,
          scene: '资料查询',
          content: formatRadarAsPromptContent(item),
          tags: parseTags(
            ['雷达', item.sourcePlatform, item.searchKeyword]
              .filter(Boolean)
              .join(', '),
          ),
          note: [
            `来源平台：${item.sourcePlatform || '未填写'}`,
            `链接：${item.link || '未填写'}`,
            `简要说明：${item.summary || '未填写'}`,
          ].join('\n'),
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
            <p className="eyebrow">PromptRadar Mini V0.2</p>
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
            draft={radarDraft}
            filteredItems={filteredRadarItems}
            onChange={setRadarDraft}
            onDelete={deleteRadarItem}
            onStatusChange={updateRadarStatus}
            onSubmit={handleRadarSubmit}
            onTransfer={transferRadarToPrompt}
            setStatusFilter={setRadarStatusFilter}
            statusFilter={radarStatusFilter}
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
  draft,
  filteredItems,
  onChange,
  onDelete,
  onStatusChange,
  onSubmit,
  onTransfer,
  setStatusFilter,
  statusFilter,
}) {
  return (
    <div className="radar-layout">
      <section className="radar-overview">
        <div>
          <p className="eyebrow">今日发现</p>
          <h2>记录值得研究的提示词线索，再转入你的本地提示词库</h2>
        </div>
        <div className="radar-pulse" aria-hidden="true">
          <Radar size={42} />
        </div>
      </section>

      <div className="radar-workbench">
        <form className="radar-form" onSubmit={onSubmit}>
          <div className="section-heading">
            <Plus size={20} aria-hidden="true" />
            <h2>新增雷达来源</h2>
          </div>

          <div className="form-row">
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
                placeholder="例如：客服回复优化模板"
                required
              />
            </label>
            <label>
              <span>来源平台</span>
              <input
                value={draft.sourcePlatform}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    sourcePlatform: event.target.value,
                  }))
                }
                placeholder="例如：博客、社区、手动记录"
              />
            </label>
          </div>

          <div className="form-row">
            <label>
              <span>链接</span>
              <input
                value={draft.link}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    link: event.target.value,
                  }))
                }
                placeholder="可选，粘贴原始链接"
              />
            </label>
            <label>
              <span>搜索关键词</span>
              <input
                value={draft.searchKeyword}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    searchKeyword: event.target.value,
                  }))
                }
                placeholder="例如：AI prompt workflow"
              />
            </label>
          </div>

          <label>
            <span>简要说明</span>
            <textarea
              className="note-input"
              value={draft.summary}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  summary: event.target.value,
                }))
              }
              placeholder="这个来源为什么值得记录？可以解决什么问题？"
              required
              rows={4}
            />
          </label>

          <button className="primary-button" type="submit">
            <Plus size={18} />
            <span>添加到雷达</span>
          </button>
        </form>

        <section className="radar-list-panel">
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
                <strong>当前状态下暂无雷达内容</strong>
                <span>切换状态筛选，或手动新增一条来源内容。</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function RadarCard({ item, onDelete, onStatusChange, onTransfer }) {
  return (
    <article className="radar-card">
      <div className="card-topline">
        <div className="card-meta">
          <span>{item.sourcePlatform}</span>
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
      <p className="signal-copy">{item.summary}</p>
      <div className="radar-detail">
        <Search size={16} aria-hidden="true" />
        <span>{item.searchKeyword || '未填写搜索关键词'}</span>
      </div>
      {item.link ? (
        <a className="radar-link" href={item.link} target="_blank" rel="noreferrer">
          <LinkIcon size={16} aria-hidden="true" />
          <span>{item.link}</span>
        </a>
      ) : null}

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
          className={item.status === '已收藏' ? 'secondary-button saved' : 'secondary-button'}
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
