import { db, names, user, uname, visible, rating } from '../data.js';
import { $, esc, button, link, head, imageFor, cards } from '../utils.js';

function renderFeatureSection({theme, eyebrow, title, route, more, list, image, caption='', metadata, itemMetadata, emptyText, moreEmpty}) {
 const first=list[0];
 const content=first ? `<div class="feature-layout">
   <a class="feature-art" href="#detail/${first.id}"><img src="${esc(image || imageFor(first))}" alt="${esc(first.title)}">${caption ? `<span>${esc(caption)}</span>` : ''}</a>
   <div class="feature-content"><a class="feature-lead" href="#detail/${first.id}"><strong>${esc(first.title)}</strong><p>${esc(first.body)}</p><small>${esc(metadata(first))}</small></a>
   <div class="feature-links">${list.slice(1,6).map(r=>`<a href="#detail/${r.id}"><span>${esc(r.title)}</span><small>${esc(itemMetadata(r))}</small></a>`).join('') || `<p>${esc(moreEmpty)}</p>`}</div></div></div>` : `<p>${esc(emptyText)}</p>`;
 return `<section class="home-section feature-section feature-section--${theme}"><div class="bulk-head"><div><span class="eyebrow">${esc(eyebrow)}</span><h2>${esc(title)}</h2></div>${link(more,route,'feature-more')}</div>${content}</section>`;
}
    function renderHomeNotices() {
 const list=db.records.filter(r=>r.kind==='announcement'&&visible(r)).sort((a,b)=>String(b.updated||b.created).localeCompare(String(a.updated||a.created))).slice(0,5);
 return `<section class="home-section home-notices" aria-label="通知公告">
   <div class="notice-art"><img src="assets/山水吉祥纹盒.jpg" alt="清代雕漆山水吉祥纹盒"><span class="notice-credit">图片来源：大都会艺术博物馆</span></div>
   <div class="notice-content"><div class="bulk-head"><h2>通知公告</h2>${link('更多内容 →','announcements','notice-more')}</div>
   <div class="notice-list">${list.map(r=>`<a href="#detail/${r.id}"><span>❖</span><div><strong>${esc(r.title)}</strong><time>${esc((r.updated||r.created||'').slice(0,10).replace(/-/g,'.'))}</time></div></a>`).join('')||'<p>暂无通知公告</p>'}</div></div></section>`;
}
export function renderHome() {
        return `
    <section class="home-carousel" aria-label="首页轮播">
      <div class="carousel-slide active">
        <img src="assets/banner-platform.png" alt="民间藏品数字传承">
        <a class="carousel-link" href="#resource">探索藏品</a>
      </div>

      <div class="carousel-slide">
        <img src="assets/banner-activity.png" alt="家书整理周末课">
        <a class="carousel-link" href="#activities">查看活动</a>
      </div>

      <div class="carousel-slide">
        <img src="assets/banner-exhibition.png" alt="纸短情长专题展">
        <a class="carousel-link" href="#exhibitions">查看专题</a>
      </div>

      <div class="carousel-slide">
        <img src="assets/banner-course.png" alt="家书记录课程">
        <a class="carousel-link" href="#courses">查看课程</a>
      </div>

      <div class="carousel-dots" aria-label="切换轮播图片">
        <button type="button" class="active" aria-label="第1张"></button>
        <button type="button" aria-label="第2张"></button>
        <button type="button" aria-label="第3张"></button>
        <button type="button" aria-label="第4张"></button>
      </div>
    </section>

<section class="home-section collection-showcase">
    <div class="bulk-head">
      <h2>藏品精选</h2>
      ${link('查看全部 →', 'resource', '')}
    </div>
    ${cards(db.records.filter(r => r.kind === 'collection' && visible(r)).slice(0, 3))}
</section>

    <section class="home-section home-exhibitions"><div class="bulk-head"><div><span class="eyebrow">EXHIBITIONS</span><h2>专题展览</h2><p>循着藏品，走进生活中的文化记忆</p></div>${link('更多展览 →','exhibitions','')}</div><div class="exhibit-posters">${db.records.filter(r=>r.kind==='exhibition'&&visible(r)&&['纸短情长：家书里的牵挂','青花里的匠心','年画里的新春'].includes(r.title)).map(r=>`<a class="exhibit-poster" href="#detail/${r.id}" style="background-image:url('${esc(imageFor(r))}')"><span class="poster-shade"></span><span class="poster-text"><small>民间藏品 · 专题展</small><strong>${esc(r.title)}</strong><em>进入展览 →</em></span></a>`).join('')}</div></section>
    ${renderFeatureSection({theme:'events',eyebrow:'EVENTS',title:'近期活动',route:'activities',more:'活动中心 →',
      list:db.records.filter(r=>r.kind==='activity'&&visible(r)).sort((a,b)=>String(b.activity_time||'').localeCompare(String(a.activity_time||''))),
      metadata:r=>(r.activity_time||'时间待定').slice(0,16).replace('T',' ')+' · '+(r.activity_location||'地点待定'),
      itemMetadata:r=>(r.activity_time||'时间待定').slice(0,10),emptyText:'暂无活动',moreEmpty:'暂无更多活动'})}
    ${renderFeatureSection({theme:'forum',eyebrow:'COMMUNITY',title:'论坛交流',route:'forum',more:'进入论坛 →',
      list:db.records.filter(r=>['post','question'].includes(r.kind)&&visible(r)),image:'assets/banner-platform.png',caption:'分享收藏故事 · 交流生活记忆',
      metadata:r=>uname(r.user)+' · '+names[r.kind],itemMetadata:r=>names[r.kind],emptyText:'暂无交流内容',moreEmpty:'期待你的分享'})}
    ${renderFeatureSection({theme:'learning',eyebrow:'LEARNING',title:'课程学习',route:'courses',more:'查看全部课程 →',
      list:db.records.filter(r=>r.kind==='course'&&visible(r)),
      metadata:r=>uname(r.user)+' · '+(r.course_category_id||'课程学习')+' · '+(r.lessons||[]).length+'课时 · '+rating(r.id),
      itemMetadata:r=>r.course_category_id||'课程学习',emptyText:'暂无课程',moreEmpty:'更多课程正在筹备中'})}
    ${renderHomeNotices()}
  `;
    }