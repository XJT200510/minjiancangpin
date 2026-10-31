import { db, names, uname, visible, rating } from '../data.js';
import { esc, link, imageFor, cards } from '../utils.js';

const newestBy = key => (a, b) => String(b[key] || b.updated || b.created || '')
    .localeCompare(String(a[key] || a.updated || a.created || ''));

const dateTime = value => String(value || '').slice(0, 16).replace('T', ' ') || '时间待定';
const dateOnly = value => String(value || '').slice(0, 10).replace(/-/g, '.') || '日期待定';

function dateParts(value) {
    const text = String(value || '');
    return { day: text.slice(8, 10) || '—', year: text.slice(0, 4) || '' };
}

function excerpt(value, length = 90) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > length ? text.slice(0, length) + '…' : text;
}

function sectionHead({ eyebrow, title, desc = '', route = '', more = '查看全部 →' }) {
    return `<div class="bulk-head home-section-head">
        <div>
            <span class="eyebrow">${esc(eyebrow)}</span>
            <h2>${esc(title)}</h2>
            ${desc ? `<p>${esc(desc)}</p>` : ''}
        </div>
        ${route ? link(more, route, 'home-more') : ''}
    </div>`;
}

function topicStrip(topics) {
    if (!topics.length) return '';
    return `<div class="home-topic-strip">
        <span class="home-topic-label">热门话题</span>
        <div class="home-topic-list">${topics.map(topic => `<a href="#detail/${topic.id}"># ${esc(topic.title)}</a>`).join('')}</div>
        ${link('话题广场 →', 'topics', 'home-topic-more')}
    </div>`;
}

function featureSection({
    theme, eyebrow, title, desc = '', route, more = '查看全部 →',
    list, image, imageAlt, caption = '', metadata, itemMetadata,
    emptyText, footer = ''
}) {
    const first = list[0];
    let content = '';

    if (!first) {
        content = `<p class="feature-empty">${esc(emptyText)}</p>`;
    } else {
        const art = `<a class="feature-art${caption ? ' has-caption' : ''}" href="#detail/${first.id}">
            <img src="${esc(image || imageFor(first))}" alt="${esc(imageAlt || first.title)}" loading="lazy" decoding="async">
            ${caption ? `<span>${esc(caption)}</span>` : ''}
        </a>`;
        const lead = `<a class="feature-lead" href="#detail/${first.id}">
            <strong>${esc(first.title)}</strong>
            <p>${esc(first.body)}</p>
            <small>${esc(metadata(first))}</small>
        </a>`;

        if (list.length === 1) {
            content = `<div class="feature-single">
                ${art}
                <div class="feature-single-copy">
                    <span class="feature-kicker">${esc(itemMetadata(first))}</span>
                    ${lead}
                    <a class="feature-cta" href="#detail/${first.id}">查看详情 <span aria-hidden="true">→</span></a>
                </div>
            </div>`;
        } else {
            content = `<div class="feature-layout">
                ${art}
                <div class="feature-content">
                    <span class="feature-kicker">${esc(itemMetadata(first))}</span>
                    ${lead}
                    <div class="feature-links">
                        ${list.slice(1, 5).map(record => `<a href="#detail/${record.id}">
                            <span>${esc(record.title)}</span>
                            <small>${esc(itemMetadata(record))}</small>
                        </a>`).join('')}
                    </div>
                </div>
            </div>`;
        }
    }

    return `<section class="home-section feature-section feature-section--${theme}">
        ${sectionHead({ eyebrow, title, desc, route, more })}
        ${content}
        ${footer}
    </section>`;
}

function renderHomeNotices() {
    const list = db.records
        .filter(record => record.kind === 'announcement' && visible(record))
        .sort(newestBy('updated'))
        .slice(0, 5);

    return `<section class="home-section home-notices" aria-label="通知公告">
        <div class="notice-mark" aria-hidden="true"><span>公告</span><small>NOTICE</small></div>
        <div class="notice-content">
            ${sectionHead({
                eyebrow: 'NOTICES',
                title: '通知公告',
                desc: '平台规则、资料填写与近期安排',
                route: 'announcements',
                more: '查看全部 →'
            })}
            ${list.length ? `<div class="notice-list">
                ${list.map((record, index) => {
                    const date = dateParts(record.updated || record.created);
                    return `<a class="notice-item ${index === 0 ? 'is-lead' : ''}" href="#detail/${record.id}">
                        <time><b>${esc(date.day)}</b><span>${esc(date.year)}</span></time>
                        <div class="notice-copy">
                            <strong>${esc(record.title)}</strong>
                            ${index === 0 ? `<p>${esc(excerpt(record.body, 80))}</p>` : ''}
                        </div>
                        <span class="notice-link">查看 →</span>
                    </a>`;
                }).join('')}
            </div>` : '<p class="feature-empty">暂无通知公告</p>'}
        </div>
    </section>`;
}

function renderHomeFooter() {
    const links = [
        ['国家档案局', 'https://www.saac.gov.cn/'],
        ['中国第二历史档案馆', 'http://www.shac.net.cn/'],
        ['中国档案报社', 'http://www.zgdazxw.com.cn/'],
        ['中国档案杂志社', 'http://www.chinaarchives.cn/'],
        ['中国档案学会', 'https://www.idangan.cn/'],
        ['档案干部教育中心', 'http://www.saacedu.org.cn/']
    ];

    return `<section class="home-footer" aria-label="友情链接">
        <div class="home-footer-copy">
            <span class="eyebrow">FRIEND LINKS / 友情链接</span>
            <h2>档案与文博平台</h2>
            <p>以下链接指向各机构官方网站，仅用于课程设计学习交流，不代表官方合作。</p>
        </div>
        <nav class="home-footer-links" aria-label="机构官方网站">
            ${links.map(([name, url]) => `<a href="${url}" target="_blank" rel="noopener noreferrer">
                <span>${esc(name)}</span><b aria-hidden="true">↗</b>
            </a>`).join('')}
        </nav>
        <div class="home-footer-bottom">
            <span>民藏 · 民间藏品数字化保护与交流平台</span>
            <span>课程设计演示 · 2026</span>
        </div>
    </section>`;
}

export function renderHome() {
    const collections = db.records.filter(record => record.kind === 'collection' && visible(record));
    const exhibitions = db.records.filter(record => record.kind === 'exhibition' && visible(record));
    const featuredTitles = ['纸短情长：家书里的牵挂', '青花里的匠心', '年画里的新春'];
    const featuredExhibitions = featuredTitles
        .map(title => exhibitions.find(record => record.title === title))
        .filter(Boolean);
    const exhibitionList = featuredExhibitions.length ? featuredExhibitions : exhibitions.slice(0, 3);
    const activities = db.records
        .filter(record => record.kind === 'activity' && visible(record))
        .sort(newestBy('activity_time'));
    const forumItems = db.records.filter(record => ['post', 'question'].includes(record.kind) && visible(record));
    const courses = db.records.filter(record => record.kind === 'course' && visible(record));
    const topics = db.records
        .filter(record => record.kind === 'topic' && visible(record))
        .sort(newestBy('updated'))
        .slice(0, 5);

    return `
    <section class="home-carousel" aria-label="首页轮播">
        <div class="carousel-slide active">
            <img src="assets/banner-platform.png" alt="民间藏品数字传承" fetchpriority="high" decoding="async">
            <a class="carousel-link" href="#resource">探索藏品</a>
        </div>
        <div class="carousel-slide">
            <img src="assets/banner-activity.png" alt="家书整理周末课" loading="lazy" decoding="async">
            <a class="carousel-link" href="#activities">查看活动</a>
        </div>
        <div class="carousel-slide">
            <img src="assets/banner-exhibition.png" alt="纸短情长专题展" loading="lazy" decoding="async">
            <a class="carousel-link" href="#exhibitions">查看专题</a>
        </div>
        <div class="carousel-slide">
            <img src="assets/banner-course.png" alt="家书记录课程" loading="lazy" decoding="async">
            <a class="carousel-link" href="#courses">查看课程</a>
        </div>
        <div class="carousel-dots" aria-label="切换轮播图片">
            <button type="button" class="active" aria-label="第1张"></button>
            <button type="button" aria-label="第2张"></button>
            <button type="button" aria-label="第3张"></button>
            <button type="button" aria-label="第4张"></button>
        </div>
    </section>

    <section class="home-intro" aria-labelledby="home-intro-title">
        <div class="home-intro-copy">
            <span class="eyebrow">ABOUT MINCANG</span>
            <h2 id="home-intro-title">让民间藏品有地方存、有人看、有人聊、有人鉴</h2>
            <p>从一件家中老物件开始，记录它的来处与细节，建立可以长期保存的数字档案；在论坛、课程与活动中，和藏友、专家一起，把器物背后的生活记忆延续下去。</p>
            <div class="home-intro-actions">
                ${link('浏览藏品', 'resource', 'home-cta')}
                ${link('进入创作中心', 'creator', 'home-cta home-cta--ghost')}
            </div>
        </div>
        <div class="home-intro-points">
            ${[
                ['01', '记录器物', '拍下全貌与细节'],
                ['02', '数字建档', '留下来源与故事'],
                ['03', '交流鉴赏', '向藏友与专家请教'],
                ['04', '课程活动', '从线上走到线下']
            ].map(([number, title, text]) => `<div class="home-intro-point">
                <b>${number}</b>
                <strong>${esc(title)}</strong>
                <small>${esc(text)}</small>
            </div>`).join('')}
        </div>
    </section>

    <section class="home-section collection-showcase" aria-label="藏品精选">
        ${sectionHead({
            eyebrow: 'COLLECTIONS',
            title: '藏品精选',
            desc: '从地方民间收藏中，看见器物与生活的细节',
            route: 'resource',
            more: '查看全部 →'
        })}
        ${cards(collections.slice(0, 3))}
    </section>

    <section class="home-section home-exhibitions" aria-label="专题展览">
        ${sectionHead({
            eyebrow: 'EXHIBITIONS',
            title: '专题展览',
            desc: '循着藏品，走进生活中的文化记忆',
            route: 'exhibitions',
            more: '更多展览 →'
        })}
        <div class="exhibit-posters">
            ${exhibitionList.map(record => `<a class="exhibit-poster" href="#detail/${record.id}" aria-label="${esc(record.title)}">
                <img class="exhibit-poster-img" src="${esc(imageFor(record))}" alt="" loading="lazy" decoding="async">
                <span class="poster-shade"></span>
                <span class="poster-text">
                    <small>民间藏品 · 专题展</small>
                    <strong>${esc(record.title)}</strong>
                    <em>进入展览 →</em>
                </span>
            </a>`).join('')}
        </div>
    </section>

    ${featureSection({
        theme: 'events',
        eyebrow: 'EVENTS',
        title: '近期活动',
        desc: '带上藏品的故事，和藏友在线下见一面',
        route: 'activities',
        more: '活动中心 →',
        list: activities,
        imageAlt: '民间收藏交流活动',
        metadata: record => `${dateTime(record.activity_time)} · ${record.activity_location || '地点待定'}`,
        itemMetadata: record => dateOnly(record.activity_time),
        emptyText: '暂无活动，新的交流正在筹备中。'
    })}

    ${featureSection({
        theme: 'forum',
        eyebrow: 'COMMUNITY',
        title: '论坛交流',
        desc: '从一件器物出发，和同好继续聊下去',
        route: 'forum',
        more: '进入论坛 →',
        list: forumItems,
        image: 'assets/山水吉祥纹盒.jpg',
        imageAlt: '清代雕漆山水吉祥纹盒',
        caption: '从一件器物开始，和同好聊起来',
        metadata: record => `${uname(record.user)} · ${names[record.kind]}`,
        itemMetadata: record => names[record.kind],
        emptyText: '暂无交流内容，期待你的第一条分享。',
        footer: topicStrip(topics)
    })}

    ${featureSection({
        theme: 'learning',
        eyebrow: 'LEARNING',
        title: '课程学习',
        desc: '跟着课程，把收藏经验变成可以复用的方法',
        route: 'courses',
        more: '查看全部课程 →',
        list: courses,
        imageAlt: '藏品数字建档课程',
        metadata: record => `${uname(record.user)} · ${record.course_category_id || '课程学习'} · ${(record.lessons || []).length}课时 · ${rating(record.id)}`,
        itemMetadata: record => record.course_category_id || '课程学习',
        emptyText: '暂无课程，新的课程正在筹备中。'
    })}

    ${renderHomeNotices()}
    ${renderHomeFooter()}
    `;
}
