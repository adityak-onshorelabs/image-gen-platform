import { signSession, verifySession } from "../src/lib/session";

const secret = "test-secret-0123456789";

async function run() {
  let pass = 0,
    fail = 0;
  const check = (name: string, cond: boolean) => {
    if (cond) { pass++; console.log(`  ✓ ${name}`); }
    else { fail++; console.log(`  ✗ ${name}`); }
  };

  const token = await signSession("admin@onshorelabs.co.in", secret);
  check("roundtrip returns email", (await verifySession(token, secret)) === "admin@onshorelabs.co.in");
  check("wrong secret rejected", (await verifySession(token, "other")) === null);
  check("tampered token rejected", (await verifySession(token.slice(0, -2) + "xx", secret)) === null);
  check("missing token rejected", (await verifySession(undefined, secret)) === null);
  check("garbage rejected", (await verifySession("not.a.token", secret)) === null);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
run();
