import AccessRestricted from "@/components/AccessRestricted";

export const metadata = { title: "Access Restricted" };

export default function AccessRestrictedPage({ searchParams }) {
  const module = searchParams?.module || "this section";
  const role = searchParams?.role || "a departmental lead";

  return (
    <AccessRestricted
      module={module}
      requiredRole={role}
      managerHref="/settings"
    />
  );
}
