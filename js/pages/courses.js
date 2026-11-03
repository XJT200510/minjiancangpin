import { db, names, uname, visible, rating, options } from '../data.js';
import { $, esc, button, link, empty, head, imageFor } from '../utils.js';

export function renderCourses(state = {}) {
    const filter = String(state.filter || '').trim();
    const categoryFilter = String(state.categoryFilter || '');
    const sort = String(state.sort || 'default');
    const page = Math.max(1, Number(state.page) || 1);

    let list = db.records.filter(r => r.kind === 'course' && visible(r));

    const categories = [
        ...new Set([
            ...(options.course_category_id || []),
            ...list.map(r => r.course_category_id).filter(Boolean)
        ])
    ];

    let filtered = list.filter(r =>
        (r.title + r.body + (r.tags || '')).includes(filter) &&
        (!categoryFilter || r.course_category_id === categoryFilter)
    );

    if (sort === 'latest') {
        filtered.sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
    }

    const pageSize = 6;
    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    const currentPage = Math.min(page, totalPages);
    const paginatedList = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    let html = head('课程中心', '以视频课程为主，发现值得记录的知识', '');

    html += `<div class="toolbar">
    <input id="filter" aria-label="搜索课程" placeholder="搜索课程名称、简介或标签" value="${esc(filter)}">
    <label class="catalog-filter">课程分类
      <select id="category-filter" aria-label="分类"><option value="">全部分类</option>${categories.map(v => `<option value="${esc(v)}" ${categoryFilter === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}
      </select>
    </label>
    <label class="catalog-filter">排序
      <select id="sort-filter" aria-label="排序">
        <option value="default" ${sort === 'default' ? 'selected' : ''}>默认排序</option><option value="latest" ${sort === 'latest' ? 'selected' : ''}>最新发布</option>
      </select>
    </label>
    <button class="btn" data-action="search">搜索</button>
    <button class="btn" data-action="clear-filters">重置筛选</button>
  </div>`;

    if (paginatedList.length > 0) {
        html += `<div class="catalog">${paginatedList.map(r => {
            const isFav = db.favorites?.some(f => f.user === db.current && f.record === r.id);
            const firstLesson = (r.lessons || [])[0];
            const realVideoUrl = firstLesson ? firstLesson.video_url : '';

            return `
      <article class="tile course-tile">
        <div class="tile-cover">
          ${realVideoUrl
                    ? 
                `<video src="${esc(realVideoUrl)}" controls preload="metadata" class="card-video"></video>`
                    : 
                    `<a href="#detail/${r.id}" tabindex="-1"><img src="${esc(imageFor(r))}" alt="${esc(r.title)}"></a>`
                }
        </div>
        <div class="tile-body">
          <span class="meta">${names[r.kind]} · ${esc(uname(r.user))}</span><h3><a href="#detail/${r.id}">${esc(r.title)}</a></h3><p class="clip">${esc(r.body)}</p><div class="tag-list">
            <span class="category-tag">${esc(r.course_category_id || '文化记忆')}</span><span class="video-status ${realVideoUrl ? 'has-video' : 'no-video'}">${realVideoUrl ? '▶ 包含视频' : '暂无视频'}</span>
          </div>
          <div class="course-rating"><span class="rating-label">课程评分：</span>${rating(r.id)}</div>
          <div class="actions">${button(isFav ? '已收藏' : '☆ 收藏', 'favorite', r.id)}${button('写评论', 'comment', r.id)}${link('查看详情 →', 'detail/' + r.id, 'btn small')}
          </div>
        </div>
      </article>`;}).join('')}</div>`;} else {html += empty('没有找到相关课程', '试试其他关键词，或清除筛选条件。');
    }

    html += `<div class="pager">${button('上一页', 'page', currentPage - 1, currentPage === 1 ? 'disabled' : '')}
    <span>${currentPage} / ${totalPages} · 共 ${filtered.length} 条</span>${button('下一页', 'page', currentPage + 1, currentPage * pageSize >= filtered.length ? 'disabled' : '')}</div>`;
    return html;
}
