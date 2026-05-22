import { useEffect, useState } from "react";

export function useRole() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    fetch("/api/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUserRole(data?.role ?? null))
      .catch(() => setUserRole(null))
      .finally(() => setRoleLoading(false));
  }, []);

  return [
    roleLoading,
    userRole
  ]
}
