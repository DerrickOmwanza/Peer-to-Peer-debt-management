# PostgreSQL Password Configuration

Your PostgreSQL is running but the password in `.env` is incorrect.

## Option 1: Find Your PostgreSQL Password

1. **Did you just install PostgreSQL?** 
   - Check the installation notes or emails
   - Look in `C:\Program Files\PostgreSQL\16\` for any README files
   - During installation, you should have chosen a password for the `postgres` user

2. **Update .env with your actual password**:
   ```
   DB_PASSWORD=your_actual_postgres_password
   ```

## Option 2: Reset PostgreSQL Password (Windows)

1. Stop PostgreSQL Service:
   - Press `WIN + R`
   - Type `services.msc`
   - Find "postgresql-x64-16"
   - Right-click → Stop

2. Open Command Prompt as Administrator

3. Start PostgreSQL in single-user mode:
   ```
   "C:\Program Files\PostgreSQL\16\bin\postgres.exe" --single -D "C:\Program Files\PostgreSQL\16\data" postgres
   ```

4. In the prompt, run:
   ```
   ALTER USER postgres WITH PASSWORD 'newpassword';
   ```

5. Exit (Ctrl+D), then start PostgreSQL service again

6. Update .env:
   ```
   DB_PASSWORD=newpassword
   ```

## Option 3: Use Windows Authentication (Easier)

Edit `C:\Program Files\PostgreSQL\16\data\pg_hba.conf`:

Find these lines:
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             all                                     trust
host    all             all             127.0.0.1/32            md5
```

Change `md5` to `trust` for localhost connections:
```
host    all             all             127.0.0.1/32            trust
```

Then in .env, you can set:
```
DB_PASSWORD=
```
(or remove the password line entirely)

Restart PostgreSQL service after this change.

## Quick Test

Once you've set the correct password, run:
```
node test-connection.js
```

You should see:
```
✓ Connected successfully!
  Server time: ...
```

Then run:
```
npm run db:init
```
