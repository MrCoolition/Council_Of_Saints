import { query } from "@/db/db";

export type AppUser = {
  id: string;
  display_name: string;
  timezone: string;
  country: string;
  diocese: string | null;
  formation_stage: string;
};

export async function ensureAppUser(
  authSubject: string,
  displayName: string,
): Promise<AppUser> {
  const result = await query<AppUser>(
    `
      insert into app_user (auth_subject, display_name)
      values ($1, $2)
      on conflict (auth_subject) do update set
        display_name = excluded.display_name,
        updated_at = now(),
        deleted_at = null
      returning
        id,
        display_name,
        timezone,
        country,
        diocese,
        formation_stage
    `,
    [authSubject, displayName],
  );

  return result.rows[0];
}
