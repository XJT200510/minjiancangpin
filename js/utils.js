import { db, names, uname, visible, rating, options, rec } from './data.js';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)], esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stamp=x=>x?new Date(x).toLocaleString('zh-CN',{hour12:false}):'—';
let lastFocus,toastTimer;
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
const button=(label,action,id='',extra='')=>`<button type="button" class="btn small" data-action="${action}" data-id="${esc(id)}" ${extra}>${label}</button>`;
const link=(label,to,cls='btn')=>`<a class="${cls}" href="#${to}">${label}</a>`;
const empty=(text='还没有记录',hint='可以先体验相关操作，再回到这里查看。')=>`<div class="empty"><h3>${text}</h3><p>${hint}</p></div>`;
const badge=t=>`<span class="badge-status ${['已发布','通过','已完成','有效','报名成功'].includes(t)?'good':''}">${esc(t)}</span>`;
function head(title,sub='',act=''){return `<div class="page-head"><div><span class="eyebrow">MINCANG / 文化与生活</span><h1>${esc(title)}</h1><p>${esc(sub)}</p></div><div class="actions">${act}</div></div>`;}
function table(headers,rows){return rows.length?`<div class="table-wrap"><table><thead><tr>${headers.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:empty();}
function modal(title,html){lastFocus=document.activeElement;$('#dialog-title').textContent=title;$('#dialog-body').innerHTML=html;if(!$('#dialog').open)$('#dialog').showModal();}
function close(){$('#dialog').close();}
function field(f,value=''){let attr=`name="${f.key}" ${f.required?'required':''} ${f.max?`maxlength="${f.max}"`:''}`;let input=f.type==='collections'?`<select ${attr} multiple size="5" aria-label="选择参展藏品，可多选">${db.records.filter(r=>r.kind==='collection'&&visible(r)).map(r=>`<option value="${r.id}" ${String(value).split(',').includes(String(r.id))?'selected':''}>${esc(r.title)}</option>`).join('')}</select><small>按住 Ctrl 可选择多件藏品。</small>`:f.type==='textarea'?`<textarea ${attr}>${esc(value)}</textarea>`:f.type==='select'?`<select ${attr}>${(f.values||[]).map(v=>`<option ${v===value?'selected':''}>${esc(v)}</option>`).join('')}</select>`:f.type==='image'?`<input ${attr} type="text" value="${esc(value)}" placeholder="图片地址（可留空使用示意图）"><input type="file" accept="image/*" data-preview="${f.key}" aria-label="本地预览${f.label}"><small>本地选择仅预览；实际文件上传将在后端接入后完成。</small><div class="file-preview" id="preview-${f.key}"></div>`:`<input ${attr} type="${f.type}" value="${esc(value)}" ${f.type==='number'?'min="1" step="1"':''}>`;return `<label class="field ${['textarea','image'].includes(f.type)?'wide':''}"><span>${esc(f.label)}${f.required?' <span class="required">*</span>':''}</span>${input}</label>`;}
function formModal(title,fields,values,submit,label='保存',extra=''){modal(title,`<form id="edit-form"><div class="form-grid">${fields.map(f=>field(f,values?.[f.key]??'')).join('')}</div>${extra}<p id="form-error" class="form-error" role="alert"></p><div class="form-actions">${button('取消','close')}<button class="btn primary" type="submit">${label}</button></div></form>`);$('#edit-form').onsubmit=e=>{e.preventDefault();try{submit(Object.fromEntries(new FormData(e.target)),e);}catch(err){$('#form-error').textContent=err.message;}};}
function safeURL(s){return /^(https?:\/\/|assets\/)/i.test(s||'')?s:'';}
function imageFor(r){return safeURL(r.cover_image||r.cover_url)||`assets/${r.img||'letters'}.svg`;}
function cards(list){return list.length?`<div class="catalog">${list.map(r=>`<article class="tile"><a href="#detail/${r.id}" tabindex="-1"><img src="${esc(imageFor(r))}" alt="${esc(r.title)}"></a><div class="tile-body"><span class="meta">${names[r.kind]} · ${esc(uname(r.user))}</span><h3><a href="#detail/${r.id}">${esc(r.title)}</a></h3><p class="clip">${esc(r.body)}</p><div class="tag-list">${(r.tags||r.topics||r.course_category_id||r.category_id||'文化记忆').split(/[,，]/).map(t=>`<span>${esc(t)}</span>`).join('')}</div><div class="actions">${link('查看详情 →','detail/'+r.id,'btn small')}${r.kind==='course'?`<small>${rating(r.id)}</small>`:''}</div></div></article>`).join('')}</div>`:empty('没有找到相关内容','试试其他关键词，或清除筛选条件。');}

// Called once by main.js after the document is ready.
function initUI(){const dialog=$('#dialog');if(dialog&&!dialog.dataset.uiBound){dialog.addEventListener('close',()=>lastFocus?.focus());dialog.dataset.uiBound='true';}}
const tabs=(items,route=location.hash.slice(1)||'home')=>`<div class="tabs">${items.map(([t,r])=>link(t,r,route===r?'active':'')).join('')}</div>`;
export { $, $$, esc, stamp, toast, button, link, empty, badge, head, table, modal, close, field, formModal, safeURL, imageFor, cards, tabs, initUI };

function catalog(kind,title,state={},ranking=null) {
 let {filter='',categoryFilter='',eraFilter='',page=1}=state;
 const collection=kind==='collection', course=kind==='course';
 let list=db.records.filter(r=>r.kind===kind&&visible(r));
 const categories=[...new Set([...(options[course?'course_category_id':'category_id']||[]),...list.map(r=>course?r.course_category_id:r.category_id).filter(Boolean)])];
 list=list.filter(r=>(r.title+r.body+(r.tags||'')).includes(filter)
   && (!(collection||course)||!categoryFilter||(course?r.course_category_id:r.category_id)===categoryFilter)
   && (!collection||!eraFilter||r.era_id===eraFilter));
 let html=head(title,collection?'浏览平台公开藏品，按分类与年代探索器物故事':'发现值得记录的故事与知识',collection?link('藏品建档','edit/collection'):['post','question','topic'].includes(kind)?link(kind==='topic'?'创建话题':kind==='question'?'发布问题':'发布帖子','edit/'+kind):'');
 if(['collection','exhibition'].includes(kind))html+=tabs([['藏品展览','resource'],['专题展览','exhibitions']]);
 if(['post','question','topic'].includes(kind))html+=tabs([['帖子','forum'],['问答','questions'],['话题广场','topics']]);
 html+=`<div class="toolbar"><input id="filter" aria-label="搜索内容" placeholder="搜索名称、内容或标签" value="${esc(filter)}">
   ${collection||course?`<label class="catalog-filter">${collection?'藏品分类':'课程分类'}<select id="category-filter" aria-label="分类"><option value="">全部分类</option>${categories.map(v=>`<option value="${esc(v)}" ${categoryFilter===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`:''}
   ${collection?`<label class="catalog-filter">藏品年代<select id="era-filter" aria-label="藏品年代"><option value="">全部年代</option>${[...new Set([...options.era_id,...db.records.filter(r=>r.kind==='collection'&&visible(r)).map(r=>r.era_id).filter(Boolean)])].map(v=>`<option value="${esc(v)}" ${eraFilter===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`:''}
   <button class="btn" data-action="search">搜索</button><button class="btn" data-action="clear-filters">重置筛选</button></div>`;
 page=Math.max(1,Math.min(page,Math.ceil(list.length/6)||1));
 const results=cards(list.slice((page-1)*6,page*6));
 html+=ranking?`<div class="forum-layout"><div>${results}</div>${ranking(kind)}</div>`:results;
 state.page=page;
 return html+`<div class="pager">${button('上一页','page',page-1,page===1?'disabled':'')}<span>${page} / ${Math.ceil(list.length/6)||1} · 共${list.length}条</span>${button('下一页','page',page+1,page*6>=list.length?'disabled':'')}</div>`;
}
function enrollmentTable(all){return table(['活动','报名者','报名资料','状态','操作'],db.enrollments.filter(e=>all||rec(e.activity)?.user===db.current).map(e=>[esc(rec(e.activity)?.title),esc(uname(e.user)),esc(e.info),badge(e.status),e.status==='待审核'?button('通过','approve-enroll',e.id)+button('驳回','reject-enroll',e.id):e.status==='报名成功'?button('确认参与并发证','issue-cert',e.id):'—']));}
function certificateTable(all){return table(['证书编号','活动','状态','操作'],db.certificates.filter(c=>all||rec(c.activity)?.user===db.current).map(c=>[esc(c.no),esc(rec(c.activity)?.title),badge(c.status),button('预览','certificate',c.id)+(c.status==='有效'?button('作废','void-cert',c.id):'')]));}

export { catalog, enrollmentTable, certificateTable };
