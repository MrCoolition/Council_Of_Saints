export type ResolvedAuth = {
  authSubject: string;
  displayName: string;
};

export function resolveAuth(request: Request): ResolvedAuth {
  return resolveAuthFromHeaders(request.headers);
}

export function resolveAuthFromHeaders(headers?: Headers | null): ResolvedAuth {
  const headerSubject = headers?.get("x-sanctum-auth-subject");
  const headerName = headers?.get("x-sanctum-display-name");
  const configuredDemoSubject =
    process.env.SANCTUM_DEMO_AUTH_SUBJECT ?? "coolition-primary";
  const configuredDemoName = process.env.SANCTUM_DEMO_DISPLAY_NAME ?? "Coolition";

  if (process.env.NODE_ENV !== "production") {
    return {
      authSubject: headerSubject ?? configuredDemoSubject ?? "local-dev-user",
      displayName: headerName ?? configuredDemoName,
    };
  }

  if (process.env.TRUST_AUTH_HEADER === "1" && headerSubject) {
    return {
      authSubject: headerSubject,
      displayName: headerName ?? "Sanctum User",
    };
  }

  return {
    authSubject: configuredDemoSubject,
    displayName: headerName ?? configuredDemoName,
  };
}
