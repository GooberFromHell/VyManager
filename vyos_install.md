# VyManager VyOS 1.5 Container Configuration

This guide provides the necessary VyOS CLI commands to deploy the VyManager stack natively using VyOS 1.5's container support (Podman under the hood). This avoids the need for `docker-compose`.

## Prerequisites

- VyOS 1.5 installed.
- Access to the target VyOS router via SSH or console.

## Configuration Steps

### 1. Create the Environment Configuration File
First, we'll create the `.env` configuration file on the VyOS router inside a persistent directory (`/config`). This directory survives OS upgrades.

```bash
sudo mkdir -p /config/vymanager/postgres_data
sudo nano /config/vymanager/.env
```

Paste your `.env` variables into that file (matching what your `docker-compose.yml` previously used), for example:
```ini
DATABASE_URL=postgresql://vymanager:vymanager@vymanager-postgres:5432/vymanager_auth
FRONTEND_URL=http://vymanager-frontend:3000
BETTER_AUTH_SECRET=Change-This-To-Something-Secret
SSH_ENCRYPTION_KEY=42a33e90f3f87b35687a6f2a0475e35f22703b74ad60adba788029ae8430509d
VYMANAGER_ENV=production
TRUSTED_ORIGINS=http://172.16.100.2:3001,http://localhost:3001
NODE_ENV=production
BACKEND_URL=http://vymanager-backend:8000
BETTER_AUTH_URL=http://172.16.100.2:3001
NEXT_PUBLIC_APP_URL=http://172.16.100.2:3001
```

### 2. Enter Configuration Mode
Enter configuration mode on your VyOS router:

```bash
configure
```

### 3. Create Network and Registry

First, create a dedicated bridge network for the containers and set the container registry:

```bash
set container network vymgr-net prefix '172.18.200.0/24'
set container registry 'ghcr.io'
```

### 4. Configure PostgreSQL Container

PostgreSQL requires native environment variables for its initialization phase, so those remain embedded in the config.

```bash
set container name vymanager-postgres image 'docker.io/postgres:16-alpine'
set container name vymanager-postgres network vymgr-net
set container name vymanager-postgres port 5432 source '5432'
set container name vymanager-postgres port 5432 destination '5432'
set container name vymanager-postgres volume postgres_data source '/config/vymanager/postgres_data'
set container name vymanager-postgres volume postgres_data destination '/var/lib/postgresql/data'
set container name vymanager-postgres restart 'on-failure'

# PostgreSQL Init Environment Variables
set container name vymanager-postgres environment POSTGRES_USER value 'vymanager'
set container name vymanager-postgres environment POSTGRES_PASSWORD value 'vymanager'
set container name vymanager-postgres environment POSTGRES_DB value 'vymanager_auth'
```

### 5. Configure Backend Container

The backend requires the `.env` file configuration. Similar to Prometheus (`--config.file`), we are injecting our `.env` file via runtime `arguments` to Uvicorn using the mounted volume instance.

```bash
set container name vymanager-backend image 'ghcr.io/community-vyprojects/vymanager-backend:beta'
set container name vymanager-backend network vymgr-net
set container name vymanager-backend port 8000 source '8000'
set container name vymanager-backend port 8000 destination '8000'
set container name vymanager-backend restart 'on-failure'

# Mount the config volume and pass the env file as a Uvicorn startup argument
set container name vymanager-backend volume vymanager-config source '/config/vymanager/.env'
set container name vymanager-backend volume vymanager-config destination '/config/backend.env'
set container name vymanager-backend volume vymanager-config mode 'ro'
set container name vymanager-backend arguments 'uvicorn app:app --host 0.0.0.0 --port 8000 --proxy-headers --env-file /config/backend.env'
```

### 6. Configure Frontend Container

Next.js does not accept configuration paths via command-line arguments. Instead, it reads the `.env` configuration file directly from the application's root working directory. By mounting the same `/config/vymanager/.env` file to `/app/.env` inside the frontend container, it serves the exact same purpose as an argument.

```bash
set container name vymanager-frontend image 'ghcr.io/community-vyprojects/vymanager-frontend:beta'
set container name vymanager-frontend network vymgr-net
set container name vymanager-frontend port 3001 source '3001'
set container name vymanager-frontend port 3001 destination '3000'
set container name vymanager-frontend restart 'on-failure'

# Mount the config file directly into Next.js' working root directory
set container name vymanager-frontend volume vymanager-config source '/config/vymanager/.env'
set container name vymanager-frontend volume vymanager-config destination '/app/.env'
set container name vymanager-frontend volume vymanager-config mode 'ro'
```

### 7. Commit and Save

Once you have entered all the configuration commands, commit the changes to apply them and then save the configuration.

```bash
commit
save
exit
```
