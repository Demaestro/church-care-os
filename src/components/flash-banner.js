export function FlashBanner({
  notice = "",
  error = "",
  noticeTitle = "Saved",
  errorTitle = "Needs attention",
}) {
  const message = error || notice;

  if (!message) {
    return null;
  }

  const isError = Boolean(error);

  return (
    <div
      className={`rounded-[1.35rem] border px-5 py-4 text-sm leading-7 ${
        isError
          ? "border-[rgba(184,101,76,0.18)] bg-[rgba(184,101,76,0.08)] text-clay"
          : "border-[rgba(73,106,77,0.16)] bg-[rgba(73,106,77,0.08)] text-moss"
      }`}
    >
      <p className="font-semibold">{isError ? errorTitle : noticeTitle}</p>
      <p className="mt-1">{message}</p>
    </div>
  );
}
