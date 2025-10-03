# Docker Deployment Guide

## Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- Access to RouterOS device with REST API enabled
- LDAP server for authentication

## Quick Start

### 1. Clone and Configure

```bash
# Clone repository
git clone <repository-url>
cd wg-manager

# Copy environment file
cp .env.example .env

# Edit .env with your actual values
nano .env
```

### 2. Build and Run with Docker Compose

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop container
docker-compose down
```

### 3. Access Application

- Open browser: `http://localhost:3000`
- Login with LDAP credentials
- Admin users (in `LDAP_ADMIN_GROUP`) can access `/admin`

## Manual Docker Commands

### Build Image

```bash
docker build -t mikroguard:latest .
```

### Run Container

```bash
docker run -d \
  --name mikroguard \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  mikroguard:latest
```

### View Logs

```bash
docker logs -f mikroguard
```

### Stop and Remove

```bash
docker stop mikroguard
docker rm mikroguard
```

## Environment Variables

All environment variables from `.env.example` must be set. Key variables:

### Required Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `LDAP_URL` | LDAP server URL | `ldap://ldap.example.com:389` |
| `LDAP_BIND_DN` | Bind DN for LDAP auth | `cn=admin,dc=example,dc=com` |
| `LDAP_BIND_PASSWORD` | LDAP password | `secret123` |
| `ROUTEROS_HOST` | RouterOS IP/hostname | `192.168.1.1` |
| `ROUTEROS_USERNAME` | RouterOS username | `admin` |
| `ROUTEROS_PASSWORD` | RouterOS password | `routeros_pass` |
| `NEXTAUTH_SECRET` | Auth secret key | Generate with `openssl rand -base64 32` |
| `CRON_SECRET` | Cron token | Generate with `openssl rand -hex 32` |

### Optional Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `WG_INTERFACE_NAME` | `wireguard1` | WireGuard interface on RouterOS |
| `WG_SUBNET` | `10.10.10.0/24` | VPN subnet |
| `WG_DNS` | `1.1.1.1` | DNS server for clients |
| `WG_EXPIRATION_DAYS` | `90` | Config expiration in days |
| `ROUTEROS_PORT` | `8080` | RouterOS REST API port |

## Health Check

The container includes a health check endpoint:

```bash
# Check health
curl http://localhost:3000/api/health

# Response
{"status":"ok","timestamp":"2025-10-02T12:00:00.000Z"}
```

Docker will automatically restart the container if health checks fail.

## Production Deployment

### 1. Use HTTPS

Deploy behind a reverse proxy (nginx, Traefik, Caddy):

```nginx
server {
    listen 443 ssl http2;
    server_name vpn.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Update `.env`:
```bash
NEXTAUTH_URL=https://vpn.example.com
```

### 2. Set Resource Limits

Uncomment resource limits in `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 512M
```

### 3. Configure Cron Job

Set up external cron to check for expired peers:

```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * curl -X POST -H "x-cron-token: YOUR_CRON_SECRET" http://localhost:3000/api/cron/check-expired
```

Or use a cron container:

```yaml
# Add to docker-compose.yml
cron:
  image: curlimages/curl:latest
  container_name: mikroguard-cron
  restart: unless-stopped
  command: >
    sh -c "while true; do
      sleep 86400;
      curl -X POST -H 'x-cron-token: ${CRON_SECRET}' http://mikroguard:3000/api/cron/check-expired;
    done"
  depends_on:
    - mikroguard
```

### 4. Backup Strategy

MikroGuard stores no local data - all state is in RouterOS. Backup:

1. **RouterOS configuration** (contains WireGuard peers)
2. **Environment variables** (your `.env` file)

## Troubleshooting

### Container won't start

```bash
# Check logs
docker logs mikroguard

# Common issues:
# - Missing required environment variables
# - Cannot connect to LDAP server
# - Cannot connect to RouterOS
```

### LDAP connection fails

```bash
# Test LDAP from container
docker exec mikroguard sh -c "nc -zv ldap.example.com 389"

# Verify LDAP credentials
ldapsearch -H "$LDAP_URL" -D "$LDAP_BIND_DN" -w "$LDAP_BIND_PASSWORD" -b "$LDAP_SEARCH_BASE"
```

### RouterOS connection fails

```bash
# Test RouterOS REST API
curl -u admin:password http://ROUTEROS_HOST:8080/rest/system/resource

# Enable REST API on RouterOS
/ip/service/set www-ssl disabled=no
/ip/service/set www port=8080
```

### Health check failing

```bash
# Check container health
docker inspect --format='{{json .State.Health}}' mikroguard

# Manual health check
docker exec mikroguard wget -qO- http://localhost:3000/api/health
```

## Updating

### Pull Latest Changes

```bash
# Stop container
docker-compose down

# Pull updates
git pull

# Rebuild and restart
docker-compose build --no-cache
docker-compose up -d
```

### Rolling Back

```bash
# Tag current version before updating
docker tag mikroguard:latest mikroguard:backup

# If update fails, restore
docker-compose down
docker tag mikroguard:backup mikroguard:latest
docker-compose up -d
```

## Security Considerations

1. **Never commit `.env` file** - contains sensitive credentials
2. **Use strong secrets** - generate with `openssl rand`
3. **Deploy behind HTTPS** - protect credentials in transit
4. **Restrict Docker socket access** - run as non-root user (default)
5. **Enable RouterOS HTTPS** - set `ROUTEROS_USE_TLS=true` and `ROUTEROS_PORT=443`
6. **Regular updates** - keep base images and dependencies updated

## Multi-Architecture Builds

Build for ARM64 (Raspberry Pi, Apple Silicon):

```bash
# Build for multiple platforms
docker buildx build --platform linux/amd64,linux/arm64 -t mikroguard:latest .

# Or specify target platform
docker build --platform linux/arm64 -t mikroguard:arm64 .
```

## Monitoring

### Container Stats

```bash
# Real-time stats
docker stats mikroguard

# Resource usage
docker inspect mikroguard | grep -A 20 "State"
```

### Application Logs

```bash
# Follow logs
docker logs -f mikroguard

# Last 100 lines
docker logs --tail 100 mikroguard

# With timestamps
docker logs -t mikroguard
```

## Support

- Issues: Report at project repository
- Documentation: See [README.md](README.md) and [CLAUDE.md](CLAUDE.md)
- RouterOS REST API: https://help.mikrotik.com/docs/display/ROS/REST+API
