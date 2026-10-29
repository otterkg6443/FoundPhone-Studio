/* React/data adapters for dudwo5/Mymy UI templates: kt/ktn/KHD/bub,
 * igHome/igProfile/igDM/igSheet, xHome. See NOTICE.txt for permission.
 * Author content, DOM globals, timers and media dependencies are excluded. */
import { Fragment, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Search,
  Plus,
  Settings,
  Users,
  MessageCircle,
  MoreHorizontal,
  Heart,
  Home,
  Grid,
  Send,
  Bookmark,
  Repeat2,
  BarChart2,
  Share,
  User,
  Video,
  Bell,
  X,
  Smile,
  Menu,
  Compass,
} from "lucide-react";
import type { SkinProps } from "../../AppSkins";
import { Avatar, Media } from "../../skins/shared";
import { useSkinState } from "../../skinState";
import { makeItem, type Item } from "../../schema";
import "./ui.css";
import "./adapter.css";
function grouped(items: Item[]) {
  return [...new Set(items.map((i) => i.title))].map((title) => ({
    title,
    items: items.filter((i) => i.title === title),
  }));
}
export function messageRun(items: Item[], index: number) {
  const m = items[index],
    previous = items[index - 1],
    next = items[index + 1];
  return {
    first:
      !previous ||
      previous.outgoing !== m.outgoing ||
      previous.sender !== m.sender,
    last:
      m.meta.kakaoShowTime === "true" ||
      !next ||
      next.outgoing !== m.outgoing ||
      next.sender !== m.sender ||
      next.time.slice(0, 10) !== m.time.slice(0, 10) ||
      next.meta.kakaoTimestampBreakBefore === "true",
  };
}
const read = (p: SkinProps, i: Item) =>
  p.creator || i.password ? p.onItem(i) : p.onRead(i.id);
function Blank() {
  return <p className="mymy-empty">暂无内容</p>;
}
function Back({ onClick }: { onClick: () => void }) {
  return (
    <button aria-label="返回" onClick={onClick}>
      <ArrowLeft size={22} />
    </button>
  );
}
export function MymyKakao(p: SkinProps) {
  const [tab, setTab] = useSkinState<string>(p, "mymyTab", "聊天"),
    [sent, setSent] = useSkinState<string[]>(p, "mymyKktSent", []),
    [readKakaoMessageIds, setReadKakaoMessageIds] = useSkinState<string[]>(
      p,
      "kakaoReadMessageIds",
      [],
    ),
    [draft, setDraft] = useState(""),
    [query, setQuery] = useState(""),
    [menu, setMenu] = useState(false);
  const isKakaoContact = (item: Item) =>
    item.folder === "好友" && item.meta.kakaoContact === "true";
  const friendItems = p.items.filter(isKakaoContact);
  const localSentItems = sent.flatMap((raw, index) => {
    try {
      const entry: unknown = JSON.parse(raw);
      if (
        !Array.isArray(entry) ||
        entry.length !== 3 ||
        !entry.every((v) => typeof v === "string")
      )
        return [];
      return [
        makeItem({
          id: "local-kkt-" + index,
          title: entry[0],
          body: entry[1],
          time: entry[2],
          sender: p.owner || "机主",
          outgoing: true,
          meta: { local: "true" },
        }),
      ];
    } catch {
      return [];
    }
  });
  const conversationItems = [
    ...p.items.filter((item) => !isKakaoContact(item)),
    ...localSentItems,
  ];
  const activeThread =
    p.thread === "粉红马尔济斯" &&
    p.items.some((item) => item.title === "啄木鸟")
      ? "啄木鸟"
      : p.thread;
  const list = grouped(tab === "好友" ? friendItems : conversationItems),
    messages = conversationItems.filter((i) => i.title === activeThread),
    scroll = useRef<HTMLDivElement>(null);
  const unreadItems = conversationItems.filter(
    (item) =>
      item.meta.kakaoUnread === "true" &&
      !readKakaoMessageIds.includes(item.id),
  );
  const totalUnreadCount = unreadItems.length;
  const unreadCountForThread = (title: string) =>
    unreadItems.filter((item) => item.title === title).length;
  useEffect(() => {
    const node = scroll.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [activeThread, messages.length]);
  useEffect(() => {
    if (p.creator || !activeThread) return;
    const newlyReadIds = messages
      .filter(
        (item) =>
          item.meta.kakaoUnread === "true" &&
          !readKakaoMessageIds.includes(item.id),
      )
      .map((item) => item.id);
    if (!newlyReadIds.length) return;
    setReadKakaoMessageIds((ids) =>
      [...new Set([...ids, ...newlyReadIds])],
    );
  }, [
    p.creator,
    activeThread,
    messages.length,
    readKakaoMessageIds,
    setReadKakaoMessageIds,
  ]);
  const dateDivider = (value: string) => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return "";
    const [, year, month, day] = match;
    const date = new Date(Number(year), Number(month) - 1, Number(day), 12);
    const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    return `${year}年${month}月${day}日 ${weekdays[date.getDay()]}`;
  };
  const stage = Number(p.ui?.kakaoSequenceStage ?? 0);
  const suggestionText = (() => {
    if (stage === 0 && activeThread === "啄木鸟") return "好";
    if (stage === 2 && activeThread === "艺俊哥") return "叽里咕噜说啥呢";
    if (stage === 4 && activeThread === "艺俊哥") return "他好像没跟我讲过这个朋友";
    if (stage === 6 && activeThread === "啄木鸟") return "没听你提起过你的新饭搭子诶";
    if (stage === 7 && activeThread === "啄木鸟") return "是你男朋友吗";
    if (stage === 9 && activeThread === "啄木鸟") return "不是说舞社有事情?";
    if (stage === 11 && activeThread === "啄木鸟") return "哥还会主动交新朋友呢";
    if (stage === 12 && activeThread === "啄木鸟") return "还以为只会和植物说话";
    if (stage === 15 && activeThread === "艺俊哥") return "好像惹他生气了🥹";
    if (stage === 16 && activeThread === "艺俊哥") return "其实自从他坦白性取向后我就在想我们要不要适当保持点距离 毕竟我是直男啊";
    if (stage === 18 && activeThread === "艺俊哥") return "我这几天都在避免和他接触来着😞";
    if (stage === 20 && activeThread === "艺俊哥") return "....";
    if (stage === 22 && activeThread === "艺俊哥") return "可是我又想凭什么呢🥹明明斑比哥才是和我一起长大的 哪个男的敢拱这一棵白菜我都会把它连根拔起扔到外太空";
    if (stage === 24 && activeThread === "艺俊哥") return "离开我谁陪他吃烫出鸟的平冷泡水没过刻度线的泡面陪他看几十次楚门的世界";
    if (stage === 25 && activeThread === "艺俊哥") return "啊…蔡斑比太烦人了";
    if (stage === 26 && activeThread === "艺俊哥") return "我不管了我要去找他";
    if (stage === 28 && activeThread === "艺俊哥") return "我给他一顿解释我不是歧视同性恋我只是觉得他坦白之后我们关系有点尴尬绝对不是故意躲着他我们还是最好的朋友";
    if (stage === 29 && activeThread === "艺俊哥") return "他听完啥也没说就站在那里看脚尖沉默";
    if (stage === 30 && activeThread === "艺俊哥") return "问我说完了吗说完他要回宿舍洗澡了";
    if (stage === 31 && activeThread === "艺俊哥") return "我啥也没想本能地把他拉回来亲了";
    if (stage === 33 && activeThread === "艺俊哥") return "啊然后就是这样那样亲了几次之后他跑回宿舍了";
    if (stage === 35 && activeThread === "艺俊哥") return "可是我们现在算什么关系啊......好乱🥹";
    if (stage === 38 && activeThread === "啄木鸟") return "亲友";
    if (stage === 39 && activeThread === "啄木鸟") return "可以亲嘴的朋友";
    if (stage === 41 && activeThread === "啄木鸟") return "我想争取一个拱白菜的机会";
    if (stage === 43 && activeThread === "啄木鸟") return "窝边草先抱着我啃的";
    if (stage === 45 && activeThread === "啄木鸟") return "不敢不敢";
    if (stage === 47 && activeThread === "啄木鸟") return "敢问鄙人初始成绩多少分";
    if (stage === 49 && activeThread === "啄木鸟") return "那你现在下楼";
    if (stage === 51 && activeThread === "啄木鸟") return "练习一下";
    if (stage === 52 && activeThread === "啄木鸟") return "早日转正";
    if (stage === 55 && activeThread === "啄木鸟") return "因为你喝醉酒在我身上拔火罐的时候很像啄木鸟在啄我";
    if (stage === 56 && activeThread === "啄木鸟") return "👉🏻👈🏻";
    return "";
  })();
  const composerPlaceholder = suggestionText
    ? "点上方提示填入消息，也可以直接输入"
    : (() => {
        if ([1, 3, 5].includes(stage)) return "等待艺俊哥回复…";
        if (stage === 8 || stage === 10 || stage === 13) return "等待啄木鸟回复…";
        if (stage === 15 && activeThread === "啄木鸟") return "截图已发给艺俊哥，去找他聊聊…";
        if ([17, 19, 21, 23, 27, 32, 34, 36].includes(stage) && activeThread === "艺俊哥") return "等待艺俊哥回复…";
        if (stage === 37 && activeThread === "艺俊哥") return "啄木鸟有新消息，切换会话继续…";
        if ([37, 40, 42, 44, 46, 48, 50, 53, 54, 57].includes(stage) && activeThread === "啄木鸟") return "等待啄木鸟回复…";
        if (stage === 58 && activeThread === "啄木鸟") return "对话已结束";
        return "输入消息";
      })();
  const composerInputRef = useRef<HTMLInputElement>(null);
  const [copiedHintText, setCopiedHintText] = useState("");
  const fillSuggestion = () => {
    setDraft(suggestionText);
    // Touch devices should not force-focus a small app input: iOS Safari can
    // zoom the page and shift the fixed phone viewport when doing so.
    if (
      typeof window !== "undefined" &&
      !window.matchMedia("(pointer: coarse)").matches
    ) {
      composerInputRef.current?.focus();
    }
  };
  const copySuggestion = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(suggestionText);
      setCopiedHintText(suggestionText);
    } catch {
      // Clipboard permission can be blocked in embedded/mobile browsers.
      // Filling the composer is a reliable fallback and still requires manual send.
      fillSuggestion();
      setCopiedHintText("");
    }
  };
  return (
    <div className="mymy-ui mymy-kakao" data-mymy="kakao">
      {activeThread ? (
        <>
          <header className="kzth">
            <Back onClick={() => p.onThread("")} />
            <span className="kzname">{activeThread}</span>
            <span className="kzpill">
              <button aria-label="聊天菜单" onClick={() => setMenu(!menu)}>
                <Menu size={21} />
              </button>
            </span>
          </header>
          <div className="msgs kk" ref={scroll}>
            {messages.map((m, i) => {
              const run = messageRun(messages, i);
              const currentDate = m.time.slice(0, 10);
              const previousDate = messages[i - 1]?.time.slice(0, 10) || "";
              return (
                <Fragment key={m.id}>
                  {(currentDate !== previousDate || m.meta.kakaoTimestampBreakBefore === "true") && (
                    <div className="kakao-date-divider">
                      {dateDivider(m.time)}
                    </div>
                  )}
                  {m.meta.kakaoGapDividerBefore === "true" && (
                    <div className="kakao-time-gap-divider" role="separator" aria-label="时间间隔" />
                  )}
                  <div
                    className={
                      "kzm " +
                      (m.outgoing ? "kzmy" : "kzot") +
                      (run.first ? " first" : "")
                    }
                  >
                    {!m.outgoing && run.first && (
                      <>
                        <div className="kzmav">
                          <Avatar name={m.sender} src={m.avatar} />
                        </div>
                        <div className="kzmn">{m.sender}</div>
                      </>
                    )}
                    {m.outgoing && run.last && (
                      <span className="kzt">
                        {m.meta.unread || ""}
                        <br />
                        {m.time.slice(-5)}
                      </span>
                    )}
                    <button
                      className={
                        "kzbub" +
                        (m.media ? " kzimg" : "") +
                        (
                          m.id === "kakao-pink-maltese-19" ||
                          m.id === "kakao-yejun-followup-in-10" ||
                          m.meta.scheduledSourceId === "kakao-yejun-followup-in-10"
                            ? " kakao-forum-link"
                            : ""
                        ) +
                        (m.id === "kakao-pink-maltese-20260310-02"
                          ? " kakao-missed-call-bubble"
                          : "")
                      }
                      onClick={() => {
                        const sourceId = m.meta.scheduledSourceId || m.id;
                        if (!p.creator && m.body === "论坛链接") {
                          if (sourceId === "kakao-pink-maltese-19") {
                            p.onNavigateToForum?.("forum-thread-power-pole-kiss");
                            return;
                          }
                          if (sourceId === "kakao-yejun-followup-in-10") {
                            p.onNavigateToForum?.("forum-thread-four-building");
                            return;
                          }
                        }
                        if (m.meta.local !== "true") read(p, m);
                      }}
                    >
                      {m.id === "kakao-pink-maltese-20260310-02" ? (
                        <span className="kakao-missed-call">
                          <span className="kakao-missed-call-icon">
                            <span className="kakao-missed-call-tile">
                              <X size={17} strokeWidth={1.7} />
                            </span>
                            <Video size={19} strokeWidth={2} />
                          </span>
                          <span>未接来电</span>
                        </span>
                      ) : m.media ? (
                        <Media item={m} />
                      ) : (
                        m.body
                      )}
                    </button>
                    {!m.outgoing && run.last && (
                      <span className="kzt">{m.time.slice(-5)}</span>
                    )}
                  </div>
                </Fragment>
              );
            })}
            {!messages.length && <Blank />}
          </div>
          {!p.creator && suggestionText && (
            <div className="kakao-hint-card">
              <div className="kakao-hint-copy">
                <div className="kakao-hint-label">建议回复 · 可长按选中复制</div>
                <div className="kakao-hint-text">{suggestionText}</div>
              </div>
              <div className="kakao-hint-actions">
                <button
                  type="button"
                  aria-label="复制建议回复"
                  onClick={copySuggestion}
                >
                  {copiedHintText === suggestionText ? "已复制" : "复制"}
                </button>
                <button
                  type="button"
                  aria-label="填入建议回复"
                  onClick={fillSuggestion}
                >
                  填入
                </button>
              </div>
            </div>
          )}
          <form
            className="kzinp"
            onSubmit={(e) => {
              e.preventDefault();
              const body = draft.trim();
              if (!body) return;
              if (!p.creator && p.onSendChat) {
                p.onSendChat(body);
              } else {
                setSent([
                  ...sent,
                  JSON.stringify([
                    activeThread,
                    body,
                    p.virtualTime || "09:41",
                  ]),
                ]);
              }
              setDraft("");
            }}
          >
            <button
              type="button"
              aria-label="添加聊天内容"
              onClick={() => (p.creator ? p.onAdd() : setMenu(!menu))}
            >
              <Plus size={21} />
            </button>
            <input
              ref={composerInputRef}
              aria-label="KKT消息"
              placeholder={composerPlaceholder}
              value={draft}
              maxLength={2000}
              onChange={(e) => setDraft(e.target.value)}
            />
            <Smile size={22} />
            <button
              className={draft.trim() ? "go" : ""}
              aria-label="发送KKT消息"
              disabled={!draft.trim()}
            >
              ↑
            </button>
          </form>
          {menu && (
            <div className="mymy-local-menu">
              <strong>{activeThread}</strong>
              <p>
                群成员：{[...new Set(messages.map((m) => m.sender))].join("、")}
              </p>
              <button onClick={() => setMenu(false)}>完成</button>
            </div>
          )}
        </>
      ) : (
        <div className="kzkk">
          <div className="kzhd">
            <header className="kzkh">
              <b className="kzti">
                {tab === "好友" ? "好友" : "聊天"}
              </b>
              <span className="kzic">
                <button
                  aria-label="搜索聊天"
                  onClick={() => setQuery(query ? "" : " ")}
                >
                  <Search size={21} />
                </button>
                {p.creator && (
                  <button aria-label="新增内容" onClick={p.onAdd}>
                    <Plus />
                  </button>
                )}
                <button aria-label="KKT设置" onClick={() => setMenu(!menu)}>
                  <Settings size={21} />
                </button>
              </span>
            </header>
            <div className="kzkc2">
              {["好友", "聊天"].map((t) => (
                <button
                  key={t}
                  className={
                    "kzkpl " +
                    (t === tab || (t === "为你推荐" && tab === "推荐")
                      ? "on"
                      : "")
                  }
                  onClick={() => setTab(t)}
                >
                  {t}
                  {t === "聊天" && totalUnreadCount > 0 && (
                    <i className="kzkbd" aria-label={`${totalUnreadCount} 条未读消息`}>
                      {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                    </i>
                  )}
                </button>
              ))}
            </div>
            {query !== "" && (
              <input
                className="mymy-search"
                aria-label="搜索KKT"
                value={query.trimStart()}
                onChange={(e) => setQuery(e.target.value || " ")}
                placeholder="搜索"
              />
            )}
          </div>
          <div className="kzkb">
            <div className="kzksec">
              {tab === "好友" ? "好友" : "全部聊天"} {list.length}
            </div>
            {list
              .filter((g) => g.title.includes(query.trim()))
              .map((g) => {
                const last = g.items.at(-1)!;
                const peer =
                  tab === "好友"
                    ? last
                    : [...g.items].reverse().find(
                        (item) => !item.outgoing && item.sender !== p.owner,
                      ) ??
                      g.items.find((item) => item.sender === g.title) ??
                      last;
                const unreadCount =
                  tab === "聊天" ? unreadCountForThread(g.title) : 0;
                return (
                  <button
                    className="kzkr kzkcr"
                    key={g.title}
                    onClick={() => p.onThread(g.title)}
                  >
                    <Avatar name={peer.sender || g.title} src={peer.avatar} />
                    <span className="kzkn">
                      <b>{g.title}</b>
                      <small>{tab === "好友" ? (last.body || "好友") : last.body}</small>
                    </span>
                    <span className="kzkmt">
                      {last.time.slice(-5)}
                      {unreadCount > 0 && (
                        <i
                          className="kzkbd"
                          aria-label={`${unreadCount} 条未读消息`}
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </i>
                      )}
                    </span>
                  </button>
                );
              })}
            {!list.length && <Blank />}
          </div>
          <nav className="kzknv">
            {[Users, MessageCircle, Compass, Grid, MoreHorizontal].map(
              (Icon, i) => (
                <button
                  key={i}
                  aria-label={["好友", "聊天", "发现", "更多功能", "设置"][i]}
                  className={(tab === "好友" ? 0 : 1) === i ? "on" : ""}
                  onClick={() =>
                    i < 2 ? setTab(["好友", "聊天"][i]) : setMenu(true)
                  }
                >
                  <Icon />
                  {i === 1 && totalUnreadCount > 0 && (
                    <i
                      className="kzk-tab-badge"
                      aria-label={`${totalUnreadCount} 条未读消息`}
                    >
                      {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                    </i>
                  )}
                </button>
              ),
            )}
          </nav>
          {menu && (
            <div className="mymy-local-menu">
              <strong>KakaoTalk</strong>
              <p>作品内聊天</p>
              <button onClick={() => setMenu(false)}>完成</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function parseInstagramComment(value: string) {
  const parts = value.split("|");
  if (parts[0] !== "igc" || parts.length < 5) return null;
  return {
    sender: parts[1],
    avatar: parts[2],
    time: parts[3],
    body: parts.slice(4).join("|"),
  };
}
export function MymyInstagram(p: SkinProps) {
  const igAvatar = "./images/ig-avatar.jpg";
  const [tab, setTab] = useSkinState<string>(p, "mymyTab", "主页"),
    [liked, setLiked] = useSkinState<string[]>(p, "mymyLiked", []),
    [saved, setSaved] = useSkinState<string[]>(p, "mymySaved", []),
    [replies, setReplies] = useSkinState<string[]>(p, "mymyReplies", []),
    [seen, setSeen] = useSkinState<string[]>(p, "mymySeen", []);
  const [sheet, setSheet] = useState<Item | null>(null),
    [selected, setSelected] = useState<Item | null>(null),
    [story, setStory] = useState(0),
    [draft, setDraft] = useState(""),
    [pop, setPop] = useState("");
  const allPosts = p.items.filter(
    (i) => i.folder !== "私信" && i.meta.story !== "true",
  );
  const postsUnlocked = p.ui?.instagramPostsUnlocked === true;
  const posts = postsUnlocked ? allPosts : [];
  const stories = p.items.filter((i) => i.meta.story === "true");
  const dms = p.items.filter((i) => i.folder === "私信");
  const active = stories[story - 1];
  const ownerPosts = allPosts.filter((i) => i.sender === p.owner);
  const ownerPost =
    ownerPosts.find((i) => i.meta.instagramProfileAvatar === "true") ??
    ownerPosts[0];
  const visibleOwnerPosts = postsUnlocked ? ownerPosts : [];
  const toggle = (id: string, values: string[], set: (v: string[]) => void) =>
    set(values.includes(id) ? values.filter((v) => v !== id) : [...values, id]);
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(
      () => setStory((n) => (n < stories.length ? n + 1 : 0)),
      5000,
    );
    return () => clearTimeout(t);
  }, [active, stories.length]);
  const openStory = (i: number) => {
    const m = stories[i];
    setSeen([...new Set([...seen, m.id])]);
    read(p, m);
    setStory(i + 1);
  };
  const openPost = (i: Item) => {
    if (p.creator || i.password) p.onItem(i);
    else {
      read(p, i);
      setSelected(i);
    }
  };
  const post = (i: Item) => (
    <article className="igp" key={i.id}>
      <header className="igph">
        <Avatar name={i.sender} src={igAvatar} />
        <div className="igpn">
          <button onClick={() => setTab("个人主页")}>
            <b>{i.sender}</b>
          </button>
          <small>{i.meta.location || i.time}</small>
        </div>
        <button aria-label="帖子详情" onClick={() => openPost(i)}>
          <MoreHorizontal />
        </button>
      </header>
      <div
        className="carw"
        onDoubleClick={() => {
          if (!liked.includes(i.id)) setLiked([...liked, i.id]);
          setPop(i.id);
        }}
      >
        <Media item={i} />
        {pop === i.id && (
          <Heart
            className="mymy-heart-pop"
            fill="white"
            onAnimationEnd={() => setPop("")}
          />
        )}
      </div>
      <div className="iga">
        <button
          aria-label={"点赞" + i.title}
          aria-pressed={liked.includes(i.id)}
          onClick={() => toggle(i.id, liked, setLiked)}
        >
          <Heart
            fill={liked.includes(i.id) ? "#ff3040" : "none"}
            color={liked.includes(i.id) ? "#ff3040" : "currentColor"}
          />
        </button>
        <button
          aria-label={"评论" + i.title}
          onClick={() => {
            read(p, i);
            setSheet(i);
          }}
        >
          <MessageCircle />
        </button>
        <button aria-label="分享帖子" onClick={() => setTab("私信")}>
          <Send />
        </button>
        <button
          className="mymy-save"
          aria-label={"收藏" + i.title}
          aria-pressed={saved.includes(i.id)}
          onClick={() => toggle(i.id, saved, setSaved)}
        >
          <Bookmark fill={saved.includes(i.id) ? "currentColor" : "none"} />
        </button>
      </div>
      <p className="lk2">
        {i.meta.instagramLikers
          ? i.meta.instagramLikers.split(",").join("、") + " 赞了"
          : i.likes + (liked.includes(i.id) ? 1 : 0) + " 次赞"}
      </p>
      <button
        className="igc"
        onClick={() => {
          openPost(i);
        }}
      >
        <b>{i.sender}</b> {i.body}
      </button>
      <button className="cmall" onClick={() => setSheet(i)}>
        查看评论{" "}
        {i.comments.length +
          replies.filter((r) => r.startsWith(i.id + "\t")).length}
      </button>
      <p className="igt">{i.time}</p>
    </article>
  );
  return (
    <div className="mymy-ui mymy-instagram" data-mymy="instagram">
      <div className="ig">
        <header className="igh">
          <button
            aria-label={selected ? "返回Instagram动态" : "关闭当前App"}
            onClick={() => (selected ? setSelected(null) : p.onBack())}
          >
            <ArrowLeft />
          </button>
          <span className="igl2">
            {selected ? "帖子" : tab === "主页" ? "Instagram" : tab}
          </span>
          <button aria-label="打开私信" onClick={() => setTab("私信")}>
            <Send />
          </button>
        </header>
        <div className="igb">
          {selected && post(selected)}
          {!selected && tab === "主页" && (
            <>
              <div className="sts">
                {stories.map((s, n) => (
                  <button
                    className="st"
                    key={s.id}
                    onClick={() => openStory(n)}
                  >
                    <span
                      className={"sr on " + (seen.includes(s.id) ? "seen" : "")}
                    >
                      <Avatar name={s.sender} src={igAvatar} />
                    </span>
                    <small>{s.sender}</small>
                  </button>
                ))}
              </div>
              {posts.map(post)}
              {!posts.length && <Blank />}
            </>
          )}
          {!selected && tab === "个人主页" && (
            <>
              <div className="pf">
                <Avatar name={p.owner || "机主"} src={igAvatar} />
                <div className="ps">
                  <div>
                    <b>{visibleOwnerPosts.length}</b>
                    <small>帖子</small>
                  </div>
                  <div>
                    <b>{ownerPost?.meta.instagramFollowers || "—"}</b>
                    <small>粉丝</small>
                  </div>
                  <div>
                    <b>{ownerPost?.meta.instagramFollowing || "—"}</b>
                    <small>关注</small>
                  </div>
                </div>
              </div>
              <p className="pn">{p.owner}</p>
              <div className="ptab">
                <div className="on">
                  <Grid />
                </div>
              </div>
              <div className="pg2">
                {visibleOwnerPosts.map((i) => (
                  <button key={i.id} onClick={() => openPost(i)}>
                    <Media item={i} />
                  </button>
                ))}
              </div>
            </>
          )}
          {!selected && tab === "私信" && (
            <>
              {dms.map((i) => (
                <button className="kzkr" key={i.id} onClick={() => openPost(i)}>
                  <Avatar name={i.sender} src={igAvatar} />
                  <span className="kzkn">
                    <b>{i.title}</b>
                    <small>{i.body}</small>
                  </span>
                </button>
              ))}
              {!dms.length && <Blank />}
            </>
          )}
          {!selected && tab === "搜索" && (
            <>
              <input
                className="mymy-search"
                aria-label="搜索Instagram"
                placeholder="搜索"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              {posts
                .filter((i) => (i.title + i.body + i.sender).includes(draft))
                .map(post)}
            </>
          )}
        </div>
        <nav className="mymy-ig-nav">
          {[Home, Search, Send, User].map((Icon, n) => (
            <button
              key={n}
              aria-label={["主页", "搜索", "私信", "个人主页"][n]}
              aria-pressed={
                !selected && tab === ["主页", "搜索", "私信", "个人主页"][n]
              }
              onClick={() => {
                setSelected(null);
                setTab(["主页", "搜索", "私信", "个人主页"][n]);
              }}
            >
              <Icon />
            </button>
          ))}
        </nav>
      </div>
      {sheet && (
        <div className="kzcs">
          <button
            className="kzbk"
            aria-label="关闭评论"
            onClick={() => setSheet(null)}
          />
          <section className="kzsh" role="dialog" aria-label="Instagram评论">
            <div className="mymy-sheet-handle" />
            <header>
              <b>评论</b>
              <button aria-label="关闭评论面板" onClick={() => setSheet(null)}>
                <X />
              </button>
            </header>
            <div className="mymy-comments">
              {[
                ...sheet.comments,
                ...replies
                  .filter((r) => r.startsWith(sheet.id + "\t"))
                  .map((r) => r.split("\t").slice(1).join("\t")),
              ].map((c, n) => {
                const parsed = parseInstagramComment(c);
                return (
                  <p key={n}>
                    <Avatar
                      name={parsed?.sender ?? c.split(":")[0]}
                      src={igAvatar}
                    />
                    {parsed ? (
                      <span>
                        <b>{parsed.sender}</b> {parsed.body}
                        {parsed.time && (
                          <small style={{ display: "block" }}>
                            {parsed.time}
                          </small>
                        )}
                      </span>
                    ) : (
                      c
                    )}
                  </p>
                );
              })}
            </div>
            <form
              className="cmb2"
              onSubmit={(e) => {
                e.preventDefault();
                if (draft.trim()) {
                  setReplies([...replies, sheet.id + "\t" + draft.trim()]);
                  setDraft("");
                }
              }}
            >
              <input
                aria-label="添加评论"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="添加评论"
                maxLength={500}
              />
              <button>发布</button>
            </form>
          </section>
        </div>
      )}
      {active && (
        <div
          className="mymy-story"
          onPointerDown={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            const next =
              e.clientX - box.left < box.width * 0.3 ? story - 1 : story + 1;
            setStory(next > stories.length ? 0 : Math.max(0, next));
          }}
        >
          <div className="mymy-story-bars">
            {stories.map((s, n) => (
              <i key={s.id} className={n < story ? "seen" : ""} />
            ))}
          </div>
          <header>
            <Avatar name={active.sender} src={igAvatar} />
            <b>{active.sender}</b>
            <button
              aria-label="关闭快拍"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setStory(0)}
            >
              <X />
            </button>
          </header>
          <Media item={active} />
          <p>{active.body}</p>
        </div>
      )}
    </div>
  );
}
export function MymyX(p: SkinProps) {
  const [dark, setDark] = useSkinState<boolean>(p, "x-dark", true);
  const [tab, setTab] = useSkinState<string>(p, "mymyTab", "推荐"),
    [likes, setLikes] = useSkinState<string[]>(p, "mymyXLikes", []),
    [reposts, setReposts] = useSkinState<string[]>(p, "mymyXReposts", []),
    [marks, setMarks] = useSkinState<string[]>(p, "mymyXMarks", []),
    [query, setQuery] = useState("");
  const isLiked = (id: string) =>
    typeof p.ui?.["liked-" + id] === "boolean"
      ? Boolean(p.ui["liked-" + id])
      : likes.includes(id);
  const isSaved = (id: string) =>
    typeof p.ui?.["saved-" + id] === "boolean"
      ? Boolean(p.ui["saved-" + id])
      : marks.includes(id);
  const toggle = (id: string, v: string[], set: (x: string[]) => void) =>
    set(v.includes(id) ? v.filter((x) => x !== id) : [...v, id]);
  return (
    <div
      className={"mymy-ui mymy-x " + (dark ? "x-reference-dark" : "")}
      data-mymy="twitter"
    >
      <div className="kzxw">
        <header className="kzxh">
          <button aria-label="关闭当前App" onClick={p.onBack}>
            <ArrowLeft />
          </button>
          <div className="kzxlg">𝕏</div>
          <button aria-label="切换X外观" onClick={() => setDark(!dark)}>
            <User />
          </button>
        </header>
        <div className="kzxtb">
          {["为你推荐", "正在关注", "添加 +", "时间"].map((t) => (
            <button
              className={t === tab ? "on" : ""}
              key={t}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "搜索" && (
          <input
            className="mymy-search"
            aria-label="搜索X"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索"
          />
        )}
        <div className="kzxfd">
          {p.items
            .filter((i) => (i.title + i.body).includes(query))
            .map((i) => (
              <article className="kzxt" key={i.id}>
                <Avatar name={i.sender} src={i.avatar} />
                <div className="kzxb">
                  <div className="kzxn">
                    <b>{i.sender}</b>
                    <small>
                      @{i.meta.handle || "user"} · {i.time.slice(-5)}
                    </small>
                    <em>
                      <MoreHorizontal size={18} />
                    </em>
                  </div>
                  <button
                    className="kzxx"
                    onClick={() => {
                      read(p, i);
                      p.onItem(i);
                    }}
                  >
                    {i.body}
                  </button>
                  {i.media && (
                    <button
                      className="kzxv"
                      aria-label="打开媒体"
                      onClick={() => p.onItem(i)}
                    >
                      <Media item={i} />
                    </button>
                  )}
                  <div className="kzxac">
                    <button
                      aria-label={"评论" + i.title}
                      onClick={() => p.onItem(i)}
                    >
                      <MessageCircle />
                      {i.comments.length}
                    </button>
                    <button
                      aria-label={"转发" + i.title}
                      aria-pressed={reposts.includes(i.id)}
                      onClick={() => toggle(i.id, reposts, setReposts)}
                    >
                      <Repeat2 />
                      {reposts.includes(i.id) ? 1 : 0}
                    </button>
                    <button
                      aria-label={"点赞" + i.title}
                      aria-pressed={isLiked(i.id)}
                      onClick={() => {
                        toggle(i.id, likes, setLikes);
                        p.onUi?.("liked-" + i.id, !isLiked(i.id));
                      }}
                    >
                      <Heart fill={isLiked(i.id) ? "#f91880" : "none"} />
                      {i.likes + (isLiked(i.id) ? 1 : 0)}
                    </button>
                    <span>
                      <BarChart2 />
                      {i.meta.views || "—"}
                    </span>
                    <button
                      aria-label={"收藏" + i.title}
                      aria-pressed={isSaved(i.id)}
                      onClick={() => {
                        toggle(i.id, marks, setMarks);
                        p.onUi?.("saved-" + i.id, !isSaved(i.id));
                      }}
                    >
                      <Bookmark />
                    </button>
                    <button aria-label="分享" onClick={() => p.onItem(i)}>
                      <Share />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          {!p.items.length && <Blank />}
        </div>
        <nav className="kzxnav">
          {[Home, Search, Bell, MessageCircle].map((Icon, n) => (
            <button
              key={n}
              aria-label={["时间线", "搜索", "通知", "私信"][n]}
              onClick={() => n < 2 && setTab(n ? "搜索" : "推荐")}
              disabled={n > 1}
            >
              <Icon />
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
