#!/bin/vbash

echo "Starting VyManager container configuration..."

# Ensure we are not already in configure mode
if [ "$(id -g -n)" != 'vyattacfg' ]; then
    exec sg vyattacfg -c "/bin/vbash $(readlink -f $0) $@"
fi

# Load VyOS script template for configuration commands
source /opt/vyatta/etc/functions/script-template

# Pre-configuration tasks
echo "Setting up database volume directory..."
sudo mkdir -p /config/vymanager/postgres_data
sudo chown 70:70 /config/vymanager/postgres_data

echo "Adding container images..."
add container image 'docker.io/postgres:16-alpine'
add container image 'ghcr.io/community-vyprojects/vymanager-backend:beta'
add container image 'ghcr.io/community-vyprojects/vymanager-frontend:beta'

echo "Entering configuration mode..."
cat << 'EOF' > /tmp/vyos-config.sh
#!/bin/vbash
source /opt/vyatta/etc/functions/script-template

configure

# 1. Network & Registry
set container network vymgr-net prefix '172.18.200.0/24'
set container registry 'ghcr.io'

# 2. PostgreSQL
# Since PostgreSQL relies on native environment variables rather than a custom config file,
# we still inject its required database credentials here.
set container name vymanager-postgres image 'docker.io/postgres:16-alpine'
set container name vymanager-postgres network 'vymgr-net'
set container name vymanager-postgres port 5432 source '5432'
set container name vymanager-postgres port 5432 destination '5432'
set container name vymanager-postgres volume postgres_data source '/config/vymanager/postgres_data'
set container name vymanager-postgres volume postgres_data destination '/var/lib/postgresql/data'
set container name vymanager-postgres restart 'on-failure'
set container name vymanager-postgres environment POSTGRES_USER value 'vymanager'
set container name vymanager-postgres environment POSTGRES_PASSWORD value 'vymanager'
set container name vymanager-postgres environment POSTGRES_DB value 'vymanager_auth'

# 3. Backend
# Mounts the configuration via persistent volume and sets the arguments exactly like Prometheus
set container name vymanager-backend image 'ghcr.io/community-vyprojects/vymanager-backend:beta'
set container name vymanager-backend network 'vymgr-net'
set container name vymanager-backend port 8000 source '8000'
set container name vymanager-backend port 8000 destination '8000'
set container name vymanager-backend restart 'on-failure'
set container name vymanager-backend volume vymanager-config source '/config/vymanager/.env'
set container name vymanager-backend volume vymanager-config destination '/config/backend.env'
set container name vymanager-backend volume vymanager-config mode 'ro'
set container name vymanager-backend arguments 'uvicorn app:app --host 0.0.0.0 --port 8000 --proxy-headers --env-file /config/backend.env'

# 4. Frontend
# Next.js natively reads configuration from an .env file placed in the working directory (/app)
# Next.js does not accept configuration paths via arguments (unlike Prometheus), so mounting it behaves structurally the same.
set container name vymanager-frontend image 'ghcr.io/community-vyprojects/vymanager-frontend:beta'
set container name vymanager-frontend network 'vymgr-net'
set container name vymanager-frontend port 3000 source '3000'
set container name vymanager-frontend port 3000 destination '3000'
set container name vymanager-frontend restart 'on-failure'
set container name vymanager-frontend volume vymanager-config source '/config/vymanager/.env'
set container name vymanager-frontend volume vymanager-config destination '/app/.env'
set container name vymanager-frontend volume vymanager-config mode 'ro'

commit
save
exit
EOF

chmod +x /tmp/vyos-config.sh
sg vyattacfg -c /tmp/vyos-config.sh
rm /tmp/vyos-config.sh


echo "VyManager automated configuration complete."
