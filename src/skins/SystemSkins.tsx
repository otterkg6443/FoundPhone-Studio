export { WeatherSkin, HealthSkin } from "./CalibratedSystemApps";
import { AudioPlayer, useTrack } from "../audio";
import { setNowPlayingTrack } from "../mediaSession";
import { YouTubeTrackPlayer } from "../YouTubeTrackPlayer";
import { useSkinState } from "../skinState";
import {
  Calendar,
  Camera,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Folder,
  Globe,
  Grid,
  Heart,
  Image,
  LockKeyhole,
  MapPin,
  Music,
  Phone,
  Plus,
  Search,
  SkipForward,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { download } from "../io";
import { safeMedia, type Item } from "../schema";
import {
  Add,
  Avatar,
  Empty,
  groupItems,
  Header,
  Media,
  meta,
  Row,
  SearchBox,
  Tabs,
  useContent,
  type Props,
} from "./shared";
export function PhoneSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "最近通话");
  const [digits, setDigits] = useState(""),
    [call, setCall] = useState("");
  const list = tab === "收藏" ? items.filter((i) => i.favorite) : items;
  return (
    <div className="catalog-skin native-phone">
      <Header p={p} />
      <div className="catalog-scroll">
        <h1>{tab}</h1>
        {tab === "拨号键盘" ? (
          <div className="dialer">
            <output>{digits || "输入号码"}</output>
            <div>
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map(
                (k) => (
                  <button key={k} onClick={() => setDigits((s) => s + k)}>
                    {k}
                    <small>
                      {
                        (
                          {
                            "2": "ABC",
                            "3": "DEF",
                            "4": "GHI",
                            "5": "JKL",
                            "6": "MNO",
                            "7": "PQRS",
                            "8": "TUV",
                            "9": "WXYZ",
                          } as Record<string, string>
                        )[k]
                      }
                    </small>
                  </button>
                ),
              )}
            </div>
            <button
              className="dial-call"
              disabled={!digits}
              aria-label="模拟拨号"
              onClick={() => {
                setCall(digits);
                const i = items.find((i) => meta(i, "number") === digits);
                if (i) p.onRead(i.id);
              }}
            >
              <Phone size={24} />
            </button>
            <button onClick={() => setDigits((s) => s.slice(0, -1))}>
              删除
            </button>
          </div>
        ) : (
          <>
            <SearchBox value={q} set={setQ} />
            {list.map((i) => (
              <button
                className={`call-row ${meta(i, "status") === "未接" ? "missed" : ""}`}
                key={i.id}
                onClick={() => p.onItem(i)}
              >
                <Phone size={17} />
                <span>
                  <strong>{i.title}</strong>
                  <small>
                    {meta(i, "number", i.sender)} ·{" "}
                    {meta(i, "status", "通话记录")}
                  </small>
                </span>
                <time>{i.time.slice(5, 10)}</time>
              </button>
            ))}
            <Empty items={list} />
          </>
        )}
      </div>
      <Tabs
        tabs={["收藏", "最近通话", "通讯录", "拨号键盘"]}
        value={tab}
        set={setTab}
        icons={[<Star />, <Clock />, <Users />, <Grid />]}
      />
      {call && (
        <div className="virtual-call">
          <small>虚拟通话</small>
          <Avatar name={call} />
          <h2>{call}</h2>
          <p>这是作品内的通话模拟</p>
          <button aria-label="挂断" onClick={() => setCall("")}>
            <Phone />
          </button>
        </div>
      )}
    </div>
  );
}
export function ContactsSkin(p: Props) {
  const { q, setQ, items } = useContent(p, "所有联系人");
  return (
    <div className="catalog-skin native-contacts">
      <Header p={p} />
      <div className="catalog-scroll">
        <h1>通讯录</h1>
        <SearchBox value={q} set={setQ} />
        <button
          className="contact-self"
          onClick={() => {
            if (items[0]) p.onItem(items[0]);
            else if (p.creator) p.onAdd();
          }}
        >
          <Avatar name={p.owner ?? "我"} />
          <span>
            <strong>{p.owner ?? "我的名片"}</strong>
            <small>我的名片</small>
          </span>
        </button>
        {groupItems(items, "所有联系人").map((g) => (
          <section key={g}>
            <h4 className="native-section">{g}</h4>
            {items
              .filter((i) => (i.folder || "所有联系人") === g)
              .sort((a, b) => a.title.localeCompare(b.title, "zh-CN"))
              .map((i) => (
                <Row
                  key={i.id}
                  item={i}
                  onItem={p.onItem}
                  leading={<Avatar name={i.title} />}
                />
              ))}
          </section>
        ))}
        <Empty items={items} />
      </div>
    </div>
  );
}
const galleryPhotoOrder = [
  "photo-bamby3",
  "photo-eat-2",
  "photo-e4",
  "photo-bamby-uniform",
  "photo-eb3",
  "photo-pai-2",
  "photo-e1",
  "photo-takeout",
  "photo-bamby4",
  "photo-eb1",
  "photo-eat-4",
  "photo-e3",
  "photo-pai",
  "photo-eb5",
  "photo-bamby-hoodie",
  "photo-e5",
  "photo-eat-1",
  "photo-eb2",
  "photo-eunho-bamby-cafe",
  "photo-e2",
  "photo-eb4",
  "photo-eat-3",
];
const galleryPhotoRank = new Map(
  galleryPhotoOrder.map((id, index) => [id, index]),
);
export function PhotosSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "图库");
  const [album, setAlbum] = useState("");
  const list =
    tab === "收藏"
      ? items.filter((i) => i.favorite)
      : album
        ? items.filter((i) => (i.folder || "未分类") === album)
        : items;
  const displayList =
    tab === "图库" && !album
      ? [...list].sort(
          (a, b) =>
            (galleryPhotoRank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
            (galleryPhotoRank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
        )
      : list;
  return (
    <div className="catalog-skin native-photos">
      <Header p={p} />
      <div className="catalog-scroll">
        <h1>{album || tab}</h1>
        {tab === "相簿" && !album ? (
          <div className="album-grid">
            {groupItems(items, "未分类").map((g) => (
              <button key={g} onClick={() => setAlbum(g)}>
                <Media
                  item={items.find((i) => (i.folder || "未分类") === g)!}
                />
                <strong>{g}</strong>
                <small>
                  {items.filter((i) => (i.folder || "未分类") === g).length} 项
                </small>
              </button>
            ))}
          </div>
        ) : (
          <>
            <SearchBox value={q} set={setQ} />
            <div className="photo-mosaic">
              {displayList.map((i) => (
                <button
                  aria-label={`查看${i.title}`}
                  key={i.id}
                  onClick={() => p.onItem(i)}
                >
                  <Media item={i} />
                  {i.favorite && <Heart size={12} fill="white" />}
                </button>
              ))}
            </div>
            <p className="media-count">{list.length} 个项目</p>
          </>
        )}
        <Empty items={list} />
      </div>
      <Tabs
        tabs={["图库", "相簿", "收藏"]}
        value={tab}
        set={(t) => {
          setTab(t);
          setAlbum("");
        }}
        icons={[<Image />, <Folder />, <Heart />]}
      />
    </div>
  );
}
export function CameraSkin(p: Props) {
  const [mode, setMode] = useState("照片"),
    [index, setIndex] = useState(0);
  const frames = p.items.filter((i) =>
    mode === "视频" ? i.kind === "video" : i.kind !== "video",
  );
  const frame = frames[index % Math.max(frames.length, 1)];
  return (
    <div className="catalog-skin native-camera">
      <Header p={p} />
      <div className="camera-top">
        <span>闪光灯关闭</span>
        <span>{mode === "视频" ? "HD · 30" : "4:3"}</span>
      </div>
      <div className="camera-view">
        {frame ? <Media item={frame} /> : <p>未设置取景画面</p>}
        <div className="camera-grid" />
      </div>
      <div className="camera-mode">
        {["视频", "照片"].map((m) => (
          <button
            className={mode === m ? "selected" : ""}
            key={m}
            onClick={() => {
              setMode(m);
              setIndex(0);
            }}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="camera-controls">
        <button
          aria-label="查看上一画面"
          disabled={!frames.length}
          onClick={() => setIndex((i) => (i + 1) % frames.length)}
        >
          <Image size={24} />
        </button>
        <button
          className="camera-shutter"
          aria-label={p.creator ? "编辑拍摄画面" : "查看拍摄内容"}
          disabled={!p.creator && !frame}
          onClick={() => (p.creator ? p.onAdd() : frame && p.onItem(frame))}
        >
          <span />
        </button>
        <button
          aria-label="切换取景画面"
          disabled={frames.length < 2}
          onClick={() => setIndex((i) => i + 1)}
        >
          <Camera size={24} />
        </button>
      </div>
      <small className="camera-caption">作者设置的虚构取景内容</small>
    </div>
  );
}
export function SafariSkin(p: Props) {
  const [q, setQ] = useState(""),
    [tab, setTab] = useState("书签");
  const items = p.items
    .filter((i) =>
      (i.title + i.body + meta(i, "url"))
        .toLowerCase()
        .includes(q.toLowerCase()),
    )
    .filter((i) =>
      tab === "书签"
        ? i.favorite || i.folder !== "历史记录"
        : i.folder === "历史记录",
    );
  return (
    <div className="catalog-skin native-safari">
      <Header p={p} />
      <div className="catalog-scroll">
        <h1>{tab}</h1>
        <div className="safari-favorites">
          {items.map((i) => (
            <button key={i.id} onClick={() => p.onItem(i)}>
              <span>
                <Globe size={28} />
              </span>
              <strong>{i.title}</strong>
              <small>{meta(i, "url")}</small>
            </button>
          ))}
        </div>
        <Empty items={items} label="没有匹配的虚构网页" />
      </div>
      <label className="safari-address">
        <LockKeyhole size={13} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索或输入虚构网址"
          aria-label="地址栏"
          onKeyDown={(e) => {
            if (e.key === "Enter" && items[0]) p.onItem(items[0]);
          }}
        />
        <Search size={16} />
      </label>
      <Tabs
        tabs={["书签", "历史记录"]}
        value={tab}
        set={setTab}
        icons={[<Globe />, <Clock />]}
      />
    </div>
  );
}
export function NotesSkin(p: Props) {
  const { q, setQ, items } = useContent(p, "备忘录");
  const [folder, setFolder] = useState<string | null>(null);
  const list = folder
    ? items.filter((i) => (i.folder || "备忘录") === folder)
    : items;
  return (
    <div className="catalog-skin native-notes">
      <Header p={p} />
      <div className="catalog-scroll">
        <button className="notes-back" onClick={() => setFolder(null)}>
          <Folder size={17} />
          文件夹
        </button>
        <h1>{folder || "所有备忘录"}</h1>
        <SearchBox value={q} set={setQ} />
        {!folder && (
          <div className="note-folders">
            {groupItems(items, "备忘录").map((g) => (
              <button key={g} onClick={() => setFolder(g)}>
                <Folder size={17} />
                {g}
                <small>
                  {items.filter((i) => (i.folder || "备忘录") === g).length}
                </small>
              </button>
            ))}
          </div>
        )}
        <div className="notes-list">
          {list.map((i) => (
            <button key={i.id} onClick={() => p.onItem(i)}>
              <strong>
                {i.password && <LockKeyhole size={12} />} {i.title}
              </strong>
              <p>
                <time>{i.time.slice(5, 10)}</time>{" "}
                {i.password ? "已锁定的备忘录" : i.body.split("\n")[0]}
              </p>
              <small>{i.folder}</small>
            </button>
          ))}
        </div>
        <Empty items={list} />
      </div>
      <div className="notes-footer">
        <span>{list.length} 则备忘录</span>
        <Add p={p} label="新建备忘录" />
      </div>
    </div>
  );
}
export function CalendarSkin(p: Props) {
  const [month, setMonth] = useState(2),
    [year, setYear] = useState(2026),
    [day, setDay] = useState(16);
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const selectedDate = `${prefix}-${String(day).padStart(2, "0")}`;
  const list = p.items
    .filter((item) => item.time.startsWith(selectedDate))
    .sort((a, b) => a.time.localeCompare(b.time));
  const eventsOnDate = (date: string) => p.items.filter((item) => item.time.startsWith(date));
  const move = (delta: number) => {
    const date = new Date(Date.UTC(year, month + delta, 1));
    setYear(date.getUTCFullYear());
    setMonth(date.getUTCMonth());
    setDay(1);
  };
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  const selectedDateLabel = `${month + 1}月${day}日 ${weekdays[new Date(Date.UTC(year, month, day, 12)).getUTCDay()]}`;
  return (
    <div className="catalog-skin native-calendar apple-calendar">
      <Header p={p}>
        <button type="button" aria-label="今天" className="calendar-today-button" onClick={() => { setYear(2026); setMonth(2); setDay(16); }}>今天</button>
        <button type="button" aria-label="添加日程" onClick={p.onAdd}><Plus size={20} /></button>
      </Header>
      <div className="catalog-scroll">
        <div className="calendar-month-toolbar">
          <h1>{year}年{month + 1}月</h1>
          <div>
            <button type="button" aria-label="上个月" onClick={() => move(-1)}><ChevronLeft size={21} /></button>
            <button type="button" aria-label="下个月" onClick={() => move(1)}><ChevronRight size={21} /></button>
          </div>
        </div>
        <div className="calendar-grid">
          {["日", "一", "二", "三", "四", "五", "六"].map((weekday) => (
            <small key={weekday}>{weekday}</small>
          ))}
          {Array.from({ length: first }, (_, index) => <span key={"blank-" + index} />)}
          {Array.from({ length: days }, (_, index) => {
            const date = `${prefix}-${String(index + 1).padStart(2, "0")}`;
            const dayEvents = eventsOnDate(date);
            return (
              <button
                type="button"
                className={day === index + 1 ? "selected" : ""}
                key={date}
                onClick={() => setDay(index + 1)}
                aria-label={`${month + 1}月${index + 1}日${dayEvents.length ? "，有日程" : ""}`}
              >
                {index + 1}
                {dayEvents.length > 0 && <i style={{ backgroundColor: dayEvents[0].meta.calendarColor || "#0a84ff" }} />}
              </button>
            );
          })}
        </div>
        <div className="calendar-agenda-heading">
          <h2>{selectedDateLabel}</h2>
          <span>{list.length ? `${list.length}项日程` : "无日程"}</span>
        </div>
        <div className="calendar-agenda-list">
          {list.map((item) => (
            <button className="calendar-event" key={item.id} onClick={() => p.onItem(item)}>
              <time>{item.meta.allDay === "true" ? "全天" : item.time.slice(-5)}</time>
              <div style={{ borderLeftColor: item.meta.calendarColor || "#0a84ff" }}>
                <strong>{item.title}</strong>
                {item.body && <p>{item.body}</p>}
                {item.meta.location && <p>{item.meta.location}</p>}
              </div>
            </button>
          ))}
          {!list.length && <div className="calendar-empty"><Calendar size={24} /><span>这一天没有日程</span></div>}
        </div>
        <Add p={p} label="添加日程" />
      </div>
    </div>
  );
}
export function MailSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "收件箱");
  const list = items.filter(
    (i) =>
      tab === "全部邮件" ||
      i.folder === tab ||
      (tab === "收件箱" &&
        (!i.folder || !["草稿", "已发送"].includes(i.folder))),
  );
  return (
    <div className="catalog-skin native-mail">
      <Header p={p} />
      <div className="mail-folders">
        {["收件箱", "草稿", "已发送", "全部邮件"].map((t) => (
          <button
            key={t}
            className={tab === t ? "selected" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="catalog-scroll">
        <h1>{tab}</h1>
        <SearchBox value={q} set={setQ} />
        {list.map((i) => (
          <button
            className="mail-preview"
            key={i.id}
            onClick={() => p.onItem(i)}
          >
            <i className={!i.read ? "unread" : ""} />
            <div>
              <strong>{i.sender}</strong>
              <h3>{i.title}</h3>
              <p>{i.body}</p>
            </div>
            <time>{i.time.slice(5, 10)}</time>
          </button>
        ))}
        <Empty items={list} />
      </div>
      <footer className="mail-footer">
        <span>{list.length} 封邮件</span>
        <Add p={p} label="写邮件" />
      </footer>
    </div>
  );
}
export function ClockSkin(p: Props) {
  const { tab, setTab, items } = useContent(p, "闹钟");
  const [enabled, setEnabled] = useSkinState<string[]>(p, "alarms", []),
    [seconds, setSeconds] = useState(0),
    [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);
  return (
    <div className="catalog-skin native-clock">
      <Header p={p} />
      <div className="catalog-scroll">
        <h1>{tab}</h1>
        {tab === "秒表" ? (
          <div className="stopwatch">
            <output>
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:
              {String(seconds % 60).padStart(2, "0")}
            </output>
            <div>
              <button
                onClick={() => {
                  setSeconds(0);
                  setRunning(false);
                }}
              >
                复位
              </button>
              <button onClick={() => setRunning(!running)}>
                {running ? "暂停" : "开始"}
              </button>
            </div>
          </div>
        ) : (
          items.map((i) => (
            <div className="alarm-row" key={i.id}>
              <button onClick={() => p.onItem(i)}>
                <time>{meta(i, "clock", i.time.slice(-5))}</time>
                <small>
                  {tab === "世界时钟" ? meta(i, "city", i.title) : i.title}
                </small>
              </button>
              {tab === "闹钟" ? (
                <button
                  role="switch"
                  aria-label={`闹钟${i.title}`}
                  aria-checked={enabled.includes(i.id)}
                  className={`native-switch ${enabled.includes(i.id) ? "on" : ""}`}
                  onClick={() =>
                    setEnabled(
                      enabled.includes(i.id)
                        ? enabled.filter((x) => x !== i.id)
                        : [...enabled, i.id],
                    )
                  }
                >
                  <span />
                </button>
              ) : (
                <Clock size={35} />
              )}
            </div>
          ))
        )}
      </div>
      <Tabs
        tabs={["世界时钟", "闹钟", "秒表"]}
        value={tab}
        set={setTab}
        icons={[<Globe />, <Clock />, <Clock />]}
      />
    </div>
  );
}
function reminderDateLabel(value: string) {
  const match = /^(\\d{4})-(\\d{2})-(\\d{2})/.exec(value);
  if (!match) return value;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()];
  return `${month}月${day}日 ${weekday}`;
}

export function RemindersSkin(p: Props) {
  const { q, setQ, items } = useContent(p, "提醒事项");
  const [checked, setChecked] = useSkinState<string[]>(p, "checked", []);
  const [view, setView] = useState("已计划");
  const today = "2026-03-16";
  const openItems = items.filter((item) => !checked.includes(item.id));
  const todayItems = openItems.filter((item) => item.time.startsWith(today));
  const list = view === "已完成"
    ? items.filter((item) => checked.includes(item.id))
    : view === "今天"
      ? todayItems
      : view === "全部"
        ? items
        : openItems;
  const categories = [
    { title: "今天", count: todayItems.length, icon: Calendar, color: "#ff3b30" },
    { title: "已计划", count: openItems.length, icon: Calendar, color: "#0a84ff" },
    { title: "全部", count: items.length, icon: List, color: "#8e8e93" },
    { title: "已完成", count: checked.length, icon: CheckCircle, color: "#34c759" },
  ];
  return (
    <div className="catalog-skin native-reminders apple-reminders">
      <Header p={p}>
        <button type="button" aria-label="新提醒事项" onClick={p.onAdd}><Plus size={20} /></button>
      </Header>
      <div className="catalog-scroll reminders-scroll">
        <div className="reminders-large-title">
          <h1>提醒事项</h1>
          <button type="button" aria-label="搜索提醒事项" onClick={() => setQ(q ? "" : " ")}><Search size={21} /></button>
        </div>
        <div className="reminder-categories">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                type="button"
                key={category.title}
                className={view === category.title ? "active" : ""}
                onClick={() => setView(category.title)}
                style={{ "--reminder-color": category.color } as React.CSSProperties}
              >
                <Icon size={24} strokeWidth={2.4} />
                <strong>{category.count}</strong>
                <span>{category.title}</span>
              </button>
            );
          })}
        </div>
        <div className="reminders-search">
          <SearchBox value={q} set={setQ} placeholder="搜索提醒事项" />
        </div>
        <div className="reminders-list-heading">
          <h2>{view}</h2>
          <span>{list.length}项</span>
        </div>
        <div className="reminders-list">
          {list.map((item) => {
            const done = checked.includes(item.id);
            return (
              <div className={"reminder-row " + (done ? "is-complete" : "")} key={item.id}>
                <button
                  type="button"
                  aria-label={done ? `取消完成${item.title}` : `完成${item.title}`}
                  role="checkbox"
                  aria-checked={done}
                  onClick={() => setChecked(done ? checked.filter((id) => id !== item.id) : [...checked, item.id])}
                >
                  <CheckCircle size={22} />
                </button>
                <button type="button" className="reminder-detail" onClick={() => p.onItem(item)}>
                  <strong>{item.title}</strong>
                  <small><Calendar size={12} /> {reminderDateLabel(item.time)}{item.meta.allDay === "true" ? " · 全天" : ""}</small>
                  {item.body && <p>{item.body}</p>}
                </button>
              </div>
            );
          })}
          {!list.length && <div className="reminders-empty">没有提醒事项</div>}
        </div>
        <Add p={p} label="新提醒事项" />
      </div>
    </div>
  );
}
export function FilesSkin(p: Props) {
  const { tab, setTab, q, setQ, items } = useContent(p, "最近项目");
  const [folder, setFolder] = useState("");
  const list = folder
    ? items.filter((i) => (i.folder || "我的iPhone") === folder)
    : items;
  return (
    <div className="catalog-skin native-files">
      <Header p={p} />
      <div className="catalog-scroll">
        <h1>{folder || tab}</h1>
        <SearchBox value={q} set={setQ} />
        {tab === "浏览" && !folder ? (
          <div className="file-folders">
            {groupItems(items, "我的iPhone").map((g) => (
              <button key={g} onClick={() => setFolder(g)}>
                <Folder size={45} />
                <strong>{g}</strong>
              </button>
            ))}
          </div>
        ) : (
          <div className="file-grid">
            {list.map((i) => (
              <div key={i.id}>
                <button onClick={() => p.onItem(i)}>
                  {i.media ? <Media item={i} /> : <FileText size={49} />}
                  <strong>{i.title}</strong>
                  <small>
                    {meta(i, "extension", "文件")} ·{" "}
                    {meta(i, "size", i.time.slice(0, 10))}
                  </small>
                </button>
                <button
                  aria-label={`下载${i.title}文本`}
                  onClick={() =>
                    download(
                      new Blob([i.body], { type: "text/plain" }),
                      `${i.title}.txt`,
                    )
                  }
                >
                  <Download size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        <Empty items={list} />
      </div>
      <Tabs
        tabs={["最近项目", "浏览"]}
        value={tab}
        set={(t) => {
          setTab(t);
          setFolder("");
        }}
        icons={[<Clock />, <Folder />]}
      />
    </div>
  );
}
export function MusicSkin(p: Props) {
  const { tab, setTab, items } = useContent(p, "资料库");
  const [song, setSong] = useTrack(p, items);
  const [playlist, setPlaylist] = useState("");
  const [autoPlayNext, setAutoPlayNext] = useState(false);
  const list = playlist ? items.filter((i) => (i.folder || "我的音乐") === playlist) : items;
  const rawVideoId = song ? meta(song, "youtubeId") : "";
  const youtubeId = /^[A-Za-z0-9_-]{11}$/.test(rawVideoId) ? rawVideoId : "";
  const searchQuery = song ? meta(song, "youtubeSearch", "PLAVE " + song.title + " official audio") : "";
  const musicSearchUrl = song ? "https://music.youtube.com/search?q=" + encodeURIComponent(searchQuery) : "";
  const goPrevious = useCallback((shouldPlay = false) => {
    if (!list.length) return;
    const currentIndex = list.findIndex((i) => i.id === song?.id);
    setAutoPlayNext(shouldPlay);
    setSong(list[(currentIndex - 1 + list.length) % list.length]);
  }, [list, song, setSong]);
  const goNext = useCallback((shouldPlay = false) => {
    if (!list.length) return;
    const currentIndex = list.findIndex((i) => i.id === song?.id);
    setAutoPlayNext(shouldPlay);
    setSong(list[(currentIndex + 1 + list.length) % list.length]);
  }, [list, song, setSong]);
  useEffect(() => {
    if (!song) return;
    setNowPlayingTrack({
      trackKey: song.id, title: song.title,
      artist: meta(song, "artist", song.sender || "PLAVE"),
      album: meta(song, "album", song.folder || "PLAVE"),
      artwork: meta(song, "artwork"),
    });
  }, [song]);
  return (
    <div className="catalog-skin native-music">
      <Header p={p} />
      <div className="catalog-scroll">
        <h1>{playlist || (tab === "资料库" ? "PLAVE" : "歌单")}</h1>
        {tab === "资料库" && <p className="music-library-subtitle">{items.length} 首曲目 · 按发行专辑整理</p>}
        {tab === "歌单" && !playlist ? (
          <div className="music-albums">
            {groupItems(items, "我的音乐").map((g) => {
              const coverTrack = items.find((i) => (i.folder || "我的音乐") === g);
              const art = meta(coverTrack, "artwork");
              return (
                <button key={g} onClick={() => setPlaylist(g)}>
                  <span className="music-album-art">
                    {art ? <img src={art} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <Music size={43} />}
                  </span>
                  <strong>{g}</strong>
                  <small>{items.filter((i) => (i.folder || "我的音乐") === g).length} 首</small>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            {playlist && <button className="music-playlist-back" onClick={() => setPlaylist("")}><ChevronLeft size={16} />全部歌单</button>}
            {list.map((i, n) => {
              const art = meta(i, "artwork");
              return (
                <button className={song?.id === i.id ? "music-track active" : "music-track"} key={i.id} aria-pressed={song?.id === i.id}
                  onClick={() => { setAutoPlayNext(false); setSong(i); }}>
                  <small>{song?.id === i.id ? "▶" : n + 1}</small>
                  {art ? <img className="plave-track-art" src={art} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="plave-track-art-fallback"><Music size={16} /></span>}
                  <span>
                    <strong>{i.title}</strong>
                    <small>{i.sender} · {meta(i, "album", i.folder || "PLAVE")}</small>
                  </span>
                  <span>{meta(i, "sourceType", meta(i, "youtubeId") ? "官方音源" : "YouTube Music 搜索")}</span>
                </button>
              );
            })}
          </>
        )}
        <Empty items={tab === "歌单" && !playlist ? [] : list} />
      </div>
      {song && (
        <div className={"native-now-playing" + (youtubeId ? " has-video" : "")}>
          <div className="native-now-playing-header">
            <div className="native-now-playing-title">
              {meta(song, "artwork") ? <img className="plave-current-art" src={meta(song, "artwork")} alt="" referrerPolicy="no-referrer" /> : <Music size={18} />}
              <span><strong>{song.title}</strong><small>{meta(song, "album", song.folder || "PLAVE")}</small></span>
            </div>
            <div className="native-track-controls">
              <button aria-label="上一首" onClick={() => goPrevious(true)}><SkipForward size={17} style={{ transform: "rotate(180deg)" }} /></button>
              <button aria-label="下一首" onClick={() => goNext(true)}><SkipForward size={18} /></button>
            </div>
          </div>
          {youtubeId ? (
            <YouTubeTrackPlayer key={song.id} item={song} videoId={youtubeId} musicSearchUrl={musicSearchUrl} autoPlay={autoPlayNext}
              onPrevious={goPrevious} onNext={goNext} onAutoPlayConsumed={() => setAutoPlayNext(false)} />
          ) : song.kind === "audio" && safeMedia(song.media) ? (
            <AudioPlayer p={p} item={song} />
          ) : (
            <div className="native-music-search-fallback">
              {meta(song, "artwork") ? <img className="plave-track-art" src={meta(song, "artwork")} alt="" referrerPolicy="no-referrer" /> : <Music size={22} />}
              <div>
                <strong>{meta(song, "sourceType", "YouTube Music 搜索")}</strong>
                <small>{meta(song, "sourceType") === "CD Only" ? "该曲目标注为 CD Only，目前没有确认可内嵌的官方在线音源。" : "这首曲目暂未找到可验证的官方嵌入 ID，可从 YouTube Music 官方搜索入口播放。"}</small>
              </div>
              <a href={musicSearchUrl} target="_blank" rel="noopener noreferrer">打开</a>
            </div>
          )}
        </div>
      )}
      <Tabs tabs={["资料库", "歌单"]} value={tab} set={(t) => { setTab(t); setPlaylist(""); }} icons={[<Music />, <Folder />]} />
    </div>
  );
}
function LocationMap({
  items,
  onItem,
  find = false,
}: {
  items: Item[];
  onItem: (i: Item) => void;
  find?: boolean;
}) {
  return (
    <div className={`fiction-map ${find ? "find-map" : ""}`}>
      <svg viewBox="0 0 300 300" aria-label="原创虚构地图">
        <rect width="300" height="300" fill="#e4e5d8" />
        {[35, 100, 190, 260].map((n) => (
          <path
            key={n}
            d={`M0 ${n} H300 M${n} 0 V300`}
            stroke="#fff"
            strokeWidth="11"
          />
        ))}
        <path
          d="M20 0 Q190 110 120 300"
          stroke="#b6d8df"
          strokeWidth="24"
          fill="none"
        />
        <rect x="205" y="112" width="42" height="65" rx="7" fill="#bdcfac" />
      </svg>
      {items.map((i, n) => (
        <button
          key={i.id}
          aria-label={`地图位置${i.title}`}
          className="map-pin"
          style={{
            left: `${Math.max(5, Math.min(90, Number(meta(i, "x", String(20 + ((n * 17) % 65))))))}%`,
            top: `${Math.max(8, Math.min(80, Number(meta(i, "y", String(25 + ((n * 13) % 50))))))}%`,
          }}
          onClick={() => onItem(i)}
        >
          {find ? <Avatar name={i.title} /> : <MapPin size={24} />}
        </button>
      ))}
    </div>
  );
}
export function MapsSkin(p: Props) {
  const { q, setQ, items } = useContent(p, "地点");
  return (
    <div className="catalog-skin native-maps">
      <Header p={p} />
      <LocationMap items={items} onItem={p.onItem} />
      <div className="map-sheet">
        <SearchBox value={q} set={setQ} placeholder="搜索虚构地点" />
        <div className="map-places">
          {items.map((i) => (
            <Row key={i.id} item={i} onItem={p.onItem} leading={<MapPin />} />
          ))}
        </div>
      </div>
    </div>
  );
}
export function WalletSkin(p: Props) {
  const [selected, setSelected] = useState("");
  const cards = p.items.filter((i) => i.folder !== "交易"),
    transactions = p.items.filter((i) => i.folder === "交易");
  return (
    <div className="catalog-skin native-wallet">
      <Header p={p} />
      <div className="catalog-scroll">
        <h1>钱包</h1>
        <div className="wallet-stack">
          {cards.map((i, n) => (
            <button
              key={i.id}
              className={selected === i.id ? "selected" : ""}
              style={{
                background: ["#252d38", "#716456", "#4a655d", "#735e6b"][n % 4],
              }}
              onClick={() => {
                setSelected(i.id);
                p.onItem(i);
              }}
            >
              <strong>{i.title}</strong>
              <span>{meta(i, "number", "••••")}</span>
              <small>{meta(i, "amount", i.sender)}</small>
            </button>
          ))}
        </div>
        <h4 className="native-section">交易记录</h4>
        {transactions.map((i) => (
          <Row key={i.id} item={i} onItem={p.onItem} leading={<Wallet />}>
            <strong>{meta(i, "amount")}</strong>
          </Row>
        ))}
        <Empty items={p.items} />
      </div>
    </div>
  );
}
export function FindSkin(p: Props) {
  const { tab, setTab, items } = useContent(p, "设备");
  const list = items.filter((i) =>
    tab === "设备" ? i.folder !== "人物" : i.folder === "人物",
  );
  return (
    <div className="catalog-skin native-find">
      <Header p={p} />
      <LocationMap items={list} onItem={p.onItem} find />
      <div className="find-sheet">
        <h2>{tab}</h2>
        {list.map((i) => (
          <Row
            key={i.id}
            item={i}
            onItem={p.onItem}
            leading={<Avatar name={i.title} />}
          >
            {meta(i, "status", "位置记录")}
          </Row>
        ))}
        <Empty items={list} />
      </div>
      <Tabs
        tabs={["人物", "设备"]}
        value={tab}
        set={setTab}
        icons={[<Users />, <MapPin />]}
      />
    </div>
  );
}
