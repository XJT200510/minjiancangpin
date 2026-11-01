import { db, visible, uname, uid, save, now as dbNow } from '../data.js';
import { head, button, link, empty, stamp, safeURL, esc } from '../utils.js';

// ===== 模块内常量（不改动公共文件） =====
const PAGE_SIZE = 6;

// 打开演示数据：true 表示首次进入活动中心时自动补充示例活动（见文件末尾“演示活动数据”区块）。
// 正式合并或不需要演示时，把这里改成 false，或点击页面底部的“移除演示活动”即可。
const DEMO_SEED = true;

// 状态筛选：沿用 main.js 现有的 hash 路由机制，形如 #activities/open。
// main.js 的 render() 只取第一段作为 section，第二段 id 会被忽略，
// 因此这里在模块内自行读取 location.hash 解析子状态，不需要新增公共事件处理器。
const STATUS_TABS = [
  ['all', '全部活动'],
  ['open', '可以报名'],
  ['ongoing', '进行中'],
  ['closed', '报名已截止'],
  ['past', '已结束']
];

// ===== 样式引入：与 main.js 的 ensureStylesheets 保持同一写法 =====
// 用 import.meta.url 解析，避免依赖页面 URL，部署到子目录也不会失效。
function ensureStyles() {
  if (document.querySelector('link[data-activities-extra]')) return;
  const sheet = document.createElement('link');
  sheet.rel = 'stylesheet';
  sheet.href = new URL('../../css/activities-extra.css', import.meta.url).href;
  sheet.dataset.activitiesExtra = 'true';
  document.head.appendChild(sheet);
}

// ===== 当前筛选状态（从 hash 子段读取） =====
function currentStatus() {
  const [, sub = ''] = (location.hash.slice(1) || '').split('/');
  return STATUS_TABS.some(([key]) => key === sub) ? sub : 'all';
}

/* ============================================================
   活动封面（模块内动态生成，不修改公共文件）
   ------------------------------------------------------------
   背景说明（这是原有实现不好看的根因）：
   1. data.js 的 specs.activity 里没有 cover_image / cover_url 字段，
      所以通过「发布活动」表单创建的活动，数据里根本没有封面地址；
   2. utils.js 的 imageFor() 此时会退回到 assets/${record.img}.svg，
      而 main.js 新建记录时把 img 固定成了 'letters'，
      结果就是：所有活动共用同一张 assets/letters.svg；
   3. letters.svg 本身是 530×590 的竖幅物件插画，被 object-fit:cover
      塞进横向卡片封面后，构图被严重裁切，只剩下中间一块。

   因此这里按「活动类别」现场生成 560×480 的活动封面：
   - 画布比例贴合列表封面区，核心元素收在四周 12% 安全区内，任何卡片宽度都不会被裁；
   - 三个类别各有独立配色与图形母题（器物 / 卷轴 / 木匣），不再千篇一律；
   - 封面上不印制任何时间信息，避免与详情页时间产生不一致；
   - 输出的 data URI 是独立文档，id 不会和页面上其它 SVG 冲突；
   - 如果数据里已经带了真实封面地址，仍然优先使用真实封面。
   ============================================================ */

const COVER_THEMES = {
  '收藏交流': { ink: '#3f5c4e', accent: '#8ca59a', soft: '#e4ece5', seal: '#a8452b', label: 'COLLECTORS EXCHANGE' },
  '文化讲座': { ink: '#7a4526', accent: '#c69a5e', soft: '#f4e8d8', seal: '#b3452a', label: 'CULTURE LECTURE' },
  '整理工作坊': { ink: '#33506f', accent: '#7c9bc0', soft: '#e3eaf3', seal: '#a8452b', label: 'ARCHIVE WORKSHOP' }
};
const COVER_FALLBACK = { ink: '#7a4526', accent: '#c69a5e', soft: '#f4e8d8', seal: '#b3452a', label: 'MINCANG ACTIVITY' };

// 母题原本按 640×420 设计，这里把它们适配到 560×480 并居中到 (280,232)。
// 三类图形的长宽比差别很大，所以各自用不同的缩放系数，视觉重量才一致。
const MOTIF_FIT = {
  vessel: 'translate(280 232) scale(1.25) translate(-320 -229)',
  scroll: 'translate(280 232) scale(1) translate(-320 -215)',
  box: 'translate(280 232) scale(1.2) translate(-320 -229)'
};

// 用 id 做稳定散列：同一条活动每次刷新得到同样的封面，不同活动之间又各有差异。
function coverSeed(value) {
  let h = 0;
  for (const ch of String(value)) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return h;
}

// 三类图形的母题路径（均以 (320,229) 为重心，由 MOTIF_FIT 统一适配到画布中心）
function coverMotif(kind, t) {
  if (kind === 'scroll') return `
    <g fill="none" stroke="${t.ink}">
      <rect x="152" y="142" width="336" height="146" rx="4" fill="#fffdfa" stroke-opacity=".34"/>
      <path d="M186 188h268M186 216h232M186 244h176" stroke-opacity=".22" stroke-width="2" stroke-linecap="round"/>
      <rect x="152" y="142" width="336" height="146" rx="4" stroke-opacity=".5"/>
    </g>
    <rect x="126" y="126" width="30" height="178" rx="15" fill="${t.ink}" opacity=".72"/>
    <rect x="484" y="126" width="30" height="178" rx="15" fill="${t.ink}" opacity=".72"/>
    <circle cx="141" cy="137" r="8" fill="${t.ink}"/><circle cx="141" cy="293" r="8" fill="${t.ink}"/>
    <circle cx="499" cy="137" r="8" fill="${t.ink}"/><circle cx="499" cy="293" r="8" fill="${t.ink}"/>
    <rect x="404" y="212" width="46" height="46" rx="6" fill="${t.seal}" opacity=".82"/>
    <path d="M416 224h22M427 224v22M416 246h22" stroke="#fffdfa" stroke-opacity=".85" stroke-width="2" fill="none"/>`;
  if (kind === 'box') return `
    <rect x="200" y="134" width="240" height="44" rx="7" fill="${t.accent}" opacity=".62"/>
    <rect x="212" y="178" width="216" height="146" rx="6" fill="${t.accent}" opacity=".38" stroke="${t.ink}" stroke-opacity=".26"/>
    <path d="M244 190v122M282 190v122M320 190v122M358 190v122M396 190v122" stroke="${t.ink}" stroke-opacity=".14" stroke-width="2"/>
    <path d="M212 232h216" stroke="${t.ink}" stroke-opacity=".2" stroke-width="2"/>
    <rect x="300" y="168" width="40" height="44" rx="5" fill="${t.ink}" opacity=".66"/>
    <circle cx="320" cy="190" r="7" fill="#fffdfa" opacity=".8"/>
    <path d="M212 178h216" stroke="${t.ink}" stroke-opacity=".3" stroke-width="2"/>`;
  return `
    <path d="M296 96h48l-8 38c-36 10-72 44-76 100-4 58 26 102 60 114 34-12 64-56 60-114-4-56-40-90-76-100z"
          fill="${t.accent}" opacity=".42" stroke="${t.ink}" stroke-opacity=".42" stroke-width="2"/>
    <path d="M300 348h40l7 22h-54z" fill="${t.ink}" opacity=".58"/>
    <path d="M290 100h56M296 116h44" fill="none" stroke="${t.ink}" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>
    <path d="M268 226q26-24 52 0t52 0" fill="none" stroke="${t.ink}" stroke-opacity=".34" stroke-width="2"/>
    <path d="M272 268q24-20 48 0t48 0" fill="none" stroke="${t.ink}" stroke-opacity=".26" stroke-width="2"/>
    <path d="M286 170q-14 54 2 108" fill="none" stroke="#fffdfa" stroke-opacity=".5" stroke-width="6" stroke-linecap="round"/>`;
}

// 生成一张活动封面的 data URI
function coverSVG(activity) {
  const category = activity.activity_category || '';
  const theme = COVER_THEMES[category] || COVER_FALLBACK;
  const kind = theme === COVER_THEMES['文化讲座'] ? 'scroll' : theme === COVER_THEMES['整理工作坊'] ? 'box' : 'vessel';
  const seed = coverSeed(activity.id ?? activity.title ?? 0);

  // 同一类别内也做细微差异：旋转角度、点缀位置都随 id 变化
  const tilt = ((seed % 9) - 4) * 0.7;
  const fit = `rotate(${tilt} 280 232) ${MOTIF_FIT[kind]}`;

  const specks = Array.from({ length: 3 + (seed % 3) }, (_, i) => {
    const s = coverSeed(`${seed}-${i}`);
    return { x: 64 + (s % 420), y: 74 + ((s >> 5) % 330), r: 2 + (s % 3) };
  });

  // 画布 560×480 接近列表封面区约 1:1 的比例，object-fit:cover 时最多只裁掉约 9%，
  // 因此把核心元素都收在四周 12% 的安全区内，任何卡片宽度下都不会被切掉。
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 480" width="560" height="480" role="img">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.soft}"/><stop offset="1" stop-color="#fffdfa"/>
    </linearGradient>
    <radialGradient id="glow" cx=".7" cy=".24" r=".66">
      <stop offset="0" stop-color="${theme.accent}" stop-opacity=".38"/>
      <stop offset="1" stop-color="${theme.accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="18" height="18" patternUnits="userSpaceOnUse">
      <path d="M0 .5H18M.5 0V18" stroke="${theme.ink}" stroke-opacity=".05" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="560" height="480" fill="url(#bg)"/>
  <rect width="560" height="480" fill="url(#grid)"/>
  <circle cx="404" cy="112" r="176" fill="url(#glow)"/>
  ${specks.map(p => `<circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="${theme.ink}" opacity=".13"/>`).join('')}
  <g transform="${fit}">${coverMotif(kind, theme)}</g>
  <g fill="none" stroke="${theme.ink}" stroke-opacity=".4" stroke-width="1.6">
    <path d="M36 108V36h72M524 108V36h-72M36 372v72h72M524 372v72h-72"/>
  </g>
  <g fill="none" stroke="${theme.ink}" stroke-opacity=".2" stroke-width="1">
    <path d="M50 112V50h62M510 112V50h-62M50 368v62h62M510 368v62h-62"/>
  </g>
  <g text-anchor="middle" font-family="'Songti SC','STSong','SimSun',serif" fill="${theme.ink}">
    <text x="280" y="94" font-size="18" letter-spacing="7" opacity=".8">${esc(category || '文化活动')}</text>
    <text x="280" y="448" font-size="10.5" letter-spacing="4" opacity=".55" font-family="Georgia,serif">${esc(theme.label)}</text>
  </g>
  <rect x="452" y="380" width="46" height="46" rx="6" fill="${theme.seal}" opacity=".22"/>
  <text x="475" y="412" text-anchor="middle" font-size="23" font-family="'Songti SC','STSong','SimSun',serif" fill="${theme.seal}" opacity=".88">民藏</text>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// 取活动封面：真实封面地址优先，否则使用动态生成的封面
function activityCover(activity) {
  return safeURL(activity.cover_image || activity.cover_url) || coverSVG(activity);
}

// ===== 活动状态判定 =====
// 只读取现有字段：status / activity_time / registration_deadline /
// max_participants / db.enrollments，不新增、不修改任何数据字段。
// 说明：现有数据结构只有“开始时间”，没有“结束时间”，
// 因此“进行中”按“活动日期为今天且已到开始时间”判断，活动日期早于今天视为“已结束”。
function getActivityState(activity, now = new Date()) {
  const start = activity.activity_time ? new Date(activity.activity_time) : null;
  const deadline = activity.registration_deadline ? new Date(activity.registration_deadline) : null;
  const limit = Number(activity.max_participants);
  const confirmed = db.enrollments.filter(e => e.activity === activity.id && e.status === '报名成功').length;
  const hasLimit = Number.isFinite(limit) && limit > 0;
  const remaining = hasLimit ? Math.max(0, limit - confirmed) : null;
  const full = hasLimit && remaining === 0;
  const base = { confirmed, limit, hasLimit, remaining, full };

  if (activity.status !== '已发布')
    return { ...base, kind: 'unavailable', label: activity.status || '暂不可报名', hint: '该活动尚未发布，暂不开放报名。' };
  if (!start || Number.isNaN(start.getTime()))
    return { ...base, kind: 'unavailable', label: '时间待确认', hint: '活动时间待主办机构确认，请稍后再查看。' };

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const running = startDay === today && start.getTime() <= now.getTime();

  if (startDay < today)
    return { ...base, kind: 'past', label: '已结束', hint: '活动已结束，报名通道已关闭。' };
  if (running)
    return { ...base, kind: 'ongoing', label: '进行中', hint: deadline && deadline.getTime() > now.getTime()
      ? `活动正在进行中，报名将于 ${stamp(deadline)} 截止。`
      : '活动正在进行中，报名通道已关闭。' };
  if (!deadline || Number.isNaN(deadline.getTime()))
    return { ...base, kind: 'unavailable', label: '报名时间待确认', hint: '报名截止时间待确认，暂不可报名。' };
  if (deadline.getTime() <= now.getTime())
    return { ...base, kind: 'closed', label: '报名已截止', hint: `报名已于 ${stamp(deadline)} 截止，无法继续报名。` };
  if (full)
    return { ...base, kind: 'full', label: '名额已满', hint: `报名人数已达上限 ${limit} 人，无法继续报名。` };

  return { ...base, kind: 'open', label: '可以报名', hint: hasLimit
    ? `报名截止 ${stamp(deadline)}，剩余 ${remaining} 个名额。`
    : `报名截止 ${stamp(deadline)}，名额不限。` };
}

// ===== 我的报名记录 / 我的证书（仅读取，不写入） =====
function myEnrollment(activityId) {
  if (!db.current) return null;
  return db.enrollments.find(e => e.activity === activityId && e.user === db.current && e.status !== '已取消') || null;
}

// 只有证书 status 为“有效”才算已获得；未发放、已作废一律不显示“已获得证书”。
function myCertificate(activityId) {
  if (!db.current) return null;
  return db.certificates.find(c =>
    c.activity === activityId && c.status === '有效' &&
    db.enrollments.find(e => e.id === c.enrollment)?.user === db.current
  ) || null;
}

// ===== 单张活动卡片 =====
function activityCard(activity) {
  const state = getActivityState(activity);
  const mine = myEnrollment(activity.id);
  const cert = myCertificate(activity.id);
  const enrolled = Boolean(mine);
  const success = mine?.status === '报名成功';

  // 名额显示：有人数上限显示 x / y 人，没有上限显示“已报名 x 人”
  const people = state.hasLimit
    ? `${state.confirmed} / ${state.limit} 人`
    : `${state.confirmed} 人`;

  // 报名区按钮
  let enrollArea = '';
  if (enrolled) {
    enrollArea = success
      ? `<span class="activity-state is-success">报名成功</span>`
      : `<span class="activity-state is-pending">我的报名：${esc(mine.status)}</span>`;
  } else if (state.kind === 'open') {
    enrollArea = button('立即报名', 'enroll', activity.id);
  } else {
    // 截止 / 满额 / 结束 / 待确认：给出明确原因，不再显示“可报名”
    enrollArea = `<span class="activity-state is-disabled">不可报名 · ${esc(state.label)}</span>`;
  }

  // 取消报名：仅在报名截止前允许（截止后或活动开始后不再允许操作）。
  // 注意“名额已满”也要允许取消——本人已报名时，取消可以腾出名额，
  // 取消后该活动会回到“可以报名”，人数同步减 1。
  const canCancel = enrolled && (state.kind === 'open' || state.kind === 'full');
  const cancelArea = canCancel ? button('取消报名', 'cancel-enroll', mine.id) : '';

  // 证书入口：仅当确实已发放且有效
  const certArea = cert
    ? `<span class="activity-state is-cert">已获得证书</span>${button('查看证书', 'certificate', cert.id)}`
    : '';

  const theme = COVER_THEMES[activity.activity_category] || COVER_FALLBACK;

  return `<article class="activity-card" style="--cover-accent:${theme.accent};--cover-ink:${theme.ink}">
    <a class="activity-cover-link" href="#detail/${activity.id}" aria-label="查看《${esc(activity.title)}》活动详情">
      <img class="activity-cover" src="${esc(activityCover(activity))}" alt="${esc(activity.title)} · ${esc(activity.activity_category || '文化活动')}封面" loading="lazy">
      <span class="activity-status status-${state.kind}">${esc(state.label)}</span>
    </a>
    <div class="activity-card-content">
      <div class="activity-card-topline">
        <span class="activity-category">${esc(activity.activity_category || '文化活动')}</span>
        <span class="activity-host">主办：${esc(uname(activity.user))}</span>
      </div>
      <h2><a href="#detail/${activity.id}">${esc(activity.title)}</a></h2>
      <p class="activity-summary">${esc(activity.content || activity.body || '活动介绍暂未补充。')}</p>
      <dl class="activity-meta">
        <div><dt>活动时间</dt><dd>${esc(stamp(activity.activity_time))}</dd></div>
        <div><dt>报名截止</dt><dd>${esc(stamp(activity.registration_deadline))}</dd></div>
        <div><dt>活动地点</dt><dd>${esc(activity.activity_location || '待公布')}</dd></div>
        <div><dt>报名人数</dt><dd>${esc(people)}</dd></div>
      </dl>
      <p class="activity-hint hint-${state.kind}">${esc(state.hint)}</p>
      <div class="activity-card-actions">
        ${link('活动详情', 'detail/' + activity.id, 'btn small')}
        ${enrollArea}${cancelArea}${certArea}
      </div>
    </div>
  </article>`;
}

/* ============================================================
   演示活动数据（模块内注入，不修改 data.js 等公共文件）
   ------------------------------------------------------------
   为什么需要它：
   1. data.js 的活动种子只有 1 条，且状态永远是“可以报名”，
      列表页看不出“进行中 / 报名已截止 / 名额已满 / 已结束”长什么样；
   2. main.js 的发布表单强制校验“活动时间必须晚于当前时间”，
      所以“已结束”“报名已截止”这类活动根本没法从界面上造出来；
   3. “名额已满”又需要另一个账号反复报名并由机构审核通过，手工操作成本高。

   因此这里在模块内按【当前时间】动态生成一组示例活动、报名记录与证书，
   一次性覆盖 6 个状态分支。所有时间都是相对“今天”算出来的，
   任何时候打开都不会过期，也不会因为日期推移而失效。

   不使用演示数据的两种关闭方式：
   1) 把文件顶部的 DEMO_SEED 改成 false，刷新页面即可；
   2) 点击列表页底部的“移除演示活动”，一键清理已注入的活动、报名与证书。
   关闭或移除后，页面上只会剩下真实发布的活动。
   ============================================================ */

const DEMO_KEY = 'mincang-demo-activities-v1';

// 生成与 data.js 种子数据同格式的 datetime-local 字符串（YYYY-MM-DDTHH:mm）
function demoTime(dayOffset, hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 演示活动清单（时间全部相对今天计算）
// enroll  = 已审核通过的报名用户（计入名额）
// pending = 待审核的报名用户（不计入名额）
// certTo  = 给该用户发放一张有效证书
function demoPlan() {
  // “进行中”需要同时满足：开始时间已过、且活动日期就是今天。
  // 取【今天 00:00】与【一小时前】中较晚的一个，保证任何时刻打开都是“进行中”。
  const t = new Date();
  const today0 = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 0, 0, 0, 0);
  const start = new Date(Math.max(today0.getTime(), Date.now() - 3600000));
  const p = n => String(n).padStart(2, '0');
  const ongoing = `${start.getFullYear()}-${p(start.getMonth() + 1)}-${p(start.getDate())}T${p(start.getHours())}:${p(start.getMinutes())}`;

  return [
    {
      title: '秋冬藏品防潮与保养讲座',
      category: '文化讲座', img: 'letters', host: 3,
      content: '围绕换季防潮、木器开裂与纸质藏品霉斑处理，现场演示家庭环境下的简易保养方法，可带一件小型实物到场交流。',
      time: ongoing, deadline: demoTime(0, 23, 59),
      location: '江南民俗文化中心 一楼报告厅',
      max: 40, enroll: [2, 6, 7], pending: []
    },
    {
      title: '家书与票证整理工作坊',
      category: '整理工作坊', img: 'wood', host: 3,
      content: '学习家书、票证与老照片的分类编号、去酸装袋与说明文字撰写，现场提供无酸袋、棉线手套等基础材料。',
      time: demoTime(5, 14, 0), deadline: demoTime(-1, 18, 0),
      location: '江南民俗文化中心 三楼整理室',
      max: 25, enroll: [2, 3, 6], pending: []
    },
    {
      title: '青花瓷片标本观摩会',
      category: '收藏交流', img: 'vase', host: 3,
      content: '以馆藏标本为参照，认识青花料的呈色差异与常见纹饰画法。名额有限，仅接受已登记用户报名。',
      time: demoTime(12, 9, 30), deadline: demoTime(9, 18, 0),
      location: '江南民俗文化中心 二楼标本室',
      max: 3, enroll: [2, 6, 7], pending: []
    },
    {
      title: '老物件拍照建档工作坊',
      category: '整理工作坊', img: 'basket', host: 3,
      content: '从自然光布置到局部特写，练习为一件器物建立完整的影像记录，现场可借用柔光板与灰卡。',
      time: demoTime(8, 13, 30), deadline: demoTime(6, 20, 0),
      location: '江南民俗文化中心 三楼整理室',
      max: 5, enroll: [1, 2, 3, 6, 7], pending: []
    },
    {
      title: '社区藏品故事分享会',
      category: '文化讲座', img: 'letters', host: 3,
      content: '六位社区居民讲述家中老物件的来历与生活记忆，现场整理成文字与音频记录，参与者可获纪念证书。',
      time: demoTime(-2, 14, 0), deadline: demoTime(-3, 18, 0),
      location: '江南民俗文化中心 一楼报告厅',
      max: 8, enroll: [1, 2, 3, 6, 7], pending: [], certTo: 1
    },
    {
      title: '民间器物公益鉴定咨询日',
      category: '收藏交流', img: 'vase', host: 3,
      content: '专家现场提供器物年代、材质与保存建议的口头咨询，不做价格评估，请提前整理好来源说明。',
      time: demoTime(15, 10, 0), deadline: demoTime(11, 17, 0),
      location: '江南民俗文化中心 一楼服务台',
      max: 20, enroll: [2, 6, 7], pending: [1]
    }
  ];
}

// 写入演示数据：只在数据库里还没有这批数据时执行一次
function ensureDemoActivities() {
  if (!DEMO_SEED) return false;
  let mark = null;
  try { mark = JSON.parse(localStorage.getItem(DEMO_KEY) || 'null'); } catch { mark = null; }
  // 已主动移除过，或注入的记录仍在库中，都不再重复注入
  if (mark && (mark.removed || db.records.some(r => (mark.records || []).includes(r.id)))) return false;

  const mark2 = { records: [], enrollments: [], certificates: [], removed: false };
  const stampNow = dbNow();
  for (const item of demoPlan()) {
    const id = uid();
    db.records.push({
      id, kind: 'activity', user: item.host,
      title: item.title, body: item.content, img: item.img,
      status: '已发布', created: stampNow, updated: stampNow,
      content: item.content,
      activity_time: item.time,
      activity_location: item.location,
      activity_category: item.category,
      registration_deadline: item.deadline,
      max_participants: item.max
    });
    mark2.records.push(id);

    for (const u of item.enroll) {
      const eid = uid();
      db.enrollments.push({
        id: eid, activity: id, user: u,
        info: '已确认参加，会准时到场。',
        status: '报名成功', time: stampNow
      });
      mark2.enrollments.push(eid);
      if (u === item.certTo) {
        const cid = uid();
        db.certificates.push({
          id: cid, enrollment: eid, activity: id,
          no: 'MC-DEMO-' + cid, issuer: uname(item.host),
          time: stampNow, status: '有效', note: '现场参与确认'
        });
        mark2.certificates.push(cid);
      }
    }
    for (const u of item.pending) {
      const eid = uid();
      db.enrollments.push({
        id: eid, activity: id, user: u,
        info: '希望带一件民国木匣到场请教保存方法。',
        status: '待审核', time: stampNow
      });
      mark2.enrollments.push(eid);
    }
  }

  save();
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(mark2)); } catch { /* 隐私模式下忽略 */ }
  return true;
}

// ===== 页面渲染（保留原有导出函数名与参数） =====
export function renderActivities(state = {}) {
  ensureStyles();
  ensureDemoActivities();

  const query = String(state.filter || '').trim().toLowerCase();
  const status = currentStatus();
  const now = new Date();

  let list = db.records.filter(r => r.kind === 'activity' && visible(r));

  // 搜索：名称、介绍、地点、类别、主办机构
  if (query) {
    list = list.filter(r => [r.title, r.body, r.content, r.activity_location, r.activity_category, uname(r.user)]
      .filter(Boolean).join(' ').toLowerCase().includes(query));
  }

  // 状态筛选
  if (status !== 'all') {
    list = list.filter(r => getActivityState(r, now).kind === status);
  }

  // 排序：未结束的按时间正序在前，已结束的按时间倒序在后
  const time = r => new Date(r.activity_time || 0).getTime() || 0;
  const isPast = r => getActivityState(r, now).kind === 'past';
  list.sort((a, b) => (isPast(a) - isPast(b)) || (isPast(a) ? time(b) - time(a) : time(a) - time(b)));

  // 分页：沿用 main.js 的 data-action="page"
  const total = list.length;
  const pages = Math.ceil(total / PAGE_SIZE) || 1;
  const page = Math.max(1, Math.min(Number(state.page) || 1, pages));
  state.page = page;
  const slice = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  let html = head('活动中心', '发现身边的民间文化活动，查看活动安排、报名截止时间与名额并完成报名。');
  html += `<section class="activity-intro">
    <div>
      <span class="eyebrow">MINCANG / ACTIVITIES</span>
      <h2>让民间记忆在线下相遇</h2>
      <p>列表中的活动时间、报名截止时间与详情页完全一致；报名截止或名额已满后将不再显示可报名。</p>
    </div>
    <div class="activity-intro-actions">
      ${link('我的报名记录', 'profile/events', 'btn')}
      ${link('我的证书', 'profile/events', 'btn')}
    </div>
  </section>`;

  html += `<div class="toolbar activity-toolbar">
    <input id="filter" aria-label="搜索活动" placeholder="搜索活动名称、介绍、地点、类别或主办机构" value="${esc(state.filter || '')}">
    <button class="btn" data-action="search">搜索</button>
    <button class="btn" data-action="clear-filters">重置筛选</button>
  </div>`;

  html += `<nav class="activity-status-filter" aria-label="活动状态筛选">
    ${STATUS_TABS.map(([key, label]) => {
      const to = key === 'all' ? 'activities' : 'activities/' + key;
      const active = key === status;
      return `<a class="activity-status-chip${active ? ' is-active' : ''}" href="#${to}" ${active ? 'aria-current="page"' : ''}>${label}</a>`;
    }).join('')}
  </nav>`;

  html += slice.length
    ? `<div class="activity-list">${slice.map(activityCard).join('')}</div>`
    : empty('暂无符合条件的活动', '可以更换关键词，或点击上方“全部活动”查看所有活动。');

  if (total) {
    html += `<div class="pager">
      ${button('上一页', 'page', page - 1, page === 1 ? 'disabled' : '')}
      <span>${page} / ${pages} · 共 ${total} 条</span>
      ${button('下一页', 'page', page + 1, page >= pages ? 'disabled' : '')}
    </div>`;
  }

  return html;
}
