import { StatusGlyph } from "./ios/StatusGlyph";
import { SocialDetail, socialDetailApps } from "./skins/SocialDetails";
import { NativeCalculator } from "./ios/Calculator";
import { HomeLauncher } from "./launcher/HomeLauncher";
import { useDeviceLayout } from "./launcher/layout";
import "./launcher/launcher.css";
import { NativeDetail, nativeDetailApps } from "./ios/Details";
import "./ios/details.css";
import {
  SystemNotifications,
  notificationContent,
} from "./SystemNotifications";
import {
  readLauncherOrigin,
  AppWindow,
  screenOrigin,
} from "./vendor/ios-web/Launcher";
import {
  DeviceLock,
  ControlCenter,
  DeviceKeyboard,
  KeyboardContext,
  NativeSettings,
  type DeviceKeyboardOptions,
} from "./DeviceSystem";
import { AppArtwork, hasNativeArtwork } from "./AppArtwork";
import { getFields } from "./fields";
import { catalogSkins } from "./skins/catalog";
import "./skins/skins.css";
import "./ios18.css";
import "./device-system.css";
import "./ios/tokens.css";
import "./ios/reference.css";
import "./ios/status-bar.css";
import { WeChatSkin, WhatsAppSkin } from "./AppSkins";
import { RichText } from "./RichText";
import {
  useEffect,
  useState,
  useRef,
  Suspense,
  type CSSProperties,
} from "react";
import { AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  Plus,
  Search,
  LockKeyhole,
  Heart,
  MessageCircle,
  MoreHorizontal,
  ArrowUp,
  Folder,
  Phone as PhoneIcon,
} from "lucide-react";
import { getApp, type AppPlugin } from "./registry";
import {
  initialRuntime,
  makeItem,
  safeMedia,
  type Work,
  type Item,
  type Runtime,
  type UiValue,
} from "./schema";
import { dispatch, choose, visible, advance } from "./engine";
import { db } from "./persistence";
export function AppIcon({
  id,
  name,
  small = false,
  custom = "",
  date,
  time,
  badge = 0,
}: {
  id: string;
  name?: string;
  small?: boolean;
  custom?: string;
  date?: string;
  time?: string;
  badge?: number;
}) {
  const a = getApp(id);
  const Icon = a.icon;
  return (
    <span className={`app-icon-wrap ${small ? "small" : ""}`}>
      <span className="app-icon" style={{ background: a.color }}>
        {custom ? (
          safeMedia(custom) ? (
            <img src={safeMedia(custom)} alt="自定义图标" />
          ) : (
            <span>{custom.slice(0, 2)}</span>
          )
        ) : hasNativeArtwork(id) ? (
          <AppArtwork id={id} date={date} time={time} />
        ) : (
          <Icon size={small ? 21 : 28} strokeWidth={1.65} />
        )}
      </span>
      {badge > 0 && (
        <b className="app-icon-badge" aria-label={`${badge} 条未读消息`}>
          {badge > 99 ? "99+" : badge}
        </b>
      )}
      {name && <span className="app-name">{name}</span>}
    </span>
  );
}
type PhoneProps = Omit<Parameters<typeof PhoneRuntime>[0], "deviceLayout">;
type PhoneSession = { revision: number; locked: boolean; app: string; ui?: Runtime["ui"] };
function readPhoneSession(work: Work, creator: boolean): PhoneSession {
  const fallback = { revision: work.updatedAt, locked: !creator, app: "" };
  if (creator || typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(
      `foundphone-phone-session-v1:${work.id}`,
    );
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Partial<PhoneSession>;
    if (saved.revision !== work.updatedAt) return fallback;
    const app =
      typeof saved.app === "string" &&
      work.apps.some((item) => item.id === saved.app && item.installed)
        ? saved.app
        : "";
    const ui =
      saved.ui && typeof saved.ui === "object" && !Array.isArray(saved.ui)
        ? (saved.ui as Runtime["ui"])
        : undefined;
    return {
      revision: work.updatedAt,
      locked: typeof saved.locked === "boolean" ? saved.locked : true,
      app,
      ui,
    };
  } catch {
    return fallback;
  }
}
export function Phone(props: PhoneProps) {
  const deviceLayout = useDeviceLayout(props.work, props.creator);
  return (
    <PhoneRuntime
      {...props}
      work={deviceLayout.work}
      deviceLayout={deviceLayout}
    />
  );
}
function PhoneRuntime({
  deviceLayout,
  work,
  creator = false,
  onEdit,
  onAdd,
  onSettings,
  onOpen,
  runtime: external,
  onRuntime,
}: {
  deviceLayout: ReturnType<typeof useDeviceLayout>;
  work: Work;
  creator?: boolean;
  onEdit?: (app: string, item: Item) => void;
  onAdd?: (app: string) => void;
  onSettings?: () => void;
  onOpen?: (app: string) => void;
  runtime?: Runtime;
  onRuntime?: (s: Runtime) => void;
}) {
  const [sessionInitial] = useState(() => readPhoneSession(work, creator));
  const [app, setApp] = useState(sessionInitial.app);
  const [homeRequest, setHomeRequest] = useState(0);
  const [locked, setLocked] = useState(sessionInitial.locked);
  const [pinOpen, setPinOpen] = useState(false);
  const [quickCamera, setQuickCamera] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const [keyboardOptions, setKeyboardOptions] = useState<DeviceKeyboardOptions>({});
  const openKeyboard = (open: boolean, options?: DeviceKeyboardOptions) => {
    if (open && options) setKeyboardOptions(options);
    setKeyboard(open);
  };
  const [recent, setRecent] = useState<string[]>([]);
  const appSnapshots = useRef(new Map<string, HTMLElement>());
  const [banner, setBanner] = useState("");
  const noticesSeen = useRef(0);
  const notificationsInitialized = useRef(false);
  const [contextApp, setContextApp] = useState("");
  const [deviceScale, setDeviceScale] = useState(0.84);
  const shell = useRef<HTMLDivElement>(null);
  const gesture = useRef({ x: 0, y: 0, time: 0, zone: "" });
  const [launchOrigin, setLaunchOrigin] = useState(screenOrigin);

  const beginUnlock = () => {
    setPinError("");
    setQuickCamera(false);
    if (work.phone.passcode) setPinOpen(true);
    else unlock();
  };
  const pressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const gestureConsumed = useRef(false);
  const [pinError, setPinError] = useState("");
  const [folder, setFolder] = useState("");
  const [panel, setPanel] = useState("");
  const [own, setOwn] = useState(() => initialRuntime(work));
  const [ready, setReady] = useState(creator || !!external);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    const el = shell.current;
    if (!el) return;
    const fit = () => {
      setDeviceScale(
        Math.max(
          0.4,
          Math.min(
            1,
            (el.parentElement!.clientWidth - 24) / 407,
            (window.innerHeight - (creator ? 170 : external ? 150 : 40)) / 866,
          ),
        ),
      );
    };
    const observer = new ResizeObserver(fit);
    observer.observe(el.parentElement!);
    window.addEventListener("resize", fit);
    fit();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [creator, ready]);
  const s = external ?? own;
  const readWechatValue = s.ui?.wechat?.wechatReadMessageIds;
  const readWechatMessageIds = Array.isArray(readWechatValue)
    ? readWechatValue
    : [];
  const arrivedIncomingWechat = [
    ...(work.data.wechat ?? []).filter(
      (item) =>
        item.title === "당신" &&
        !item.outgoing &&
        (!item.meta?.stage || /^opening-[12]$/.test(item.meta.stage)),
    ),
    ...(s.messages.wechat ?? []).filter(
      (item) => item.title === "당신" && !item.outgoing,
    ),
  ].filter(
    (item, index, items) =>
      items.findIndex(
        (other) =>
          other.title === item.title &&
          other.body.trim() === item.body.trim() &&
          other.kind === item.kind,
      ) === index,
  );
  const unreadWechatCount = arrivedIncomingWechat.filter(
    (item) => !item.read && !readWechatMessageIds.includes(item.id),
  ).length;
  const openingWechatItems = (work.data.wechat ?? [])
    .filter(
      (item) =>
        item.title === "당신" &&
        /^opening-[12]$/.test(item.meta?.stage || ""),
    )
    .sort((a, b) =>
      (a.meta?.stage || "").localeCompare(b.meta?.stage || ""),
    )
    .slice(0, 2);
  const openingWechatNotices = openingWechatItems.map(
    (item) => `${item.sender}：${item.body}`,
  );
  const lockNotices =
    openingWechatNotices.length === 2
      ? openingWechatNotices
      : s.notifications;
  const runtimeRef = useRef(s);
  runtimeRef.current = s;
  const update = (next: Runtime) => {
    runtimeRef.current = next;
    setOwn(next);
    onRuntime?.(next);
  };
  const wechatUi = s.ui?.wechat;
  const wechatInteractionVersion = wechatUi?.wechatInteractionVersion;
  const wechatScheduleValue = wechatUi?.wechatSchedule;

  // Migrate saves created by the previous automatic-message implementation:
  // only incoming replies should ever be scheduled, and outgoing messages
  // must now be authored and sent by the player.
  useEffect(() => {
    if (
      creator ||
      !ready ||
      wechatInteractionVersion === "manual-send-v2"
    ) {
      return;
    }
    const latest = runtimeRef.current;
    const stagedIds = new Set(
      (work.data.wechat ?? [])
        .filter((item) => item.meta?.stage?.startsWith("chat-"))
        .map((item) => item.id),
    );
    const openingIds = new Set(
      (work.data.wechat ?? [])
        .filter((item) => /^opening-[12]$/.test(item.meta?.stage || ""))
        .map((item) => item.id),
    );
    const wechatState = latest.ui?.wechat ?? {};
    const oldReadIds = Array.isArray(wechatState.wechatReadMessageIds)
      ? wechatState.wechatReadMessageIds.filter(
          (id) =>
            typeof id === "string" &&
            !stagedIds.has(id) &&
            ![...stagedIds].some(
              (sourceId) =>
                id === `scheduled-${sourceId}` ||
                id === `sent-${sourceId}`,
            ),
        )
      : [];
    const cleanMessages = (latest.messages.wechat ?? []).filter(
      (item) =>
        !(
          typeof item.meta?.scheduledSourceId === "string" &&
          stagedIds.has(item.meta.scheduledSourceId)
        ),
    );
    update({
      ...latest,
      ui: {
        ...latest.ui,
        wechat: {
          ...wechatState,
          wechatInteractionVersion: "manual-send-v2",
          wechatChatStarted: false,
          wechatSentMessageIds: [],
          wechatRevealedChatIds: Array.isArray(
            wechatState.wechatRevealedChatIds,
          )
            ? wechatState.wechatRevealedChatIds.filter((id) =>
                openingIds.has(id),
              )
            : [],
          wechatReadMessageIds: oldReadIds,
          wechatSchedule: "[]",
        },
      },
      messages: {
        ...latest.messages,
        wechat: cleanMessages,
      },
    });
  }, [
    creator,
    ready,
    work.id,
    work.updatedAt,
    work.data.wechat,
    wechatInteractionVersion,
  ]);

  // A send action creates one outgoing message and schedules only its response.
  // Nothing advances merely because the chat is visible or its composer is opened.
  const sendWeChatMessage = (value: string) => {
    const body = value.trim();
    if (!body) return;
    const latest = runtimeRef.current;
    const currentUi = latest.ui?.wechat ?? {};
    const sentIds = Array.isArray(currentUi.wechatSentMessageIds)
      ? currentUi.wechatSentMessageIds
      : [];
    const outgoingStages = (work.data.wechat ?? [])
      .filter(
        (item) =>
          item.title === "당신" &&
          item.outgoing &&
          /^chat-[13]$/.test(item.meta?.stage || ""),
      )
      .sort((a, b) =>
        (a.meta?.stage || "").localeCompare(b.meta?.stage || ""),
      );
    const nextOutgoing = outgoingStages.find(
      (item) => !sentIds.includes(item.id),
    );
    const stage = nextOutgoing?.meta?.stage || "";
    const previousReplyId =
      stage === "chat-3"
        ? (work.data.wechat ?? []).find(
            (item) => item.title === "당신" && item.meta?.stage === "chat-2",
          )?.id
        : undefined;
    const previousReplyArrived =
      !previousReplyId ||
      (latest.messages.wechat ?? []).some(
        (item) => item.meta?.scheduledSourceId === previousReplyId,
      );
    const matchesScript =
      !!nextOutgoing &&
      previousReplyArrived &&
      body === nextOutgoing.body.trim();
    const timestamp = `${latest.date || work.phone.date || "2026-10-28"} ${latest.time || work.phone.time}`;
    const outgoingMessage: Item = matchesScript && nextOutgoing
      ? {
          ...nextOutgoing,
          id: `sent-${nextOutgoing.id}`,
          body,
          time: timestamp,
          sender: "我",
          avatar: "./images/owner-avatar.jpg",
          outgoing: true,
          read: true,
          meta: {
            ...Object.fromEntries(
              Object.entries(nextOutgoing.meta).filter(
                ([key]) => key !== "stage" && key !== "delayMs",
              ),
            ),
            sentSourceId: nextOutgoing.id,
          },
        }
      : {
          id: `wechat-user-${Date.now()}-${(latest.messages.wechat ?? []).length}`,
          title: "당신",
          body,
          richText: "",
          meta: {},
          time: timestamp,
          sender: "我",
          avatar: "./images/owner-avatar.jpg",
          kind: "text",
          media: "",
          hidden: false,
          unlock: "",
          password: "",
          folder: "",
          favorite: false,
          outgoing: true,
          read: true,
          likes: 0,
          comments: [],
        };

    let nextSchedule: { id: string; dueAt: number }[] = [];
    try {
      const parsed =
        typeof currentUi.wechatSchedule === "string"
          ? JSON.parse(currentUi.wechatSchedule)
          : [];
      if (Array.isArray(parsed)) {
        nextSchedule = parsed.filter(
          (entry): entry is { id: string; dueAt: number } =>
            !!entry &&
            typeof entry.id === "string" &&
            typeof entry.dueAt === "number" &&
            Number.isFinite(entry.dueAt),
        );
      }
    } catch {
      nextSchedule = [];
    }

    let nextUi: Record<string, UiValue> = {
      ...currentUi,
      wechatInteractionVersion: "manual-send-v2",
    };
    if (matchesScript && nextOutgoing) {
      const replyStage = stage === "chat-1" ? "chat-2" : "chat-4";
      const reply = (work.data.wechat ?? []).find(
        (item) => item.title === "당신" && item.meta?.stage === replyStage,
      );
      nextUi = {
        ...nextUi,
        wechatChatStarted: true,
        wechatSentMessageIds: [...sentIds, nextOutgoing.id],
      };
      if (
        reply &&
        !nextSchedule.some((entry) => entry.id === reply.id) &&
        !(latest.messages.wechat ?? []).some(
          (item) => item.meta?.scheduledSourceId === reply.id,
        )
      ) {
        nextSchedule.push({
          id: reply.id,
          dueAt: Date.now() + Math.max(0, Number(reply.meta.delayMs || "4000")),
        });
      }
      nextUi.wechatSchedule = JSON.stringify(nextSchedule);
    }

    update({
      ...latest,
      ui: {
        ...latest.ui,
        wechat: nextUi,
      },
      messages: {
        ...latest.messages,
        wechat: [...(latest.messages.wechat ?? []), outgoingMessage],
      },
    });
  };

  useEffect(() => {
    const stagedIncomingReplies = (work.data.wechat ?? [])
      .filter(
        (item) =>
          item.title === "당신" &&
          !item.outgoing &&
          /^chat-[24]$/.test(item.meta?.stage || ""),
      )
      .sort((a, b) =>
        (a.meta?.stage || "").localeCompare(b.meta?.stage || ""),
      );
    if (
      creator ||
      !ready ||
      wechatInteractionVersion !== "manual-send-v2" ||
      !stagedIncomingReplies.length
    ) {
      return;
    }

    let schedule: { id: string; dueAt: number }[] = [];
    try {
      const parsed =
        typeof wechatScheduleValue === "string"
          ? JSON.parse(wechatScheduleValue)
          : [];
      if (Array.isArray(parsed)) {
        schedule = parsed.filter(
          (entry): entry is { id: string; dueAt: number } =>
            !!entry &&
            typeof entry.id === "string" &&
            typeof entry.dueAt === "number" &&
            Number.isFinite(entry.dueAt),
        );
      }
    } catch {
      schedule = [];
    }
    const deliveredIds = new Set(
      (s.messages.wechat ?? [])
        .map((item) => item.meta?.scheduledSourceId)
        .filter((id): id is string => typeof id === "string"),
    );
    const next = schedule
      .filter(
        (entry) =>
          !deliveredIds.has(entry.id) &&
          stagedIncomingReplies.some((item) => item.id === entry.id),
      )
      .sort((a, b) => a.dueAt - b.dueAt)[0];
    if (!next) return;

    const timer = window.setTimeout(() => {
      const latest = runtimeRef.current;
      const latestUi = latest.ui?.wechat ?? {};
      let currentSchedule: { id: string; dueAt: number }[] = [];
      try {
        const parsed =
          typeof latestUi.wechatSchedule === "string"
            ? JSON.parse(latestUi.wechatSchedule)
            : [];
        if (Array.isArray(parsed)) {
          currentSchedule = parsed.filter(
            (entry): entry is { id: string; dueAt: number } =>
              !!entry &&
              typeof entry.id === "string" &&
              typeof entry.dueAt === "number" &&
              Number.isFinite(entry.dueAt),
          );
        }
      } catch {
        currentSchedule = [];
      }
      const currentDelivered = new Set(
        (latest.messages.wechat ?? [])
          .map((item) => item.meta?.scheduledSourceId)
          .filter((id): id is string => typeof id === "string"),
      );
      const dueEntries = currentSchedule
        .filter(
          (entry) =>
            entry.dueAt <= Date.now() &&
            !currentDelivered.has(entry.id) &&
            stagedIncomingReplies.some((item) => item.id === entry.id),
        )
        .sort((a, b) => a.dueAt - b.dueAt);
      if (!dueEntries.length) return;
      const deliveredMessages: Item[] = dueEntries.flatMap((entry) => {
        const source = stagedIncomingReplies.find(
          (item) => item.id === entry.id,
        );
        if (!source) return [];
        const meta = Object.fromEntries(
          Object.entries(source.meta).filter(
            ([key]) => key !== "stage" && key !== "delayMs",
          ),
        );
        return [
          {
            ...source,
            id: `scheduled-${source.id}`,
            meta: { ...meta, scheduledSourceId: source.id },
          },
        ];
      });
      const activeConversation =
        app === "wechat" && latestUi.currentThread === "당신";
      const newNotifications = activeConversation
        ? []
        : deliveredMessages.map(
            (item) => `${item.sender}：${item.body}`,
          );
      const deliveredEntryIds = new Set(dueEntries.map((entry) => entry.id));
      const remainingSchedule = currentSchedule.filter(
        (entry) => !deliveredEntryIds.has(entry.id),
      );
      update({
        ...latest,
        ui: {
          ...latest.ui,
          wechat: {
            ...latestUi,
            wechatSchedule: JSON.stringify(remainingSchedule),
          },
        },
        messages: {
          ...latest.messages,
          wechat: [...(latest.messages.wechat ?? []), ...deliveredMessages],
        },
        notifications: [
          ...latest.notifications,
          ...newNotifications,
        ],
      });
    }, Math.max(0, next.dueAt - Date.now()));

    return () => window.clearTimeout(timer);
  }, [
    creator,
    ready,
    work.id,
    work.updatedAt,
    work.data.wechat,
    wechatInteractionVersion,
    wechatScheduleValue,
    s.messages.wechat,
    app,
    locked,
    wechatUi?.currentThread,
  ]);
  useEffect(() => {
    if (creator || !ready) return;
    try {
      window.localStorage.setItem(
        `foundphone-phone-session-v1:${work.id}`,
        JSON.stringify({
          revision: work.updatedAt,
          locked,
          app: locked ? "" : app,
          ui: s.ui,
        } satisfies PhoneSession),
      );
    } catch {
      // Keep the runtime save usable even when local storage is unavailable.
    }
  }, [creator, ready, work.id, work.updatedAt, locked, app, s.ui]);
  useEffect(() => {
    let active = true;
    if (creator || external) return;
    void db.saves
      .get(work.id)
      .then((saved) => {
        if (!active) return;
        if (saved && saved.state.revision === work.updatedAt)
          setOwn({
            ...saved.state,
            ui: { ...saved.state.ui, ...sessionInitial.ui },
          });
        else {
          const started = dispatch(work, initialRuntime(work), "start");
          setOwn({ ...started, ui: sessionInitial.ui ?? started.ui });
          if (saved) setLoadError("作品已更新，已开始新的进度。");
        }
        setReady(true);
      })
      .catch(() => {
        const started = dispatch(work, initialRuntime(work), "start");
        setOwn({ ...started, ui: sessionInitial.ui ?? started.ui });
        setLoadError("无法读取本地存档。本次仍可游玩。");
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [work.id, work.updatedAt, creator, external]);
  useEffect(() => {
    if (!creator && !external && ready)
      void db.saves
        .put({ id: work.id, state: own })
        .catch(() => setLoadError("存档失败，请检查浏览器存储权限。"));
  }, [own, creator, work.id, external, ready]);
  useEffect(() => {
    if (creator || !ready) return;
    const interval = setInterval(() => {
      const previous = runtimeRef.current;
      const next = advance(work, previous, 1000);
      runtimeRef.current = next;
      const changed =
        next.time !== previous.time ||
        next.trace.join() !== previous.trace.join() ||
        (next.scheduled?.length ?? 0) !== (previous.scheduled?.length ?? 0) ||
        (next.scheduled?.length ?? 0) > 0 ||
        Math.floor((next.elapsedMs ?? 0) / 5000) !==
          Math.floor((previous.elapsedMs ?? 0) / 5000);
      if (changed) update(next);
    }, 1000);
    return () => clearInterval(interval);
  }, [creator, ready, work.id, work.updatedAt]);
  const event = (event: string, target: string) => {
    if (!creator) update(dispatch(work, runtimeRef.current, event, target));
  };
  const captureApp = () => {
    if (!app) return;
    const current = shell.current?.querySelector<HTMLElement>(".app-screen");
    if (!current) return;
    const snapshot = current.cloneNode(true) as HTMLElement;
    snapshot.style.transform = "none";
    snapshot.style.opacity = "1";
    snapshot.style.filter = "none";
    snapshot.style.borderRadius = "0";
    snapshot.querySelectorAll("audio").forEach((el) => el.remove());
    snapshot.querySelectorAll("video").forEach((el) => {
      el.removeAttribute("autoplay");
      el.removeAttribute("src");
    });
    snapshot.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    appSnapshots.current.set(app, snapshot);
    for (const id of appSnapshots.current.keys())
      if (!recent.includes(id) && id !== app) appSnapshots.current.delete(id);
  };
  const open = (id: string) => {
    if (!work.apps.some((a) => a.id === id && a.installed)) return;
    setApp(id);
    setKeyboard(false);
    setRecent((v) => [id, ...v.filter((a) => a !== id)].slice(0, 8));
    setFolder("");
    setPanel("");
    onOpen?.(id);
    event("openApp", id);
  };
  const installedApps = work.apps.filter((a) => a.installed);
  const apps = installedApps.filter((a) => a.visible);
  const openingNotificationsSent = useRef(false);
  const unlock = (pin = "") => {
    if (!work.phone.passcode || pin === work.phone.passcode) {
      setLocked(false);
      setPinOpen(false);
      event("password", pin);
      if (
        !creator &&
        !external &&
        runtimeRef.current.variables.kakaoUnlockSequenceStarted !== true &&
        runtimeRef.current.variables.kakaoContactRenamed !== true
      ) {
        const latest = runtimeRef.current;
        update({
          ...latest,
          variables: {
            ...latest.variables,
            kakaoUnlockSequenceStarted: true,
            kakaoRenameDueAt: Date.now() + 15000,
          },
        });
      }
      if (
        !openingNotificationsSent.current &&
        work.phone.notifications &&
        openingWechatNotices.length
      ) {
        openingNotificationsSent.current = true;
        // Start a fresh two-message notification sequence instead of keeping saved notices.
        noticesSeen.current = 0;
        update({
          ...runtimeRef.current,
          notifications: openingWechatNotices.slice(0, 1),
        });
        if (openingWechatNotices.length > 1) {
          window.setTimeout(() => {
            update({
              ...runtimeRef.current,
              notifications: openingWechatNotices,
            });
          }, 2500);
        }
      }
    } else {
      setPinError("密码不正确");
      setPinOpen(true);
    }
  };
  useEffect(() => {
    if (
      creator ||
      external ||
      !ready ||
      s.variables.kakaoUnlockSequenceStarted !== true ||
      s.variables.kakaoContactRenamed === true
    ) {
      return;
    }
    const dueAt = Number(s.variables.kakaoRenameDueAt ?? Date.now() + 15000);
    const timer = window.setTimeout(() => {
      const latest = runtimeRef.current;
      if (latest.variables.kakaoContactRenamed === true) return;

      const messageId = "kakao-pink-maltese-20260316-1810";
      const message = makeItem({
        id: messageId,
        title: "啄木鸟",
        sender: "啄木鸟",
        body: "今天舞社有点事 就不和你一起去吃饭了哈",
        time: "2026-03-16 18:10",
        avatar: "./images/kakao-pink-maltese-avatar.jpg",
        kind: "text",
        outgoing: false,
      });
      const kakaoMessages = latest.messages.kakao ?? [];
      const messageAlreadyDelivered = kakaoMessages.some(
        (item) => item.id === messageId,
      );
      const notification = "KakaoTalk：啄木鸟：今天舞社有点事 就不和你一起去吃饭了哈";

      update({
        ...latest,
        variables: {
          ...latest.variables,
          kakaoContactRenamed: true,
          kakaoMessageDelivered: true,
        },
        messages: {
          ...latest.messages,
          kakao: messageAlreadyDelivered
            ? kakaoMessages
            : [...kakaoMessages, message],
        },
        notifications: latest.notifications.includes(notification)
          ? latest.notifications
          : [...latest.notifications, notification],
      });
    }, Math.max(0, dueAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [
    creator,
    external,
    ready,
    work.id,
    work.updatedAt,
    s.variables.kakaoUnlockSequenceStarted,
    s.variables.kakaoContactRenamed,
    s.variables.kakaoRenameDueAt,
  ]);
  useEffect(() => {
    if (app && !work.apps.some((a) => a.id === app && a.installed)) setApp("");
  }, [app, work.apps]);
  const displayTime = creator ? work.phone.time : s.time || work.phone.time;
  const plugin = getApp(app);
  useEffect(() => {
    if (!ready) return;
    const count = s.notifications.length;
    // Do not replay an old banner after restoring a saved session.
    if (!notificationsInitialized.current) {
      notificationsInitialized.current = true;
      noticesSeen.current = count;
      return;
    }
    if (!locked && work.phone.notifications && count > noticesSeen.current) {
      setBanner(s.notifications.at(-1) || "");
      const timer = setTimeout(() => setBanner(""), 4500);
      noticesSeen.current = count;
      return () => clearTimeout(timer);
    }
    noticesSeen.current = count;
  }, [ready, s.notifications.length, locked, work.phone.notifications]);
  const dismissNotice = (index: number) =>
    update({
      ...runtimeRef.current,
      notifications: runtimeRef.current.notifications.filter(
        (_, i) => i !== index,
      ),
    });
  if (!ready) return <div className="phone-loading">正在恢复进度…</div>;
  return (
    <div
      ref={shell}
      style={{ "--phone-scale": deviceScale } as CSSProperties}
      className={`phone-shell ios18 ${work.phone.theme === "dark" ? "dark-phone" : ""}`}
    >
      <KeyboardContext.Provider value={openKeyboard}>
        <div
          className={`phone-screen wallpaper-${work.phone.wallpaper} ${locked ? "is-locked" : ""} ${app ? "in-app" : ""} ${keyboard ? "keyboard-open" : ""}`}
          style={work.phone.wallpaper === "bamby-eunho-cafe" ? { backgroundImage: 'url("./images/eunho-bamby-wallpaper.jpg")', backgroundPosition: "center", backgroundSize: "cover" } : undefined}
          data-app={app}
          onDragStart={(e) => e.preventDefault()}
          onPointerDown={(e) => {
            gestureConsumed.current = false;
            const button = (e.target as HTMLElement).closest<HTMLElement>(
              "[data-app-id]",
            );
            if (button) {
              pressTimer.current = setTimeout(() => {
                gestureConsumed.current = true;
                setContextApp(button.dataset.appId || "");
              }, 550);
            }
            const box = e.currentTarget.getBoundingClientRect(),
              x = (e.clientX - box.left) / deviceScale,
              y = (e.clientY - box.top) / deviceScale;
            gesture.current = {
              x,
              y,
              time: Date.now(),
              zone: y < 58 ? "top" : y > 818 ? "bottom" : locked ? "lock" : "",
            };
          }}
          onPointerMove={(e) => {
            if (Math.abs(e.movementX) > 5 || Math.abs(e.movementY) > 5)
              clearTimeout(pressTimer.current);
          }}
          onPointerCancel={() => clearTimeout(pressTimer.current)}
          onPointerUp={(e) => {
            clearTimeout(pressTimer.current);
            const box = e.currentTarget.getBoundingClientRect(),
              y = (e.clientY - box.top) / deviceScale,
              g = gesture.current;
            const dy = y - g.y;
            if (g.zone === "top" && dy > 65)
              setPanel(g.x > 230 ? "control" : "notification");
            else if ((g.zone === "bottom" || g.zone === "lock") && dy < -55) {
              gestureConsumed.current = true;
              if (!locked) captureApp();
              setKeyboard(false);
              if (panel) {
                setPanel("");
              } else if (locked) {
                beginUnlock();
              } else if (g.zone === "bottom" && Date.now() - g.time > 450) {
                captureApp();
                setPanel("switcher");
              } else {
                setApp("");
                setPanel("");
                setFolder("");
              }
            }
          }}
          onClickCapture={(e) => {
            const target = (e.target as HTMLElement).closest(
              ".home-app-grid button,.dock button",
            );
            if (target) {
              setLaunchOrigin(
                readLauncherOrigin(target as HTMLElement, e.currentTarget),
              );
            }
          }}
        >
          <div className="wallpaper-orb orb-one" />
          <div className="wallpaper-orb orb-two" />
          <div className="status-bar">
            <button
              onClick={() =>
                setPanel(panel === "notification" ? "" : "notification")
              }
              className="status-time"
              aria-label="通知中心"
            >
              {displayTime}
              <StatusGlyph kind="silent" />
            </button>
            <div className="dynamic-island" />
            <button
              className="signals"
              onClick={() => setPanel(panel === "control" ? "" : "control")}
              aria-label="控制中心"
            >
              <StatusGlyph kind="cellular" />
              <StatusGlyph kind="wifi" />
              <span
                className={`ios-battery${work.phone.battery <= 20 ? " low-battery" : ""}`}
              >
                <span style={{ width: `${work.phone.battery}%` }} />
                <b>{work.phone.battery}</b>
              </span>
            </button>
          </div>
          <AnimatePresence mode="wait">
            {locked && !(quickCamera && app === "camera") ? (
              <DeviceLock
                work={
                  s.date
                    ? { ...work, phone: { ...work.phone, date: s.date } }
                    : work
                }
                time={displayTime}
                notices={lockNotices}
                onDismiss={dismissNotice}
                pinOpen={pinOpen}
                setPinOpen={setPinOpen}
                error={pinError}
                onUnlock={unlock}
                onLight={() => setPanel("light")}
                onCamera={() => {
                  setQuickCamera(true);
                  open("camera");
                }}
              />
            ) : app && app !== "appstore" ? (
              <AppWindow
                key={app}
                className={`app-screen engine-${plugin.engine} skin-${app}`}
                creator={creator}
                origin={launchOrigin}
              >
                <AppContent
                  app={plugin}
                  name={
                    work.apps.find((a) => a.id === app)?.name ?? plugin.name
                  }
                  items={[
                    ...(work.data[app] ?? []),
                    ...(s.messages[app] ?? []),
                  ].map((item) => {
                    if (
                      app !== "kakao" ||
                      s.variables.kakaoContactRenamed !== true
                    ) {
                      return item;
                    }
                    return {
                      ...item,
                      title:
                        item.title === "粉红马尔济斯" ? "啄木鸟" : item.title,
                      sender:
                        item.sender === "粉红马尔济斯" ? "啄木鸟" : item.sender,
                    };
                  })}
                  creator={creator}
                  state={s}
                  onRead={(id) => event("read", id)}
                  onEdit={(item) => onEdit?.(app, item)}
                  onAdd={() => onAdd?.(app)}
                  onBack={() => setApp("")}
                  onSettings={onSettings}
                  onUi={(key, value) => {
                    const current = runtimeRef.current;
                    update(
                      dispatch(
                        work,
                        {
                          ...current,
                          ui: {
                            ...current.ui,
                            [app]: { ...current.ui?.[app], [key]: value },
                          },
                        },
                        "variable",
                        `ui:${app}:${key}`,
                      ),
                    );
                  }}
                  onSendChat={app === "wechat" ? sendWeChatMessage : undefined}
                  work={work}
                />
              </AppWindow>
            ) : (
              <HomeLauncher
                key={
                  "home-" + homeRequest + (app === "appstore" ? "store" : "")
                }
                storeOpen={app === "appstore"}
                closeStore={() => setApp("")}
                work={work}
                layout={deviceLayout.layout}
                change={deviceLayout.change}
                importLayout={deviceLayout.importLayout}
                error={deviceLayout.error}
                open={open}
                onFolder={setFolder}
                search={() => setPanel("search")}
                time={displayTime}
                icon={(a, small) => (
                  <AppIcon
                    key={a.id}
                    id={a.id}
                    name={small ? undefined : a.name}
                    small={small}
                    custom={a.icon}
                    date={s.date || work.phone.date}
                    time={s.time}
                    badge={a.id === "wechat" ? unreadWechatCount : 0}
                  />
                )}
                clearApp={(id) =>
                  update({
                    ...runtimeRef.current,
                    messages: Object.fromEntries(
                      Object.entries(runtimeRef.current.messages).filter(
                        ([app]) => app !== id,
                      ),
                    ),
                  })
                }
              />
            )}
          </AnimatePresence>
          {folder && (
            <div className="folder-overlay" onClick={() => setFolder("")}>
              <h2>{folder}</h2>
              <div className="folder-apps" onClick={(e) => e.stopPropagation()}>
                {apps
                  .filter((a) => a.folder === folder)
                  .map((a) => (
                    <button key={a.id} onClick={() => open(a.id)}>
                      <AppIcon id={a.id} name={a.name} custom={a.icon} />
                    </button>
                  ))}
              </div>
              <button className="glass-btn" onClick={() => setFolder("")}>
                关闭文件夹
              </button>
            </div>
          )}
          {panel === "control" && (
            <ControlCenter
              battery={work.phone.battery}
              network={work.phone.network}
              close={() => setPanel("")}
            />
          )}
          {panel && panel !== "control" && panel !== "switcher" && (
            <div
              className={`system-panel ${panel === "light" ? "flash-on" : ""}`}
            >
              <button className="panel-close" onClick={() => setPanel("")}>
                关闭 <ChevronLeft size={14} />
              </button>
              {panel === "notification" ? (
                <>
                  <h2>通知中心</h2>
                  {work.phone.notifications && lockNotices.length ? (
                    <SystemNotifications
                      notices={lockNotices}
                      apps={work.apps}
                      onOpen={() => {
                        setPanel("");
                        if (locked) beginUnlock();
                        else if (installedApps.some((a) => a.id === "messages"))
                          open("messages");
                      }}
                      onDismiss={dismissNotice}
                    />
                  ) : (
                    <p>没有新通知</p>
                  )}
                </>
              ) : panel === "search" ? (
                <>
                  <h2>搜索 App</h2>
                  <AppSearch apps={installedApps} open={open} />
                </>
              ) : (
                <h2>手电筒已打开</h2>
              )}
            </div>
          )}
          {!creator && s.choices.length > 0 && !locked && (
            <div className="story-overlay">
              <span className="eyebrow">故事来到一个岔路口</span>
              <h3>你会如何选择？</h3>
              {s.choices.map((c) => (
                <button
                  key={c.target}
                  onClick={() => update(choose(work, s, c.target))}
                >
                  {c.label}
                  <ArrowUp size={15} />
                </button>
              ))}
            </div>
          )}
          {!creator && s.endings.length > 0 && !locked && (
            <div className="story-overlay ending">
              <span className="eyebrow">ENDING · {s.endings.length}</span>
              <h2>故事在这里停泊。</h2>
              <p>{s.endings[s.endings.length - 1]}</p>
              <button
                onClick={() => {
                  update(dispatch(work, initialRuntime(work), "start"));
                  setApp("");
                  setLocked(true);
                }}
              >
                重新开始
              </button>
            </div>
          )}
          {!creator && s.incomingCall && (
            <div className="incoming-call-screen">
              <small>
                {s.incomingCall.status === "ringing" ? "来电" : "通话中"} ·
                作品内模拟
              </small>
              <div className="incoming-avatar">
                {s.incomingCall.caller.slice(0, 1)}
              </div>
              <h2>{s.incomingCall.caller}</h2>
              {s.incomingCall.status === "answered" &&
                (() => {
                  const record = work.data.phone?.find(
                    (i) => i.id === s.incomingCall?.target,
                  );
                  return record?.kind === "audio" && safeMedia(record.media) ? (
                    <audio controls src={safeMedia(record.media)} />
                  ) : (
                    <p>这是一通虚构来电。</p>
                  );
                })()}
              <div className="incoming-actions">
                <button
                  className="decline-call"
                  onClick={() => {
                    const call = runtimeRef.current.incomingCall;
                    if (call)
                      update(
                        dispatch(
                          work,
                          { ...runtimeRef.current, incomingCall: null },
                          call.status === "ringing"
                            ? "callDeclined"
                            : "callEnded",
                          call.target || call.caller,
                        ),
                      );
                  }}
                >
                  <PhoneIcon size={25} />
                  <span>
                    {s.incomingCall.status === "ringing" ? "拒接" : "挂断"}
                  </span>
                </button>
                {s.incomingCall.status === "ringing" && (
                  <button
                    className="accept-call"
                    onClick={() => {
                      const call = runtimeRef.current.incomingCall;
                      if (call)
                        update(
                          dispatch(
                            work,
                            {
                              ...runtimeRef.current,
                              incomingCall: { ...call, status: "answered" },
                            },
                            "callAnswered",
                            call.target || call.caller,
                          ),
                        );
                    }}
                  >
                    <PhoneIcon size={25} />
                    <span>接听</span>
                  </button>
                )}
              </div>
            </div>
          )}
          {banner && !locked && (
            <button
              className="device-banner"
              onClick={() => {
                setBanner("");
                setPanel("notification");
              }}
            >
              <AppIcon
                id={notificationContent(banner, work.apps).appId}
                small
              />
              <span>
                <strong>{notificationContent(banner, work.apps).title}</strong>
                <span>{notificationContent(banner, work.apps).body}</span>
              </span>
            </button>
          )}
          {panel === "switcher" && (
            <div className="device-switcher">
              <div className="switcher-cards">
                {recent
                  .filter(
                    (id) =>
                      installedApps.some((a) => a.id === id) &&
                      appSnapshots.current.has(id),
                  )
                  .map((id) => (
                    <button
                      className="recent-app-card"
                      key={id}
                      onClick={() => open(id)}
                    >
                      <span className="recent-app-label">
                        <AppIcon id={id} small />
                        <strong>
                          {work.apps.find((a) => a.id === id)?.name}
                        </strong>
                      </span>
                      <span className="recent-app-window">
                        <span
                          className="recent-app-snapshot"
                          aria-hidden="true"
                          inert
                          ref={(el) => {
                            const snapshot = appSnapshots.current.get(id);
                            if (el && snapshot)
                              el.replaceChildren(snapshot.cloneNode(true));
                          }}
                        />
                      </span>
                    </button>
                  ))}
              </div>
              <button className="switcher-done" onClick={() => setPanel("")}>
                完成
              </button>
            </div>
          )}
          {contextApp && (
            <div
              className="home-context-shade"
              onClick={() => setContextApp("")}
            >
              <div className="home-context-menu">
                <AppIcon id={contextApp} />
                <strong>
                  {work.apps.find((a) => a.id === contextApp)?.name}
                </strong>
                <button
                  onClick={() => {
                    open(contextApp);
                    setContextApp("");
                  }}
                >
                  打开 App
                </button>
                <button
                  onClick={() => {
                    setContextApp("");
                    setPanel("search");
                  }}
                >
                  在 App 库中查看
                </button>
                <button onClick={() => setContextApp("")}>取消</button>
              </div>
            </div>
          )}
          {keyboard && (
            <DeviceKeyboard
              close={() => setKeyboard(false)}
              placeholder={keyboardOptions.placeholder}
              onSend={keyboardOptions.onSend}
              disabled={keyboardOptions.disabled}
            />
          )}
          {loadError && (
            <button className="runtime-error" onClick={() => setLoadError("")}>
              {loadError}
            </button>
          )}
          <button
            className="home-indicator"
            aria-label="返回桌面"
            onClick={() => {
              if (gestureConsumed.current) return;
              if (locked) {
                beginUnlock();
                return;
              }
              captureApp();
              setHomeRequest((n) => n + 1);
              setKeyboard(false);
              setApp("");
              setFolder("");
              setPanel("");
            }}
          />
          <div className="screen-dimmer" />
          <div className="hardware-reflection" />
        </div>
      </KeyboardContext.Provider>
    </div>
  );
}
function AppSearch({
  apps,
  open,
}: {
  apps: Work["apps"];
  open: (id: string) => void;
}) {
  const [q, set] = useState("");
  return (
    <>
      <input
        autoFocus
        value={q}
        placeholder="App 名称"
        onChange={(e) => set(e.target.value)}
      />
      {apps
        .filter((a) => a.name.toLowerCase().includes(q.toLowerCase()))
        .map((a) => (
          <button
            className="search-result"
            key={a.id}
            onClick={() => open(a.id)}
          >
            <AppIcon id={a.id} small />
            {a.name}
          </button>
        ))}
    </>
  );
}
function Media({ item }: { item: Item }) {
  const fallbackMedia =
    item.id === "photo-bamby-uniform"
      ? "./images/bamby-uniform.jpg"
      : item.id === "photo-bamby-hoodie"
        ? "./images/bamby-hoodie.jpg"
        : item.id === "photo-eunho-bamby-cafe"
          ? "./images/eunho-bamby-wallpaper.jpg"
          : "";
  const src = safeMedia(item.media) || safeMedia(fallbackMedia);
  return src ? (
    item.kind === "audio" ? (
      <audio controls src={src} />
    ) : item.kind === "video" ? (
      <video controls playsInline src={src} />
    ) : (
      <img loading="lazy" src={src} alt={item.title} />
    )
  ) : (
    <div
      className={`original-art art-${item.id.includes("ticket") ? "ticket" : "rain"}`}
    >
      <span>
        {item.id.includes("ticket") ? "城南 / SOUTHBOUND" : "after the rain"}
      </span>
      <strong>{item.id.includes("ticket") ? "09 · 01" : "雨 后"}</strong>
      <small>
        {item.id.includes("ticket")
          ? "16:30 · 一张未完成的约定"
          : "a little moment of quiet"}
      </small>
    </div>
  );
}
function AppContent({
  app,
  name,
  items,
  creator,
  state,
  onRead,
  onEdit,
  onAdd,
  onBack,
  onSettings,
  onUi,
  onSendChat,
  work,
}: {
  app: AppPlugin;
  name: string;
  items: Item[];
  creator: boolean;
  state: Runtime;
  onRead: (id: string) => void;
  onEdit: (item: Item) => void;
  onAdd: () => void;
  onBack: () => void;
  onSettings?: () => void;
  onUi?: (key: string, value: UiValue) => void;
  onSendChat?: (message: string) => void;
  work: Work;
}) {
  const [detail, setDetail] = useState<Item | null>(null);
  const [thread, setThread] = useState(() => {
    const savedThread = state.ui?.[app.id]?.currentThread;
    return typeof savedThread === "string" ? savedThread : "";
  });
  const changeThread = (value: string) => {
    setThread(value);
    if (!creator) onUi?.("currentThread", value);
  };
  const [tab, setTab] = useState(app.tabs[0]);
  const [q, setQ] = useState("");
  const [pw, setPw] = useState("");
  const [unlocks, setUnlocks] = useState<string[]>([]);
  const [pwError, setPwError] = useState("");
  const [likes, setLikes] = useState<string[]>([]);
  const shown = items
    .filter((i) => creator || visible(i, state))
    .filter((i) =>
      (i.title + i.body + i.sender).toLowerCase().includes(q.toLowerCase()),
    );
  const filtered =
    tab === "收藏"
      ? shown.filter((i) => i.favorite)
      : tab === app.tabs[0]
        ? shown
        : shown.filter((i) => i.folder === tab);
  const read = (i: Item) => {
    if (creator) {
      onEdit(i);
      return;
    }
    setDetail(i);
    if (!i.password || unlocks.includes(i.id)) onRead(i.id);
  };
  const chats = [...new Set(shown.map((i) => i.title))];
  const back = () => {
    if (detail) setDetail(null);
    else if (thread) changeThread("");
    else onBack();
  };
  const Skin =
    app.id === "wechat"
      ? WeChatSkin
      : app.id === "whatsapp"
        ? WhatsAppSkin
        : (catalogSkins[app.id as keyof typeof catalogSkins] ?? null);
  const detailView = detail ? (
    <div className="phone-content detail-content">
      {detail.password && !creator && !unlocks.includes(detail.id) ? (
        <div className="locked-note">
          <LockKeyhole size={36} />
          <h3>这条内容已锁定</h3>
          <input
            type="password"
            placeholder="内容密码"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <button
            onClick={() => {
              if (pw === detail.password) {
                setUnlocks([...unlocks, detail.id]);
                onRead(detail.id);
                setPwError("");
              } else setPwError("密码不正确");
            }}
          >
            解锁内容
          </button>
          <small>{pwError}</small>
        </div>
      ) : (
        <>
          <small className="detail-meta">
            {detail.time} · {detail.sender}
          </small>
          <h2>{detail.title}</h2>
          {(detail.media || ["media", "social"].includes(app.engine)) && (
            <Media item={detail} />
          )}
          <RichText value={detail.richText} fallback={detail.body} />
          <dl className="item-metadata">
            {getFields(app.id)
              .filter((f) => detail.meta?.[f.key])
              .map((f) => (
                <div key={f.key}>
                  <dt>{f.label}</dt>
                  <dd>{detail.meta[f.key]}</dd>
                </div>
              ))}
          </dl>
          {detail.folder && (
            <span className="folder-label">
              <Folder size={12} />
              {detail.folder}
            </span>
          )}
          {detail.comments.map((c, i) => (
            <p key={i} className="comment">
              {c}
            </p>
          ))}
        </>
      )}
    </div>
  ) : null;
  if (Skin)
    return (
      <>
        <div className="catalog-slot" hidden={!!detail}>
          <Suspense fallback={<div className="catalog-loading">正在打开…</div>}>
            <Skin
              appId={app.id}
              owner={work.phone.owner}
              virtualTime={state.time}
              ui={state.ui?.[app.id]}
              onUi={creator ? undefined : onUi}
              name={name}
              items={shown}
              creator={creator}
              onRead={onRead}
              onItem={read}
              onAdd={onAdd}
              onBack={onBack}
              thread={thread}
              onThread={changeThread}
              onSendChat={app.id === "wechat" ? onSendChat : undefined}
            />
          </Suspense>
        </div>
        {detail &&
          (socialDetailApps.has(app.id) &&
          (!detail.password || unlocks.includes(detail.id)) ? (
            <SocialDetail
              app={app.id}
              item={detail}
              back={back}
              owner={work.phone.owner}
              ui={state.ui?.[app.id]}
              onUi={onUi}
            />
          ) : nativeDetailApps.has(app.id) &&
            (!detail.password || unlocks.includes(detail.id)) ? (
            <NativeDetail app={app.id} item={detail} back={back} />
          ) : (
            <>
              <div className="app-nav">
                <button aria-label="返回" onClick={back}>
                  <ChevronLeft size={23} />
                </button>
                <strong>{detail.title}</strong>
                <span />
              </div>
              {detailView}
            </>
          ))}
      </>
    );
  return (
    <>
      <div className="app-nav">
        <button onClick={back} aria-label="返回">
          <ChevronLeft size={23} />
          {detail || thread ? "返回" : ""}
        </button>
        <strong>{thread || name}</strong>
        <button
          onClick={
            creator
              ? onAdd
              : () =>
                  document
                    .querySelector<HTMLInputElement>(
                      ".app-screen .phone-search input",
                    )
                    ?.focus()
          }
          aria-label={creator ? "新增内容" : "搜索内容"}
        >
          {creator ? <Plus size={22} /> : <Search size={20} />}
        </button>
      </div>
      {app.id === "settings" && !detail ? (
        <NativeSettings
          work={work}
          items={items}
          creator={creator}
          onItem={read}
          onSettings={onSettings}
        />
      ) : app.id === "calculator" && !detail ? (
        <NativeCalculator
          items={shown}
          onRead={read}
          ui={state.ui?.[app.id]}
          onUi={onUi}
        />
      ) : detail ? (
        detailView
      ) : app.engine === "messaging" && thread ? (
        <div className="chat-content">
          <div className="chat-time">2026 年 9 月 1 日</div>
          {shown
            .filter((i) => i.title === thread)
            .map((i) => (
              <button
                key={i.id}
                className={`message-row ${i.outgoing ? "outgoing" : ""}`}
                onClick={() => (creator ? onEdit(i) : onRead(i.id))}
              >
                <span className="avatar">{i.sender.slice(0, 1)}</span>
                <span className="bubble">
                  {i.kind === "image" ||
                  i.kind === "audio" ||
                  i.kind === "video" ? (
                    <Media item={i} />
                  ) : i.kind === "transfer" ? (
                    <span className="transfer">
                      ¥ {i.body}
                      <small>虚构转账记录</small>
                    </span>
                  ) : (
                    i.body
                  )}
                  <small>
                    {i.time.slice(-5)} {i.read ? "✓✓" : ""}
                  </small>
                  {creator && (i.hidden || i.unlock) && (
                    <LockKeyhole size={12} />
                  )}
                </span>
              </button>
            ))}
          {creator ? (
            <button className="chat-compose" onClick={onAdd}>
              ＋ 添加一条消息
            </button>
          ) : (
            <div className="chat-compose muted">
              根据剧情推进，互动回复将在这里出现。
            </div>
          )}
        </div>
      ) : (
        <div
          className={`phone-content ${app.engine === "social" ? "feed-content" : ""}`}
        >
          {app.engine !== "media" && (
            <div className="phone-search">
              <Search size={15} />
              <input
                placeholder={`搜索${name}`}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          )}
          {app.engine === "messaging" ? (
            chats.map((t) => {
              const list = shown.filter((i) => i.title === t),
                last = list[list.length - 1];
              return (
                <button
                  className="contact-row"
                  key={t}
                  onClick={() => {
                    setThread(t);
                    onRead(t);
                  }}
                >
                  <span className="avatar" style={{ background: app.color }}>
                    {t.slice(0, 1)}
                  </span>
                  <span>
                    <strong>{t}</strong>
                    <p>{last.body}</p>
                  </span>
                  <small>{last.time.slice(-5)}</small>
                </button>
              );
            })
          ) : app.engine === "media" ? (
            <>
              <div className="media-heading">
                <h1>{tab}</h1>
                <p>{filtered.length} 个故事片段</p>
              </div>
              <div className="media-grid">
                {filtered.map((i) => (
                  <button key={i.id} onClick={() => read(i)}>
                    <Media item={i} />
                    <span>
                      {i.title} {creator && i.hidden ? "· 隐藏" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : app.engine === "social" ? (
            filtered.map((i) => (
              <article className="social-post" key={i.id}>
                <div className="post-author">
                  <span className="avatar" style={{ background: app.color }}>
                    {i.sender.slice(0, 1)}
                  </span>
                  <div>
                    <strong>{i.sender}</strong>
                    <small>{i.time}</small>
                  </div>
                  <button aria-label="查看帖子详情" onClick={() => read(i)}>
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                <button className="post-image" onClick={() => read(i)}>
                  <Media item={i} />
                </button>
                <div className="post-actions">
                  <button
                    aria-label="虚构点赞"
                    onClick={() =>
                      setLikes(
                        likes.includes(i.id)
                          ? likes.filter((id) => id !== i.id)
                          : [...likes, i.id],
                      )
                    }
                  >
                    <Heart
                      size={22}
                      fill={likes.includes(i.id) ? "#d67670" : "none"}
                    />
                  </button>
                  <button aria-label="查看评论" onClick={() => read(i)}>
                    <MessageCircle size={22} />
                  </button>
                  <small>
                    {i.likes + (likes.includes(i.id) ? 1 : 0)} 次虚构喜欢
                  </small>
                </div>
                <button className="post-text" onClick={() => read(i)}>
                  <strong>{i.title}</strong>
                  <p>{i.body}</p>
                </button>
              </article>
            ))
          ) : (
            filtered.map((i) => (
              <button
                key={i.id}
                className={`record-row ${app.engine === "document" ? "document-row" : ""}`}
                onClick={() => read(i)}
              >
                <div className="record-symbol">
                  {app.engine === "records" ? (
                    <app.icon size={20} />
                  ) : (
                    <span>{i.title.slice(0, 1)}</span>
                  )}
                </div>
                <div>
                  <strong>{i.title}</strong>
                  <p>{i.body.split("\n")[0]}</p>
                  <small>
                    {i.time} {i.folder && `· ${i.folder}`}
                  </small>
                </div>
                {i.password || i.hidden ? (
                  <LockKeyhole size={14} />
                ) : (
                  <ChevronLeft className="chevron-right" size={16} />
                )}
              </button>
            ))
          )}
          {!filtered.length && app.engine !== "messaging" && (
            <div className="empty-app">
              <app.icon size={36} />
              <h3>这一页还很安静</h3>
              <p>
                {creator
                  ? "添加属于这个 App 的故事内容。"
                  : "暂时没有可浏览的内容。"}
              </p>
            </div>
          )}
          {creator && (
            <button className="phone-add" onClick={onAdd}>
              <Plus size={15} />
              添加
              {app.engine === "messaging"
                ? "聊天"
                : app.engine === "social"
                  ? "帖子"
                  : app.engine === "media"
                    ? "素材"
                    : "内容"}
            </button>
          )}
        </div>
      )}
      {!detail &&
        !thread &&
        app.id !== "calculator" &&
        app.id !== "settings" && (
          <div className="app-tabs">
            {app.tabs.map((t, i) => (
              <button
                key={t}
                className={tab === t ? "selected" : ""}
                onClick={() => setTab(t)}
              >
                {i === 0 ? (
                  <MessageCircle size={17} />
                ) : i === 1 ? (
                  <Search size={17} />
                ) : (
                  <UsersIcon />
                )}
                <span>{t}</span>
              </button>
            ))}
          </div>
        )}
    </>
  );
}
function UsersIcon() {
  return <PhoneIcon size={17} />;
}
