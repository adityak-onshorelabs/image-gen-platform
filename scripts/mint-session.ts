import "dotenv/config";
import { signSession } from "../src/lib/session";

async function main() {
  const token = await signSession(
    process.env.ADMIN_EMAIL!,
    process.env.SESSION_SECRET!
  );
  process.stdout.write(token);
}
main();
