export const APP_TIME_ZONE = "Africa/Lagos";

const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: APP_TIME_ZONE,
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: APP_TIME_ZONE,
});

export function formatDateTime(value) {
  if (!value) {
    return "No time set";
  }

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return "Invalid date";
  }

  return longDateFormatter.format(date);
}

export function formatShortDateTime(value) {
  if (!value) {
    return "No time set";
  }

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return "Invalid date";
  }

  return shortDateFormatter.format(date);
}

export function toDateTimeLocalValue(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const mapped = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${mapped.year}-${mapped.month}-${mapped.day}T${mapped.hour}:${mapped.minute}`;
}
