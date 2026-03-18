import pino, { type Logger } from "pino";

const LEVEL_LABEL: Record<number, string> = {
  10: "TRACE",
  20: "DEBUG",
  30: "INFO",
  40: "WARN",
  50: "ERROR",
  60: "FATAL",
};

type BrowserLogRecord = {
  level?: number;
  msg?: string;
  time?: string;
  scope?: string;
} & Record<string, unknown>;

const formatLogLine = (record: BrowserLogRecord): string => {
  const level = LEVEL_LABEL[record.level ?? 30] ?? "INFO";
  const scope = String(record.scope ?? "app");
  const rawTime = typeof record.time === "string" ? record.time : undefined;
  const parsed = rawTime ? new Date(rawTime) : new Date();
  const time = Number.isNaN(parsed.getTime())
    ? "--:--:--"
    : parsed.toLocaleTimeString("en-GB", { hour12: false });
  const message = typeof record.msg === "string" ? record.msg : "";

  return `[${time}][${scope}][${level}] ${message}`.trim();
};

const writeHumanReadable = (record: object): void => {
  const normalized = record as BrowserLogRecord;
  const { level, msg, time, scope, ...extra } = normalized;
  const line = formatLogLine({ level, msg, time, scope });
  const hasExtra = Object.keys(extra).length > 0;

  if ((level ?? 30) >= 50) {
    if (hasExtra) {
      console.error(line, extra);
      return;
    }
    console.error(line);
    return;
  }

  if ((level ?? 30) >= 40) {
    if (hasExtra) {
      console.warn(line, extra);
      return;
    }
    console.warn(line);
    return;
  }

  if (hasExtra) {
    console.info(line, extra);
    return;
  }

  console.info(line);
};

const baseLogger = pino({
  name: "league-jax-web",
  level: import.meta.env.DEV ? "debug" : "info",
  timestamp: pino.stdTimeFunctions.isoTime,
  browser: {
    asObject: true,
    write: writeHumanReadable,
  },
});

export const createLogger = (scope: string): Logger => {
  return baseLogger.child({ scope });
};
