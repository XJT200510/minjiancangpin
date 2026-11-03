import { db, names, user, allowedKind } from '../data.js';
import { $, esc, button, link, empty, badge, head, table, enrollmentTable, certificateTable } from '../utils.js';

export function renderStudio() {
    if (!user()) return empty('请先选择体验账号') + button('选择账号', 'account');

    const u = user();
    const hasCoursePerm = allowedKind('course');
    const own = db.records.filter(r => r.user === u.id && ['course', 'activity'].includes(r.kind) && r.status !== '已删除');
    const myCourses = own.filter(r => r.kind === 'course');
    const myActivities = own.filter(r => r.kind === 'activity');
    let courseTable = '';
    if (!hasCoursePerm) {
        courseTable = `<div class="panel" style="padding: 20px; text-align: center; background: #fffbeb; border: 1px solid #fde68a;">
      <p style="color: #d97706; margin-bottom: 12px;">当前账号尚未取得课程发布资格，无法发布或管理课程。</p>
      ${link('前往申请课程发布资格', 'profile/identity', 'btn primary')}
    </div>`;
    } else if (myCourses.length === 0) {
        courseTable = empty('还没有发布过课程', '点击右上角的“发布课程”开启您的第一节视频课。');
    } else {
        courseTable = table(['课程名称', '状态', '视频情况', '退回原因', '操作'],
            myCourses.map(r => {
                const hasVideo = (r.lessons || []).some(l => l.video_url);
                const videoStatus = hasVideo
                    ? '<span class="badge-status good">包含视频</span>'
                    : '<span class="badge-status">无视频(占位)</span>';
                const isRejected = r.status === '已退回' || r.status === '审核未通过';
                const rejectReason = isRejected ? `<span style="color: #dc2626;">${esc(r.reason || r.audit_reason || '未填写原因')}</span>` : '—';
                let ops = link('编辑', 'edit/course/' + r.id, 'btn small');
                if (r.status === '已发布') {
                    ops += link('查看', 'detail/' + r.id, 'btn small');
                } else if (r.status === '草稿' || isRejected) {
                    ops += link('继续编辑', 'edit/course/' + r.id, 'btn small primary');
                }

                return [
                    `<strong>${esc(r.title)}</strong>`,
                    badge(r.status),
                    videoStatus,
                    rejectReason,
                    ops
                ];
            })
        );
    }

    let activityTable = '';
    if (myActivities.length > 0) {
        activityTable = table(['活动名称', '状态', '操作'],
            myActivities.map(r => [
                esc(r.title),
                badge(r.status),
                link('编辑', 'edit/activity/' + r.id, 'btn small') + link('查看', 'detail/' + r.id, 'btn small')
            ])
        );
    } else {
        activityTable = empty('暂无发布的活动');
    }

    const actionButtons = (hasCoursePerm ? link('＋ 发布课程', 'edit/course') : '') +
        (allowedKind('activity') ? link('＋ 发布活动', 'edit/activity') : '');

    return head('机构与课程管理', '机构资格与课程发布资格独立管理。', actionButtons) +
        `<p class="note">当前身份：${esc(u.roles.join('、') || '普通用户')}。${!hasCoursePerm ? '<span style="color:#dc2626;">尚无课程发布资格，可前往个人中心申请。</span>' : ''}</p>` +

        `<div class="panel" style="margin-bottom: 24px;">
       <h2>我的课程</h2>
       <p class="note">本平台以视频课程为准，无真实视频的课时在详情页会显示占位提示。</p>
       ${courseTable}
     </div>

     <div class="panel" style="margin-bottom: 24px;">
       <h2>我的活动</h2>
       ${activityTable}
     </div>

     <h2>活动报名审核</h2>` +
        enrollmentTable(false) +
        `<h2>活动证书</h2>` +
        certificateTable(false);
}
