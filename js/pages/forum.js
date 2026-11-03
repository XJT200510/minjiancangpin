import { db, uname, visible } from '../data.js';
import { esc, stamp, button, link, head, empty, imageFor } from '../utils.js';

/* ============================================================
   论坛交流 · 三个板块（帖子 / 问答 / 话题广场）
   只负责本模块渲染：复用 data.js 的现有数据结构、utils.js 的少量格式化函数，
   搜索 / 重置 / 翻页沿用 main.js 已有的 data-action 约定（#filter / search / clear-filters / page），
   因此无需改动 main.js、utils.js、data.js、resource.js。
   ============================================================ */

const PER_PAGE = 8;
const RANK_LIMIT = 5;

// 三个板块：路由 → 记录类型 + 页面文案
const SECTIONS = {
 forum: {
  kind: 'post', title: '交流论坛', sub: '记录与分享，看看藏友们在聊什么',
  noun: '帖子', publish: '发布帖子',
  placeholder: '搜索帖子标题、正文、作者或话题'
 },
 questions: {
  kind: 'question', title: '藏友问答', sub: '有疑问就提出来，让懂的人一起看看',
  noun: '问题', publish: '提出问题',
  placeholder: '搜索问题标题、描述、提问人或话题'
 },
 topics: {
  kind: 'topic', title: '话题广场', sub: '按主题聚拢内容，一起讨论同一个方向',
  noun: '话题', publish: '创建话题',
  placeholder: '搜索话题名称或简介'
 }
};

// 榜单标题与口径说明，三个板块各自独立
const RANKINGS = {
 post: { title: '热帖榜', hint: '按点赞、收藏、评论合计排序' },
 question: { title: '热门问题榜', hint: '按回答数量排序' },
 topic: { title: '热门话题榜', hint: '按相关内容数量排序' }
};

const alive = (list = []) => list.filter(x => !x.deleted);
const timeOf = r => stamp(r.publishedAt || r.created || r.updated);

// 话题下的帖子与问题：按 topics 字段逐项精确匹配话题名
function relatedTo(topic) {
 const name = String(topic.title || '').trim();
 if (!name) return [];
 return db.records.filter(r => ['post', 'question'].includes(r.kind) && visible(r)
  && String(r.topics || '').split(/[,，]/).map(t => t.trim()).includes(name));
}

// 三个板块各算各的指标，避免所有榜单展示同一份数据
function metricsOf(r) {
 if (r.kind === 'post') {
  const like = db.likes.filter(x => x.record === r.id).length;
  const favorite = db.favorites.filter(x => x.record === r.id).length;
  const comment = alive(db.comments).filter(x => x.record === r.id).length;
  return { heat: like + favorite + comment, text: `赞 ${like} · 藏 ${favorite} · 评 ${comment}` };
 }
 if (r.kind === 'question') {
  const answer = alive(db.answers).filter(x => x.record === r.id).length;
  return { heat: answer, text: `回答 ${answer}` };
 }
 const related = relatedTo(r).length;
 return { heat: related, text: `相关内容 ${related} 篇` };
}

// 搜索范围：标题 / 正文 / 话题 / 作者名
function haystack(r) {
 return [r.title, r.body, r.topics, r.topic_name, r.topic_description, uname(r.user)]
  .filter(Boolean).join(' ').toLowerCase();
}

function topicTags(r) {
 return String(r.topics || '').split(/[,，]/).map(t => t.trim()).filter(Boolean)
  .slice(0, 2).map(t => `<span class="forum-tag">#${esc(t)}</span>`).join('');
}

function itemShell(r, flagHtml, enterLabel) {
 const m = metricsOf(r);
 return `<article class="forum-item">
  <a class="forum-thumb" href="#detail/${r.id}" tabindex="-1" aria-hidden="true"><img src="${esc(imageFor(r))}" alt="" loading="lazy"></a>
  <div class="forum-item-body">
   <h3><a href="#detail/${r.id}">${esc(r.title)}</a>${flagHtml}</h3>
   <p class="clip">${esc(r.body || '这条内容还没有填写正文。')}</p>
   <div class="forum-meta">
    <span class="forum-author">${esc(uname(r.user))}</span>
    <span class="forum-time">${esc(timeOf(r))}</span>
    ${topicTags(r)}
   </div>
  </div>
  <div class="forum-metrics"><strong>${m.text}</strong><a class="forum-enter" href="#detail/${r.id}">${enterLabel}</a></div>
 </article>`;
}

const postRow = r => itemShell(r, '', '查看 →');

const questionRow = r => itemShell(r,
 r.resolved ? '<span class="forum-flag done">已解决</span>' : '<span class="forum-flag">待解答</span>',
 '去回答 →');

// 话题广场用两列卡片，与帖子 / 问答的列表区分开
function topicCard(r) {
 const related = relatedTo(r);
 const people = new Set(related.map(x => x.user)).size;
 return `<article class="forum-topic">
  <h3><a href="#detail/${r.id}">#${esc(r.title)}</a></h3>
  <p class="clip">${esc(r.body || '这个话题还没有填写简介。')}</p>
  <div class="forum-topic-foot">
   <span>相关内容 <b>${related.length}</b> 篇</span>
   <span>参与 <b>${people}</b> 人</span>
  </div>
  <a class="btn small" href="#detail/${r.id}">进入话题 →</a>
 </article>`;
}

// 板块切换：当前项高亮，并在标签上直接显示该板块条数
function tabBar(current) {
 const items = [['forum', '帖子', 'post'], ['questions', '问答', 'question'], ['topics', '话题广场', 'topic']];
 return `<div class="tabs forum-tabs">${items.map(([to, label, kind]) => {
  const count = db.records.filter(r => r.kind === kind && visible(r)).length;
  return link(`${label}<em>${count}</em>`, to, 'forum-tab' + (current === to ? ' active' : ''));
 }).join('')}</div>`;
}

function rankingBlock(kind) {
 const cfg = RANKINGS[kind];
 const list = db.records.filter(r => r.kind === kind && visible(r))
  .map(r => ({ r, m: metricsOf(r) }))
  .sort((a, b) => b.m.heat - a.m.heat || String(b.r.publishedAt || b.r.created || '').localeCompare(String(a.r.publishedAt || a.r.created || '')))
  .slice(0, RANK_LIMIT);
 const body = list.length
  ? `<ol>${list.map(({ r, m }, i) => `<li><span class="rank-number">${i + 1}</span><a href="#detail/${r.id}"><strong>${esc(r.title)}</strong><small>${m.text}</small></a></li>`).join('')}</ol>`
  : '<p class="forum-rank-empty">暂无上榜内容</p>';
 return `<aside class="forum-ranking"><h2>${cfg.title}</h2><p>${cfg.hint}</p>${body}</aside>`;
}

// 两种空状态要分开：板块本来没内容 / 搜索没有结果
function emptyBlock(cfg, keyword) {
 if (keyword) {
  return `<div class="empty forum-empty"><h3>没有找到与「${esc(keyword)}」相关的${cfg.noun}</h3><p>换个关键词试试，也可以只搜作者名或话题名。</p><div class="actions">${button('清空搜索', 'clear-filters')}</div></div>`;
 }
 const hint = {
  post: '点右上角「发布帖子」，记录一件器物或一段故事。',
  question: '点右上角「提出问题」，让懂行的藏友来解答。',
  topic: '点右上角「创建话题」，把相关的内容聚在一起。'
 }[cfg.kind];
 return `<div class="empty forum-empty"><h3>还没有${cfg.noun}</h3><p>${hint}</p><div class="actions">${link(cfg.publish, 'edit/' + cfg.kind)}</div></div>`;
}

export function renderForum(section = 'forum', state = {}) {
 const cfg = SECTIONS[section];
 if (!cfg) return empty('页面不存在', '请通过上方导航返回论坛。');
 const kind = cfg.kind;
 const keyword = String(state.filter || '').trim();

 let list = db.records.filter(r => r.kind === kind && visible(r))
  .sort((a, b) => String(b.publishedAt || b.created || '').localeCompare(String(a.publishedAt || a.created || '')));
 if (keyword) {
  const q = keyword.toLowerCase();
  list = list.filter(r => haystack(r).includes(q));
 }

 const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
 const page = Math.max(1, Math.min(Number(state.page) || 1, pages));
 const items = list.slice((page - 1) * PER_PAGE, page * PER_PAGE);

 let html = head(cfg.title, cfg.sub, link(cfg.publish, 'edit/' + kind));
 html += tabBar(section);
 html += `<div class="toolbar">
  <input id="filter" aria-label="搜索${cfg.noun}" placeholder="${esc(cfg.placeholder)}" value="${esc(keyword)}">
  <button class="btn" data-action="search">搜索</button>
  <button class="btn" data-action="clear-filters">重置</button>
 </div>`;
 if (keyword) {
  html += `<p class="forum-search-note">关键词「${esc(keyword)}」· 命中 ${list.length} 条<button type="button" class="forum-clear" data-action="clear-filters">清空</button></p>`;
 }

 html += '<div class="forum-layout"><div class="forum-main">';
 if (!items.length) html += emptyBlock(cfg, keyword);
 else if (kind === 'topic') html += `<div class="forum-topic-grid">${items.map(topicCard).join('')}</div>`;
 else html += `<div class="forum-list">${items.map(kind === 'post' ? postRow : questionRow).join('')}</div>`;

 if (list.length > PER_PAGE) {
  html += `<div class="pager">${button('上一页', 'page', page - 1, page === 1 ? 'disabled' : '')}<span>${page} / ${pages} · 共${list.length}条</span>${button('下一页', 'page', page + 1, page >= pages ? 'disabled' : '')}</div>`;
 }
 html += '</div>' + rankingBlock(kind) + '</div>';

 state.page = page;
 return html;
}

/* 样式表 css/forum-extra.css 已由组长在 index.html 统一引入（2026-11-03），
   这里不再重复注入，避免同一个文件加载两次。 */

/* 搜索框支持回车提交：main.js 没有绑定键盘事件，这里用 document 级委托，
   且只在论坛三个板块生效，不影响资源库等其他页面的同名输入框。 */
const onForumRoute = () => /^#(forum|questions|topics)(?:$|[/?])/.test(location.hash);
document.addEventListener('keydown', e => {
 if (e.key !== 'Enter' || e.isComposing) return; // 中文输入法选词时的回车不算
 const el = e.target;
 if (!(el instanceof HTMLElement) || el.id !== 'filter' || !onForumRoute()) return;
 const trigger = document.querySelector('#app [data-action="search"]');
 if (trigger) { e.preventDefault(); trigger.click(); }
});
