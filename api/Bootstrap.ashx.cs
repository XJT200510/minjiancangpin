using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Web;
using System.Web.Script.Serialization;

namespace MinCang.Api
{
    public class Bootstrap : IHttpHandler
    {
        private static string Str(SqlDataReader r, string column)
        {
            return r[column] == DBNull.Value ? "" : Convert.ToString(r[column]);
        }

        private static string Dt(SqlDataReader r, string column)
        {
            return r[column] == DBNull.Value ? "" : Convert.ToDateTime(r[column]).ToString("yyyy-MM-ddTHH:mm:ss");
        }

        private static int Int(SqlDataReader r, string column)
        {
            return r[column] == DBNull.Value ? 0 : Convert.ToInt32(r[column]);
        }

        private static string CollectionStatus(int status)
        {
            switch (status)
            {
                case 1: return "已发布";
                case 3: return "草稿";
                case 4: return "已下架";
                case 2: return "已驳回";
                default: return "待审核";
            }
        }

        private static string PostStatus(int status)
        {
            switch (status)
            {
                case 2: return "已发布";
                case 3: return "已隐藏";
                case 4: return "已删除";
                default: return "草稿";
            }
        }

        private static string QuestionStatus(int status)
        {
            switch (status)
            {
                case 1: return "已发布";
                case 2: return "已关闭";
                case 3:
                case 4: return "已删除";
                default: return "草稿";
            }
        }

        private static string CourseStatus(int auditStatus, bool publishStatus)
        {
            if (auditStatus == 1 && publishStatus) return "已发布";
            if (auditStatus == 0) return "待审核";
            if (auditStatus == 2) return "已驳回";
            return "草稿";
        }

        private static string ActivityStatus(int status)
        {
            switch (status)
            {
                case 2: return "已发布";
                case 1: return "待审核";
                case 3: return "已驳回";
                default: return "草稿";
            }
        }

        private static string ActivityTitle(string content)
        {
            if (string.IsNullOrWhiteSpace(content)) return "文化活动";
            var start = content.IndexOf('【');
            var end = start >= 0 ? content.IndexOf('】', start + 1) : -1;
            if (start >= 0 && end > start)
                return content.Substring(start + 1, end - start - 1).Trim();

            var first = content.Split(new[] { '。', '；', '\n' }, 2)[0].Trim();
            return first.Length > 30 ? first.Substring(0, 30) + "…" : first;
        }

        public void ProcessRequest(HttpContext context)
        {
            context.Response.ContentType = "application/json; charset=utf-8";
            context.Response.ContentEncoding = System.Text.Encoding.UTF8;

            try
            {
                var users = new List<Dictionary<string, object>>();
                var roles = new Dictionary<int, List<string>>();
                var records = new List<Dictionary<string, object>>();
                var carousel = new List<Dictionary<string, object>>();
                var comments = new List<Dictionary<string, object>>();
                var answers = new List<Dictionary<string, object>>();
                var replies = new List<Dictionary<string, object>>();
                var likes = new List<Dictionary<string, object>>();
                var favorites = new List<Dictionary<string, object>>();
                var folders = new List<Dictionary<string, object>>();
                var ratings = new List<Dictionary<string, object>>();

                using (var connection = Db.Open())
                {
                    // 用户
                    using (var command = new SqlCommand(@"
                        SELECT user_id, user_name, real_name, avatar_url, status
                        FROM dbo.users_table", connection))
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            var id = Int(reader, "user_id");
                            roles[id] = new List<string>();
                            users.Add(new Dictionary<string, object>
                            {
                                { "id", id },
                                { "name", Str(reader, "user_name") },
                                { "real_name", Str(reader, "real_name") },
                                { "avatar_url", Str(reader, "avatar_url") },
                                { "intro", "" },
                                { "status", Int(reader, "status") == 1 ? "正常" : "已封禁" },
                                { "roles", roles[id] }
                            });
                        }
                    }

                    // 管理员角色
                    using (var command = new SqlCommand(@"
                        SELECT a.user_id, r.role_name
                        FROM dbo.admins_table a
                        INNER JOIN dbo.admin_roles_table ar ON ar.admin_id = a.admin_id
                        INNER JOIN dbo.roles_table r ON r.role_id = ar.role_id
                        WHERE a.status = 1 AND r.status = 1", connection))
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            var id = Int(reader, "user_id");
                            if (!roles.ContainsKey(id)) roles[id] = new List<string>();
                            var role = Str(reader, "role_name");
                            if (!roles[id].Contains(role)) roles[id].Add(role);
                        }
                    }

                    // 专家 / 课程发布人 / 机构
                    AddRoles(connection, roles, "SELECT user_id FROM dbo.expert_table WHERE certification_status = 0", "专家");
                    AddRoles(connection, roles, "SELECT user_id FROM dbo.publisher_table WHERE status = 0", "课程发布人");
                    AddRoles(connection, roles, "SELECT user_id FROM dbo.organizations_table WHERE certification_status = 1", "机构");

                    // 藏品
                    using (var command = new SqlCommand(@"
                        SELECT c.collection_id, c.user_id, c.collection_name, c.description,
                               c.cover_image, c.material, c.size_information, c.source,
                               c.status, c.created_time, c.updated_time,
                               cat.category_name, era.era_name
                        FROM dbo.collections_table c
                        LEFT JOIN dbo.collection_categories_table cat ON cat.category_id = c.category_id
                        LEFT JOIN dbo.collection_eras_table era ON era.era_id = c.era_id", connection))
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            records.Add(new Dictionary<string, object>
                            {
                                { "id", 100000 + Int(reader, "collection_id") },
                                { "kind", "collection" },
                                { "user", Int(reader, "user_id") },
                                { "title", Str(reader, "collection_name") },
                                { "body", Str(reader, "description") },
                                { "img", "vase" },
                                { "status", CollectionStatus(Int(reader, "status")) },
                                { "created", Dt(reader, "created_time") },
                                { "updated", Dt(reader, "updated_time") },
                                { "collection_name", Str(reader, "collection_name") },
                                { "category_id", Str(reader, "category_name") },
                                { "era_id", Str(reader, "era_name") },
                                { "material", Str(reader, "material") },
                                { "size_information", Str(reader, "size_information") },
                                { "source", Str(reader, "source") },
                                { "description", Str(reader, "description") },
                                { "cover_image", Str(reader, "cover_image") },
                                { "image_urls", "" }
                            });
                        }
                    }

                    // 帖子
                    using (var command = new SqlCommand(@"
                        SELECT p.post_id, p.author_id, p.post_title, p.content, p.cover_url,
                               p.post_status, p.visibility, p.created_time, p.updated_time,
                               STUFF((SELECT ',' + t.topic_name
                                      FROM dbo.post_topics_table pt
                                      INNER JOIN dbo.topics_table t ON t.topic_id = pt.topic_id
                                      WHERE pt.post_id = p.post_id
                                      FOR XML PATH('')), 1, 1, '') AS topic_names
                        FROM dbo.posts_table p", connection))
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            records.Add(new Dictionary<string, object>
                            {
                                { "id", 200000 + Int(reader, "post_id") },
                                { "kind", "post" },
                                { "user", Int(reader, "author_id") },
                                { "title", Str(reader, "post_title") },
                                { "body", Str(reader, "content") },
                                { "img", "letters" },
                                { "status", PostStatus(Int(reader, "post_status")) },
                                { "visibility", Int(reader, "visibility") == 0 ? "公开" : "仅自己可见" },
                                { "created", Dt(reader, "created_time") },
                                { "updated", Dt(reader, "updated_time") },
                                { "post_title", Str(reader, "post_title") },
                                { "content", Str(reader, "content") },
                                { "topics", Str(reader, "topic_names") },
                                { "cover_url", Str(reader, "cover_url") }
                            });
                        }
                    }

                    // 问题
                    using (var command = new SqlCommand(@"
                        SELECT q.question_id, q.user_id, q.question_title, q.content,
                               q.question_status, q.is_resolved, q.created_time, q.updated_time,
                               STUFF((SELECT ',' + t.topic_name
                                      FROM dbo.question_topics_table qt
                                      INNER JOIN dbo.topics_table t ON t.topic_id = qt.topic_id
                                      WHERE qt.question_id = q.question_id
                                      FOR XML PATH('')), 1, 1, '') AS topic_names
                        FROM dbo.questions_table q", connection))
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            records.Add(new Dictionary<string, object>
                            {
                                { "id", 300000 + Int(reader, "question_id") },
                                { "kind", "question" },
                                { "user", Int(reader, "user_id") },
                                { "title", Str(reader, "question_title") },
                                { "body", Str(reader, "content") },
                                { "img", "tickets" },
                                { "status", QuestionStatus(Int(reader, "question_status")) },
                                { "created", Dt(reader, "created_time") },
                                { "updated", Dt(reader, "updated_time") },
                                { "question_title", Str(reader, "question_title") },
                                { "content", Str(reader, "content") },
                                { "topics", Str(reader, "topic_names") },
                                { "resolved", Int(reader, "is_resolved") == 1 }
                            });
                        }
                    }

                    // 课程 + 课时
                    var lessons = new Dictionary<int, List<Dictionary<string, object>>>();
                    using (var command = new SqlCommand(@"
                        SELECT lesson_id, course_id, lesson_title, lesson_order,
                               content, video_url, duration, material_reference
                        FROM dbo.course_lessons_table
                        ORDER BY course_id, lesson_order", connection))
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            var courseId = Int(reader, "course_id");
                            if (!lessons.ContainsKey(courseId)) lessons[courseId] = new List<Dictionary<string, object>>();
                            lessons[courseId].Add(new Dictionary<string, object>
                            {
                                { "id", Int(reader, "lesson_id") },
                                { "lesson_title", Str(reader, "lesson_title") },
                                { "lesson_order", Int(reader, "lesson_order") },
                                { "content", Str(reader, "content") },
                                { "video_url", Str(reader, "video_url") },
                                { "duration", Int(reader, "duration") },
                                { "material_reference", Str(reader, "material_reference") }
                            });
                        }
                    }

                    using (var command = new SqlCommand(@"
                        SELECT c.course_id, c.publisher_id, c.course_title, c.introduction,
                               c.cover_url, c.audit_status, c.publish_status,
                               c.created_time, c.updated_time, cat.category_name
                        FROM dbo.courses_table c
                        LEFT JOIN dbo.course_categories_table cat ON cat.course_category_id = c.course_category_id", connection))
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            var courseId = Int(reader, "course_id");
                            records.Add(new Dictionary<string, object>
                            {
                                { "id", 400000 + courseId },
                                { "kind", "course" },
                                { "user", Int(reader, "publisher_id") },
                                { "title", Str(reader, "course_title") },
                                { "body", Str(reader, "introduction") },
                                { "img", "vase" },
                                { "status", CourseStatus(Int(reader, "audit_status"), Convert.ToBoolean(reader["publish_status"])) },
                                { "created", Dt(reader, "created_time") },
                                { "updated", Dt(reader, "updated_time") },
                                { "course_title", Str(reader, "course_title") },
                                { "introduction", Str(reader, "introduction") },
                                { "course_category_id", Str(reader, "category_name") },
                                { "cover_url", Str(reader, "cover_url") },
                                { "lessons", lessons.ContainsKey(courseId) ? lessons[courseId] : new List<Dictionary<string, object>>() }
                            });
                        }
                    }

                    // 活动
                    using (var command = new SqlCommand(@"
                        SELECT activity_id, organizer_id, content, activity_time,
                               activity_location, activity_category, registration_deadline,
                               max_participants, status, activity_status, cover_url,
                               created_time, updated_time
                        FROM dbo.activities_table", connection))
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            records.Add(new Dictionary<string, object>
                            {
                                { "id", 500000 + Int(reader, "activity_id") },
                                { "kind", "activity" },
                                { "user", Int(reader, "organizer_id") },
                                { "title", ActivityTitle(Str(reader, "content")) },
                                { "body", Str(reader, "content") },
                                { "img", "basket" },
                                { "status", ActivityStatus(Int(reader, "status")) },
                                { "created", Dt(reader, "created_time") },
                                { "updated", Dt(reader, "updated_time") },
                                { "content", Str(reader, "content") },
                                { "activity_time", Dt(reader, "activity_time") },
                                { "activity_location", Str(reader, "activity_location") },
                                { "activity_category", Str(reader, "activity_category") },
                                { "registration_deadline", Dt(reader, "registration_deadline") },
                                { "max_participants", Int(reader, "max_participants") },
                                { "cover_url", Str(reader, "cover_url") }
                            });
                        }
                    }

                    // 专题展览
                    var topicCollections = new Dictionary<int, List<int>>();
                    using (var command = new SqlCommand(@"
                        SELECT topic_id, collection_id
                        FROM dbo.special_topic_collections_table
                        ORDER BY topic_id, display_order", connection))
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            var topicId = Int(reader, "topic_id");
                            if (!topicCollections.ContainsKey(topicId)) topicCollections[topicId] = new List<int>();
                            topicCollections[topicId].Add(Int(reader, "collection_id"));
                        }
                    }

                    using (var command = new SqlCommand(@"
                        SELECT topic_id, topic_name, introduction, cover_url,
                               publisher_id, publish_status, created_time, updated_time
                        FROM dbo.special_topics_table", connection))
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            var topicId = Int(reader, "topic_id");
                            var ids = topicCollections.ContainsKey(topicId)
                                ? string.Join(",", topicCollections[topicId].ConvertAll(x => (100000 + x).ToString()))
                                : "";
                            records.Add(new Dictionary<string, object>
                            {
                                { "id", 600000 + topicId },
                                { "kind", "exhibition" },
                                { "user", Int(reader, "publisher_id") },
                                { "title", Str(reader, "topic_name") },
                                { "body", Str(reader, "introduction") },
                                { "img", "wood" },
                                { "status", Int(reader, "publish_status") == 1 ? "已发布" : "草稿" },
                                { "created", Dt(reader, "created_time") },
                                { "updated", Dt(reader, "updated_time") },
                                { "topic_name", Str(reader, "topic_name") },
                                { "introduction", Str(reader, "introduction") },
                                { "cover_url", Str(reader, "cover_url") },
                                { "collection_ids", ids }
                            });
                        }
                    }

                    // 公告
                    using (var command = new SqlCommand(@"
                        SELECT announcement_id, announcement_title, announcement_content,
                               publish_status, start_time, end_time, created_time
                        FROM dbo.announcements_table", connection))
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            records.Add(new Dictionary<string, object>
                            {
                                { "id", 700000 + Int(reader, "announcement_id") },
                                { "kind", "announcement" },
                                { "user", 0 },
                                { "title", Str(reader, "announcement_title") },
                                { "body", Str(reader, "announcement_content") },
                                { "img", "letters" },
                                { "status", Int(reader, "publish_status") == 1 ? "已发布" : "草稿" },
                                { "created", Dt(reader, "created_time") },
                                { "updated", Dt(reader, "created_time") },
                                { "announcement_title", Str(reader, "announcement_title") },
                                { "announcement_content", Str(reader, "announcement_content") }
                            });
                        }
                    }

                    // 话题
                    using (var command = new SqlCommand(@"
                        SELECT topic_id, topic_name, topic_description, cover_url,
                               creator_id, topic_status, created_time
                        FROM dbo.topics_table", connection))
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            records.Add(new Dictionary<string, object>
                            {
                                { "id", 800000 + Int(reader, "topic_id") },
                                { "kind", "topic" },
                                { "user", Int(reader, "creator_id") },
                                { "title", Str(reader, "topic_name") },
                                { "body", Str(reader, "topic_description") },
                                { "img", "letters" },
                                { "status", Convert.ToBoolean(reader["topic_status"]) ? "已发布" : "草稿" },
                                { "created", Dt(reader, "created_time") },
                                { "updated", Dt(reader, "created_time") },
                                { "topic_name", Str(reader, "topic_name") },
                                { "topic_description", Str(reader, "topic_description") },
                                { "cover_url", Str(reader, "cover_url") }
                            });
                        }
                    }

                    // 评论
                    using (var command = new SqlCommand(@"
                        SELECT comment_id, user_id, target_type, target_id, content, status, comment_time
                        FROM dbo.comments_table
                        WHERE status = 0", connection))
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            var targetType = Int(reader, "target_type");
                            var prefix = targetType == 0 ? 100000 : targetType == 1 ? 200000 : targetType == 2 ? 300000 : 400000;
                            comments.Add(new Dictionary<string, object>
                            {
                                { "id", Int(reader, "comment_id") },
                                { "record", prefix + Int(reader, "target_id") },
                                { "user", Int(reader, "user_id") },
                                { "content", Str(reader, "content") },
                                { "time", Dt(reader, "comment_time") }
                            });
                        }
                    }

                    // 回答
                    using (var command = new SqlCommand(@"
                        SELECT answer_id, question_id, user_id, content, publish_time, status, is_accepted
                        FROM dbo.answers_table", connection))
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            answers.Add(new Dictionary<string, object>
                            {
                                { "id", Int(reader, "answer_id") },
                                { "record", 300000 + Int(reader, "question_id") },
                                { "user", Int(reader, "user_id") },
                                { "content", Str(reader, "content") },
                                { "time", Dt(reader, "publish_time") },
                                { "accepted", Int(reader, "is_accepted") == 1 }
                            });
                        }
                    }

                    // 回复（评论下的回复）
                    using (var command = new SqlCommand(@"
                        SELECT reply_id, user_id, content, comment_id, reply_to_user_id, reply_time
                        FROM dbo.reply_table
                        WHERE status = 0", connection))
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            var toUserId = reader["reply_to_user_id"] == DBNull.Value
                                ? 0
                                : Convert.ToInt32(reader["reply_to_user_id"]);
                            replies.Add(new Dictionary<string, object>
                            {
                                { "id", Int(reader, "reply_id") },
                                { "comment", Int(reader, "comment_id") },
                                { "user", Int(reader, "user_id") },
                                { "to", toUserId },
                                { "content", Str(reader, "content") },
                                { "time", Dt(reader, "reply_time") }
                            });
                        }
                    }

                    // 点赞：target_type 与评论共用一套约定，0 藏品 / 1 帖子 / 2 问题
                    using (var command = new SqlCommand(@"
                        SELECT user_id, target_type, target_id, likes_time
                        FROM dbo.likes_table
                        WHERE status = 1", connection))
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            var targetType = Int(reader, "target_type");
                            var prefix = targetType == 0 ? 100000 : targetType == 1 ? 200000 : targetType == 2 ? 300000 : 400000;
                            likes.Add(new Dictionary<string, object>
                            {
                                { "user", Int(reader, "user_id") },
                                { "record", prefix + Int(reader, "target_id") },
                                { "time", Dt(reader, "likes_time") }
                            });
                        }
                    }

                    // 收藏
                    using (var command = new SqlCommand(@"
                        SELECT target_type, target_id, favorite_folder_id, favorites_time, user_id
                        FROM dbo.favorites_table
                        WHERE status = 1", connection))
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            var targetType = Int(reader, "target_type");
                            var prefix = targetType == 0 ? 100000 : targetType == 1 ? 200000 : targetType == 2 ? 300000 : 400000;
                            favorites.Add(new Dictionary<string, object>
                            {
                                { "record", prefix + Int(reader, "target_id") },
                                { "user", Int(reader, "user_id") },
                                { "folder", Int(reader, "favorite_folder_id") },
                                { "time", Dt(reader, "favorites_time") }
                            });
                        }
                    }

                    // 收藏夹
                    using (var command = new SqlCommand(@"
                        SELECT favorite_folder_id, user_id, folder_name, is_default
                        FROM dbo.favorites_folder_table", connection))
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            folders.Add(new Dictionary<string, object>
                            {
                                { "id", Int(reader, "favorite_folder_id") },
                                { "user", Int(reader, "user_id") },
                                { "name", Str(reader, "folder_name") },
                                { "default", Int(reader, "is_default") == 1 }
                            });
                        }
                    }

                    // 评分
                    using (var command = new SqlCommand(@"
                        SELECT rating_id, course_id, user_id, score, content, status, rating_time
                        FROM dbo.ratings_table
                        WHERE status = 0", connection))
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            ratings.Add(new Dictionary<string, object>
                            {
                                { "id", Int(reader, "rating_id") },
                                { "record", 400000 + Int(reader, "course_id") },
                                { "user", Int(reader, "user_id") },
                                { "score", Convert.ToDouble(reader["score"]) },
                                { "content", Str(reader, "content") },
                                { "time", Dt(reader, "rating_time") }
                            });
                        }
                    }
                    // 首页轮播（独立假数据，不影响藏品/课程/活动本身）
                    using (var command = new SqlCommand(@"
                        SELECT carousel_id, title, subtitle, image_url, target_type, target_id
                        FROM dbo.carousel_table
                        WHERE status = 1
                        ORDER BY sort_order, carousel_id", connection))
                    using (var reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            var targetType = Str(reader, "target_type");
                            var prefix = targetType == "collection" ? 100000
                                : targetType == "post" ? 200000
                                : targetType == "question" ? 300000
                                : targetType == "course" ? 400000
                                : targetType == "activity" ? 500000
                                : targetType == "exhibition" ? 600000
                                : targetType == "announcement" ? 700000
                                : targetType == "topic" ? 800000 : 0;
                            carousel.Add(new Dictionary<string, object>
                            {
                                { "id", Int(reader, "carousel_id") },
                                { "title", Str(reader, "title") },
                                { "subtitle", Str(reader, "subtitle") },
                                { "image", Str(reader, "image_url") },
                                { "targetType", targetType },
                                { "targetId", prefix + Int(reader, "target_id") }
                            });
                        }
                    }
                }
                var appraisals = new List<Dictionary<string, object>>();
                var appraisalTasks = new Dictionary<int, List<Dictionary<string, object>>>();

                using (var connection = Db.Open())
                {
                using (var command = new SqlCommand(@"
                    SELECT appraisal_id, application_id, expert_id, judgement,
                           appraisal_opinion, appraisal_time, opinion_review_status
                    FROM dbo.expert_appraisals_table
                    ORDER BY application_id, appraisal_id", connection))
                using (var reader = command.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        var applicationId = Int(reader, "application_id");
                        if (!appraisalTasks.ContainsKey(applicationId))
                            appraisalTasks[applicationId] = new List<Dictionary<string, object>>();

                        var judgement = Int(reader, "judgement");
                        var reviewStatus = Int(reader, "opinion_review_status");
                        appraisalTasks[applicationId].Add(new Dictionary<string, object>
                        {
                            { "id", Int(reader, "appraisal_id") },
                            { "expert", Int(reader, "expert_id") },
                            { "judgement", judgement == 0 ? "存疑" : judgement == 1 ? "真品" : judgement == 2 ? "赝品" : judgement == 3 ? "需进一步鉴定" : "" },
                            { "opinion", Str(reader, "appraisal_opinion") },
                            { "time", Dt(reader, "appraisal_time") },
                            { "valid", reviewStatus == 1 ? "有效" : reviewStatus == 2 ? "无效" : (Str(reader, "appraisal_opinion") == "" ? "" : "待审核") }
                        });
                    }
                }

                using (var command = new SqlCommand(@"
                    SELECT a.application_id, a.collection_id, a.applicant_id,
                           a.application_status, a.opinion_deadline, c.collection_name
                    FROM dbo.appraisal_applications_table a
                    INNER JOIN dbo.collections_table c ON c.collection_id = a.collection_id
                    ORDER BY a.application_id", connection))
                using (var reader = command.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        var applicationId = Int(reader, "application_id");
                        var status = Int(reader, "application_status");
                        appraisals.Add(new Dictionary<string, object>
                        {
                            { "id", applicationId },
                            { "record", 100000 + Int(reader, "collection_id") },
                            { "user", Int(reader, "applicant_id") },
                            { "status", status == 0 ? "待分配" : status == 1 ? "鉴定中" : status == 2 ? "待审核" : status == 3 ? "已完成" : "已取消" },
                            { "deadline", Dt(reader, "opinion_deadline") },
                            { "tasks", appraisalTasks.ContainsKey(applicationId) ? appraisalTasks[applicationId] : new List<Dictionary<string, object>>() },
                            { "supplements", new List<Dictionary<string, object>>() }
                        });
                    }
                }
                }

                var serializer = new JavaScriptSerializer { MaxJsonLength = int.MaxValue };
                context.Response.Write(serializer.Serialize(new
                {
                    ok = true,
                    current = 0,
                    users,
                    records,
                    comments,
                    answers,
                    replies,
                    likes,
                    favorites,
                    folders,
                    ratings,
                    carousel,
                    appraisals
                }));
            }
            catch (Exception ex)
            {
                context.Response.StatusCode = 500;
                context.Response.Write(new JavaScriptSerializer().Serialize(new
                {
                    ok = false,
                    message = ex.Message
                }));
            }
        }

        private static void AddRoles(SqlConnection connection, Dictionary<int, List<string>> roles, string sql, string roleName)
        {
            using (var command = new SqlCommand(sql, connection))
            using (var reader = command.ExecuteReader())
            {
                while (reader.Read())
                {
                    var id = Convert.ToInt32(reader[0]);
                    if (!roles.ContainsKey(id)) roles[id] = new List<string>();
                    if (!roles[id].Contains(roleName)) roles[id].Add(roleName);
                }
            }
        }

        public bool IsReusable
        {
            get { return false; }
        }
    }
}
