import { useEffect, useState } from "react";
import {
  Heart,
  Users,
  Grid2X2,
  Flame,
  Bed,
  Footprints,
  ChevronRight,
  ChevronLeft,
  User,
  Plus,
  MoonStar,
  Sunrise,
  Sunset,
  Sun,
  CloudSun,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplet,
  Wind,
  Map,
  List,
  Cloud,
  Activity,
  Search,
  RefreshCw,
  Thermometer,
} from "lucide-react";
import { useSkinState } from "../skinState";
import type { Item } from "../schema";
import { meta, type Props } from "./shared";
import "../ios/native-apps.css";
const healthTypes = [
  { id: "cycle", title: "经期追踪", icon: Activity, color: "#7361ff" },
  { id: "activity", title: "健身记录", icon: Flame, color: "#ff5900" },
  { id: "sleep", title: "睡眠评分", icon: Bed, color: "#7361ff" },
  { id: "steps", title: "步数", icon: Footprints, color: "#ff5900" },
];
function seriesFor(item: Item | undefined) {
  try {
    const values = JSON.parse(meta(item, "series", "[]"));
    return Array.isArray(values)
      ? values
          .filter((v) => typeof v === "number" && Number.isFinite(v) && v >= 0)
          .slice(0, 30)
      : [];
  } catch {
    return [];
  }
}
function recordFor(items: Item[], key: string) {
  const map: Record<string, string[]> = {
    cycle: ["经期", "月经"],
    activity: ["活动", "健身"],
    sleep: ["睡眠"],
    steps: ["步数"],
  };
  return items.find((i) =>
    map[key].some((s) => meta(i, "metric", i.title).includes(s)),
  );
}
export function HealthSkin(p: Props) {
  const [tab, setTab] = useSkinState<string>(p, "tab", "摘要"),
    [pins, setPins] = useSkinState<string[]>(
      p,
      "pins",
      p.items.some((i) => recordFor([i], "cycle"))
        ? ["cycle", "activity", "sleep", "steps"]
        : ["activity", "sleep", "steps"],
    );
  const [editing, setEditing] = useState(false),
    [detail, setDetail] = useState(""),
    [profile, setProfile] = useState(false);
  const current = recordFor(p.items, detail);
  const open = (key: string) => {
    const i = recordFor(p.items, key);
    if (i && p.creator) {
      p.onItem(i);
      return;
    }
    if (i?.password) {
      p.onItem(i);
      return;
    }
    if (i) p.onRead(i.id);
    setDetail(key);
  };
  return (
    <div className="catalog-skin native-health calibrated-health">
      <header className="health-native-nav">
        {detail || profile ? (
          <button
            aria-label="返回健康摘要"
            onClick={() => {
              setDetail("");
              setProfile(false);
            }}
          >
            <ChevronLeft />
          </button>
        ) : (
          <span />
        )}
        <strong>
          {detail
            ? healthTypes.find((x) => x.id === detail)?.title
            : profile
              ? "健康详细资料"
              : tab}
        </strong>
        <button
          aria-label="健康资料"
          onClick={() => (p.creator ? p.onAdd() : setProfile(true))}
        >
          <User size={23} />
        </button>
      </header>
      <div className="health-native-scroll">
        {profile ? (
          <>
            <h1>健康详细资料</h1>
            <section className="health-profile-empty">
              <User size={45} />
              <h2>{p.owner || "机主"}</h2>
              <p>尚未设置更多资料</p>
            </section>
          </>
        ) : detail ? (
          <>
            <div className="health-periods">
              {["日", "周", "月", "6个月", "年"].map((x) => (
                <button
                  key={x}
                  onClick={(e) => {
                    e.currentTarget.parentElement
                      ?.querySelectorAll("button")
                      .forEach((b) => b.removeAttribute("data-selected"));
                    e.currentTarget.dataset.selected = "true";
                  }}
                >
                  {x}
                </button>
              ))}
            </div>
            <p className="health-detail-value">
              {current ? meta(current, "value", "—") : "无数据"}{" "}
              <small>{current ? meta(current, "unit") : ""}</small>
            </p>
            <div className="health-detail-chart" aria-label="健康记录图表">
              {Array.from({ length: 7 }, (_, i) => (
                <span
                  key={i}
                  style={{
                    height:
                      seriesFor(current)[i] !== undefined
                        ? `${Math.max(2, (seriesFor(current)[i] / Math.max(...seriesFor(current), 1)) * 100)}%`
                        : "3px",
                  }}
                />
              ))}
            </div>
            <section className="health-detail-description">
              <h2>记录</h2>
              {current ? (
                <>
                  <p>{current.body}</p>
                  <small>{current.time}</small>
                </>
              ) : (
                <p>暂无数据</p>
              )}
            </section>
          </>
        ) : tab === "摘要" ? (
          <>
            <div className="health-section-title">
              <h2>置顶</h2>
              <button onClick={() => setEditing(!editing)}>
                {editing ? "完成" : "编辑"}
              </button>
            </div>
            {editing && (
              <div className="health-pin-editor">
                {healthTypes.map((t) => (
                  <label key={t.id}>
                    <input
                      type="checkbox"
                      checked={pins.includes(t.id)}
                      onChange={() =>
                        setPins(
                          pins.includes(t.id)
                            ? pins.filter((x) => x !== t.id)
                            : [...pins, t.id],
                        )
                      }
                    />
                    {t.title}
                  </label>
                ))}
              </div>
            )}
            <div className="health-cards">
              {pins.map((id) => {
                const t = healthTypes.find((t) => t.id === id);
                if (!t) return null;
                const i = recordFor(p.items, id);
                const Icon = t.icon;
                return (
                  <button
                    key={id}
                    className={"health-native-card health-card-" + id}
                    onClick={() => open(id)}
                  >
                    <header style={{ color: t.color }}>
                      <Icon size={19} />
                      <strong>{t.title}</strong>
                      <time>{i?.time.slice(5, 10) || ""}</time>
                      <ChevronRight size={18} />
                    </header>
                    {id === "activity" ? (
                      <div className="health-activity-values">
                        {[
                          ["活动", "active", "千卡"],
                          ["锻炼", "exercise", "分钟"],
                          ["站立", "stand", "小时"],
                        ].map(([name, key, unit], n) => (
                          <div
                            key={key}
                            style={{
                              color: ["#ff2d55", "#54c900", "#00b2d9"][n],
                            }}
                          >
                            <small>{name}</small>
                            <p>
                              <b>{i ? meta(i, key, "—") : "—"}</b>
                              <span>{unit}</span>
                            </p>
                          </div>
                        ))}
                        <div className="activity-rings">
                          <i />
                          <i />
                          <i />
                        </div>
                      </div>
                    ) : (
                      <div className="health-card-bottom">
                        <div>
                          <b>
                            {i
                              ? meta(i, "value", i.body || "无数据")
                              : "无数据"}
                          </b>
                          <span>{i ? meta(i, "unit") : ""}</span>
                        </div>
                        {id === "steps" && (
                          <div className="health-spark" aria-hidden="true">
                            {Array.from({ length: 7 }, (_, n) => (
                              <i
                                key={n}
                                style={{
                                  height:
                                    seriesFor(i)[n] !== undefined
                                      ? `${Math.max(3, (seriesFor(i)[n] / Math.max(...seriesFor(i), 1)) * 45)}px`
                                      : "8px",
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <button className="health-all-row" onClick={() => setTab("浏览")}>
              <Heart color="#ff2d55" />
              显示所有健康数据
              <ChevronRight />
            </button>
            <h2 className="health-trends-title">趋势</h2>
            <div className="health-trends-empty">
              {p.items.length ? "查看健康数据中的记录" : "暂无趋势"}
            </div>
          </>
        ) : tab === "共享" ? (
          <section className="health-sharing">
            <Users size={54} />
            <h2>共享健康数据</h2>
            <p>尚未共享数据</p>
            {p.items
              .filter((i) => i.folder === "共享")
              .map((i) => (
                <button key={i.id} onClick={() => p.onItem(i)}>
                  {i.title}
                </button>
              ))}
          </section>
        ) : (
          <>
            <h1>浏览</h1>
            {healthTypes.map((t) => (
              <button
                key={t.id}
                className="health-browse-row"
                onClick={() => open(t.id)}
              >
                <t.icon size={22} color={t.color} />
                {t.title}
                <ChevronRight />
              </button>
            ))}
            {p.items
              .filter((i) => !healthTypes.some((t) => recordFor([i], t.id)))
              .map((i) => (
                <button
                  className="health-browse-row"
                  key={i.id}
                  onClick={() => p.onItem(i)}
                >
                  {i.title}
                  <ChevronRight />
                </button>
              ))}
          </>
        )}
      </div>
      {!detail && !profile && (
        <nav className="health-floating-tabs">
          {[
            [Heart, "摘要"],
            [Users, "共享"],
            [Grid2X2, "浏览"],
          ].map(([Icon, label]) => {
            const Glyph = Icon as typeof Heart;
            return (
              <button
                key={String(label)}
                className={tab === label ? "selected" : ""}
                onClick={() => setTab(String(label))}
              >
                <Glyph size={25} />
                <span>{String(label)}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
type WeatherMetaPoint = {
  time?: string;
  temperature?: string;
  low?: string;
  high?: string;
  label?: string;
  precipitationProbability?: string;
  windSpeed?: string;
  weatherCode?: string;
  sunrise?: string;
  sunset?: string;
  uv?: string;
};
type LiveWeatherData = {
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    surface_pressure: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    wind_speed_10m: number[];
    weather_code: number[];
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
    precipitation_probability_max: number[];
  };
};
type LiveAirQualityData = {
  current?: {
    us_aqi: number;
    pm2_5: number;
    pm10: number;
  };
};
function listMeta(item: Item | undefined, key: string): WeatherMetaPoint[] {
  try {
    const v = JSON.parse(meta(item, key, "[]"));
    return Array.isArray(v)
      ? v
          .filter(
            (x) =>
              x &&
              typeof x === "object" &&
              Object.values(x).every(
                (v) => typeof v === "string" || typeof v === "number",
              ),
          )
          .slice(0, 12)
      : [];
  } catch {
    return [];
  }
}
function weatherDescription(code: number) {
  if (code === 0) return "晴朗";
  if (code === 1) return "大致晴朗";
  if (code === 2) return "局部多云";
  if (code === 3) return "阴天";
  if (code === 45 || code === 48) return "有雾";
  if ([51, 53, 55, 56, 57].includes(code)) return "毛毛雨";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "降雨";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "降雪";
  if ([95, 96, 99].includes(code)) return "雷暴";
  return "多云";
}
function WeatherGlyph({
  code,
  isDay = true,
  size = 28,
  className,
}: {
  code: number;
  isDay?: boolean;
  size?: number;
  className?: string;
}) {
  if (code === 0 || code === 1)
    return isDay ? (
      <Sun className={className} size={size} />
    ) : (
      <MoonStar className={className} size={size} />
    );
  if (code === 2) return <CloudSun className={className} size={size} />;
  if (code === 3) return <Cloud className={className} size={size} />;
  if (code === 45 || code === 48)
    return <CloudFog className={className} size={size} />;
  if ([51, 53, 55, 56, 57].includes(code))
    return <CloudDrizzle className={className} size={size} />;
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code))
    return <CloudRain className={className} size={size} />;
  if ([71, 73, 75, 77, 85, 86].includes(code))
    return <CloudSnow className={className} size={size} />;
  if ([95, 96, 99].includes(code))
    return <CloudLightning className={className} size={size} />;
  return <CloudSun className={className} size={size} />;
}
function aqiLabel(value: number) {
  if (!Number.isFinite(value)) return "暂无数据";
  if (value <= 50) return "优";
  if (value <= 100) return "良";
  if (value <= 150) return "轻度污染";
  if (value <= 200) return "中度污染";
  if (value <= 300) return "重度污染";
  return "严重污染";
}
function windDirection(degrees: number) {
  const directions = ["北风", "东北风", "东风", "东南风", "南风", "西南风", "西风", "西北风"];
  return directions[Math.round(degrees / 45) % 8];
}
function weatherHour(time?: string) {
  if (!time) return "—";
  if (time === "现在") return time;
  const match = time.match(/T(\d{2}):/);
  if (match) return Number(match[1]) + "时";
  return time;
}
function weatherDay(date: string, index: number) {
  if (index === 0) return "今天";
  if (index === 1) return "明天";
  const parsed = new Date(date + "T12:00:00+09:00");
  return Number.isNaN(parsed.getTime())
    ? date.slice(5)
    : parsed.toLocaleDateString("zh-CN", {
        weekday: "short",
        timeZone: "Asia/Seoul",
      });
}
export function WeatherSkin(p: Props) {
  const [index, setIndex] = useSkinState<number>(p, "city", 0),
    [mode, setMode] = useState("temperature"),
    [sheet, setSheet] = useState(""),
    [query, setQuery] = useState("");
  const [liveWeather, setLiveWeather] = useState<LiveWeatherData | null>(null);
  const [liveAirQuality, setLiveAirQuality] = useState<LiveAirQualityData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const item = p.items[index] || p.items[0];
  const isSeoulCity = Boolean(
    item && (/首尔|seoul/i.test(item.title) || meta(item, "latitude") === "37.5665"),
  );
  useEffect(() => {
    if (!isSeoulCity) return;
    const controller = new AbortController();
    const forecastUrl =
      "https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=Asia%2FSeoul&forecast_days=7";
    const airQualityUrl =
      "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=37.5665&longitude=126.9780&current=us_aqi,pm2_5,pm10&timezone=Asia%2FSeoul";
    const forecastRequest = fetch(forecastUrl, { signal: controller.signal }).then(
      (response) => {
        if (!response.ok) throw new Error("天气服务暂时不可用");
        return response.json() as Promise<LiveWeatherData>;
      },
    );
    const airRequest = fetch(airQualityUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) return null;
        return response.json() as Promise<LiveAirQualityData>;
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") throw error;
        return null;
      });
    Promise.all([forecastRequest, airRequest])
      .then(([forecast, air]) => {
        setLiveWeather(forecast);
        setLiveAirQuality(air);
        setWeatherError(false);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setWeatherError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setWeatherLoading(false);
      });
    return () => controller.abort();
  }, [isSeoulCity, refreshToken]);

  const current = liveWeather?.current;
  const fallbackCode = Number(meta(item, "weatherCode", "0"));
  const currentCode = current?.weather_code ?? (Number.isFinite(fallbackCode) ? fallbackCode : 0);
  const isDay = current ? current.is_day === 1 : true;
  const currentTemperature = current
    ? String(Math.round(current.temperature_2m))
    : meta(item, "temperature", "8");
  const highTemperature = liveWeather?.daily?.temperature_2m_max?.[0] !== undefined
    ? String(Math.round(liveWeather.daily.temperature_2m_max[0]))
    : meta(item, "high", "13");
  const lowTemperature = liveWeather?.daily?.temperature_2m_min?.[0] !== undefined
    ? String(Math.round(liveWeather.daily.temperature_2m_min[0]))
    : meta(item, "low", "4");
  const humidity = current?.relative_humidity_2m ?? Number(meta(item, "humidity", "32"));
  const windSpeed = current?.wind_speed_10m ?? Number(meta(item, "windSpeed", "8"));
  const apparentTemperature = current
    ? Math.round(current.apparent_temperature)
    : Number(meta(item, "feelsLike", "8"));
  const pressure = current?.surface_pressure ?? Number(meta(item, "pressure", "1026"));
  const rainfall = current?.precipitation ?? Number(meta(item, "rainfall", "0"));
  const uvIndex = liveWeather?.daily?.uv_index_max?.[0] ?? Number(meta(item, "uv", "2"));
  const airQualityIndex =
    liveAirQuality?.current?.us_aqi ?? Number(meta(item, "aqi", "25"));
  const currentTime = current?.time ?? "";
  const lastUpdated =
    currentTime.length >= 16
      ? currentTime.slice(11, 16)
      : meta(item, "updatedAt", "20:00");
  const condition = current
    ? weatherDescription(current.weather_code)
    : meta(item, "condition", "晴朗");
  const hourly = listMeta(item, "hourly");
  const daily = listMeta(item, "daily");
  const apiHourly = liveWeather?.hourly;
  const hourlyView: WeatherMetaPoint[] = apiHourly
    ? (() => {
        const match = currentTime
          ? apiHourly.time.findIndex((time) => time.slice(0, 13) === currentTime.slice(0, 13))
          : -1;
        const firstIndex = match >= 0 ? match : 0;
        return Array.from({ length: 6 }, (_, n) => {
          const i = Math.min(firstIndex + n, apiHourly.time.length - 1);
          return {
            time: n === 0 ? "现在" : apiHourly.time[i]?.slice(0, 16),
            temperature: String(Math.round(apiHourly.temperature_2m[i] ?? 0)),
            precipitationProbability: String(apiHourly.precipitation_probability[i] ?? 0),
            windSpeed: String(Math.round(apiHourly.wind_speed_10m[i] ?? 0)),
            weatherCode: String(apiHourly.weather_code[i] ?? currentCode),
          };
        });
      })()
    : hourly.length
      ? hourly
      : [
          { time: "现在", temperature: currentTemperature, precipitationProbability: "0", windSpeed: "8", weatherCode: String(currentCode) },
          { time: "21时", temperature: "7", precipitationProbability: "0", windSpeed: "7", weatherCode: String(currentCode) },
          { time: "22时", temperature: "7", precipitationProbability: "0", windSpeed: "6", weatherCode: String(currentCode) },
          { time: "23时", temperature: "6", precipitationProbability: "0", windSpeed: "6", weatherCode: String(currentCode) },
          { time: "0时", temperature: "6", precipitationProbability: "0", windSpeed: "5", weatherCode: String(currentCode) },
          { time: "1时", temperature: "5", precipitationProbability: "0", windSpeed: "5", weatherCode: String(currentCode) },
        ];
  const apiDaily = liveWeather?.daily;
  const dailyView: WeatherMetaPoint[] = apiDaily
    ? apiDaily.time.map((date, i) => ({
        label: weatherDay(date, i),
        low: String(Math.round(apiDaily.temperature_2m_min[i] ?? 0)),
        high: String(Math.round(apiDaily.temperature_2m_max[i] ?? 0)),
        weatherCode: String(apiDaily.weather_code[i] ?? currentCode),
        precipitationProbability: String(apiDaily.precipitation_probability_max[i] ?? 0),
      }))
    : daily.length
      ? daily
      : [
          { label: "今天", low: lowTemperature, high: highTemperature, weatherCode: String(currentCode) },
          { label: "明天", low: "8", high: "13", weatherCode: "3", precipitationProbability: "60" },
          { label: "周五", low: "9", high: "17", weatherCode: "1", precipitationProbability: "10" },
          { label: "周六", low: "7", high: "14", weatherCode: "0", precipitationProbability: "10" },
          { label: "周日", low: "6", high: "12", weatherCode: "2", precipitationProbability: "25" },
          { label: "周一", low: "5", high: "11", weatherCode: "3", precipitationProbability: "35" },
          { label: "周二", low: "6", high: "13", weatherCode: "2", precipitationProbability: "20" },
        ];
  const read = () => {
    if (item) {
      if (p.creator || item.password) p.onItem(item);
      else p.onRead(item.id);
    }
  };
  const updateLabel = weatherLoading
    ? "正在更新天气…"
    : weatherError && !liveWeather
      ? "网络暂不可用 · 显示备用天气"
      : "更新于 " + lastUpdated + "（首尔时间）";
  return (
    <div
      className="catalog-skin native-weather calibrated-weather"
      data-empty={!item}
    >
      <div className="weather-stars" aria-hidden="true" />
      <div className="weather-native-scroll">
        <section className="weather-native-current">
          <small>{item ? meta(item, "locationLabel", "韩国 · 首尔") : "天气"}</small>
          <h1>{item?.title || "未添加城市"}</h1>
          <button
            className="weather-refresh"
            aria-label="刷新首尔天气"
            onClick={() => {
              setWeatherLoading(true);
              setWeatherError(false);
              setRefreshToken((value) => value + 1);
            }}
          >
            <RefreshCw size={16} className={weatherLoading ? "is-spinning" : ""} />
          </button>
          <output>{currentTemperature}°</output>
          <div className="weather-high-low">
            <span>最高 {highTemperature}°</span>
            <span>最低 {lowTemperature}°</span>
          </div>
          <p>{condition}</p>
          <small className="weather-update-label" aria-live="polite">{updateLabel}</small>
          <WeatherGlyph
            code={currentCode}
            isDay={isDay}
            size={55}
            className="weather-moon-art"
          />
        </section>

        <section className="weather-native-card weather-weather-details" aria-label="天气详情">
          <div className="weather-stat">
            <div><Thermometer size={16} /><span>体感温度</span></div>
            <strong>{apparentTemperature}°</strong>
          </div>
          <div className="weather-stat">
            <div><Droplet size={16} /><span>湿度</span></div>
            <strong>{Number.isFinite(humidity) ? Math.round(humidity) : "—"}%</strong>
          </div>
          <div className="weather-stat">
            <div><Wind size={16} /><span>风速</span></div>
            <strong>{Number.isFinite(windSpeed) ? Math.round(windSpeed) : "—"}<small> km/h</small></strong>
          </div>
          <div className="weather-stat">
            <div><Droplet size={16} /><span>降水量</span></div>
            <strong>{Number.isFinite(rainfall) ? rainfall.toFixed(1) : "—"}<small> mm</small></strong>
          </div>
          <div className="weather-stat">
            <div><Sun size={16} /><span>紫外线</span></div>
            <strong>{Number.isFinite(uvIndex) ? uvIndex.toFixed(1) : "—"}</strong>
          </div>
          <div className="weather-stat">
            <div><Activity size={16} /><span>气压</span></div>
            <strong>{Number.isFinite(pressure) ? Math.round(pressure) : "—"}<small> hPa</small></strong>
          </div>
        </section>

        <button
          className="weather-native-card weather-air-quality"
          onClick={() => {
            read();
            setSheet("空气质量");
          }}
        >
          <strong>
            {Number.isFinite(airQualityIndex)
              ? airQualityIndex + " · " + aqiLabel(airQualityIndex)
              : "暂无空气质量数据"}
          </strong>
          <div className="weather-aqi-scale">
            <i
              style={{
                left: Number.isFinite(airQualityIndex)
                  ? Math.max(0, Math.min(95, airQualityIndex / 5)) + "%"
                  : "0%",
              }}
            />
          </div>
          <p>
            {liveAirQuality?.current
              ? "PM2.5 " + liveAirQuality.current.pm2_5.toFixed(1) + " μg/m³ · PM10 " + liveAirQuality.current.pm10.toFixed(1) + " μg/m³"
              : Number.isFinite(airQualityIndex)
                ? "当前空气质量指数（US AQI）"
                : "暂时无法获取空气质量数据"}
          </p>
        </button>

        <section className="weather-native-card weather-hourly">
          <header>
            <div>
              <strong>逐小时预报</strong>
              <small>
                {mode === "temperature"
                  ? "气温 (°C)"
                  : mode === "rain"
                    ? "降水概率"
                    : "风速 (km/h)"}
              </small>
            </div>
            <div className="weather-mode-switch">
              {[
                [Cloud, "temperature"],
                [Droplet, "rain"],
                [Wind, "wind"],
              ].map(([Icon, key]) => {
                const Glyph = Icon as typeof Cloud;
                return (
                  <button
                    aria-label={String(key)}
                    aria-pressed={mode === key}
                    key={String(key)}
                    onClick={() => setMode(String(key))}
                  >
                    <Glyph size={18} />
                  </button>
                );
              })}
            </div>
          </header>
          <div className="weather-hour-grid">
            {hourlyView.map((hour, n) => (
              <button
                key={String(hour.time) + "-" + n}
                onClick={() => {
                  read();
                  setSheet("逐小时天气");
                }}
              >
                <strong>{weatherHour(hour.time)}</strong>
                <WeatherGlyph
                  code={Number(hour.weatherCode ?? currentCode)}
                  isDay={n === 0 ? isDay : Number((hour.time || "").slice(11, 13)) >= 6 && Number((hour.time || "").slice(11, 13)) < 18}
                  size={26}
                />
                <span>
                  {mode === "temperature"
                    ? (hour.temperature ?? "—") + "°"
                    : mode === "rain"
                      ? (hour.precipitationProbability ?? meta(item, "rain", "—")) + "%"
                      : (hour.windSpeed ?? meta(item, "wind", "—")) + " km/h"}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="weather-native-card weather-days">
          <header className="weather-days-header">
            <strong>未来 7 天</strong>
            <small>每日天气与温度范围</small>
          </header>
          {dailyView.map((day, n) => (
            <button
              key={String(day.label) + "-" + n}
              onClick={() => {
                read();
                setSheet("每日天气");
              }}
            >
              <strong>{day.label || day.time || "—"}</strong>
              <WeatherGlyph code={Number(day.weatherCode ?? currentCode)} size={23} />
              <small>{day.precipitationProbability ? day.precipitationProbability + "%" : ""}</small>
              <span>{day.low || "—"}°</span>
              <i />
              <b>{day.high || "—"}°</b>
            </button>
          ))}
        </section>
      </div>
      <nav className="weather-native-toolbar">
        <button aria-label="天气地图" onClick={() => setSheet("天气地图")}>
          <Map size={27} />
        </button>
        <div className="weather-city-dots">
          {p.items.length ? (
            p.items.map((i, n) => (
              <button
                aria-label={"切换城市" + i.title}
                aria-current={n === index ? "true" : undefined}
                key={i.id}
                onClick={() => {
                  setIndex(n);
                  p.onRead(i.id);
                }}
              />
            ))
          ) : (
            <span />
          )}
        </div>
        <button aria-label="城市列表" onClick={() => setSheet("城市列表")}>
          <List size={29} />
        </button>
      </nav>
      {sheet && (
        <div className="weather-native-sheet">
          <header>
            <button aria-label="返回天气" onClick={() => setSheet("")}>
              <ChevronLeft />
              天气
            </button>
            <strong>{sheet}</strong>
          </header>
          {sheet === "城市列表" ? (
            <>
              <label className="weather-city-search">
                <Search size={18} />
                <input
                  placeholder="搜索城市"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              {p.items
                .filter((i) => i.title.includes(query))
                .map((i) => (
                  <button
                    className="weather-city-row"
                    key={i.id}
                    onClick={() => {
                      setIndex(p.items.indexOf(i));
                      setSheet("");
                      p.onRead(i.id);
                    }}
                  >
                    <strong>{i.title}</strong>
                    <span>{liveWeather?.current && /首尔|seoul/i.test(i.title) ? currentTemperature : meta(i, "temperature", "—")}°</span>
                  </button>
                ))}
              {!p.items.length && <p>暂无城市</p>}
              {p.creator && (
                <button onClick={p.onAdd}>
                  <Plus />
                  添加城市
                </button>
              )}
            </>
          ) : sheet === "天气地图" ? (
            <div className="weather-map-empty">
              <Map size={60} />
              <h2>{item?.title || "首尔特别市"}</h2>
              <p>韩国 · 37.5665°N, 126.9780°E</p>
              <small>实时天气已同步；地图底图需联网加载。</small>
            </div>
          ) : (
            <div className="weather-section-detail">
              <h2>{item?.title || "首尔特别市"}</h2>
              <p>
                {sheet === "空气质量"
                  ? (Number.isFinite(airQualityIndex) ? "AQI " + airQualityIndex + "（" + aqiLabel(airQualityIndex) + "）" : "暂无空气质量数据") +
                    (liveAirQuality?.current ? "。PM2.5 " + liveAirQuality.current.pm2_5.toFixed(1) + " μg/m³，PM10 " + liveAirQuality.current.pm10.toFixed(1) + " μg/m³。" : "")
                  : sheet === "逐小时天气"
                    ? hourlyView.map((hour) => weatherHour(hour.time) + " " + (hour.temperature ?? "—") + "°C · 降水 " + (hour.precipitationProbability ?? "—") + "%").join("；")
                    : dailyView.map((day) => (day.label || "—") + " " + (day.low || "—") + "° / " + (day.high || "—") + "° · " + weatherDescription(Number(day.weatherCode ?? currentCode))).join("；")}
              </p>
              <small>{updateLabel}</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
