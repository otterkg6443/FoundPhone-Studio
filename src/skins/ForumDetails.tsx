import { ChevronLeft, MoreHorizontal } from "lucide-react";
import type { Item } from "../schema";
import "./forum-details.css";

type ForumDetailProps = {
  item: Item;
  items: Item[];
  back: () => void;
  onOpenItem: (item: Item) => void;
};

type ForumThreadReply = { author: string; body: string; time: string };
type ForumThread = { floor: number; body: string; time: string; replies: ForumThreadReply[] };

function readForumThreads(item: Item): ForumThread[] {
  const raw = item.meta?.forumCommentThreads;
  if (typeof raw !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as ForumThread[]).filter(
      (thread) =>
        typeof thread.floor === "number" &&
        typeof thread.body === "string" &&
        typeof thread.time === "string" &&
        Array.isArray(thread.replies),
    ).sort((a, b) => a.time.localeCompare(b.time));
  } catch {
    return [];
  }
}

function formatForumTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value);
  if (!match) return value;
  return `${Number(match[2])}月${Number(match[3])}日 ${match[4]}:${match[5]}`;
}

function authorAndBody(comment: string) {
  const splitAt = comment.indexOf("|");
  if (splitAt < 0) return { author: "匿名用户", body: comment };
  return {
    author: comment.slice(0, splitAt) || "匿名用户",
    body: comment.slice(splitAt + 1),
  };
}

function renderReplyBody(
  body: string,
  items: Item[],
  onOpenItem: (item: Item) => void,
) {
  const match = /\[\[([^\]]+)\]\]/.exec(body);
  if (!match || match.index === undefined) return body;
  const linkedTitle = match[1];
  const linkedItem = items.find((candidate) => candidate.title === linkedTitle);
  return (
    <>
      {body.slice(0, match.index)}
      {linkedItem ? (
        <button
          type="button"
          className="forum-inline-link"
          onClick={() => onOpenItem(linkedItem)}
          aria-label={"打开帖子：" + linkedTitle}
        >
          {linkedTitle}
        </button>
      ) : (
        <span className="forum-inline-link">{linkedTitle}</span>
      )}
      {body.slice(match.index + match[0].length)}
    </>
  );
}

export function ForumDetail({
  item,
  items,
  back,
  onOpenItem,
}: ForumDetailProps) {
  return (
    <section className="forum-detail-ui" aria-label="论坛帖子详情">
      <header className="forum-detail-nav">
        <button type="button" aria-label="返回论坛" onClick={back}>
          <ChevronLeft size={24} />
        </button>
        <div className="forum-detail-nav-title">
          <strong>帖子详情</strong>
          <small>校园论坛</small>
        </div>
        <button type="button" aria-label="更多选项">
          <MoreHorizontal size={23} />
        </button>
      </header>

      <div className="forum-detail-scroll">
        <div className="forum-detail-location">
          <span>校园闲聊</span>
          <span className="forum-location-separator">›</span>
          <span>帖子详情</span>
        </div>

        <article className="forum-thread-card">
          <h1>{item.title}</h1>
          <div className="forum-thread-author">
            <span className="forum-user-avatar forum-user-avatar-op">
              {(item.sender || "匿名用户").slice(0, 1)}
            </span>
            <div className="forum-author-info">
              <strong>{item.sender || "匿名用户"}</strong>
              <small>{item.time || "刚刚"} · 发布于校园闲聊</small>
            </div>
            <span className="forum-op-badge">楼主</span>
          </div>
          <p className="forum-thread-body">{item.body}</p>
          <div className="forum-thread-stats">
            <span>{item.meta?.commentCount || item.comments.length} 条回复</span>
            <span>浏览 {item.meta?.views || "0"}</span>
            <span>校园闲聊</span>
          </div>
        </article>

        <section className="forum-replies-card">
          <header className="forum-replies-heading">
            <strong>全部回复</strong>
            <span>{item.comments.length} 条</span>
          </header>
          {readForumThreads(item).length ? (
            <div className="forum-threaded-list">
              {readForumThreads(item).map((thread) => (
                <article className="forum-threaded-floor" key={thread.floor}>
                  <div className="forum-threaded-main">
                    <div className="forum-floor-number">{thread.floor}L</div>
                    <div className="forum-threaded-content">
                      <div className="forum-threaded-author-line">
                        <span className="forum-user-avatar">匿</span>
                        <strong>匿名用户</strong>
                        <time>{formatForumTime(thread.time)}</time>
                      </div>
                      <p className="forum-reply-body">
                        {renderReplyBody(thread.body, items, onOpenItem)}
                      </p>
                    </div>
                  </div>
                  {thread.replies.map((reply, index) => {
                    const isOwner = reply.author === "楼主";
                    return (
                      <div className="forum-threaded-reply" key={index}>
                        <span className={"forum-user-avatar forum-threaded-reply-avatar " + (isOwner ? "forum-user-avatar-op" : "")}>
                          {isOwner ? "楼" : "匿"}
                        </span>
                        <div className="forum-threaded-reply-content">
                          <div className="forum-threaded-author-line">
                            <strong>{isOwner ? "楼主" : "匿名用户"}</strong>
                            {isOwner && <span className="forum-op-mini-badge">楼主</span>}
                            <time>{formatForumTime(reply.time)}</time>
                          </div>
                          <p className="forum-reply-body">
                            {renderReplyBody(reply.body, items, onOpenItem)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </article>
              ))}
            </div>
          ) : (
            item.comments.map((comment, index) => {
              const { author, body } = authorAndBody(comment);
              const isOwner = author === "楼主";
              return (
                <article className="forum-reply-row" key={index}>
                  <div className="forum-floor-number">{index + 1}L</div>
                  <div className="forum-reply-main">
                    <div className="forum-reply-author">
                      <span
                        className={
                          "forum-user-avatar " +
                          (isOwner ? "forum-user-avatar-op" : "")
                        }
                      >
                        {isOwner ? "楼" : "匿"}
                      </span>
                      <strong>{author}</strong>
                      {isOwner && <span className="forum-op-mini-badge">楼主</span>}
                    </div>
                    <p className="forum-reply-body">
                      {renderReplyBody(body, items, onOpenItem)}
                    </p>
                    <div className="forum-reply-actions">
                      <span>回复</span>
                      <span>···</span>
                    </div>
                  </div>
                </article>
              );
            })
          )}
          {item.comments.length === 0 && (
            <div className="forum-empty-replies">暂时还没有回复</div>
          )}
        </section>
        <div className="forum-detail-end">已经到底啦</div>
      </div>
    </section>
  );
}
