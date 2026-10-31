import {
    db, names, F, specs,
    user, rec, admin, allowedKind
} from '../data.js';

import {
    esc, stamp, button, link, empty, field, imageFor
} from '../utils.js';

/* ------------------------------------------------------------------ */
/* 图标：保持零依赖，全部使用内联 SVG，颜色跟随 currentColor。         */
/* ------------------------------------------------------------------ */

const iconPaths = {
    overview: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    works: '<path d="m4 7.5 8-4.5 8 4.5-8 4.5-8-4.5Z"/><path d="m4 12 8 4.5 8-4.5"/><path d="m4 16.5 8 4.5 8-4.5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    vase: '<path d="M9 3h6M10 3c0 3-3 4-3 8 0 5 2 10 5 10s5-5 5-10c0-4-3-5-3-8"/><path d="M8 13h8"/>',
    post: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-.9.7-1.5 1.2-1.5 2.5"/><path d="M12 17h.01"/>',
    spark: '<path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    trend: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 5-6"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 16v-4M12 16V8M17 16v-7"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    reply: '<path d="M9 17l-6-6 6-6"/><path d="M3 11h11a7 7 0 0 1 7 7v1"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    megaphone: '<path d="m3 11 18-6v14L3 13Z"/><path d="M11 14v5a2 2 0 0 1-4 0v-3"/>',
    hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
    quote: '<path d="M10 11H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v7a5 5 0 0 1-5 5"/><path d="M20 11h-4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v7a5 5 0 0 1-5 5"/>'
};

const icon = (name, className = '') =>
    `<svg class="cc-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || ''}</svg>`;

const kindIcons = {
    collection: 'vase',
    post: 'post',
    question: 'question',
    course: 'book',
    activity: 'calendar',
    exhibition: 'image',
    announcement: 'megaphone',
    topic: 'hash'
};

const kindIcon = kind => icon(kindIcons[kind] || 'works');

/* ------------------------------------------------------------------ */
/* 通用格式化与小组件                                                 */
/* ------------------------------------------------------------------ */

const creatorKinds = ['collection', 'post', 'question'];

const creatorTabs = [
    { key: 'overview', label: '数据概览', icon: 'overview' },
    { key: 'works', label: '作品管理', icon: 'works' },
    { key: 'fans', label: '粉丝管理', icon: 'users' },
    { key: 'interactions', label: '互动管理', icon: 'chat' }
];

function greeting() {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了';
    if (hour < 11) return '早上好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    return '晚上好';
}

function shortTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function dayKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function statusTone(status) {
    return ({
        '已发布': 'is-live',
        '草稿': 'is-draft',
        '待审核': 'is-pending',
        '已驳回': 'is-rejected',
        '已下架': 'is-offline',
        '已删除': 'is-deleted'
    })[status] || 'is-neutral';
}

function ccEmpty(iconName, title, text, action = '') {
    return `<div class="cc-empty">
        <span class="cc-empty-icon">${icon(iconName)}</span>
        <h3>${esc(title)}</h3>
        <p>${esc(text)}</p>
        ${action ? `<div class="cc-empty-action">${action}</div>` : ''}
    </div>`;
}

function ccTabHead(kicker, title, desc, side = '') {
    return `<header class="cc-tabhead">
        <div class="cc-tabhead-copy">
            <span class="cc-kicker">${esc(kicker)}</span>
            <h1>${esc(title)}</h1>
            <p>${esc(desc)}</p>
        </div>
        ${side ? `<div class="cc-tabhead-side">${side}</div>` : ''}
    </header>`;
}

function createMenu() {
    const kinds = creatorKinds.filter(allowedKind);
    const copy = {
        collection: ['记录藏品', '建立数字档案，提交鉴定与审核'],
        post: ['写一篇帖子', '分享收藏见闻与整理方法'],
        question: ['提一个问题', '向藏友请教具体的收藏难题']
    };
    return `<details class="cc-create">
        <summary>
            ${icon('plus')}
            <span>开始创作</span>
            ${icon('chevron', 'cc-chev')}
        </summary>
        <div class="cc-create-pop">
            <div class="cc-pop-head">
                <span>选择创作类型</span>
                <small>内容保存在本机浏览器</small>
            </div>
            ${kinds.length ? kinds.map(kind => `<a class="cc-create-item" href="#edit/${kind}">
                <span class="cc-create-item-icon cc-kind-${kind}">${kindIcon(kind)}</span>
                <span class="cc-create-item-copy">
                    <strong>${copy[kind][0]}</strong>
                    <small>${copy[kind][1]}</small>
                </span>
                ${icon('arrow')}
            </a>`).join('') : `<p class="cc-pop-empty">当前体验账号暂无可发布的内容类型。</p>`}
            <a class="cc-create-perm" href="#profile/identity">申请课程 / 活动发布资格 ${icon('arrow')}</a>
        </div>
    </details>`;
}

function creatorSidebar(tab, counts) {
    const currentUser = user();
    const person = currentUser || { name: '访客', roles: [], intro: '' };
    const roleText = person.roles?.length ? person.roles.join(' · ') : '普通藏友';
    const nav = creatorTabs.map(item => {
        const count = counts[item.key] || 0;
        return `<a class="cc-nav-item" href="#creator/${item.key}" ${item.key === tab ? 'aria-current="page"' : ''}>
            ${icon(item.icon)}
            <span>${item.label}</span>
            ${count ? `<em>${count}</em>` : ''}
        </a>`;
    }).join('');

    const guide = rec(10);
    return `<aside class="cc-side">
        <a class="cc-profile-card" href="#profile">
            <span class="cc-avatar">${esc(String(person.name || '藏').slice(0, 1))}</span>
            <span class="cc-profile-copy">
                <strong>${esc(person.name || '访客')}</strong>
                <small>${esc(roleText)}</small>
            </span>
            ${icon('arrow', 'cc-profile-arrow')}
        </a>
        <nav class="cc-nav" aria-label="创作中心导航">
            <span class="cc-nav-label">创作空间</span>
            ${nav}
        </nav>
        <div class="cc-side-guide">
            <span class="cc-label">创作手记</span>
            <p>“先记录器物的来处，再谈年代与价值。真实，比完整更重要。”</p>
            ${guide ? `<a href="#detail/${guide.id}">查看《${esc(guide.title)}》${icon('arrow')}</a>` : ''}
        </div>
        <a class="cc-side-link" href="#profile">进入个人中心 ${icon('arrow')}</a>
    </aside>`;
}

function creatorHero(works, draftCount, pendingCount, interactionTotal) {
    const person = user();
    return `<section class="cc-hero">
        <div class="cc-hero-copy">
            <span class="cc-kicker">MINCANG CREATOR STUDIO / 创作中心</span>
            <h1>${greeting()}，${esc(person.name)}</h1>
            <p>把器物的来处、生活的温度，整理成可以被看见的故事。</p>
            <div class="cc-hero-meta">
                <span><b>${works.length}</b> 件作品</span>
                <span><b>${draftCount}</b> 份草稿</span>
                <span><b>${pendingCount}</b> 件待审</span>
                <span><b>${interactionTotal}</b> 次互动</span>
            </div>
        </div>
        <div class="cc-hero-actions">
            ${createMenu()}
            <p class="cc-hero-quote">记录器物，也记录器物背后的生活。</p>
        </div>
        <span class="cc-hero-mark" aria-hidden="true">藏</span>
    </section>`;
}

function metricCard({ label, value, note, iconName, tone }) {
    return `<article class="cc-kpi cc-kpi--${tone}">
        <div class="cc-kpi-top">
            <span>${esc(label)}</span>
            <span class="cc-kpi-icon">${icon(iconName)}</span>
        </div>
        <strong>${value}</strong>
        <p>${esc(note)}</p>
    </article>`;
}

function metricCards(works, published, fans, stats) {
    const typeCount = kind => published.filter(r => r.kind === kind).length;
    const drafts = works.filter(r => r.status === '草稿').length;
    const pending = works.filter(r => r.status === '待审核').length;
    const rejected = works.filter(r => r.status === '已驳回').length;
    const mutual = fans.filter(f => db.relations.some(r => r.user === db.current && r.target === f.user && r.type === '关注')).length;
    const interactionTotal = stats.likes + stats.favorites + stats.comments + stats.answers + stats.replies;
    const attention = drafts + pending + rejected;

    return `<div class="cc-kpis">
        ${metricCard({
            label: '已发布作品',
            value: published.length,
            note: `藏品 ${typeCount('collection')} · 帖子 ${typeCount('post')} · 问题 ${typeCount('question')}`,
            iconName: 'works',
            tone: 'brown'
        })}
        ${metricCard({
            label: '收到互动',
            value: interactionTotal,
            note: `赞藏 ${stats.likes + stats.favorites} · 评论 ${stats.comments} · 回答 ${stats.answers} · 回复 ${stats.replies}`,
            iconName: 'spark',
            tone: 'green'
        })}
        ${metricCard({
            label: '粉丝总数',
            value: fans.length,
            note: mutual ? `互相关注 ${mutual} 人` : '持续分享，遇见同好',
            iconName: 'users',
            tone: 'blue'
        })}
        ${metricCard({
            label: '待处理',
            value: attention,
            note: `草稿 ${drafts} · 待审核 ${pending}${rejected ? ` · 已驳回 ${rejected}` : ''}`,
            iconName: 'clock',
            tone: 'gold'
        })}
    </div>`;
}

function compositionCard(works) {
    const colors = ['#9a5127', '#4d6b5b', '#b1844d'];
    const items = creatorKinds.map((kind, index) => ({
        kind,
        label: names[kind],
        count: works.filter(r => r.kind === kind).length,
        color: colors[index]
    }));
    const total = works.length;
    const segments = items.filter(item => item.count).map(item =>
        `<span class="cc-stack-seg" style="width:${(item.count / total) * 100}%;--seg:${item.color}" title="${esc(item.label)} ${item.count} 件"></span>`
    ).join('');

    return `<section class="cc-card cc-composition">
        <div class="cc-card-head">
            <div>
                <span class="cc-kicker">CONTENT MIX</span>
                <h2>你的创作版图</h2>
            </div>
            <span class="cc-total">${total}<small>件</small></span>
        </div>
        ${total ? `<div class="cc-stack" role="img" aria-label="内容构成：${items.map(item => `${item.label}${item.count}件`).join('，')}">${segments}</div>
        <div class="cc-legend">
            ${items.map(item => `<span class="cc-legend-item"><i style="--dot:${item.color}"></i>${esc(item.label)}<b>${item.count}</b><small>${Math.round(item.count / total * 100)}%</small></span>`).join('')}
        </div>` : `<p class="cc-comp-empty">还没有作品。从一件器物、一段见闻或一个问题开始吧。</p>`}
    </section>`;
}

function smoothPath(points) {
    if (!points.length) return '';
    let path = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] || points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] || p2;
        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;
        path += ` C${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
}

function trendChart(items, days, title, color, chartId) {
    const dates = Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - days + 1 + i);
        return dayKey(date);
    });
    const counts = dates.map(date => items.filter(value => dayKey(value) === date).length);
    const total = counts.reduce((sum, value) => sum + value, 0);
    const max = Math.max(1, ...counts);
    const width = 720;
    const height = 248;
    const pad = { left: 40, right: 20, top: 24, bottom: 38 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const stepX = innerW / Math.max(1, days - 1);
    const points = counts.map((value, index) => ({
        x: pad.left + index * stepX,
        y: pad.top + innerH - (value / max) * innerH,
        value,
        date: dates[index]
    }));
    const line = smoothPath(points);
    const area = line
        ? `${line} L${points[points.length - 1].x.toFixed(1)} ${pad.top + innerH} L${points[0].x.toFixed(1)} ${pad.top + innerH} Z`
        : '';
    const labelEvery = days <= 7 ? 1 : 5;
    const xLabels = points.filter((point, index) => index % labelEvery === 0 || index === points.length - 1);
    const tickValues = max >= 2 ? [max, Math.round(max / 2), 0] : [max, 0];
    const yTicks = tickValues.map(value => ({
        value,
        y: pad.top + innerH - (value / max) * innerH
    }));
    const svg = `<svg class="cc-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}：近${days}天共${total}条">
        <defs>
            <linearGradient id="cc-grad-${chartId}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="${color}" stop-opacity=".22"/>
                <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
            </linearGradient>
        </defs>
        ${yTicks.map(tick => `<path d="M${pad.left} ${tick.y.toFixed(1)}H${width - pad.right}" stroke="#eadfce" stroke-dasharray="${tick.value === 0 ? '0' : '3 5'}" fill="none"/>`).join('')}
        ${yTicks.map(tick => `<text x="${pad.left - 10}" y="${(tick.y + 4).toFixed(1)}" text-anchor="end">${tick.value}</text>`).join('')}
        <path d="${area}" fill="url(#cc-grad-${chartId})"/>
        <path d="${line}" fill="none" stroke="${color}" stroke-width="2.8" stroke-linecap="round"/>
        ${points.map(point => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${point.value ? 4 : 2.3}" fill="${point.value ? color : '#fffdf8'}" stroke="${color}" stroke-width="1.8"><title>${point.date.slice(5)}：${point.value}条</title></circle>`).join('')}
        ${xLabels.map(point => `<text x="${point.x.toFixed(1)}" y="${height - 10}" text-anchor="${point.x < pad.left + 10 ? 'start' : point.x > width - pad.right - 10 ? 'end' : 'middle'}">${point.date.slice(5)}</text>`).join('')}
    </svg>`;

    return `<section class="cc-card cc-chart-card">
        <div class="cc-card-head">
            <div>
                <span class="cc-kicker">${days} DAYS</span>
                <h2>${esc(title)}</h2>
            </div>
            <span class="cc-total">${total}<small>条</small></span>
        </div>
        <p class="cc-chart-meta">近${days}天累计 · 日均 ${(total / days).toFixed(1)} 条</p>
        ${total ? `<div class="cc-chart-wrap">${svg}</div>` : `<div class="cc-chart-empty">
            ${icon('chart')}
            <strong>这个时间段还没有记录</strong>
            <span>发布作品或收到互动后，这里会出现趋势。</span>
        </div>`}
        <details class="cc-data-details">
            <summary>查看每日数据</summary>
            <div class="cc-mini-table">
                ${days === 7 ? dates.map((date, index) => `<div><span>${date.slice(5)}</span><b>${counts[index]}</b></div>`).join('') : `<div class="cc-mini-table-grid">${dates.map((date, index) => `<span>${date.slice(5)} <b>${counts[index]}</b></span>`).join('')}</div>`}
            </div>
        </details>
    </section>`;
}

function worksTable(works) {
    if (!works.length) {
        return ccEmpty(
            'works',
            '还没有符合条件的作品',
            '可以调整筛选条件，或从第一件器物、第一段见闻开始记录。',
            link('开始创作', 'edit/collection', 'cc-empty-btn')
        );
    }

    const rows = works.map(record => {
        const title = record.title || '未命名内容';
        const editLabel = record.status === '草稿' ? '继续编辑' : '编辑';
        return `<article class="cc-work-row">
            <div class="cc-work-main">
                <a class="cc-work-thumb" href="#detail/${record.id}" tabindex="-1">
                    <img src="${esc(imageFor(record))}" alt="">
                </a>
                <div class="cc-work-title">
                    <a href="#detail/${record.id}">${esc(title)}</a>
                    <small>${record.reason ? esc(record.reason) : esc(names[record.kind]) + ' · ' + (record.status === '草稿' ? '仅自己可见' : '公开内容')}</small>
                </div>
            </div>
            <div class="cc-work-type"><span class="cc-kind">${kindIcon(record.kind)}${esc(names[record.kind])}</span></div>
            <div><span class="cc-status ${statusTone(record.status)}">${esc(record.status)}</span></div>
            <div class="cc-work-time">${shortTime(record.updated)}</div>
            <div class="cc-work-actions">
                ${link(editLabel, 'edit/' + record.kind + '/' + record.id, 'cc-action cc-action-strong')}
                ${record.kind === 'collection'
                    ? button('进度', 'progress', record.id)
                    : link('查看', 'detail/' + record.id, 'cc-action')}
                <details class="cc-row-more">
                    <summary aria-label="更多操作">${icon('more')}</summary>
                    <div class="cc-row-menu">
                        ${link('查看详情', 'detail/' + record.id, '')}
                        ${button('删除作品', 'delete-record', record.id, '')}
                    </div>
                </details>
            </div>
        </article>`;
    }).join('');

    return `<div class="cc-work-list">
        <div class="cc-work-head" aria-hidden="true">
            <span>作品</span><span>类型</span><span>状态</span><span>最近更新</span><span>操作</span>
        </div>
        ${rows}
    </div>`;
}

function personCard(fan) {
    const person = db.users.find(u => u.id === fan.user);
    if (!person) return '';
    const mutual = db.relations.some(r => r.user === db.current && r.target === person.id && r.type === '关注');
    return `<article class="cc-person">
        <div class="cc-person-head">
            <span class="cc-avatar cc-avatar-sm">${esc(String(person.name || '藏').slice(0, 1))}</span>
            <div class="cc-person-copy">
                <strong>${esc(person.name)}</strong>
                <p>${esc(person.intro || '这位藏友还没有填写个人简介。')}</p>
            </div>
            <span class="cc-chip ${mutual ? 'is-green' : ''}">${mutual ? '互相关注' : '关注了你'}</span>
        </div>
        <div class="cc-person-foot">
            <span>关注于 ${shortTime(fan.time)}</span>
            <div class="cc-person-actions">
                ${button(mutual ? '取消关注' : '回关', mutual ? 'remove-relation' : 'follow', person.id)}
                ${button('私信', 'chat', person.id)}
            </div>
        </div>
    </article>`;
}

function interactionRow(item) {
    const actor = db.users.find(u => u.id === item.user);
    const record = rec(item.record);
    const canReply = item.source === 'comments' && record?.status === '已发布';
    return `<article class="cc-interaction">
        <span class="cc-int-icon cc-int-${item.source}">${icon(item.source === 'comments' ? 'chat' : item.source === 'answers' ? 'spark' : 'reply')}</span>
        <div class="cc-int-body">
            <header>
                <strong>${esc(actor?.name || '已注销用户')}</strong>
                <span>${esc(item.label)}了你的作品</span>
                <time>${shortTime(item.time)}</time>
            </header>
            <blockquote>${esc(item.content)}</blockquote>
            <a class="cc-int-source" href="#detail/${item.record}">来自《${esc(record?.title || '已删除内容')}》${icon('arrow')}</a>
        </div>
        <div class="cc-int-actions">
            ${link('查看并处理', 'detail/' + item.record, 'cc-action cc-action-strong')}
            ${canReply ? button('回复', 'reply', item.id) : ''}
        </div>
    </article>`;
}

/* ------------------------------------------------------------------ */
/* 编辑器                                                             */
/* ------------------------------------------------------------------ */

// 创建、编辑内容。
// 保持 renderEditor 名称，与 main.js 的导入一致。
export function renderEditor(kind, id) {
    if (!user()) {
        return empty('请先选择体验账号')
            + button('体验登录', 'account');
    }

    if (!Array.isArray(specs[kind])) {
        return empty('未找到内容类型');
    }

    if (!allowedKind(kind)) {
        return empty(
            '当前身份尚不具备此发布资格',
            '机构发布课程也需要单独取得课程发布资格。'
        )
            + link('申请身份 / 切换体验账号', 'profile/identity');
    }

    const record = id ? rec(id) : null;

    if (id && !record) {
        return empty('未找到需要编辑的内容')
            + link('返回创作中心', 'creator', 'btn');
    }

    if (record && record.kind !== kind) {
        return empty('内容类型与编辑页面不一致')
            + link('返回创作中心', 'creator', 'btn');
    }

    if (record && record.user !== db.current && !admin()) {
        return empty('只能编辑自己的内容');
    }

    const needsReview = [
        'collection', 'course', 'activity'
    ].includes(kind);

    // 保留当前项目已有的草稿类型。
    const supportsDraft = [
        'collection', 'course', 'activity', 'post', 'question'
    ].includes(kind);

    const title = (record ? '编辑' : '创建') + names[kind];

    const description = needsReview
        ? '草稿仅自己可见；提交后进入相应审核流程。'
        : '发布后直接进入对应栏目。';

    const fieldsHtml = specs[kind]
        .map(config =>
            config.key === 'topics' && ['post', 'question'].includes(kind)
                ? renderTopicPicker(record)
                : field(config, record?.[config.key] ?? '')
        )
        .join('');

    let lessonsHtml = '';

    if (kind === 'course') {
        const lessons = Array.isArray(record?.lessons)
            && record.lessons.length > 0
            ? record.lessons
            : [{}];

        lessonsHtml = `
            <section class="editor-section editor-lessons">
                <div class="editor-section-head">
                    <span class="cc-step-no">02</span>
                    <div>
                        <h2>课时安排</h2>
                        <p>请填写视频课时信息，可附课程说明和配套资料。添加至少一节课后再提交审核。</p>
                    </div>
                </div>
                <div id="lesson-editor">
                    ${lessons.map((lesson, index) =>
                        lessonFields(lesson, index)
                    ).join('')}
                </div>
                <div class="editor-add-lesson">
                    ${button('＋ 添加课时', 'add-lesson')}
                </div>
            </section>
        `;
    }

    const steps = editorSteps(kind, needsReview);
    const tip = editorTip(kind);

    return `<div class="editor-page">
        <header class="editor-head">
            <div class="editor-head-copy">
                <a class="editor-back" href="#creator">${icon('back')} 返回创作中心</a>
                <span class="cc-kicker">${record ? 'EDIT / 修改作品' : 'CREATE / 新建作品'}</span>
                <h1>${title}</h1>
                <p>${description}</p>
            </div>
            <div class="editor-head-side">
                <span class="cc-status ${record ? statusTone(record.status) : 'is-neutral'}">${record?.status || '新作品'}</span>
                <span class="editor-kind">${kindIcon(kind)}${esc(names[kind])}</span>
            </div>
        </header>

        <div class="editor-layout">
            <form id="content-form" class="panel editor-form">
                ${record?.reason ? `<p class="note">上次审核说明：${esc(record.reason)}</p>` : ''}
                <section class="editor-section">
                    <div class="editor-section-head">
                        <span class="cc-step-no">01</span>
                        <div>
                            <h2>内容与资料</h2>
                            <p>带 <span class="required">*</span> 的为必填项。图片字段目前用于本地预览，接入后端后完成真实上传。</p>
                        </div>
                    </div>
                    <div class="form-grid">
                        ${fieldsHtml}
                    </div>
                </section>

                ${lessonsHtml}

                <p
                    id="form-error"
                    class="form-error"
                    role="alert"
                ></p>

                <p class="editor-save-note">${supportsDraft ? '可以先保存草稿，稍后回到创作中心继续编辑。' : '发布后会直接进入对应栏目。'}</p>

                <div class="form-actions">
                    ${link('取消并返回', 'creator', 'btn')}

                    ${supportsDraft ? `
                        <button
                            type="submit"
                            name="mode"
                            value="draft"
                            class="btn"
                            formnovalidate
                        >
                            保存草稿
                        </button>
                    ` : ''}

                    <button
                        type="submit"
                        name="mode"
                        value="publish"
                        class="btn primary"
                    >
                        ${needsReview ? '提交审核' : '发布内容'}
                    </button>
                </div>
            </form>

            <aside class="editor-aside">
                <section class="cc-card cc-pipeline-card">
                    <span class="cc-kicker">WORKFLOW</span>
                    <h2>${needsReview ? '提交后会发生什么' : '发布之后'}</h2>
                    <ol class="cc-pipeline">
                        ${steps.map((step, index) => `<li class="${index === 0 ? 'is-current' : ''}">
                            <span>${String(index + 1).padStart(2, '0')}</span>
                            <div><strong>${esc(step[0])}</strong><p>${esc(step[1])}</p></div>
                        </li>`).join('')}
                    </ol>
                </section>
                <section class="cc-card cc-tip-card">
                    <span class="cc-kicker">EDITOR'S NOTE</span>
                    <h2>一条小建议</h2>
                    <p>${esc(tip)}</p>
                </section>
                <section class="cc-card cc-demo-card">
                    <span class="cc-kicker">DEMO</span>
                    <p>当前为前端体验版，内容保存在本机浏览器，不会上传到服务器。</p>
                </section>
            </aside>
        </div>
    </div>`;
}

function editorSteps(kind, needsReview) {
    if (kind === 'collection') {
        return [
            ['提交资料', '填写藏品基础信息、来源与图片。'],
            ['专家鉴定', '平台按分类与年代分派鉴定专家。'],
            ['合规审核', '管理员核验内容与鉴定结论。'],
            ['进入资源库', '通过后公开档案，并通知你结果。']
        ];
    }
    if (kind === 'course' || kind === 'activity') {
        return [
            ['提交审核', '填写完整资料后提交平台审核。'],
            ['平台审核', '管理员检查内容与发布资格。'],
            ['发布展示', '通过后上架，并同步通知你。']
        ];
    }
    if (needsReview) {
        return [
            ['提交资料', '填写内容并确认必填项。'],
            ['平台审核', '管理员核验内容。'],
            ['发布展示', '通过后进入对应栏目。']
        ];
    }
    return [
        ['填写内容', '把想分享的细节写清楚。'],
        ['立即发布', '帖子与问题无需审核，直接进入栏目。'],
        ['参与交流', '在评论与回答中继续讨论。']
    ];
}

function editorTip(kind) {
    return ({
        collection: '来源与流传经历尽量写清楚；不确定的年代可以标注“待核实”，不要凭印象写成定论。',
        post: '好帖子往往从一个具体细节开始：一件器物、一次整理、一个还没有想明白的问题。',
        question: '把已经尝试过的方法写出来，藏友更容易给出真正有用的建议。',
        course: '课时按学习顺序编号，视频地址可以稍后补充，但提交审核前请至少保留一节课。',
        activity: '报名截止时间应早于活动开始时间，地点写清楚楼层或集合方式。',
        exhibition: '先选定展览主题，再挑选能互相呼应的藏品。',
        topic: '话题名称不宜过长，介绍里写清楚希望大家讨论什么。',
        announcement: '公告正文尽量短而明确，说明时间、对象和需要读者做的事。'
    })[kind] || '把重要的信息写清楚，也把不确定的地方诚实标出来。';
}

// 课时字段名称和 DOM 标记保持原样，
// 供 main.js 添加、移除和保存课时时使用。
export function lessonFields(lesson = {}, index) {
    const currentLesson = lesson ?? {};

    const configs = [
        F('lesson_title', '课时标题', 'text', true, 120),
        F('lesson_order', '排序', 'number', true),
        F('video_url', '视频地址', 'url', true, 255),
        F('duration', '时长（分钟）', 'number', true),
        F('content', '课时说明', 'textarea', false, 2000),
        F(
            'material_reference',
            '配套资料地址',
            'url',
            false,
            500
        )
    ];

    const fieldsHtml = configs.map(config => {
        const value = currentLesson[config.key]
            ?? (config.key === 'lesson_order' ? index + 1 : '');

        return field(
            {
                ...config,
                key: `lesson_${index}_${config.key}`
            },
            value
        );
    }).join('');

    return `
        <div class="lesson cc-lesson" data-lesson="${index}">
            <div class="cc-lesson-head">
                <span class="cc-lesson-no">${String(index + 1).padStart(2, '0')}</span>
                <div>
                    <h3>课时 ${index + 1}</h3>
                    <p>按实际学习顺序填写，时长用于展示课程总时长。</p>
                </div>
                ${button('移除此课时', 'remove-lesson', index)}
            </div>
            <div class="form-grid">
                ${fieldsHtml}
            </div>
        </div>
    `;
}

/* ------------------------------------------------------------------ */
/* 创作中心                                                           */
/* ------------------------------------------------------------------ */

// 创作中心：仅统计当前账号的藏品、帖子和问题。
function ownWorks() {
    return db.records.filter(r => r.user === db.current && creatorKinds.includes(r.kind) && r.status !== '已删除');
}

function receivedInteractions(works) {
    const ids = new Set(works.map(r => r.id));
    return [['comments', '评论'], ['answers', '回答'], ['replies', '回复']].flatMap(([key, label]) =>
        (db[key] || []).filter(x => ids.has(x.record) && x.user !== db.current && !x.deleted)
            .map(x => ({ ...x, label, source: key }))
    ).sort((a, b) => (Date.parse(b.time) || 0) - (Date.parse(a.time) || 0));
}

function optionList(values, selected) {
    return values.map(([value, label]) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`).join('');
}

function rangeControl(days) {
    return `<div class="cc-range" aria-label="选择统计时间范围">
        ${[[7, '近 7 天'], [30, '近 30 天']].map(([value, label]) =>
            `<a class="${days === value ? 'is-active' : ''}" href="#creator/overview?days=${value}" ${days === value ? 'aria-current="true"' : ''}>${label}</a>`
        ).join('')}
    </div>`;
}

export function renderCreator(tab = 'overview', query = '') {
    if (!user()) return empty('请先选择体验账号') + button('体验登录', 'account');
    if (!creatorTabs.some(item => item.key === tab)) tab = 'overview';
    const params = new URLSearchParams(query);
    const works = ownWorks().sort((a, b) => (Date.parse(b.updated) || 0) - (Date.parse(a.updated) || 0));
    const interactions = receivedInteractions(works);
    const fans = (db.relations || []).filter(r => r.type === '关注' && r.target === db.current && db.users.some(u => u.id === r.user));
    const published = works.filter(r => r.status === '已发布');
    const drafts = works.filter(r => r.status === '草稿');
    const pending = works.filter(r => r.status === '待审核');
    const ids = new Set(works.map(r => r.id));
    const count = key => (db[key] || []).filter(x => ids.has(x.record) && x.user !== db.current && !x.deleted).length;
    const stats = {
        likes: count('likes'),
        favorites: count('favorites'),
        comments: count('comments'),
        answers: count('answers'),
        replies: count('replies')
    };
    const interactionTotal = stats.likes + stats.favorites + stats.comments + stats.answers + stats.replies;
    const counts = {
        works: works.length,
        fans: fans.length,
        interactions: interactions.length
    };

    let body = '';

    if (tab === 'overview') {
        const days = params.get('days') === '7' ? 7 : 30;
        body = `<section class="cc-overview-head">
            <div>
                <span class="cc-kicker">OVERVIEW / 数据概览</span>
                <h2>创作数据</h2>
            </div>
            ${rangeControl(days)}
        </section>
        ${metricCards(works, published, fans, stats)}
        ${compositionCard(works)}
        <div class="cc-charts">
            ${trendChart(published.map(r => r.publishedAt || r.updated || r.created).filter(Boolean), days, '作品发布', '#9a5127', 'publish')}
            ${trendChart(interactions.map(r => r.time), days, '收到互动', '#4d6b5b', 'interaction')}
        </div>
        <section class="cc-card cc-recent">
            <div class="cc-card-head">
                <div>
                    <span class="cc-kicker">RECENT WORKS</span>
                    <h2>最近更新</h2>
                </div>
                ${link('全部作品 →', 'creator/works', 'cc-text-link')}
            </div>
            ${worksTable(works.slice(0, 4))}
        </section>
        <p class="cc-footnote">统计范围：当前账号的藏品、帖子和问题；不计自己的点赞、收藏与回复。旧作品未记录首次发布时间时，以最近更新时间计入发布趋势。点赞没有时间记录，暂不展示点赞趋势。数据来自当前浏览器，未连接数据库。</p>`;
    } else if (tab === 'works') {
        const kind = params.get('kind') || '';
        const status = params.get('status') || '';
        const q = params.get('q') || '';
        const filtered = works.filter(record =>
            (!kind || record.kind === kind)
            && (!status || record.status === status)
            && (record.title || '').toLowerCase().includes(q.toLowerCase())
        );
        const statuses = [...new Set(works.map(record => record.status))];
        body = `${ccTabHead('WORKS / 作品管理', '作品管理', `共 ${works.length} 件作品，按最近更新时间排序。`, createMenu())}
        <section class="cc-card cc-filter-card">
            <form class="cc-filter" id="cc-filter-form">
                <label class="cc-search">
                    <span class="cc-sr-only">搜索作品标题</span>
                    ${icon('search')}
                    <input name="q" value="${esc(q)}" aria-label="搜索作品标题" placeholder="搜索作品标题">
                </label>
                <label class="cc-filter-field">
                    <span>类型</span>
                    <select name="kind">${optionList([['', '全部类型'], ...creatorKinds.map(item => [item, names[item]])], kind)}</select>
                </label>
                <label class="cc-filter-field">
                    <span>状态</span>
                    <select name="status">${optionList([['', '全部状态'], ...statuses.map(item => [item, item])], status)}</select>
                </label>
                <button class="btn primary" type="submit">筛选</button>
                ${link('清除条件', 'creator/works', 'cc-reset')}
            </form>
        </section>
        <div class="cc-list-meta"><span>共 ${filtered.length} 件</span>${kind || status || q ? '<span>已按条件筛选</span>' : ''}</div>
        ${worksTable(filtered)}`;
    } else if (tab === 'fans') {
        body = `${ccTabHead('AUDIENCE / 粉丝管理', '粉丝管理', '看见每一次关注，也把同好留在身边。', createMenu())}
        <div class="cc-section-meta"><span>共 ${fans.length} 位藏友关注了你</span></div>
        ${fans.length
            ? `<div class="cc-people-grid">${fans.map(fan => personCard(fan)).join('')}</div>`
            : ccEmpty('users', '还没有粉丝', '发布作品、参与交流后，关注你的藏友会出现在这里。', link('去作品管理', 'creator/works', 'cc-empty-btn'))}`;
    } else {
        const type = params.get('type') || '';
        const typeCounts = {
            comments: interactions.filter(item => item.source === 'comments').length,
            answers: interactions.filter(item => item.source === 'answers').length,
            replies: interactions.filter(item => item.source === 'replies').length
        };
        const list = interactions.filter(item => !type || item.source === type);
        body = `${ccTabHead('INTERACTIONS / 互动管理', '互动管理', '评论、回答与回复，都是作品之外继续发生的交流。', createMenu())}
        <nav class="cc-chips" aria-label="按互动类型筛选">
            <a class="${!type ? 'is-active' : ''}" href="#creator/interactions">全部 <b>${interactions.length}</b></a>
            <a class="${type === 'comments' ? 'is-active' : ''}" href="#creator/interactions?type=comments">评论 <b>${typeCounts.comments}</b></a>
            <a class="${type === 'answers' ? 'is-active' : ''}" href="#creator/interactions?type=answers">回答 <b>${typeCounts.answers}</b></a>
            <a class="${type === 'replies' ? 'is-active' : ''}" href="#creator/interactions?type=replies">回复 <b>${typeCounts.replies}</b></a>
        </nav>
        <div class="cc-section-meta"><span>共 ${list.length} 条</span><span>按时间倒序</span></div>
        ${list.length
            ? `<div class="cc-interactions">${list.map(item => interactionRow(item)).join('')}</div>`
            : ccEmpty('chat', type ? '这个类型下暂无互动' : '还没有收到的互动', '其他藏友对你的作品发表评论、回答或回复后，会显示在这里。', link('查看全部作品', 'creator/works', 'cc-empty-btn'))}`;
    }

    return `<div class="creator-center">
        ${tab === 'overview' ? creatorHero(works, drafts.length, pending.length, interactionTotal) : ''}
        <div class="cc-layout">
            ${creatorSidebar(tab, counts)}
            <main class="cc-content">${body}</main>
        </div>
    </div>`;
}

// 只绑定当前页面控件；菜单关闭委托只注册一次，路由切换后继续复用。
export function bindCreatorControls() {
    const form = document.getElementById('cc-filter-form');
    if (form) form.onsubmit = event => {
        event.preventDefault();
        location.hash = 'creator/works?' + new URLSearchParams(new FormData(form)).toString();
    };

    document.querySelectorAll('.cc-create').forEach(details => {
        details.addEventListener('toggle', () => {
            if (!details.open) return;
            document.querySelectorAll('.cc-create[open]').forEach(other => {
                if (other !== details) other.open = false;
            });
        });
    });

    if (!document.body.dataset.ccMenusBound) {
        document.addEventListener('click', event => {
            if (!event.target.closest('.cc-create')) {
                document.querySelectorAll('.cc-create[open]').forEach(details => { details.open = false; });
            }
            if (!event.target.closest('.cc-row-more')) {
                document.querySelectorAll('.cc-row-more[open]').forEach(details => { details.open = false; });
            }
        });
        document.addEventListener('keydown', event => {
            if (event.key !== 'Escape') return;
            document.querySelectorAll('.cc-create[open], .cc-row-more[open]').forEach(details => { details.open = false; });
        });
        document.body.dataset.ccMenusBound = 'true';
    }
}

function renderTopicPicker(record) {
    const selected = String(record?.topics || '').split(/[,，]/).map(x => x.trim()).filter(Boolean);
    const topics = [...new Set(db.records.filter(r => r.kind === 'topic' && r.status === '已发布').map(r => r.title))];
    const draft = record?.pendingTopic || {};
    return `<fieldset class="cc-topic">
        <legend>添加话题</legend>
        <label class="field">
            <span>搜索已有话题</span>
            <input id="cc-topic-search" type="search" placeholder="输入话题名称">
        </label>
        <div class="cc-topic-list">
            ${topics.map(title => `<label data-topic-label="${esc(title)}"><input type="checkbox" name="selected_topics" value="${esc(title)}" ${selected.includes(title) ? 'checked' : ''}> ${esc(title)}</label>`).join('') || '<p>暂无已发布话题</p>'}
        </div>
        <p id="cc-topic-empty" hidden>没有匹配的话题，可以在下方创建。</p>
        ${selected.filter(t => !topics.includes(t)).map(t => `<p class="cc-muted">原话题“${esc(t)}”目前不可选，请重新选择。</p>`).join('')}
        <details ${draft.name ? 'open' : ''}>
            <summary>找不到话题？创建新话题</summary>
            <label class="field">
                <span>话题名称</span>
                <input name="new_topic_name" maxlength="100" value="${esc(draft.name || '')}" placeholder="不含逗号，同名话题将复用">
            </label>
            <label class="field">
                <span>话题介绍</span>
                <textarea name="new_topic_description" maxlength="500">${esc(draft.description || '')}</textarea>
            </label>
            <p class="cc-muted">随帖子或问题发布；保存草稿不会公开新话题。</p>
        </details>
    </fieldset>`;
}

export function bindTopicPicker() {
    const search = document.getElementById('cc-topic-search');
    if (!search) return;
    search.oninput = () => {
        let found = 0;
        document.querySelectorAll('[data-topic-label]').forEach(label => {
            label.hidden = !label.dataset.topicLabel.toLowerCase().includes(search.value.trim().toLowerCase());
            if (!label.hidden) found++;
        });
        document.getElementById('cc-topic-empty').hidden = found > 0;
    };
}

// 在写入任何数据前完成校验；返回待创建的话题，由现有提交流程统一保存。
export function prepareTopics(formData, draft) {
    const selected = [...new Set(formData.getAll('selected_topics').map(String))];
    const active = db.records.filter(r => r.kind === 'topic' && r.status === '已发布');
    if (selected.some(name => !active.some(t => t.title === name))) throw Error('所选话题已不可用，请重新选择。');
    const name = String(formData.get('new_topic_name') || '').trim();
    const description = String(formData.get('new_topic_description') || '').trim();
    if (name.length > 100 || /[,，]/.test(name)) throw Error('话题名称不能超过100字或包含逗号。');
    if (description.length > 500) throw Error('话题介绍不能超过500字。');
    const existing = active.find(t => t.title === name);
    if (!draft && name && !existing && !description) throw Error('请填写新话题介绍。');
    if (!draft && description && !name) throw Error('请填写新话题名称。');
    if (!draft && name && !existing && !allowedKind('topic')) throw Error('当前账号不能创建话题。');
    if (!draft && name && !existing && db.records.some(t => t.kind === 'topic' && t.title === name && t.status !== '已删除')) throw Error('同名话题暂不可使用，请选择其他名称。');
    if (!draft && name && !selected.includes(name)) selected.push(name);
    if (selected.join(',').length > 100) throw Error('所选话题名称总长度不能超过100字。');
    return { topics: selected.join(','), pendingTopic: draft ? { name, description } : null, newTopic: !draft && name && !existing ? { name, description } : null };
}
