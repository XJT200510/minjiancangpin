import { db, visible } from '../data.js';
import { $, esc, empty, catalog } from '../utils.js';

function forumHeat(r) {
 const count=rows=>rows.filter(x=>x.record===r.id&&!x.deleted).length;
 const discussions=r.kind==='topic'?db.records.filter(x=>['post','question'].includes(x.kind)&&visible(x)&&(x.topics||'').split(/[,，]/).map(t=>t.trim()).includes(r.title)).length:0;
 return count(db.likes)+count(db.favorites)+count(db.comments)+count(db.answers)+discussions;
}
function renderForumRanking(kind) {
 const title={post:'热帖榜',question:'热门问题榜',topic:'热门话题榜'}[kind];
 const records=db.records.filter(r=>r.kind===kind&&visible(r)).sort((a,b)=>forumHeat(b)-forumHeat(a)||String(b.created).localeCompare(String(a.created))).slice(0,5);
 return `<aside class="forum-ranking"><h2>${title}</h2><p>按互动热度排序，同热度优先展示新内容</p><ol>${records.map((r,i)=>`<li><span class="rank-number">${i+1}</span><a href="#detail/${r.id}"><strong>${esc(r.title)}</strong><small>互动热度 ${forumHeat(r)}</small></a></li>`).join('')||'<li>暂无内容</li>'}</ol></aside>`;
}
export function renderForum(section='forum',state={}) {
 const entry={forum:['post','交流论坛'],questions:['question','藏友问答'],topics:['topic','话题广场']}[section];
 return entry?catalog(...entry,state,renderForumRanking):empty('页面不存在');
}
