// Creates the initial user accounts inside a running backend container.
// Piped over SSH by `make tenant-users TENANT=<tenant>`:
//
//   cat scripts/create-first-users.js | ssh root@<tenant>... \
//     "docker exec -i -e ADMIN_PASS=... <tenant>-backend-1 node -"
//
// Reads DATABASE_URL from the container env (set by compose). Creates
// admin + one account per role (all password ADMIN_PASS, default Abc123).
// Deliberately NO email/phone — usernames are the login identifiers.
// Idempotent: the partial unique index users_username_active_unq (schema.ts)
// makes ON CONFLICT DO NOTHING a no-op once a live row exists.
const postgres = require('postgres');
const bcrypt = require('bcryptjs');

const sql = postgres(process.env.DATABASE_URL);

const ACCOUNTS = [
  { username: 'admin',    fullName: 'Quản trị viên', role: 'ADMIN' },
  { username: 'giamdoc',  fullName: 'Giám đốc',      role: 'ADMIN' },
  { username: 'ketoan',   fullName: 'Kế toán',       role: 'ACCOUNTANT' },
  { username: 'laixe',    fullName: 'Lái xe',        role: 'DRIVER' },
  { username: 'giaonhan', fullName: 'Giao nhận',     role: 'FORWARDER' },
];

(async () => {
  const hash = bcrypt.hashSync(process.env.ADMIN_PASS || 'Abc123', 10);
  for (const { username, fullName, role } of ACCOUNTS) {
    const rows = await sql`
      insert into users (username, full_name, password_hash, role, status)
      values (${username}, ${fullName}, ${hash}, ${role}, 'ACTIVE')
      on conflict do nothing
      returning id`;
    console.log(rows.length ? `Created ${username} id=${rows[0].id} (${role})` : `${username} already exists`);
  }
  const cleaned = await sql`
    update users set email = null, phone = null
    where username = any(${ACCOUNTS.map((a) => a.username)})
      and (email is not null or phone is not null)
    returning username`;
  if (cleaned.length) console.log(`Cleared placeholder email/phone on: ${cleaned.map((r) => r.username).join(', ')}`);
  await sql.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
