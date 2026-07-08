import { getPool, type SanctumPoolClient } from "@/db/db";

export async function withUserTransaction<T>(
  userId: string,
  fn: (client: SanctumPoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query("begin");
    await client.query("select set_config('app.current_user_id', $1, true)", [
      userId,
    ]);

    const result = await fn(client);

    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
