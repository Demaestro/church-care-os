import {
  permissionLegend,
  permissionMatrixSections,
  permissionRoles,
  permissionRules,
} from "@/lib/role-previews";

export const metadata = {
  title: "Permission Matrix",
  description:
    "A detailed role matrix showing how members, volunteers, leaders, pastors, and owners see care requests and records.",
};

export default function PermissionsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10 pb-16 lg:px-10 lg:py-14">
      <section className="surface-card rounded-[2rem] border border-line bg-paper p-7 lg:p-10">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-muted">
          Permission matrix
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl leading-tight tracking-[-0.04em] text-foreground [font-family:var(--font-display)] sm:text-5xl">
          The privacy model is visible in the UI, not hidden in policy.
        </h1>
        <p className="mt-5 max-w-4xl text-base leading-8 text-muted sm:text-lg">
          This table mirrors the access logic behind the care product. It makes
          two boundaries explicit: volunteers only see assigned work, and the
          pastor-only at-risk list never appears in general task views.
        </p>

        <div className="mt-8 flex flex-wrap gap-6">
          {permissionLegend.map((item) => (
            <div key={item.key} className="flex items-center gap-3 text-sm text-foreground">
              <AccessMark access={item.key} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="min-w-[960px] w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className="border-b border-line px-4 py-4 text-base font-semibold text-foreground">
                  Action
                </th>
                {permissionRoles.map((role) => (
                  <th
                    key={role.key}
                    className="border-b border-line px-4 py-4 text-center"
                  >
                    <span
                      className={`inline-flex rounded-full px-4 py-2 text-base font-semibold ${role.pillClass}`}
                    >
                      {role.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionMatrixSections.map((section) => (
                <PermissionSection key={section.title} section={section} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        {permissionRules.map((rule) => (
          <article
            key={rule.title}
            className="surface-card rounded-[1.75rem] border border-line bg-paper p-6"
          >
            <h2 className="text-2xl text-foreground [font-family:var(--font-display)]">
              {rule.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted">{rule.detail}</p>
          </article>
        ))}
      </section>
    </div>
  );
}

function PermissionSection({ section }) {
  return (
    <>
      <tr>
        <th
          colSpan={permissionRoles.length + 1}
          className="bg-[#f3eee4] px-4 py-3 text-center text-[0.8rem] font-semibold uppercase tracking-[0.16em] text-muted"
        >
          {section.title}
        </th>
      </tr>
      {section.rows.map((row) => (
        <tr key={row.label}>
          <th className="border-b border-line px-4 py-5 text-base font-medium text-foreground">
            {row.label}
          </th>
          {permissionRoles.map((role) => (
            <td
              key={role.key}
              className="border-b border-line px-4 py-5 text-center"
            >
              <AccessMark access={row.access[role.key]} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function AccessMark({ access }) {
  if (access === "full") {
    return (
      <span
        aria-label="Full access"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(73,106,77,0.12)] text-lg font-semibold text-moss"
      >
        <span
          aria-hidden
          className="block h-3.5 w-2 rotate-45 border-b-2 border-r-2 border-moss"
        />
      </span>
    );
  }

  if (access === "own") {
    return (
      <span
        aria-label="Own records only"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(179,138,69,0.12)]"
      >
        <span aria-hidden className="h-3.5 w-3.5 rounded-full bg-gold" />
      </span>
    );
  }

  return (
    <span
      aria-label="No access"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(34,28,22,0.1)] bg-transparent"
    >
      <span aria-hidden className="h-3.5 w-3.5 rounded-full border border-[rgba(34,28,22,0.1)]" />
    </span>
  );
}
