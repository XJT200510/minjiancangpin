import { db, user, rec } from '../data.js';
import { $, esc, stamp, button, empty, badge, head, table } from '../utils.js';

export function renderExpert(){if(!user()?.roles.includes('专家'))return head('专家工作台')+empty('当前体验账号没有专家身份')+button('切换至专家体验账号','account');return head('专家鉴定工作台','查看分配给自己的任务，提交意见或要求补充资料。',button('维护擅长领域','specialty'))+table(['申请 / 藏品','截止时间','状态','操作'],db.appraisals.flatMap(a=>a.tasks.filter(t=>t.expert===db.current).map(t=>[`${a.id} · ${esc(rec(a.record)?.title)}`,stamp(a.deadline),t.opinion?badge(t.valid||'待审核'):badge(a.status),button('查看材料','progress',a.record)+(a.status!=='已完成'?button('要求补充','supplement',a.id)+(!t.opinion?button('提交鉴定意见','opinion',a.id):''): '')])));}
