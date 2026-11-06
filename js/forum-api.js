import { db, F, loadBootstrap } from './data.js';
import { $, toast, formModal, close } from './utils.js';

/* ============================================================
   论坛交流 · 写库接口层
   把帖子/问题/话题/回答/评论/回复/点赞/收藏这些「写操作」统一送到
   api/Forum.ashx，成功后重新拉一次 Bootstrap 再重绘页面，
   保证页面上看到的就是数据库里的数据。

   路由里的 record id 是带前缀的（藏品 100000+ / 帖子 200000+ / 问题 300000+），
   写库时要还原成数据库的 target_type + target_id，见 splitRecord()。
   ============================================================ */

// main.js 注册自己的 render，写完数据后由这里回调
let refreshHandler = null;
export function setForumRefresh(fn) { refreshHandler = fn; }

// 由 main.js 在 action() 开头转发过来的写操作
export const FORUM_ACTIONS = [
 'like', 'favorite', 'unfavorite',
 'comment', 'answer', 'reply', 'accept',
 'delete-comment', 'delete-reply'
];

export function splitRecord(recordId) {
 const n = Number(recordId) || 0;
 if (n >= 400000) return null;                 // 课程/活动等其它类型，不在此接口范围
 if (n >= 300000) return { target_type: 2, target_id: n - 300000 }; // 问题
 if (n >= 200000) return { target_type: 1, target_id: n - 200000 }; // 帖子
 if (n >= 100000) return { target_type: 0, target_id: n - 100000 }; // 藏品
 return null;
}

async function call(op, payload = {}) {
 const body = new URLSearchParams({ op, ...payload });
 const response = await fetch('api/Forum.ashx', { method: 'POST', body, cache: 'no-store' });
 let data = {};
 try { data = await response.json(); } catch { /* 非 JSON 响应按失败处理 */ }
 if (!response.ok || !data.ok) throw new Error(data.message || ('接口调用失败（HTTP ' + response.status + '）'));
 return data.data;
}

async function refresh() {
 await loadBootstrap();
 if (refreshHandler) refreshHandler();
}

function formError(message) {
 const box = $('#form-error');
 if (box) box.textContent = message;
 else toast(message);
}

// ---------------- 点赞 ----------------

async function toggleLike(recordId) {
 const target = splitRecord(recordId);
 if (!target) return toast('该内容暂不支持点赞');
 if (!db.current) return toast('请先切换体验账号');

 const liked = db.likes.some(x => x.user === db.current && x.record === Number(recordId));
 try {
  await call(liked ? 'unlike' : 'like', { user_id: db.current, ...target });
  await refresh();
  toast(liked ? '已取消点赞' : '已点赞');
 } catch (err) {
  toast('点赞失败：' + err.message);
 }
}

// ---------------- 收藏 ----------------

async function openFavorite(recordId) {
 const target = splitRecord(recordId);
 if (!target) return toast('该内容暂不支持收藏');
 if (!db.current) return toast('请先切换体验账号');

 const folders = db.folders.filter(f => f.user === db.current);
 const old = db.favorites.find(f => f.user === db.current && f.record === Number(recordId));

 if (old) return unfavorite(recordId);

 if (!folders.length) return toast('还没有收藏夹，请先在个人中心新建');

 const options = folders.map(f => f.id + ' · ' + f.name);
 formModal('收藏内容', [F('folder', '选择收藏夹', 'select', true, 0, options)], { folder: options[0] },
  d => {
   const folderId = parseInt(d.folder);
   call('favorite', { user_id: db.current, ...target, folder_id: folderId })
    .then(refresh)
    .then(() => { close(); toast('已收藏'); })
    .catch(err => formError(err.message));
  }, '保存收藏');
}

async function unfavorite(recordId) {
 const target = splitRecord(recordId);
 if (!target) return toast('该内容暂不支持收藏');
 try {
  await call('unfavorite', { user_id: db.current, ...target });
  await refresh();
  close();
  toast('已取消收藏');
 } catch (err) {
  toast('取消收藏失败：' + err.message);
 }
}

// ---------------- 评论 / 回答 / 回复 ----------------

function askComment(recordId) {
 const target = splitRecord(recordId);
 if (!target) return toast('该内容暂不支持评论');
 if (!db.current) return toast('请先切换体验账号');
 formModal('发表评论', [F('content', '内容', 'textarea', true, 500)], {}, d => {
  call('comment', { user_id: db.current, ...target, content: d.content })
   .then(refresh)
   .then(() => { close(); toast('评论已发布'); })
   .catch(err => formError(err.message));
 }, '发布');
}

function askAnswer(recordId) {
 const target = splitRecord(recordId);
 if (!target) return toast('该内容暂不支持回答');
 if (!db.current) return toast('请先切换体验账号');
 formModal('回答问题', [F('content', '内容', 'textarea', true, 2000)], {}, d => {
  call('answer', { user_id: db.current, question_id: target.target_id, content: d.content })
   .then(refresh)
   .then(() => { close(); toast('回答已提交'); })
   .catch(err => formError(err.message));
 }, '发布');
}

function askReply(commentId, toUserId) {
 const comment = db.comments.find(x => x.id === Number(commentId));
 if (!comment) return toast('评论不存在');
 if (!db.current) return toast('请先切换体验账号');
 formModal('回复用户', [F('content', '内容', 'textarea', true, 500)], {}, d => {
  call('reply', {
   user_id: db.current,
   comment_id: comment.id,
   reply_to_user_id: toUserId || comment.user,
   content: d.content
  })
   .then(refresh)
   .then(() => { close(); toast('回复已发布'); })
   .catch(err => formError(err.message));
 }, '发布');
}

async function acceptAnswer(answerId) {
 const answer = db.answers.find(x => x.id === Number(answerId));
 if (!answer) return toast('回答不存在');
 const question = splitRecord(answer.record);
 if (!question || question.target_type !== 2) return toast('只能采纳问题下的回答');
 try {
  await call('accept_answer', {
   user_id: db.current,
   answer_id: answer.id,
   question_id: question.target_id
  });
  await refresh();
  toast('已采纳该回答');
 } catch (err) {
  toast('采纳失败：' + err.message);
 }
}

async function deleteComment(commentId) {
 try {
  await call('delete_comment', { user_id: db.current, comment_id: Number(commentId) });
  await refresh();
  toast('评论已删除');
 } catch (err) {
  toast('删除失败：' + err.message);
 }
}

async function deleteReply(replyId) {
 try {
  await call('delete_reply', { user_id: db.current, reply_id: Number(replyId) });
  await refresh();
  toast('回复已删除');
 } catch (err) {
  toast('删除失败：' + err.message);
 }
}

/* main.js 的 action() 会把论坛写操作转发到这里。
   b 是触发按钮，回复时要从中取 data-to（回复给谁）。
   返回 true 表示已经接管；返回 false 说明这条内容不在本接口范围（例如课程评论），
   交回 main.js 原来的本机流程处理。 */
export function runForumAction(name, id, b) {
 const needRecord = ['like', 'favorite', 'unfavorite', 'comment', 'answer', 'accept'].includes(name);
 if (needRecord) {
  let recordId = id;
  if (name === 'accept') {
   const answer = db.answers.find(x => x.id === Number(id));
   recordId = answer ? answer.record : 0;
  }
  if (!splitRecord(recordId)) return false;
 }

 switch (name) {
  case 'like': toggleLike(id); return true;
  case 'favorite': openFavorite(id); return true;
  case 'unfavorite': unfavorite(id); return true;
  case 'comment': askComment(id); return true;
  case 'answer': askAnswer(id); return true;
  case 'reply': askReply(id, Number(b?.dataset?.to) || 0); return true;
  case 'accept': acceptAnswer(id); return true;
  case 'delete-comment': deleteComment(id); return true;
  case 'delete-reply': deleteReply(id); return true;
  default: return false;
 }
}

/* ---------------- 发帖 / 提问 / 建话题 ----------------
   由 main.js 的 bindEditor 转发：kind 为 post / question / topic 时走数据库，
   其余类型（藏品、课程、活动等）仍保持原来的本地流程。 */
export async function saveForumContent(event, form, context) {
 const kind = context?.kind;
 const record = context?.r;
 if (!['post', 'question', 'topic'].includes(kind)) return false;

 const draft = event.submitter?.value === 'draft';
 const data = Object.fromEntries(new FormData(form));
 const fail = message => { $('#form-error').textContent = message; };

 try {
  if (draft && kind !== 'post') throw new Error('只有帖子支持保存草稿，问题与话题请直接发布');
  if (!form.reportValidity()) return true;

  const common = {};
  if (kind === 'post') {
   const title = (data.post_title || '').trim();
   if (!title) throw new Error('请填写帖子标题');
   Object.assign(common, {
    post_id: record ? splitRecord(record.id)?.target_id || 0 : 0,
    author_id: db.current,
    post_title: title.slice(0, 200),
    content: data.content || '',
    cover_url: data.cover_url || '',
    visibility: data.visibility === '仅自己可见' ? 1 : 0,
    post_status: draft ? 1 : 2,
    topics: data.topics || ''
   });
   await call('save_post', common);
  } else if (kind === 'question') {
   const title = (data.question_title || '').trim();
   if (!title) throw new Error('请填写问题标题');
   Object.assign(common, {
    question_id: record ? splitRecord(record.id)?.target_id || 0 : 0,
    user_id: db.current,
    question_title: title.slice(0, 100),
    content: data.content || '',
    question_status: 1,
    topics: data.topics || ''
   });
   await call('save_question', common);
  } else {
   const name = (data.topic_name || '').trim();
   if (!name) throw new Error('请填写话题名称');
   Object.assign(common, {
    topic_id: record ? splitRecord(record.id)?.target_id || 0 : 0,
    creator_id: db.current,
    topic_name: name.slice(0, 100),
    topic_description: data.topic_description || '',
    cover_url: data.cover_url || ''
   });
   await call('save_topic', common);
  }

  await refresh();
  location.hash = '#creator';
  toast(draft ? '草稿已保存到数据库' : '内容已保存到数据库');
  return true;
 } catch (err) {
  fail(err.message);
  return true;
 }
}

/* main.js 里挂到 window，避免改动它已有的 import 列表 */
window.__forumSaveContent = saveForumContent;
window.__forumAction = runForumAction;
