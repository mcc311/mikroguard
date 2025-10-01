# WireGuard Manager for RouterOS

A modern Next.js application for managing WireGuard VPN configurations on RouterOS devices with LDAP authentication.

## Features

- 🔐 **LDAP Authentication**: Secure login using LDAP credentials with role-based access control
- 🔑 **WireGuard Configuration Management**: Create, renew, and download VPN configurations
- 📱 **QR Code Generation**: Easy mobile device setup with QR codes
- 👥 **Admin Panel**: Comprehensive management interface for administrators
- ⏰ **Automatic Expiration**: Configurable TTL for configurations with automatic expiration checks
- 🎨 **Modern UI**: Built with Next.js 15, Tailwind CSS, and shadcn/ui components
- 🔌 **RouterOS API Integration**: Direct communication with MikroTik RouterOS devices

## Architecture

- **Frontend**: Next.js 15 (App Router), TypeScript, TailwindCSS, shadcn/ui
- **Authentication**: NextAuth.js with LDAP provider
- **Backend**: Next.js API routes with custom RouterOS API client
- **No Database Required**: Peer data stored directly in RouterOS comments

## Prerequisites

- Node.js 20+ and npm
- RouterOS device with WireGuard interface configured
- LDAP server for authentication
- RouterOS API access enabled

## Installation

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd wg-manager
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your settings:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# LDAP Configuration
LDAP_URL=ldap://your-ldap-server:389
LDAP_BIND_DN=cn=admin,dc=example,dc=com
LDAP_BIND_PASSWORD=your-ldap-password
LDAP_SEARCH_BASE=ou=users,dc=example,dc=com
LDAP_ADMIN_GROUP=cn=wg-admins,ou=groups,dc=example,dc=com

# RouterOS Configuration
ROUTEROS_HOST=192.168.1.1
ROUTEROS_PORT=8728
ROUTEROS_USERNAME=admin
ROUTEROS_PASSWORD=your-routeros-password
ROUTEROS_USE_TLS=false

# WireGuard Configuration
WG_INTERFACE_NAME=wireguard1
WG_SUBNET=10.10.10.0/24
WG_SERVER_PUBLIC_KEY=your-server-public-key
WG_ENDPOINT=vpn.example.com:13231
WG_DNS=1.1.1.1
WG_PERSISTENT_KEEPALIVE=25
WG_DEFAULT_ALLOWED_IPS=10.10.10.0/24,10.0.0.0/24
WG_EXPIRATION_DAYS=90

# Cron Job Configuration
CRON_SECRET=your-random-secret-token
```

### 3. Generate NextAuth Secret

```bash
openssl rand -base64 32
```

### 4. RouterOS Setup

Ensure your RouterOS device has:

1. WireGuard interface configured:
```routeros
/interface wireguard
add listen-port=13231 name=wireguard1
```

2. API enabled:
```routeros
/ip service
set api address=0.0.0.0/0 disabled=no port=8728
```

3. Server keys generated:
```routeros
/interface wireguard
print
```

Copy the public key to `WG_SERVER_PUBLIC_KEY` in your `.env.local`.

## Usage

### Development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Production

```bash
npm run build
npm start
```

## User Workflow

### Regular Users

1. **Login**: Sign in with LDAP credentials at `/login`
2. **Dashboard**: View current configuration status at `/dashboard`
3. **Create Config**:
   - Generate WireGuard key pair on your device
   - Click "Create Configuration" and provide your public key
   - Download the config file or scan the QR code
4. **Renew**: Extend expiration by 3 months (or configured duration)
5. **Customize**: Adjust DNS, allowed IPs, and other settings

### Administrators

1. **Access Admin Panel**: Navigate to `/admin`
2. **View All Peers**: See status, expiration, and IP assignments
3. **Manage Peers**:
   - Enable/disable peers
   - Renew expiration for any user
   - Delete configurations
4. **Check Expired**: Manually trigger expiration check

## API Endpoints

### User Endpoints

- `GET /api/config/my` - Get current user's configuration
- `POST /api/config/create` - Create new configuration
- `POST /api/config/renew` - Renew existing configuration
- `GET /api/config/download` - Download configuration file
- `GET /api/config/qr` - Get QR code for configuration

### Admin Endpoints (Requires Admin Role)

- `GET /api/admin/peers` - List all peers
- `GET /api/admin/peers/[username]` - Get specific peer
- `PATCH /api/admin/peers/[username]` - Update peer (enable/disable/renew)
- `DELETE /api/admin/peers/[username]` - Delete peer
- `POST /api/admin/check-expired` - Check and disable expired peers

### Cron Endpoint

- `GET /api/cron/check-expired?token=YOUR_CRON_SECRET` - Expiration check for cron services
- `POST /api/cron/check-expired` - Alternative POST with `x-cron-token` header

## Expiration Management

The system tracks peer expiration using comments in RouterOS in the format: `ttl-{unix_timestamp}`

### Automatic Expiration Check

Set up a cron job to periodically check for expired peers:

**Using cron-job.org or similar:**
```
GET https://your-domain.com/api/cron/check-expired?token=YOUR_CRON_SECRET
```

**Using system cron:**
```bash
0 * * * * curl -X POST -H "x-cron-token: YOUR_CRON_SECRET" https://your-domain.com/api/cron/check-expired
```

**Recommended schedule**: Every hour

## Security Considerations

- Store sensitive credentials in environment variables, never in code
- Use TLS for RouterOS API in production (`ROUTEROS_USE_TLS=true`)
- Secure the cron endpoint with `CRON_SECRET`
- Keep `NEXTAUTH_SECRET` secure and random
- Use HTTPS in production
- Implement rate limiting on API routes
- Review LDAP group assignments for admin access

## Project Structure

```
├── app/
│   ├── api/                    # API routes
│   │   ├── auth/              # NextAuth endpoints
│   │   ├── config/            # User config endpoints
│   │   ├── admin/             # Admin endpoints
│   │   └── cron/              # Cron job endpoints
│   ├── dashboard/             # User dashboard
│   ├── admin/                 # Admin panel
│   ├── login/                 # Login page
│   └── layout.tsx             # Root layout
├── components/                 # React components
│   ├── ui/                    # shadcn/ui components
│   ├── ConfigDisplay.tsx      # Config viewer
│   ├── QRCodeDisplay.tsx      # QR code generator
│   ├── PeerTable.tsx          # Admin peer table
│   ├── TemplateEditor.tsx     # Config customization
│   └── Providers.tsx          # Context providers
├── lib/
│   ├── auth/                  # Authentication logic
│   │   ├── ldap.ts           # LDAP authentication
│   │   └── auth-options.ts   # NextAuth configuration
│   ├── routeros/              # RouterOS integration
│   │   ├── client.ts         # API client
│   │   └── wireguard.ts      # WireGuard operations
│   ├── wireguard/             # WireGuard utilities
│   │   ├── keygen.ts         # Key generation
│   │   ├── config-builder.ts # Config file builder
│   │   └── qrcode.ts         # QR code generation
│   └── cron/                  # Scheduled tasks
│       └── expiration-checker.ts
├── types/                      # TypeScript definitions
└── .env.example               # Environment variables template
```

## Troubleshooting

### Cannot connect to RouterOS

- Verify RouterOS API is enabled and accessible
- Check firewall rules allow API port (default 8728)
- Confirm credentials are correct
- Test with: `telnet <routeros-host> 8728`

### LDAP authentication fails

- Verify LDAP server is accessible
- Check bind DN and password
- Confirm search base is correct
- Test LDAP connection with `ldapsearch`

### QR code not generating

- Ensure client public key is provided
- Check WireGuard configuration is created
- Review browser console for errors

### Expired peers not disabling

- Verify cron job is configured and running
- Check `CRON_SECRET` matches in request
- Review server logs for errors
- Manually trigger: `/api/admin/check-expired` (admin only)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.
