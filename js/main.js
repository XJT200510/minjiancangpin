import { db, seed, resetData, key, now, options, names, F, specs, permissions, user, uname, rec, uid, notify, log, admin, can, visible, rating, allowedKind, save as persist } from './data.js';
import { $, $$, esc, stamp, toast, button, link, empty, badge, head, table, modal, close, field, formModal, safeURL, imageFor, cards, tabs, initUI, catalog, enrollmentTable, certificateTable } from './utils.js';
import { renderHome } from './pages/home.js';
import { renderResource, renderDetail } from './pages/resource.js';
import { renderForum } from './pages/forum.js';
import { renderCourses } from './pages/courses.js';
import { renderActivities } from './pages/activities.js';
import { renderCreator, renderEditor, lessonFields, bindCreatorControls, bindTopicPicker, prepareTopics } from './pages/creator.js';
import { renderProfile } from './pages/profile.js';
import { renderExpert } from './pages/expert.js';
import { renderStudio } from './pages/studio.js';
import { renderAdmin } from './pages/admin.js';

// Recover styles when an older cached HTML entry still references assets/site.css.
function ensureStylesheets() {
 const sheets=['base','home','pages'];
 for(const name of sheets){
  const url=new URL('../css/'+name+'.css',import.meta.url);
  const exists=Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(link=>new URL(link.href,document.baseURI).pathname===url.pathname);
  if(!exists){
   const link=document.createElement('link');
   link.rel='stylesheet';
   link.href=url.href+'?v=20261030-3';
   document.head.append(link);
  }
 }
}
ensureStylesheets();
let route='',filter='',categoryFilter='',eraFilter='',page=1,editContext=null;
function save(){if(!persist())toast('浏览器存储空间不足，本次数据仅保留到关闭页面。');}
function need(){if(!user()){account();return false;}if(user().status!=='正常'){toast('当前体验账号已停用，可在账号设置中提交申诉。');return false;}return true;}
function go(to){if(location.hash.slice(1)===to)render();else location.hash=to;}
function account(){modal('切换体验账号',`<p class="note">用于检查不同身份的页面流程，不是真实登录。同一用户可以具备多个身份，机构须另行申请课程发布资格。</p><div class="account-list">${db.users.map(u=>`<div class="lesson"><b>${esc(u.name)}</b><p>${esc(u.roles.join('、')||'普通用户')} · ${u.status}</p>${button('使用此体验账号','switch',u.id)}</div>`).join('')}</div><div class="actions">${button('注册体验账号','register')}${button('以游客浏览','switch',0)}</div>`);}

function bindEditor(){const form=$('#content-form');if(!form)return;form.onsubmit=e=>{e.preventDefault();const {kind,id,r}=editContext;const draft=e.submitter?.value==='draft';const formData=new FormData(form);const d=Object.fromEntries(formData);if(kind==='exhibition')d.collection_ids=formData.getAll('collection_ids').join(',');try{if(!allowedKind(kind))throw Error('当前账号无发布资格。');const title=d[specs[kind][0].key]?.trim();if(!title)throw Error('请至少填写标题或活动内容后再保存。');if(!draft&&!form.reportValidity())return;let lessons=$$('[data-lesson]',form).map(el=>{let i=el.dataset.lesson,o={id:uid()};for(const f of ['lesson_title','lesson_order','video_url','duration','content','material_reference'])o[f]=d[`lesson_${i}_${f}`];return o;});if(kind==='course'&&!draft&&!lessons.length)throw Error('请至少添加一个视频课时。');if(kind==='activity'&&!draft){if(new Date(d.registration_deadline)>new Date(d.activity_time))throw Error('报名截止不能晚于活动开始。');if(new Date(d.activity_time)<=new Date())throw Error('活动时间应晚于当前时间。');}if(kind==='exhibition'&&!draft&&(d.collection_ids||'').split(',').some(x=>!rec(x)||rec(x).kind!=='collection'||!visible(rec(x))))throw Error('请选择已发布的藏品作为展品。');const topicData=['post','question'].includes(kind)?prepareTopics(formData,draft):null;let record=r||{id:uid(),kind,user:db.current,created:now(),img:kind==='collection'?'vase':'letters'};for(const f of specs[kind])record[f.key]=d[f.key]?.trim()||'';Object.assign(record,{title:title.slice(0,kind==='activity'?50:kind==='post'?200:120),body:d.description||d.topic_description||d.content||d.introduction||d.announcement_content||'',updated:now(),status:draft?'草稿':['collection','course','activity'].includes(kind)?'待审核':'已发布'});if(topicData){
 record.topics=topicData.topics;record.pendingTopic=topicData.pendingTopic;
 if(topicData.newTopic){const t=topicData.newTopic;db.records.unshift({id:uid(),kind:'topic',user:db.current,title:t.name,topic_name:t.name,body:t.description,topic_description:t.description,img:'letters',status:'已发布',created:now(),updated:now(),publishedAt:now()});}
 }
 if(!draft&&record.status==='已发布'&&!record.publishedAt)record.publishedAt=now();
 if(kind==='course')record.lessons=lessons;if(!r)db.records.unshift(record);if(kind==='collection'&&!draft&&!db.appraisals.some(a=>a.record===record.id&&a.status!=='已完成'))db.appraisals.push({id:uid(),record:record.id,user:db.current,status:'待分配',deadline:new Date(Date.now()+10*86400000).toISOString(),tasks:[],supplements:[],time:now()});save();editContext=null;go('creator');toast(draft?'草稿已保存在本机浏览器':'内容已提交，当前为前端演示');}catch(err){$('#form-error').textContent=err.message;}};}
function progress(id){const r=rec(id),a=db.appraisals.find(a=>a.record===id&&a.status!=='已取消');if(!r)return;if(r.user!==db.current&&!admin()&&!a?.tasks.some(t=>t.expert===db.current))return toast('无权查看');modal('处理进度 · '+r.title,`<p>${badge(r.status)}</p>${r.reason?`<p class="note">审核说明：${esc(r.reason)}</p>`:''}${a?`<p>申请：${a.id} · ${badge(a.status)} · 截止：${stamp(a.deadline)}</p>${table(['专家','提交状态','意见'],a.tasks.map(t=>[esc(uname(t.expert)),t.opinion?badge(t.valid||'待审核'):'尚未提交',esc(t.opinion||'—')]))}<h3>补充材料要求</h3>${a.supplements.map(s=>`<div class="lesson"><p>${esc(s.requirement)}</p><p>${esc(s.material||'等待补充')}</p>${r.user===db.current?button('提交补充材料','supplement-submit',`${a.id}:${s.id}`):''}</div>`).join('')||'<p>暂无补充要求</p>'}${a.result?`<p class="note">最终结论：${a.result}。${esc(a.reason)}</p>`:''}`:'<p>提交后的审核结果将在这里展示。</p>'}`);}
function reason(title,callback,fields=[],label='确认'){formModal(title,[...fields,F('reason','说明 / 原因','textarea',true,500)],{},d=>{callback(d);save();close();render();toast('已更新本机演示记录');},label);}
function owned(r){return r?.user===db.current||admin();}
function mutate(fn){if(!need())return;fn();save();render();}
function action(name,id,b){const n=+id;
 if(name==='share'){
   const record=rec(n);if(!record||!visible(record))return toast('内容暂不可分享');
   const url=new URL(location.href);url.hash='detail/'+n;
   modal('转发内容',`<p>复制链接后，可粘贴给其他人。当前演示数据保存在本机，接收者需能访问同一网站及内容。</p><label class="field">分享链接<input id="share-link" readonly value="${esc(url.href)}"></label><button class="btn" id="copy-share-link">复制链接</button>`);
   $('#copy-share-link').onclick=async()=>{try{await navigator.clipboard.writeText(url.href);toast('链接已复制');}catch{$('#share-link').select();toast('请按 Ctrl+C 复制链接');}};
   return;
 }

 if(name==='close')return close();if(name==='account')return account();if(name==='switch'){db.current=n;close();save();return render();}if(name==='reset'){modal('重置演示数据',`<p>将清除本浏览器此细化版的演示操作，恢复初始资料。</p>${button('确认重置','confirm-reset')}`);return;}if(name==='confirm-reset'){resetData();save();close();go('home');return;}
 if(name==='register')return formModal('注册体验账号',[F('name','昵称','text',true,20),F('phone','演示手机号','tel',true,11)],{},d=>{if(!/^1\d{10}$/.test(d.phone))throw Error('请输入11位演示手机号');if(db.users.some(u=>u.phone===d.phone))throw Error('此手机号已有体验账号');const u={id:uid(),name:d.name,phone:d.phone,roles:[],status:'正常'};db.users.push(u);db.current=u.id;db.folders.push({id:uid(),user:u.id,name:'默认收藏夹',default:true});save();close();go('profile');},'创建体验账号','<p class="note">本地演示不收集或保存真实密码。</p>');
 if(name==='clear-filters'){filter='';categoryFilter='';eraFilter='';page=1;return render();}if(name==='page'){page=n;return render();}if(name==='search'){filter=$('#filter')?.value||'';page=1;return render();}if(name==='inspect')return go('detail/'+id);if(name==='progress')return progress(n);
 if(name==='add-lesson'){let list=$('#lesson-editor'),i=Math.max(-1,...$$('[data-lesson]',list).map(e=>+e.dataset.lesson))+1;list.insertAdjacentHTML('beforeend',lessonFields({},i));return;}if(name==='remove-lesson'){b.closest('[data-lesson]').remove();return;}
 if(name==='play'){let [rid,i]=id.split(':').map(Number),l=rec(rid)?.lessons[i],url=safeURL(l?.video_url);if(!url)return toast('此课时尚未配置视频，可选择本地视频预览。');$('#course-video').src=url;$('#course-video').play().catch(()=>toast('视频无法播放，请检查地址或选择本地视频。'));return;}
 if(!user())return account();if(user().status!=='正常'&&!['appeal','password'].includes(name))return toast('当前账号不可操作，请提交解禁申诉或切换账号。');
 if(name==='edit-profile')return formModal('编辑个人资料',[F('name','昵称','text',true,20),F('real_name','真实姓名','text',false,20),F('phone','手机号','tel',true,11),F('avatar_url','头像地址'),F('intro','个人介绍','textarea',false,500)],user(),d=>{if(!/^1\d{10}$/.test(d.phone))throw Error('手机号应为11位');if(db.users.some(u=>u.id!==db.current&&u.phone===d.phone))throw Error('手机号已被使用');Object.assign(user(),d);save();close();render();});
 if(name==='password')return formModal('修改密码（界面预览）',[F('old','原密码','password',true,128),F('new','新密码','password',true,128),F('again','确认新密码','password',true,128)],{},d=>{if(d.new!==d.again)throw Error('两次新密码不一致');close();toast('格式检查通过；未连接后端，密码未修改、未保存。');},'检查填写','<p class="note">请勿输入真实密码。此处不进行真实账号验证。</p>');
 if(name==='deactivate')return reason('注销体验账号',()=>{user().status='已注销';},[],'确认注销');
 if(name==='like'){db.likes=db.likes.some(x=>x.user===db.current&&x.record===n)?db.likes.filter(x=>!(x.user===db.current&&x.record===n)):[...db.likes,{user:db.current,record:n}];save();return render();}
 if(name==='favorite'){let folders=db.folders.filter(f=>f.user===db.current);if(!folders.length){db.folders.push({id:uid(),user:db.current,name:'默认收藏夹',default:true});folders=db.folders.filter(f=>f.user===db.current);}let old=db.favorites.find(f=>f.user===db.current&&f.record===n);return formModal('收藏内容',[F('folder','选择收藏夹','select',true,0,folders.map(f=>f.id+' · '+f.name))],{folder:old?folders.find(f=>f.id===old.folder)?.id+' · '+folders.find(f=>f.id===old.folder)?.name:undefined},d=>{db.favorites=db.favorites.filter(x=>!(x.user===db.current&&x.record===n));db.favorites.push({record:n,user:db.current,folder:parseInt(d.folder),time:now()});save();close();render();},'保存收藏',old?button('取消收藏','unfavorite',n):'');}
 if(name==='unfavorite'){db.favorites=db.favorites.filter(f=>!(f.user===db.current&&f.record===n));save();close();return render();}
 if(name==='folder'||name==='rename-folder'){let f=db.folders.find(f=>f.id===n&&f.user===db.current);return formModal(name==='folder'?'新建收藏夹':'重命名收藏夹',[F('name','收藏夹名称','text',true,50)],f,d=>{if(db.folders.some(x=>x.user===db.current&&x.name===d.name&&x.id!==n))throw Error('已有同名收藏夹');if(f)f.name=d.name;else db.folders.push({id:uid(),user:db.current,name:d.name,default:false});save();close();render();});}
 if(name==='delete-folder'){const f=db.folders.find(f=>f.id===n&&f.user===db.current);if(!f||f.default)return toast('默认收藏夹不能删除');if(db.favorites.some(x=>x.folder===n))return toast('请先移动或取消夹内收藏，再删除空收藏夹');db.folders=db.folders.filter(f=>f.id!==n);save();return render();}
 if(['comment','answer','reply'].includes(name)){const c=db.comments.find(c=>c.id===n),rid=name==='reply'?c?.record:n;return formModal({comment:'发表评论',answer:'回答问题',reply:'回复用户'}[name],[F('content','内容','textarea',true,name==='answer'?2000:500)],{},d=>{if(!rec(rid)||!visible(rec(rid)))throw Error('内容不可访问');if(name==='answer'&&rec(rid).resolved)throw Error('问题已解决');const x={id:uid(),record:rid,user:db.current,content:d.content,time:now()};if(name==='reply')Object.assign(x,{comment:n,to:+b.dataset.to||c.user});db[name==='comment'?'comments':name==='answer'?'answers':'replies'].push(x);notify(name==='reply'?x.to:rec(rid).user,'收到新的'+(name==='answer'?'回答':'评论'),d.content,'detail/'+rid);save();close();render();},'发布');}
 if(name==='accept'){let a=db.answers.find(a=>a.id===n);if(a&&rec(a.record)?.user===db.current){db.answers.filter(x=>x.record===a.record).forEach(x=>x.accepted=x.id===n);rec(a.record).resolved=true;save();render();}return;}
 if(name==='delete-comment'){let c=db.comments.find(c=>c.id===n);if(c?.user===db.current){c.deleted=true;save();render();}return;}
 if(name==='rate')return formModal('评价课程',[F('score','评分（1至5分）','select',true,0,['1','1.5','2','2.5','3','3.5','4','4.5','5']),F('content','评价内容','textarea',false,2000)],db.ratings.find(x=>x.user===db.current&&x.record===n),d=>{if(rec(n)?.kind!=='course')throw Error('仅支持课程评分');db.ratings=db.ratings.filter(x=>!(x.user===db.current&&x.record===n));db.ratings.push({id:uid(),record:n,user:db.current,score:+d.score,content:d.content});save();close();render();},'提交评价');
 if(['follow','block','remove-relation'].includes(name)){if(n===db.current)return toast('不能关注或拉黑自己');db.relations=db.relations.filter(x=>!(x.user===db.current&&x.target===n));if(name!=='remove-relation')db.relations.push({user:db.current,target:n,type:name==='follow'?'关注':'黑名单',time:now()});save();return render();}
 if(name==='new-chat')return formModal('选择私信联系人',[F('target','联系人','select',true,0,db.users.filter(u=>u.id!==db.current).map(u=>u.id+' · '+u.name))],{},d=>chat(parseInt(d.target)),'打开会话');if(name==='chat')return chat(n);
 if(name==='delete-message'){const m=db.messages.find(m=>m.id===n);if(m&&(m.sender===db.current||m.receiver===db.current)){m.hidden.push(db.current);save();chat(m.sender===db.current?m.receiver:m.sender);}return;}
 if(name==='clear-history'){db.footprints=db.footprints.filter(f=>f.user!==db.current);save();return render();}if(name==='delete-notice'){db.notifications=db.notifications.filter(x=>!(x.id===n&&x.user===db.current));save();return render();}
 if(name==='report'||name==='report-user')return formModal('提交举报',[F('reason','举报原因','textarea',true,500),F('evidence','证据说明','textarea',false,1000)],{},d=>{db.reports.unshift({id:uid(),user:db.current,record:name==='report'?n:null,targetUser:name==='report-user'?n:null,reason:d.reason,evidence:d.evidence,status:'待处理',time:now()});save();close();toast('举报已保存，可在个人中心查看进度');});
 if(name==='appeal')return formModal('解禁申诉',[F('reason','申诉理由与整改说明','textarea',true,500)],{},d=>{if(user().status!=='已封禁')throw Error('仅被封禁的账号需要提交解禁申诉');if(db.appeals.some(a=>a.user===db.current&&a.status==='待审核'))throw Error('已有待处理申诉');db.appeals.push({id:uid(),user:db.current,reason:d.reason,status:'待审核'});save();close();go('profile/reports');});
 if(name==='apply')return formModal('申请新身份',[F('type','申请身份','select',true,0,['专家','课程发布人','机构']),F('data','申请资料与资质说明','textarea',true,500),F('org_name','机构名称（机构申请填写）','text',false,60),F('contact_name','联系人（机构申请填写）','text',false,50)],{},d=>{if(user().roles.includes(d.type))throw Error('已经拥有此身份');if(db.applications.some(a=>a.user===db.current&&a.type===d.type&&a.status==='待审核'))throw Error('此身份已有待审核申请');if(d.type==='机构'&&(!d.org_name||!d.contact_name))throw Error('机构申请请填写机构名称和联系人');db.applications.push({id:uid(),user:db.current,...d,status:'待审核',time:now()});save();close();render();},'提交申请');
 if(name==='accept-invite'||name==='reject-invite'){let i=db.invitations.find(i=>i.id===n&&i.user===db.current);if(i&&i.status==='待确认'){i.status=name==='accept-invite'?'已接受':'已拒绝';if(name==='accept-invite'&&!user().roles.includes('专家'))user().roles.push('专家');save();close();render();}return;}
 if(name==='delete-record'){const r=rec(n);if(!owned(r))return;return reason('删除内容',()=>{r.status='已删除';log('删除内容：'+r.title);});}
 if(name==='enroll'){let r=rec(n);return formModal('活动报名',[F('info','报名资料与参加说明','textarea',true,500)],{},d=>{if(!r||r.kind!=='activity'||!visible(r)||new Date(r.registration_deadline)<=new Date())throw Error('活动已截止报名或不可报名');let old=db.enrollments.find(e=>e.activity===n&&e.user===db.current);if(old&&old.status!=='已取消')throw Error('请勿重复报名');if(db.enrollments.filter(e=>e.activity===n&&e.status==='报名成功').length>=+r.max_participants)throw Error('活动名额已满');if(old)Object.assign(old,{info:d.info,status:'待审核'});else db.enrollments.push({id:uid(),activity:n,user:db.current,info:d.info,status:'待审核',time:now()});save();close();render();},'提交报名');}
 if(name==='cancel-enroll'){let e=db.enrollments.find(e=>e.id===n&&e.user===db.current);if(e){if(db.certificates.some(c=>c.enrollment===e.id&&c.status==='有效'))return toast('已获证的报名不能取消');e.status='已取消';save();render();}return;}
 if(['approve-enroll','reject-enroll','issue-cert'].includes(name)){let e=db.enrollments.find(e=>e.id===n),r=rec(e?.activity);if(!e||!(r.user===db.current||can('活动管理')))return toast('无权处理');if(name==='issue-cert'){if(new Date(r.activity_time)>new Date())return toast('活动尚未开始，不能发放证书');if(e.status!=='报名成功')return toast('仅成功报名且确认参与的用户可获证');if(db.certificates.some(c=>c.enrollment===e.id))return toast('此报名已有证书');return reason('确认参与并发放演示证书',d=>{db.certificates.push({id:uid(),enrollment:e.id,activity:r.id,no:'MC-DEMO-'+uid(),issuer:uname(r.user),time:now(),status:'有效',note:d.reason});notify(e.user,'活动证书已发放',r.title,'profile/events');});}if(e.status!=='待审核')return toast('报名已处理');if(new Date(r.activity_time)<=new Date())return toast('活动已开始，不能审核报名');if(name==='approve-enroll'&&db.enrollments.filter(x=>x.activity===e.activity&&x.status==='报名成功').length>=+r.max_participants)return toast('报名人数已满');e.status=name==='approve-enroll'?'报名成功':'已驳回';notify(e.user,'活动报名结果',e.status,'profile/events');log('活动报名审核：'+e.id);save();return render();}
 if(name==='certificate'){const c=db.certificates.find(c=>c.id===n),e=db.enrollments.find(e=>e.id===c?.enrollment);if(!c||!(e.user===db.current||rec(c.activity)?.user===db.current||admin()))return;return modal('活动证书预览',`<div class="certificate"><span>民藏 · 活动参与纪念</span><h2>参与证书</h2><p>兹证明 ${esc(uname(e.user))}</p><p>参与了「${esc(rec(c.activity)?.title)}」</p><p>${esc(c.issuer)}</p><p>${stamp(c.time)}</p><small>${esc(c.no)} · ${c.status}</small><p class="note">前端演示证书，不具备真实证明效力。</p></div>`);}
 if(name==='void-cert'){const c=db.certificates.find(c=>c.id===n);if(c&&(rec(c.activity)?.user===db.current||can('活动管理')))return reason('作废证书',()=>c.status='已作废');}
 if(name==='specialty')return formModal('新增擅长领域',[F('category','藏品类别','select',true,0,options.category_id),F('era','藏品年代','select',true,0,options.era_id)],{},d=>{if(!user().roles.includes('专家'))throw Error('仅专家可维护');if(!db.specialties.some(x=>x.expert===db.current&&x.category===d.category&&x.era===d.era))db.specialties.push({expert:db.current,...d});save();close();toast('领域组合已保存');});
 if(name==='opinion'){let a=db.appraisals.find(a=>a.id===n),t=a?.tasks.find(t=>t.expert===db.current);if(!t)return;return formModal('提交鉴定意见',[F('judgement','鉴定判断','select',true,0,['存疑','真品','赝品','需进一步鉴定']),F('opinion','鉴定意见','textarea',true,500)],{},d=>{if(a.status==='已完成'||t.opinion||new Date(a.deadline)<new Date())throw Error('任务已结束、已提交或超过截止时间');Object.assign(t,d,{time:now(),valid:'待审核'});if(a.tasks.every(t=>t.opinion))a.status='待审核';save();close();render();},'提交意见');}
 if(name==='supplement'){let a=db.appraisals.find(a=>a.id===n);if(!a?.tasks.some(t=>t.expert===db.current))return;return formModal('要求补充材料',[F('requirement','需要补充的材料','textarea',true,500)],{},d=>{a.supplements.push({id:uid(),expert:db.current,requirement:d.requirement});notify(a.user,'请补充鉴定材料',d.requirement,'profile/appraisals');save();close();render();});}
 if(name==='supplement-submit'){let [aid,sid]=id.split(':').map(Number),a=db.appraisals.find(a=>a.id===aid),s=a?.supplements.find(s=>s.id===sid);if(!s||a.user!==db.current)return;return formModal('补充资料',[F('material','材料说明及图片地址','textarea',true,1000)],s,d=>{s.material=d.material;save();close();progress(a.record);},'提交补充材料');}
 return adminAction(name,n,id);
}
function chat(target){if(target===db.current)return toast('不能给自己发送私信');const blocked=()=>db.relations.some(r=>r.type==='黑名单'&&((r.user===db.current&&r.target===target)||(r.target===db.current&&r.user===target)));modal('与 '+uname(target)+' 的私信',`<div id="chat-history">${db.messages.filter(m=>((m.sender===db.current&&m.receiver===target)||(m.sender===target&&m.receiver===db.current))&&!m.hidden.includes(db.current)).map(m=>`<div class="chat-row ${m.sender===db.current?'mine':''}"><small>${esc(uname(m.sender))} · ${stamp(m.time)}</small><p>${esc(m.content)}</p>${button('从我的会话删除','delete-message',m.id)}</div>`).join('')||'<p>还没有消息，开始交流吧。</p>'}</div>${blocked()?'<p class="note">存在黑名单关系，无法发送消息。</p>':`<form id="chat-form"><label class="field">消息<textarea name="content" maxlength="1000" required></textarea></label><p class="form-error" id="chat-error"></p><button class="btn primary">发送</button></form>`}`);if($('#chat-form'))$('#chat-form').onsubmit=e=>{e.preventDefault();const text=new FormData(e.target).get('content').trim();if(!text||blocked())return;db.messages.push({id:uid(),sender:db.current,receiver:target,content:text,time:now(),hidden:[]});save();chat(target);};}
function adminAction(name,n,id){if(!admin())return toast('此操作需要管理员体验账号');const require=p=>{if(!can(p)){toast('当前管理员角色无此权限');return false;}return true;};
 if(name==='audit-identity'){if(!require('身份认定审核'))return;const a=db.applications.find(a=>a.id===n);if(!a||a.status!=='待审核')return;return reason('审核身份申请',d=>{a.status=d.result;a.reason=d.reason;if(d.result==='通过'){const u=db.users.find(u=>u.id===a.user);if(!u.roles.includes(a.type))u.roles.push(a.type);}notify(a.user,'身份申请审核结果',a.status+'：'+d.reason,'profile/identity');log('审核身份申请：'+a.id);},[F('result','审核结果','select',true,0,['通过','驳回'])]);}
 if(name==='audit-content'){const r=rec(n);if(!r||!require(r.kind==='course'?'课程审核':'活动审核'))return;return reason('审核'+names[r.kind],d=>{if(r.status!=='待审核')throw Error('该内容已处理');r.status=d.result==='通过'?'已发布':'已驳回';r.reason=d.reason;notify(r.user,'内容审核结果',r.title+'：'+r.status,'creator');log('审核内容：'+r.title);},[F('result','审核结果','select',true,0,['通过','驳回'])]);}
 if(name==='audit-appeal'){if(!require('账号封禁与解封'))return;let a=db.appeals.find(a=>a.id===n);if(!a)return;return reason('审核账号申诉',d=>{a.status=d.result;a.result=d.reason;if(d.result==='通过')db.users.find(u=>u.id===a.user).status='正常';notify(a.user,'申诉处理结果',d.reason,'profile/reports');log('审核解禁申诉：'+a.id);},[F('result','审核结果','select',true,0,['通过','驳回'])]);}
 if(name==='invite'){if(!require('身份认定审核'))return;return reason('邀请用户成为专家',d=>{const target=parseInt(d.target);if(db.invitations.some(i=>i.user===target&&i.status==='待确认'))throw Error('已有待确认邀请');db.invitations.push({id:uid(),user:target,reason:d.reason,status:'待确认'});notify(target,'收到专家邀请',d.reason,'profile/identity');log('邀请专家：'+uname(target));},[F('target','受邀用户','select',true,0,db.users.filter(u=>!u.roles.includes('专家')).map(u=>u.id+' · '+u.name))],'发出邀请');}
 if(name==='user-status'){if(!require('账号封禁与解封'))return;let u=db.users.find(u=>u.id===n);if(n===db.current||u?.roles.includes('超级管理员'))return toast('不能在此封禁当前账号或超级管理员');return reason(u.status==='正常'?'封禁账号':'解除封禁',d=>{u.status=u.status==='正常'?'已封禁':'正常';notify(n,'账号状态变更',d.reason,'profile/settings');log('账号状态变更：'+u.name);});}
 if(name==='toggle-publish'){let r=rec(n);if(!r||!require(({collection:'藏品管理',post:'帖子管理',question:'问答管理',topic:'话题管理',course:'课程管理',activity:'活动管理',announcement:'公告管理',exhibition:'专题展览管理'})[r.kind]))return;if(!['已发布','已下架'].includes(r.status))return toast('待审核或草稿内容请先完成审核');r.status=r.status==='已发布'?'已下架':'已发布';log('内容状态变更：'+r.title);save();return render();}
 if(name==='moderate'){let [kind,i]=id.split(':'),perm={comments:'评论管理',replies:'回复管理',answers:'问答管理',ratings:'课程评分管理'}[kind];if(!require(perm))return;const x=db[kind].find(x=>x.id===+i);if(x)return reason('处理互动内容',d=>{x.deleted=true;log('处理'+perm+'：'+d.reason);});}
 if(name==='handle-report'){let r=db.reports.find(r=>r.id===n);if(!r||!require(r.targetUser?'账号举报处理':'内容举报处理'))return;return reason('举报处理',d=>{if(d.result==='封禁账号'&&!can('账号封禁与解封'))throw Error('无账号封禁权限');if(d.result==='下架内容'&&r.targetUser)throw Error('账号举报不能执行内容下架');if(d.result==='下架内容'){let target=rec(r.record);if(!target)throw Error('对象不存在');target.status='已下架';}if(d.result==='封禁账号'){const target=db.users.find(u=>u.id===(r.targetUser||rec(r.record)?.user));if(!target||target.id===db.current||target.roles.includes('超级管理员'))throw Error('此账号不能封禁');target.status='已封禁';}r.status='已处理';r.result=d.result+'：'+d.reason;notify(r.user,'举报处理结果',r.result,'profile/reports');log('处理举报：'+r.id);},[F('result','处理方式','select',true,0,['举报不成立，保留','举报成立，提醒整改','下架内容','封禁账号'])]);}
 if(name==='assign'){if(!require('鉴定任务分配'))return;let a=db.appraisals.find(a=>a.id===n),r=rec(a?.record);if(!a||a.status==='已完成')return;const candidates=db.users.filter(u=>u.status==='正常'&&u.roles.includes('专家')&&u.id!==a.user&&!a.tasks.some(t=>t.expert===u.id)&&db.specialties.some(s=>s.expert===u.id&&s.category===r.category_id&&s.era===r.era_id));if(!candidates.length)return toast('暂无匹配类别与年代的可分配专家，请维护专家擅长领域');return formModal('分配专家',[F('expert','匹配的专家','select',true,0,candidates.map(u=>u.id+' · '+u.name))],{},d=>{if(new Date(a.deadline)<new Date())throw Error('已超过意见截止时间');a.tasks.push({id:uid(),expert:parseInt(d.expert)});a.status='鉴定中';notify(parseInt(d.expert),'收到鉴定任务',r.title,'expert');log('分配鉴定任务：'+a.id);save();close();render();},'分配任务');}
 if(name==='review-opinions'){if(!require('藏品最终审核'))return;let a=db.appraisals.find(a=>a.id===n);if(!a)return;modal('审核专家意见',a.tasks.filter(t=>t.opinion).map(t=>`<div class="lesson"><b>${esc(uname(t.expert))} · ${esc(t.judgement)}</b><p>${esc(t.opinion)}</p><p>${badge(t.valid)}</p>${button('有效','valid-opinion',`${a.id}:${t.id}`)}${button('无效','invalid-opinion',`${a.id}:${t.id}`)}</div>`).join('')||empty('尚无已提交意见'));return;}
 if(name==='valid-opinion'||name==='invalid-opinion'){if(!require('藏品最终审核'))return;let [aid,tid]=id.split(':').map(Number),a=db.appraisals.find(a=>a.id===aid),t=a?.tasks.find(t=>t.id===tid);if(!t||a.status==='已完成')return;return reason('确认意见有效性',d=>{t.valid=name==='valid-opinion'?'有效':'无效';t.invalid_reason=d.reason;log('审核专家意见：'+tid);});}
 if(name==='finalize'){if(!require('藏品最终审核'))return;let a=db.appraisals.find(a=>a.id===n);if(!a||a.status==='已完成')return;const valid=a.tasks.filter(t=>t.valid==='有效'&&['真品','赝品','存疑'].includes(t.judgement));if(new Date(a.deadline)>new Date()&&a.tasks.some(t=>!t.opinion))return toast('还有已分配专家未提交意见');if(a.tasks.some(t=>t.opinion&&t.valid==='待审核'))return toast('请先审核已提交意见的有效性');if(valid.length<3)return toast('至少需要3位专家的有效最终意见');const result=valid.filter(t=>t.judgement==='真品').length>valid.length/2?'真品':valid.filter(t=>t.judgement==='赝品').length>valid.length/2?'赝品':'存疑';return reason('最终审核 · 多数意见：'+result,d=>{a.status='已完成';a.result=result;a.reason=d.reason;let r=rec(a.record);r.status=d.compliance==='合规'&&result==='真品'?'已发布':'已驳回';r.reason=d.reason;notify(a.user,'鉴定审核已完成',result+'：'+d.reason,'profile/appraisals');log('完成最终鉴定：'+a.id);},[F('compliance','藏品资料合规判断','select',true,0,['合规','不合规'])]);}
 if(['role','delete-role','grant-role'].includes(name)&&!user().roles.includes('超级管理员'))return toast('仅超级管理员可配置角色权限');
 if(name==='role'){let r=db.roles.find(r=>r.id===n);return formModal(r?'编辑角色权限':'新增角色',[F('name','角色名称','text',true,50),F('description','角色说明','textarea',true,500),F('enabled','角色状态','select',true,0,['启用','停用'])],r?{...r,enabled:r.enabled?'启用':'停用'}:{},(d,e)=>{const selected=new FormData(e.target).getAll('permission');if(r)Object.assign(r,{name:d.name,description:d.description,enabled:d.enabled==='启用',permissions:selected});else db.roles.push({id:uid(),name:d.name,description:d.description,enabled:d.enabled==='启用',permissions:selected});log('配置角色权限：'+d.name);save();close();render();},'保存角色',`<h3>业务权限</h3><div class="check-grid">${permissions.map(p=>`<label><input type="checkbox" name="permission" value="${p}" ${r?.permissions.includes(p)?'checked':''}>${p}</label>`).join('')}</div>`);}
 if(name==='delete-role')return reason('删除角色并解除关联',()=>{db.roles=db.roles.filter(r=>r.id!==n);db.users.forEach(u=>u.roleIds=u.roleIds?.filter(x=>x!==n));log('删除角色：'+n);});
 if(name==='grant-role'){const u=db.users.find(u=>u.id===n);return formModal('为 '+u.name+' 分配角色',[],{},(d,e)=>{u.roleIds=new FormData(e.target).getAll('role').map(Number);log('分配管理员角色：'+u.name);save();close();render();},'保存授权',`<div class="check-grid">${db.roles.map(r=>`<label><input type="checkbox" name="role" value="${r.id}" ${u.roleIds?.includes(r.id)?'checked':''}>${esc(r.name)}</label>`).join('')}</div>`);}
 if(name==='dictionary'){if(!require('藏品管理'))return;return formModal('新增字典项',[F('kind','字典类型','select',true,0,['藏品分类','藏品年代','课程分类','标签']),F('name','名称','text',true,50)],{},d=>{let k={'藏品分类':'category_id','藏品年代':'era_id','课程分类':'course_category_id','标签':'tags'}[d.kind];options[k]??=[];if(options[k].includes(d.name))throw Error('该名称已存在');options[k].push(d.name);db.dictionaries=options;log('新增字典：'+d.name);save();close();render();});}
}
if(db.dictionaries)for(const [k,v] of Object.entries(db.dictionaries)){if(options[k])options[k].splice(0,options[k].length,...v);else options[k]=v;}
document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b){e.preventDefault();try{action(b.dataset.action,b.dataset.id||'',b);}catch(err){toast('操作未完成：'+err.message);}}});
document.addEventListener('change',e=>{const input=e.target;if(input.id==='category-filter'||input.id==='era-filter'){if(input.id==='category-filter')categoryFilter=input.value;else eraFilter=input.value;filter=$('#filter')?.value||'';page=1;render();}if(input.dataset.preview&&input.files?.[0]){const f=input.files[0];if(!f.type.startsWith('image/')||f.size>5*1024*1024)return toast('请选择5MB以内的图片');const img=document.createElement('img'),url=URL.createObjectURL(f);img.src=url;img.alt='本地图片预览';img.onload=()=>URL.revokeObjectURL(url);$('#preview-'+input.dataset.preview).replaceChildren(img);}if(input.id==='video-file'&&input.files?.[0]){const video=$('#course-video');if(video.dataset.localURL)URL.revokeObjectURL(video.dataset.localURL);video.src=URL.createObjectURL(input.files[0]);video.dataset.localURL=video.src;}});

let carouselTimer=null, carouselIndex=0, carouselSlides=[], carouselDots=[];
function stopCarousel() {
 clearInterval(carouselTimer);
 carouselTimer=null;
 carouselSlides=[];
 carouselDots=[];
}
function showCarouselSlide(index) {
 if (!carouselSlides.length) return;
 carouselIndex=(index+carouselSlides.length)%carouselSlides.length;
 carouselSlides.forEach((slide,i)=>slide.classList.toggle('active',i===carouselIndex));
 carouselDots.forEach((dot,i)=>{dot.classList.toggle('active',i===carouselIndex);dot.setAttribute('aria-pressed',String(i===carouselIndex));});
}
function startCarousel() {
 const container=$('.home-carousel');
 if (!container) return;
 carouselSlides=$$('.carousel-slide',container);
 carouselDots=$$('.carousel-dots button',container);
 carouselDots.forEach((dot,i)=>{dot.onclick=()=>showCarouselSlide(i);});
 showCarouselSlide(0);
 if (carouselSlides.length>1) carouselTimer=setInterval(()=>showCarouselSlide(carouselIndex+1),3000);
}
window.addEventListener('pagehide',stopCarousel);
window.addEventListener('pageshow',()=>{if(route==='home' && carouselTimer===null)startCarousel();});


const navigation=[['首页','home'],['资源库','resource'],['论坛','forum'],['课程中心','courses'],['活动','activities'],['创作中心','creator'],['个人中心','profile'],['专家工作台','expert'],['机构与课程管理','studio'],['管理后台','admin']];
function render(){
 stopCarousel();
 const next=location.hash.slice(1)||'home';
 if(next!==route){filter='';categoryFilter='';eraFilter='';page=1;}
 route=next;
 const [routePath, creatorQuery='']=route.split('?');
 const [section,id,editId]=routePath.split('/');
 const activeSection={questions:'forum',topics:'forum',exhibitions:'resource',announcements:'home',edit:'creator'}[section]||section;
 $('#account-button').textContent=user()?user().name+' · 切换体验':'游客 · 体验登录';
 $('#nav').innerHTML=navigation.map(([title,to])=>link(title,to,activeSection===to?'active':'')).join('');
 $('#crumb').innerHTML=link('首页','home','')+'　›　'+esc(section==='announcements'?'通知公告':navigation.find(x=>x[1]===activeSection)?.[0]||'内容详情');
 const state={filter,categoryFilter,eraFilter,page};
 let out=''; editContext=null;
 switch(section){
 case 'home':out=renderHome();break;
 case 'resource':case 'exhibitions':case 'announcements':out=renderResource(section,state);break;
 case 'forum':case 'questions':case 'topics':out=renderForum(section,state);break;
 case 'courses':out=renderCourses(state);break;
 case 'activities':out=renderActivities(state);break;
 case 'detail':out=renderDetail(+id);break;
 case 'edit':editContext={kind:id,id:+editId||undefined,r:rec(+editId)};out=renderEditor(id,+editId||undefined);break;
 case 'creator':out=renderCreator(id||'overview',creatorQuery);break;
 case 'profile':out=renderProfile(id||'overview');break;
 case 'expert':out=renderExpert();break;
 case 'studio':out=renderStudio();break;
 case 'admin':out=renderAdmin(id||'audit');break;
 case 'search':{
   let q;try{q=decodeURIComponent(id||'');}catch{q=id||'';}
   out=head('搜索结果','关键词：'+q)+cards(db.records.filter(r=>visible(r)&&(r.title+r.body).includes(q)));break;
 }
 default:out=empty('页面不存在','请通过上方导航返回。');
 }
 page=state.page;
 $('#app').innerHTML=out;
 if(section==='home')startCarousel();
 bindEditor();bindCreatorControls();bindTopicPicker();save();
}
initUI();
$('#global-search-form').onsubmit=e=>{e.preventDefault();const q=new FormData(e.target).get('q').trim();go('search/'+encodeURIComponent(q));};window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);});render();
