# Local PostgreSQL setup (Windows)

Use this to run the Prevailing Wage app with a real database on your machine.

## 1. Install PostgreSQL

**Option A – Official installer (recommended)**

1. Download the Windows installer: https://www.postgresql.org/download/windows/
2. Run it and use the default port **5432**.
3. Set a **password for the `postgres` superuser** (remember it for step 2).
4. Finish the installer (Stack Builder at the end is optional).

**Option B – Winget**

```powershell
winget install PostgreSQL.PostgreSQL
```

After install, add the Postgres `bin` folder to your PATH (e.g. `C:\Program Files\PostgreSQL\16\bin`) so you can run `psql` from any terminal.

## 2. Create the database and user

Open **Command Prompt** or **PowerShell** and run (replace `YOUR_POSTGRES_PASSWORD` with the password you set for `postgres`):

```powershell
# Set password for this session (optional; you can type it when prompted)
$env:PGPASSWORD = "YOUR_POSTGRES_PASSWORD"

# Create database (from project root; or use the one-liner below)
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -f create-db.sql

# One-liner alternative:
# & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE prevailing_wage;"
```

If your PostgreSQL version is not 16, change the path (e.g. `...\PostgreSQL\15\bin\...`).

**Optional:** Create a dedicated app user instead of using `postgres`:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE USER pwage WITH PASSWORD 'your_app_password';"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE prevailing_wage TO pwage;"
```

Then use `pwage` and `your_app_password` in `DATABASE_URL` below. Otherwise use `postgres` and its password.

## 3. Run the schema

From the project root (where `cloudsql-schema.sql` is):

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d prevailing_wage -f cloudsql-schema.sql
```

If you created a user like `pwage`, grant schema permissions after the first run:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d prevailing_wage -c "GRANT ALL ON SCHEMA public TO pwage; GRANT ALL ON ALL TABLES IN SCHEMA public TO pwage; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO pwage;"
```

## 4. Set DATABASE_URL in .env.local

In `.env.local` add or override:

```env
# Local PostgreSQL (use the user and password you created)
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/prevailing_wage
```

If you use a dedicated user:

```env
DATABASE_URL=postgresql://pwage:your_app_password@localhost:5432/prevailing_wage
```

Restart the dev server (`npm run dev`). Sign in with Google again; your profile will be created in the `profiles` table and you’ll use the real DB instead of the dev fallback.

## Troubleshooting

- **“psql not found”** – Use the full path to `psql.exe` as above, or add the Postgres `bin` folder to your PATH.
- **“password authentication failed”** – Double-check the password for `postgres` (or your app user) and that there are no extra spaces in `DATABASE_URL`.
- **“relation does not exist”** – Re-run step 3 to apply `cloudsql-schema.sql`.
- **Port 5432 in use** – Another Postgres or app is using it; stop it or use a different port and put it in the URL, e.g. `localhost:5433`.
