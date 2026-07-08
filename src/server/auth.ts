export type ResolvedAuth = {
  authSubject: string;
  displayName: string;
};

export function resolveAuth(request: Request): ResolvedAuth | null {
  const headerSubject = request.headers.get("x-sanctum-auth-subject");
  const headerName = request.headers.get("x-sanctum-display-name");
  const configuredDemoSubject = process.env.SANCTUM_DEMO_AUTH_SUBJECT;

  if (process.env.NODE_ENV !== "production") {
    return {
      authSubject: headerSubject ?? configuredDemoSubject ?? "local-dev-user",
      displayName: headerName ?? "Coolition",
    };
  }

  if (process.env.TRUST_AUTH_HEADER === "1" && headerSubject) {
    return {
      authSubject: headerSubject,
      displayName: headerName ?? "Sanctum User",
    };
  }

  return null;
}
