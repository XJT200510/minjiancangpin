import { db, now, names, user, uname, rec, admin, visible, rating, options } from '../data.js';
import { esc, stamp, button, empty, badge, head, safeURL, imageFor, cards, catalog, tabs, link } from '../utils.js';

export function renderResource(section='resource',state={}) {
 if(section==='resource')return renderCollection(state);
 if(section==='exhibitions')return renderExhibitions();
 if(section==='announcements')return catalog('announcement','通知公告',state);
 return empty('页面不存在');
}

// 资源库 · 藏品列表：关键词搜索 + 分类 / 年代筛选 + 分页
function renderCollection(state={}) {
 const {filter='',categoryFilter='',eraFilter=''}=state;
 const per=6;
 let list=db.records.filter(r=>r.kind==='collection'&&visible(r));
 const categories=[...new Set([...(options.category_id||[]),...list.map(r=>r.category_id).filter(Boolean)])];
 const eras=[...new Set([...(options.era_id||[]),...list.map(r=>r.era_id).filter(Boolean)])];
 const q=String(filter).trim().toLowerCase();
 list=list.filter(r=>`${r.title} ${r.body||''} ${r.description||''} ${r.tags||''} ${r.category_id||''} ${r.era_id||''}`.toLowerCase().includes(q)
   && (!categoryFilter||r.category_id===categoryFilter)
   && (!eraFilter||r.era_id===eraFilter));
 const pages=Math.max(1,Math.ceil(list.length/per));
 const page=Math.max(1,Math.min(state.page||1,pages));
 const items=list.slice((page-1)*per,page*per);
 let html=head('资源库','浏览平台公开藏品，按分类与年代探索器物故事',link('藏品建档','edit/collection'));
 html+=tabs([['藏品展览','resource'],['专题展览','exhibitions']]);
 html+=`<div class="toolbar">
   <input id="filter" aria-label="搜索藏品" placeholder="搜索名称、简介、标签、分类或年代" value="${esc(filter)}">
   <label class="catalog-filter">藏品分类<select id="category-filter" aria-label="藏品分类"><option value="">全部分类</option>${categories.map(v=>`<option value="${esc(v)}" ${categoryFilter===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label>
   <label class="catalog-filter">藏品年代<select id="era-filter" aria-label="藏品年代"><option value="">全部年代</option>${eras.map(v=>`<option value="${esc(v)}" ${eraFilter===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label>
   <button class="btn" data-action="search">搜索</button><button class="btn" data-action="clear-filters">重置筛选</button></div>`;
 html+=items.length
   ? `<div class="catalog resource-catalog">${items.map(collectionCard).join('')}</div>`
   : empty('暂无符合条件的藏品','试试其他关键词，或点击「重置筛选」清除条件。');
 state.page=page;
 if(list.length>per)html+=`<div class="pager">${button('上一页','page',page-1,page===1?'disabled':'')}<span>${page} / ${pages} · 共${list.length}条</span>${button('下一页','page',page+1,page>=pages?'disabled':'')}</div>`;
 return html;
}

function collectionCard(r){
 const meta=[r.category_id,r.era_id,uname(r.user)].filter(Boolean).join(' · ');
 return `<article class="tile"><a class="tile-media" href="#detail/${r.id}"><img src="${esc(imageFor(r))}" alt="${esc(r.title)}" loading="lazy"></a><div class="tile-body"><span class="meta">${esc(meta)}</span><h3><a href="#detail/${r.id}">${esc(r.title)}</a></h3><p class="clip">${esc(r.body||r.description||'')}</p><div class="tag-list">${(r.tags||'').split(/[,，]/).filter(Boolean).map(t=>`<span>${esc(t)}</span>`).join('')}</div><div class="actions">${link('查看详情 →','detail/'+r.id,'btn small')}</div></div></article>`;
}

// 专题展览 · 封面 / 标题 / 介绍，进入后展示对应藏品
function renderExhibitions() {
 const list=db.records.filter(r=>r.kind==='exhibition'&&visible(r));
 let html=head('专题展览','循着藏品，走进生活中的文化记忆');
 html+=tabs([['藏品展览','resource'],['专题展览','exhibitions']]);
 html+=list.length
   ? `<div class="catalog exhibition-catalog">${list.map(exhibitionCard).join('')}</div>`
   : empty('暂无专题展览','专题展览正在筹备中，敬请期待。');
 return html;
}

function exhibitionCard(r){
 const items=(r.collection_ids||'').split(',').map(x=>+x).filter(Boolean).map(rec).filter(x=>x&&visible(x));
 const tags=items.slice(0,4).map(x=>`<span>${esc(x.title)}</span>`).join('')+(items.length>4?`<span>等 ${items.length} 件</span>`:'');
 return `<article class="tile"><a class="tile-media" href="#detail/${r.id}"><img src="${esc(imageFor(r))}" alt="${esc(r.title)}" loading="lazy"></a><div class="tile-body"><span class="meta">专题展览 · ${items.length} 件藏品</span><h3><a href="#detail/${r.id}">${esc(r.title)}</a></h3><p class="clip">${esc(r.body||r.introduction||'')}</p><div class="tag-list">${tags}</div><div class="actions">${link('进入专题 →','detail/'+r.id,'btn small')}</div></div></article>`;
}
export function renderDetail(id){const r=rec(id);if(!r||(!visible(r)&&r.user!==db.current&&!admin()))return empty('内容不存在或暂不可访问');if(user()&&['collection','post','question','topic','course'].includes(r.kind)){db.footprints=db.footprints.filter(x=>!(x.user===db.current&&x.record===id));db.footprints.unshift({user:db.current,record:id,time:now()});let own=db.footprints.filter(x=>x.user===db.current).slice(0,50);db.footprints=db.footprints.filter(x=>x.user!==db.current).concat(own);}
 const liked=db.likes.some(x=>x.user===db.current&&x.record===id),fav=db.favorites.some(x=>x.user===db.current&&x.record===id);let actions=['collection','post','question','topic','course','activity'].includes(r.kind)?button(liked?'已点赞 · 取消':'♡ 点赞','like',id):'';if(['collection','post','question','topic','course'].includes(r.kind))actions+=button(fav?'已收藏 · 管理':'☆ 收藏','favorite',id);if(['post','question','topic'].includes(r.kind))actions+=button('转发链接','share',id);actions+=button('举报','report',id);if(r.user!==db.current)actions+=button('关注作者','follow',r.user)+button('私信作者','chat',r.user);let content=head(r.title,`${names[r.kind]} · ${uname(r.user)} · ${stamp(r.updated)}`,actions)+`<div class="two-col"><div><article class="panel"><img class="detail-image" src="${esc(imageFor(r))}" alt="${esc(r.title)}"><p class="prose">${esc(r.body)}</p>${r.kind==='collection'?`<dl class="facts">${[['分类',r.category_id],['年代',r.era_id],['材质',r.material],['尺寸',r.size_information],['来源',r.source]].map(([k,v])=>`<dt>${k}</dt><dd>${esc(v||'待补充')}</dd>`).join('')}</dl>`:''}</article>`;
 if(r.kind==='course'){content+=`<section class="panel"><h2>视频课时</h2><p class="note">演示包不附课程视频。可用下方本地视频预览播放界面，文件不会上传。</p><video id="course-video" class="video" controls preload="metadata"></video><label class="field">选择本地视频预览<input type="file" accept="video/*" id="video-file"></label>${(r.lessons||[]).map((l,i)=>`<div class="lesson"><b>第${i+1}课 · ${esc(l.lesson_title)}</b><p>${esc(l.content)}</p><small>${esc(l.duration)}分钟</small> ${button('播放此课时','play',`${r.id}:${i}`)} ${safeURL(l.material_reference)?`<a href="${esc(safeURL(l.material_reference))}" target="_blank" rel="noopener">查看配套资料</a>`:'<small>暂无配套资料</small>'}</div>`).join('')}<h2>课程评价</h2><p>${rating(id)}</p>${button('评价这门课程','rate',id)}${db.ratings.filter(x=>x.record===id&&!x.deleted).map(x=>`<div class="comment"><b>${esc(uname(x.user))} · ${x.score}分</b><p>${esc(x.content)}</p></div>`).join('')}</section>`;}
 if(r.kind==='question')content+=`<section class="panel"><h2>回答 · ${r.resolved?'已解决':'等待更多观点'}</h2>${!r.resolved?button('我来回答','answer',id):''}${db.answers.filter(a=>a.record===id&&!a.deleted).map(a=>`<div class="comment"><b>${esc(uname(a.user))}</b> ${a.accepted?badge('已采纳'):''}<p>${esc(a.content)}</p>${r.user===db.current&&!r.resolved?button('采纳回答','accept',a.id):''}</div>`).join('')}</section>`;
 if(r.kind==='activity'){const enrolled=db.enrollments.find(e=>e.activity===id&&e.user===db.current);content+=`<section class="panel"><h2>报名与活动安排</h2><dl class="facts"><dt>活动时间</dt><dd>${stamp(r.activity_time)}</dd><dt>报名截止</dt><dd>${stamp(r.registration_deadline)}</dd><dt>地点</dt><dd>${esc(r.activity_location)}</dd><dt>成功报名</dt><dd>${db.enrollments.filter(e=>e.activity===id&&e.status==='报名成功').length} / ${r.max_participants}人</dd></dl>${enrolled&&enrolled.status!=='已取消'?`${badge(enrolled.status)} ${button('取消报名','cancel-enroll',enrolled.id)}`:button('填写报名资料','enroll',id)}</section>`;}
 if(r.kind==='exhibition')content+=`<section class="panel"><h2>展品目录</h2>${cards((r.collection_ids||'').split(',').map(rec).filter(x=>x&&visible(x)))}</section>`;
 if(r.kind==='topic')content+=`<section class="panel"><h2>话题下的讨论</h2>${cards(db.records.filter(x=>['post','question'].includes(x.kind)&&(x.topics||'').includes(r.title)&&visible(x)))}</section>`;
 if(['collection','post','question','topic','course'].includes(r.kind))content+=`<section class="panel"><h2>评论交流</h2>${button('写评论','comment',id)}${db.comments.filter(c=>c.record===id&&!c.deleted).map(c=>`<div class="comment"><b>${esc(uname(c.user))}</b><small>　${stamp(c.time)}</small><p>${esc(c.content)}</p>${button('回复','reply',c.id)} ${c.user===db.current?button('删除','delete-comment',c.id):''}${db.replies.filter(x=>x.comment===c.id&&!x.deleted).map(x=>`<div class="reply"><b>${esc(uname(x.user))} 回复 ${esc(uname(x.to))}</b><p>${esc(x.content)}</p>${button('回复此人','reply',c.id,`data-to="${x.user}"`)}</div>`).join('')}</div>`).join('')}</section>`;
 return content+`</div><aside><div class="panel"><h2>作者资料</h2><div class="avatar-big">${esc(uname(r.user)[0])}</div><h3>${esc(uname(r.user))}</h3><p>${esc(db.users.find(u=>u.id===r.user)?.intro||'热爱收藏，分享生活。')}</p></div><div class="note">资料中的年代与来源以记录说明为准。交流时请尊重不同观点。</div></aside></div>`;
}
