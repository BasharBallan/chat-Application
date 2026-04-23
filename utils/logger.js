const { createLogger, format, transports } = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const util = require("util");

// Mask sensitive fields
const maskSensitive = (obj) => {
  if (!obj) return obj;
  const clone = { ...obj };
  const fieldsToMask = ["password", "token", "refreshToken", "email"];

  for (const field of fieldsToMask) {
    if (clone[field]) clone[field] = "***MASKED***";
  }

  return clone;
};

// Pretty console formatter
const consoleFormat = format.printf(({ level, message, timestamp, meta }) => {
  let metaFormatted = "";

  if (meta) {
    const masked = maskSensitive(meta);
    for (const [key, value] of Object.entries(masked)) {
      metaFormatted += `\n   • ${key}: ${util.inspect(value, { colors: true, depth: 3 })}`;
    }
  }

  return `${timestamp}  [${level}]  ${message}${metaFormatted}`;
});

// JSON formatter for files
const fileFormat = format.printf(({ level, message, timestamp, meta }) => {
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...(meta ? { meta: maskSensitive(meta) } : {})
  });
});

const logger = createLogger({
  level: "info",

  transports: [
    // -------- Console (Pretty + Colored) --------
    new transports.Console({
      format: format.combine(
        format.colorize({ all: true }),
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        consoleFormat
      ),
    }),

    // -------- Daily Rotating Log (JSON) --------
    new DailyRotateFile({
      filename: "logs/app-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "14d",
      zippedArchive: true,
      level: "info",
      format: format.combine(format.timestamp(), fileFormat),
    }),

    new DailyRotateFile({
      filename: "logs/error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "30d",
      zippedArchive: true,
      level: "error",
      format: format.combine(format.timestamp(), fileFormat),
    }),
  ],
});

module.exports = logger;
