using System;
using System.Data;
using System.Data.SqlClient;
using System.Web;
using System.Web.Script.Serialization;

namespace MinCang.Api
{
    /// <summary>
    /// 论坛交流模块的写库接口：帖子、问题、话题、回答、评论、回复、点赞、收藏。
    ///
    /// 前端统一以 POST 方式调用，用 op 参数区分操作；全部使用参数化 SQL，不做字符串拼接。
    /// 各项状态码与 Bootstrap.ashx 的读取映射保持一致，避免"写进去读不出来"：
    ///   posts_table.post_status        1 草稿 / 2 已发布 / 3 已隐藏 / 4 已删除
    ///   questions_table.question_status 0 草稿 / 1 已发布 / 2 已关闭 / 3 已删除
    ///   comments_table / reply_table.status  0 正常 / 1 已删除
    ///   likes_table / favorites_table.status 1 有效 / 0 取消
    ///   target_type                    0 藏品 / 1 帖子 / 2 问题
    /// </summary>
    public class Forum : IHttpHandler
    {
        private const byte TypeCollection = 0;
        private const byte TypePost = 1;
        private const byte TypeQuestion = 2;

        private const byte PostDraft = 1;
        private const byte PostPublished = 2;
        private const byte PostDeleted = 4;

        private const byte QuestionDraft = 0;
        private const byte QuestionPublished = 1;
        private const byte QuestionDeleted = 3;

        public void ProcessRequest(HttpContext context)
        {
            context.Response.ContentType = "application/json; charset=utf-8";

            HttpRequest request = context.Request;
            string op = Str(request, "op");

            if (op.Length == 0)
            {
                WriteError(context, 400, "缺少 op 参数");
                return;
            }

            try
            {
                using (var connection = Db.Open())
                {
                    object data = Handle(connection, op, request);
                    context.Response.Write(Json(new { ok = true, data = data }));
                }
            }
            catch (ArgumentException ex)
            {
                WriteError(context, 400, ex.Message);
            }
            catch (SqlException ex)
            {
                WriteError(context, 400, "数据库操作失败：" + ex.Message);
            }
            catch (Exception ex)
            {
                WriteError(context, 500, ex.Message);
            }
        }

        private static object Handle(SqlConnection connection, string op, HttpRequest request)
        {
            switch (op)
            {
                case "save_post": return SavePost(connection, request);
                case "delete_post": return DeletePost(connection, request);
                case "save_question": return SaveQuestion(connection, request);
                case "delete_question": return DeleteQuestion(connection, request);
                case "save_topic": return SaveTopic(connection, request);
                case "delete_topic": return DeleteTopic(connection, request);
                case "answer": return AddAnswer(connection, request);
                case "accept_answer": return AcceptAnswer(connection, request);
                case "comment": return AddComment(connection, request);
                case "delete_comment": return DeleteComment(connection, request);
                case "reply": return AddReply(connection, request);
                case "delete_reply": return DeleteReply(connection, request);
                case "like": return SetLike(connection, request, true);
                case "unlike": return SetLike(connection, request, false);
                case "favorite": return SetFavorite(connection, request, true);
                case "unfavorite": return SetFavorite(connection, request, false);
                case "folder": return SaveFolder(connection, request);
                default: throw new ArgumentException("未知操作：" + op);
            }
        }

        // ---------------- 帖子 ----------------

        private static object SavePost(SqlConnection connection, HttpRequest request)
        {
            int postId = Int(request, "post_id");
            int authorId = Int(request, "author_id");
            string title = Str(request, "post_title");
            string content = Str(request, "content");
            string cover = Str(request, "cover_url");
            int visibility = Int(request, "visibility") == 1 ? 1 : 0;
            int status = Int(request, "post_status");
            string topics = Str(request, "topics");

            if (authorId <= 0) throw new ArgumentException("缺少作者，请先登录");
            if (title.Length == 0) throw new ArgumentException("帖子标题不能为空");
            if (status != PostDraft && status != PostPublished) status = PostPublished;

            bool publish = status == PostPublished;

            using (var transaction = connection.BeginTransaction())
            {
                if (postId > 0)
                {
                    using (var command = new SqlCommand(@"
                        UPDATE dbo.posts_table
                           SET post_title   = @title,
                               content      = @content,
                               cover_url    = @cover,
                               visibility   = @visibility,
                               post_status  = @status,
                               publish_time = CASE WHEN @publish = 1 AND publish_time IS NULL THEN @now ELSE publish_time END,
                               updated_time = @now
                         WHERE post_id = @id AND author_id = @author", connection, transaction))
                    {
                        command.Parameters.AddWithValue("@title", title);
                        command.Parameters.AddWithValue("@content", content);
                        command.Parameters.AddWithValue("@cover", cover);
                        command.Parameters.AddWithValue("@visibility", visibility);
                        command.Parameters.AddWithValue("@status", status);
                        command.Parameters.AddWithValue("@publish", publish ? 1 : 0);
                        command.Parameters.AddWithValue("@now", DateTime.Now);
                        command.Parameters.AddWithValue("@id", postId);
                        command.Parameters.AddWithValue("@author", authorId);

                        if (command.ExecuteNonQuery() == 0)
                            throw new ArgumentException("没有找到可以编辑的帖子，只能修改本人发布的内容");
                    }
                }
                else
                {
                    using (var command = new SqlCommand(@"
                        INSERT INTO dbo.posts_table
                            (author_id, post_title, content, cover_url, created_time, publish_time, updated_time, post_status, visibility)
                        OUTPUT INSERTED.post_id
                        VALUES (@author, @title, @content, @cover, @now, @publishTime, @now, @status, @visibility)", connection, transaction))
                    {
                        command.Parameters.AddWithValue("@author", authorId);
                        command.Parameters.AddWithValue("@title", title);
                        command.Parameters.AddWithValue("@content", content);
                        command.Parameters.AddWithValue("@cover", cover);
                        command.Parameters.AddWithValue("@now", DateTime.Now);
                        command.Parameters.AddWithValue("@publishTime", publish ? (object)DateTime.Now : DBNull.Value);
                        command.Parameters.AddWithValue("@status", status);
                        command.Parameters.AddWithValue("@visibility", visibility);

                        postId = Convert.ToInt32(command.ExecuteScalar());
                    }
                }

                SyncTopics(connection, transaction, "post", postId, topics, authorId);
                transaction.Commit();
            }

            return new { post_id = postId, post_status = status };
        }

        private static object DeletePost(SqlConnection connection, HttpRequest request)
        {
            int postId = Int(request, "post_id");
            int authorId = Int(request, "author_id");
            if (postId <= 0 || authorId <= 0) throw new ArgumentException("参数不完整");

            using (var command = new SqlCommand(@"
                UPDATE dbo.posts_table
                   SET post_status = @status, updated_time = @now
                 WHERE post_id = @id AND author_id = @author", connection))
            {
                command.Parameters.AddWithValue("@status", PostDeleted);
                command.Parameters.AddWithValue("@now", DateTime.Now);
                command.Parameters.AddWithValue("@id", postId);
                command.Parameters.AddWithValue("@author", authorId);
                if (command.ExecuteNonQuery() == 0)
                    throw new ArgumentException("没有找到可以删除的帖子，只能删除本人发布的内容");
            }

            return new { post_id = postId };
        }

        // ---------------- 问题 ----------------

        private static object SaveQuestion(SqlConnection connection, HttpRequest request)
        {
            int questionId = Int(request, "question_id");
            int userId = Int(request, "user_id");
            string title = Str(request, "question_title");
            string content = Str(request, "content");
            int status = Int(request, "question_status");
            string topics = Str(request, "topics");

            if (userId <= 0) throw new ArgumentException("缺少提问人，请先登录");
            if (title.Length == 0) throw new ArgumentException("问题标题不能为空");
            if (status != QuestionDraft && status != QuestionPublished) status = QuestionPublished;

            bool publish = status == QuestionPublished;

            using (var transaction = connection.BeginTransaction())
            {
                if (questionId > 0)
                {
                    using (var command = new SqlCommand(@"
                        UPDATE dbo.questions_table
                           SET question_title = @title,
                               content        = @content,
                               question_status = @status,
                               publish_time   = CASE WHEN @publish = 1 AND publish_time IS NULL THEN @now ELSE publish_time END,
                               updated_time   = @now
                         WHERE question_id = @id AND user_id = @user", connection, transaction))
                    {
                        command.Parameters.AddWithValue("@title", title);
                        command.Parameters.AddWithValue("@content", content);
                        command.Parameters.AddWithValue("@status", status);
                        command.Parameters.AddWithValue("@publish", publish ? 1 : 0);
                        command.Parameters.AddWithValue("@now", DateTime.Now);
                        command.Parameters.AddWithValue("@id", questionId);
                        command.Parameters.AddWithValue("@user", userId);

                        if (command.ExecuteNonQuery() == 0)
                            throw new ArgumentException("没有找到可以编辑的问题，只能修改本人提出的问题");
                    }
                }
                else
                {
                    using (var command = new SqlCommand(@"
                        INSERT INTO dbo.questions_table
                            (user_id, question_title, content, created_time, publish_time, updated_time, question_status, is_resolved)
                        OUTPUT INSERTED.question_id
                        VALUES (@user, @title, @content, @now, @publishTime, @now, @status, 0)", connection, transaction))
                    {
                        command.Parameters.AddWithValue("@user", userId);
                        command.Parameters.AddWithValue("@title", title);
                        command.Parameters.AddWithValue("@content", content);
                        command.Parameters.AddWithValue("@now", DateTime.Now);
                        command.Parameters.AddWithValue("@publishTime", publish ? (object)DateTime.Now : DBNull.Value);
                        command.Parameters.AddWithValue("@status", status);

                        questionId = Convert.ToInt32(command.ExecuteScalar());
                    }
                }

                SyncTopics(connection, transaction, "question", questionId, topics, userId);
                transaction.Commit();
            }

            return new { question_id = questionId, question_status = status };
        }

        private static object DeleteQuestion(SqlConnection connection, HttpRequest request)
        {
            int questionId = Int(request, "question_id");
            int userId = Int(request, "user_id");
            if (questionId <= 0 || userId <= 0) throw new ArgumentException("参数不完整");

            using (var command = new SqlCommand(@"
                UPDATE dbo.questions_table
                   SET question_status = @status, updated_time = @now
                 WHERE question_id = @id AND user_id = @user", connection))
            {
                command.Parameters.AddWithValue("@status", QuestionDeleted);
                command.Parameters.AddWithValue("@now", DateTime.Now);
                command.Parameters.AddWithValue("@id", questionId);
                command.Parameters.AddWithValue("@user", userId);
                if (command.ExecuteNonQuery() == 0)
                    throw new ArgumentException("没有找到可以删除的问题，只能删除本人提出的问题");
            }

            return new { question_id = questionId };
        }

        // ---------------- 话题 ----------------

        private static object SaveTopic(SqlConnection connection, HttpRequest request)
        {
            int topicId = Int(request, "topic_id");
            int creatorId = Int(request, "creator_id");
            string name = Str(request, "topic_name");
            string description = Str(request, "topic_description");
            string cover = Str(request, "cover_url");

            if (creatorId <= 0) throw new ArgumentException("缺少创建人，请先登录");
            if (name.Length == 0) throw new ArgumentException("话题名称不能为空");

            if (topicId > 0)
            {
                using (var command = new SqlCommand(@"
                    UPDATE dbo.topics_table
                       SET topic_name = @name, topic_description = @description, cover_url = @cover
                     WHERE topic_id = @id", connection))
                {
                    command.Parameters.AddWithValue("@name", name);
                    command.Parameters.AddWithValue("@description", description);
                    command.Parameters.AddWithValue("@cover", cover);
                    command.Parameters.AddWithValue("@id", topicId);
                    if (command.ExecuteNonQuery() == 0)
                        throw new ArgumentException("没有找到要修改的话题");
                }
            }
            else
            {
                using (var command = new SqlCommand(@"
                    INSERT INTO dbo.topics_table (topic_name, topic_description, cover_url, creator_id, created_time, topic_status)
                    OUTPUT INSERTED.topic_id
                    VALUES (@name, @description, @cover, @creator, @now, 1)", connection))
                {
                    command.Parameters.AddWithValue("@name", name);
                    command.Parameters.AddWithValue("@description", description);
                    command.Parameters.AddWithValue("@cover", cover);
                    command.Parameters.AddWithValue("@creator", creatorId);
                    command.Parameters.AddWithValue("@now", DateTime.Now);
                    topicId = Convert.ToInt32(command.ExecuteScalar());
                }
            }

            return new { topic_id = topicId };
        }

        private static object DeleteTopic(SqlConnection connection, HttpRequest request)
        {
            int topicId = Int(request, "topic_id");
            if (topicId <= 0) throw new ArgumentException("参数不完整");

            using (var command = new SqlCommand(
                "UPDATE dbo.topics_table SET topic_status = 0 WHERE topic_id = @id", connection))
            {
                command.Parameters.AddWithValue("@id", topicId);
                if (command.ExecuteNonQuery() == 0)
                    throw new ArgumentException("没有找到要删除的话题");
            }

            return new { topic_id = topicId };
        }

        /// <summary>重建帖子/问题与话题的关联：先清空再按话题名逐条关联，不存在的话题自动创建。</summary>
        private static void SyncTopics(SqlConnection connection, SqlTransaction transaction,
            string kind, int targetId, string topics, int creatorId)
        {
            bool isPost = kind == "post";
            string linkTable = isPost ? "post_topics_table" : "question_topics_table";
            string idColumn = isPost ? "post_id" : "question_id";

            using (var clear = new SqlCommand(
                "DELETE FROM dbo." + linkTable + " WHERE " + idColumn + " = @id", connection, transaction))
            {
                clear.Parameters.AddWithValue("@id", targetId);
                clear.ExecuteNonQuery();
            }

            if (string.IsNullOrWhiteSpace(topics)) return;

            string[] names = topics.Split(new[] { ',', '，' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (string raw in names)
            {
                string name = raw.Trim();
                if (name.Length == 0) continue;

                int topicId = 0;

                using (var find = new SqlCommand(
                    "SELECT TOP 1 topic_id FROM dbo.topics_table WHERE topic_name = @name", connection, transaction))
                {
                    find.Parameters.AddWithValue("@name", name);
                    object found = find.ExecuteScalar();
                    if (found != null && found != DBNull.Value) topicId = Convert.ToInt32(found);
                }

                if (topicId == 0)
                {
                    using (var create = new SqlCommand(@"
                        INSERT INTO dbo.topics_table (topic_name, topic_description, cover_url, creator_id, created_time, topic_status)
                        OUTPUT INSERTED.topic_id
                        VALUES (@name, @description, NULL, @creator, @now, 1)", connection, transaction))
                    {
                        create.Parameters.AddWithValue("@name", name);
                        create.Parameters.AddWithValue("@description", "关联帖子或问题时自动创建的话题。");
                        create.Parameters.AddWithValue("@creator", creatorId);
                        create.Parameters.AddWithValue("@now", DateTime.Now);
                        topicId = Convert.ToInt32(create.ExecuteScalar());
                    }
                }

                using (var link = new SqlCommand(@"
                    IF NOT EXISTS (SELECT 1 FROM dbo." + linkTable + @" WHERE " + idColumn + @" = @id AND topic_id = @topic)
                        INSERT INTO dbo." + linkTable + @" (" + idColumn + @", topic_id, created_time)
                        VALUES (@id, @topic, @now)", connection, transaction))
                {
                    link.Parameters.AddWithValue("@id", targetId);
                    link.Parameters.AddWithValue("@topic", topicId);
                    link.Parameters.AddWithValue("@now", DateTime.Now);
                    link.ExecuteNonQuery();
                }
            }
        }

        // ---------------- 回答 ----------------

        private static object AddAnswer(SqlConnection connection, HttpRequest request)
        {
            int questionId = Int(request, "question_id");
            int userId = Int(request, "user_id");
            string content = Str(request, "content");

            if (userId <= 0) throw new ArgumentException("请先登录再回答问题");
            if (questionId <= 0) throw new ArgumentException("缺少问题编号");
            if (content.Length == 0) throw new ArgumentException("回答内容不能为空");

            int status = 0;
            bool resolved = false;

            using (var check = new SqlCommand(
                "SELECT question_status, ISNULL(is_resolved, 0) FROM dbo.questions_table WHERE question_id = @id", connection))
            {
                check.Parameters.AddWithValue("@id", questionId);
                using (var reader = check.ExecuteReader())
                {
                    if (!reader.Read()) throw new ArgumentException("问题不存在");
                    status = Convert.ToInt32(reader[0]);
                    resolved = Convert.ToBoolean(reader[1]);
                }
            }

            if (status != QuestionPublished) throw new ArgumentException("该问题当前不可回答");
            if (resolved) throw new ArgumentException("该问题已解决，不能再回答");

            int answerId;
            using (var command = new SqlCommand(@"
                INSERT INTO dbo.answers_table (question_id, user_id, content, publish_time, status, is_accepted)
                OUTPUT INSERTED.answer_id
                VALUES (@question, @user, @content, @now, 0, 0)", connection))
            {
                command.Parameters.AddWithValue("@question", questionId);
                command.Parameters.AddWithValue("@user", userId);
                command.Parameters.AddWithValue("@content", content);
                command.Parameters.AddWithValue("@now", DateTime.Now);
                answerId = Convert.ToInt32(command.ExecuteScalar());
            }

            return new { answer_id = answerId, question_id = questionId };
        }

        private static object AcceptAnswer(SqlConnection connection, HttpRequest request)
        {
            int answerId = Int(request, "answer_id");
            int questionId = Int(request, "question_id");
            int userId = Int(request, "user_id");

            if (answerId <= 0 || questionId <= 0 || userId <= 0) throw new ArgumentException("参数不完整");

            using (var check = new SqlCommand(
                "SELECT user_id FROM dbo.questions_table WHERE question_id = @id", connection))
            {
                check.Parameters.AddWithValue("@id", questionId);
                object owner = check.ExecuteScalar();
                if (owner == null || owner == DBNull.Value) throw new ArgumentException("问题不存在");
                if (Convert.ToInt32(owner) != userId) throw new ArgumentException("只有提问人可以采纳回答");
            }

            using (var transaction = connection.BeginTransaction())
            {
                using (var reset = new SqlCommand(
                    "UPDATE dbo.answers_table SET is_accepted = 0 WHERE question_id = @question", connection, transaction))
                {
                    reset.Parameters.AddWithValue("@question", questionId);
                    reset.ExecuteNonQuery();
                }

                using (var accept = new SqlCommand(@"
                    UPDATE dbo.answers_table SET is_accepted = 1
                     WHERE answer_id = @answer AND question_id = @question", connection, transaction))
                {
                    accept.Parameters.AddWithValue("@answer", answerId);
                    accept.Parameters.AddWithValue("@question", questionId);
                    if (accept.ExecuteNonQuery() == 0)
                        throw new ArgumentException("回答不存在或不属于该问题");
                }

                using (var resolve = new SqlCommand(@"
                    UPDATE dbo.questions_table
                       SET is_resolved = 1, question_status = @status, updated_time = @now
                     WHERE question_id = @question", connection, transaction))
                {
                    resolve.Parameters.AddWithValue("@status", QuestionPublished);
                    resolve.Parameters.AddWithValue("@now", DateTime.Now);
                    resolve.Parameters.AddWithValue("@question", questionId);
                    resolve.ExecuteNonQuery();
                }

                transaction.Commit();
            }

            return new { answer_id = answerId, is_resolved = true };
        }

        // ---------------- 评论与回复 ----------------

        private static object AddComment(SqlConnection connection, HttpRequest request)
        {
            int userId = Int(request, "user_id");
            int targetType = Int(request, "target_type");
            int targetId = Int(request, "target_id");
            string content = Str(request, "content");

            if (userId <= 0) throw new ArgumentException("请先登录再发表评论");
            if (targetType < TypeCollection || targetType > TypeQuestion) throw new ArgumentException("评论对象类型不正确");
            if (targetId <= 0) throw new ArgumentException("缺少评论对象编号");
            if (content.Length == 0) throw new ArgumentException("评论内容不能为空");

            int commentId;
            using (var command = new SqlCommand(@"
                INSERT INTO dbo.comments_table (user_id, target_type, target_id, content, status, comment_time)
                OUTPUT INSERTED.comment_id
                VALUES (@user, @type, @target, @content, 0, @now)", connection))
            {
                command.Parameters.AddWithValue("@user", userId);
                command.Parameters.AddWithValue("@type", targetType);
                command.Parameters.AddWithValue("@target", targetId);
                command.Parameters.AddWithValue("@content", content);
                command.Parameters.AddWithValue("@now", DateTime.Now);
                commentId = Convert.ToInt32(command.ExecuteScalar());
            }

            return new { comment_id = commentId };
        }

        private static object DeleteComment(SqlConnection connection, HttpRequest request)
        {
            int commentId = Int(request, "comment_id");
            int userId = Int(request, "user_id");
            if (commentId <= 0 || userId <= 0) throw new ArgumentException("参数不完整");

            using (var command = new SqlCommand(@"
                UPDATE dbo.comments_table SET status = 1
                 WHERE comment_id = @id AND user_id = @user", connection))
            {
                command.Parameters.AddWithValue("@id", commentId);
                command.Parameters.AddWithValue("@user", userId);
                if (command.ExecuteNonQuery() == 0)
                    throw new ArgumentException("只能删除本人的评论");
            }

            return new { comment_id = commentId };
        }

        private static object AddReply(SqlConnection connection, HttpRequest request)
        {
            int userId = Int(request, "user_id");
            int commentId = Int(request, "comment_id");
            int replyToUserId = Int(request, "reply_to_user_id");
            string content = Str(request, "content");

            if (userId <= 0) throw new ArgumentException("请先登录再回复");
            if (commentId <= 0) throw new ArgumentException("缺少被回复的评论编号");
            if (content.Length == 0) throw new ArgumentException("回复内容不能为空");

            int replyId;
            using (var command = new SqlCommand(@"
                INSERT INTO dbo.reply_table (user_id, content, comment_id, reply_to_user_id, reply_time, status)
                OUTPUT INSERTED.reply_id
                VALUES (@user, @content, @comment, @replyTo, @now, 0)", connection))
            {
                command.Parameters.AddWithValue("@user", userId);
                command.Parameters.AddWithValue("@content", content);
                command.Parameters.AddWithValue("@comment", commentId);
                command.Parameters.AddWithValue("@replyTo",
                    replyToUserId > 0 ? (object)replyToUserId : DBNull.Value);
                command.Parameters.AddWithValue("@now", DateTime.Now);
                replyId = Convert.ToInt32(command.ExecuteScalar());
            }

            return new { reply_id = replyId };
        }

        private static object DeleteReply(SqlConnection connection, HttpRequest request)
        {
            int replyId = Int(request, "reply_id");
            int userId = Int(request, "user_id");
            if (replyId <= 0 || userId <= 0) throw new ArgumentException("参数不完整");

            using (var command = new SqlCommand(@"
                UPDATE dbo.reply_table SET status = 1
                 WHERE reply_id = @id AND user_id = @user", connection))
            {
                command.Parameters.AddWithValue("@id", replyId);
                command.Parameters.AddWithValue("@user", userId);
                if (command.ExecuteNonQuery() == 0)
                    throw new ArgumentException("只能删除本人的回复");
            }

            return new { reply_id = replyId };
        }

        // ---------------- 点赞与收藏 ----------------

        private static object SetLike(SqlConnection connection, HttpRequest request, bool add)
        {
            int userId = Int(request, "user_id");
            int targetType = Int(request, "target_type");
            int targetId = Int(request, "target_id");

            if (userId <= 0) throw new ArgumentException("请先登录再点赞");
            if (targetType < TypeCollection || targetType > TypeQuestion) throw new ArgumentException("点赞对象类型不正确");
            if (targetId <= 0) throw new ArgumentException("缺少点赞对象编号");

            int status = add ? 1 : 0;

            using (var command = new SqlCommand(@"
                IF EXISTS (SELECT 1 FROM dbo.likes_table
                            WHERE user_id = @user AND target_type = @type AND target_id = @target)
                BEGIN
                    UPDATE dbo.likes_table
                       SET status = @status, likes_time = @now
                     WHERE user_id = @user AND target_type = @type AND target_id = @target
                END
                ELSE IF @status = 1
                BEGIN
                    INSERT INTO dbo.likes_table (user_id, target_type, target_id, likes_time, status)
                    VALUES (@user, @type, @target, @now, 1)
                END", connection))
            {
                command.Parameters.AddWithValue("@user", userId);
                command.Parameters.AddWithValue("@type", targetType);
                command.Parameters.AddWithValue("@target", targetId);
                command.Parameters.AddWithValue("@status", status);
                command.Parameters.AddWithValue("@now", DateTime.Now);
                command.ExecuteNonQuery();
            }

            return new { liked = add };
        }

        private static object SetFavorite(SqlConnection connection, HttpRequest request, bool add)
        {
            int userId = Int(request, "user_id");
            int targetType = Int(request, "target_type");
            int targetId = Int(request, "target_id");
            int folderId = Int(request, "folder_id");

            if (userId <= 0) throw new ArgumentException("请先登录再收藏");
            if (targetType < TypeCollection || targetType > TypeQuestion) throw new ArgumentException("收藏对象类型不正确");
            if (targetId <= 0) throw new ArgumentException("缺少收藏对象编号");

            int status = add ? 1 : 0;
            if (add && folderId <= 0) folderId = EnsureDefaultFolder(connection, userId);

            using (var command = new SqlCommand(@"
                IF EXISTS (SELECT 1 FROM dbo.favorites_table
                            WHERE user_id = @user AND target_type = @type AND target_id = @target)
                BEGIN
                    UPDATE dbo.favorites_table
                       SET status = @status,
                           favorite_folder_id = CASE WHEN @status = 1 THEN @folder ELSE favorite_folder_id END,
                           favorites_time = @now
                     WHERE user_id = @user AND target_type = @type AND target_id = @target
                END
                ELSE IF @status = 1
                BEGIN
                    INSERT INTO dbo.favorites_table
                        (target_type, target_id, favorite_folder_id, favorites_time, status, user_id)
                    VALUES (@type, @target, @folder, @now, 1, @user)
                END", connection))
            {
                command.Parameters.AddWithValue("@user", userId);
                command.Parameters.AddWithValue("@type", targetType);
                command.Parameters.AddWithValue("@target", targetId);
                command.Parameters.AddWithValue("@folder", folderId);
                command.Parameters.AddWithValue("@status", status);
                command.Parameters.AddWithValue("@now", DateTime.Now);
                command.ExecuteNonQuery();
            }

            return new { favorited = add, folder_id = folderId };
        }

        private static object SaveFolder(SqlConnection connection, HttpRequest request)
        {
            int folderId = Int(request, "folder_id");
            int userId = Int(request, "user_id");
            string name = Str(request, "folder_name");

            if (userId <= 0) throw new ArgumentException("请先登录");
            if (name.Length == 0) throw new ArgumentException("收藏夹名称不能为空");

            if (folderId > 0)
            {
                using (var command = new SqlCommand(@"
                    UPDATE dbo.favorites_folder_table SET folder_name = @name
                     WHERE favorite_folder_id = @id AND user_id = @user", connection))
                {
                    command.Parameters.AddWithValue("@name", name);
                    command.Parameters.AddWithValue("@id", folderId);
                    command.Parameters.AddWithValue("@user", userId);
                    if (command.ExecuteNonQuery() == 0)
                        throw new ArgumentException("没有找到要修改的收藏夹");
                }
            }
            else
            {
                using (var command = new SqlCommand(@"
                    INSERT INTO dbo.favorites_folder_table (user_id, folder_name, created_time, is_default)
                    OUTPUT INSERTED.favorite_folder_id
                    VALUES (@user, @name, @now, 0)", connection))
                {
                    command.Parameters.AddWithValue("@user", userId);
                    command.Parameters.AddWithValue("@name", name);
                    command.Parameters.AddWithValue("@now", DateTime.Now);
                    folderId = Convert.ToInt32(command.ExecuteScalar());
                }
            }

            return new { folder_id = folderId };
        }

        /// <summary>取用户的默认收藏夹，没有就建一个，保证收藏时一定有 folder_id。</summary>
        private static int EnsureDefaultFolder(SqlConnection connection, int userId)
        {
            using (var find = new SqlCommand(@"
                SELECT TOP 1 favorite_folder_id FROM dbo.favorites_folder_table
                 WHERE user_id = @user AND is_default = 1
                 ORDER BY favorite_folder_id", connection))
            {
                find.Parameters.AddWithValue("@user", userId);
                object found = find.ExecuteScalar();
                if (found != null && found != DBNull.Value) return Convert.ToInt32(found);
            }

            using (var create = new SqlCommand(@"
                INSERT INTO dbo.favorites_folder_table (user_id, folder_name, created_time, is_default)
                OUTPUT INSERTED.favorite_folder_id
                VALUES (@user, N'默认收藏夹', @now, 1)", connection))
            {
                create.Parameters.AddWithValue("@user", userId);
                create.Parameters.AddWithValue("@now", DateTime.Now);
                return Convert.ToInt32(create.ExecuteScalar());
            }
        }

        // ---------------- 工具方法 ----------------

        private static string Json(object value)
        {
            return new JavaScriptSerializer().Serialize(value);
        }

        private static void WriteError(HttpContext context, int status, string message)
        {
            context.Response.StatusCode = status;
            context.Response.Write(Json(new { ok = false, message = message }));
        }

        private static int Int(HttpRequest request, string key)
        {
            int value;
            int.TryParse(request.Form[key], out value);
            return value;
        }

        private static string Str(HttpRequest request, string key)
        {
            string value = request.Form[key];
            return value == null ? "" : value.Trim();
        }

        public bool IsReusable
        {
            get { return false; }
        }
    }
}
