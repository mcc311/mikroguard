# MikroGuard

A modern Next.js application for managing WireGuard VPN configurations on MikroTik RouterOS devices with LDAP authentication.

## Features

- 🔐 **LDAP Authentication**: Secure login using LDAP credentials with role-based access control
- 🔑 **WireGuard Configuration Management**: Create, renew, update, and download VPN configurations
- 🛡️ **Route Protection**: Next.js middleware for authentication and admin authorization
- 👥 **Admin Panel**: Comprehensive management interface with peer oversight and template configuration
- ⏰ **Automatic Expiration**: Configurable TTL for configurations with automatic expiration checks
- 🎨 **Modern UI**: Built with Next.js 15, TailwindCSS, and shadcn/ui components
- 🔌 **RouterOS REST API Integration**: Direct communication with MikroTik RouterOS devices via REST API
- 📝 **Public Key Management**: Users can update their public keys without recreating configurations
- 🎯 **Template System**: Global configuration templates for DNS, allowed IPs, and keepalive settings

## Architecture

- **Frontend**: Next.js 15 (App Router), TypeScript, TailwindCSS, shadcn/ui
- **Authentication**: NextAuth.js with LDAP provider
- **Backend**: Next.js API routes with custom RouterOS API client
- **No Database Required**: Peer data stored directly in RouterOS comments

## Prerequisites

- Node.js 20+ and npm
- **Next.js >= 15.2.3** (required for CVE-2025-29927 security fix)
- RouterOS device with WireGuard interface configured
- LDAP server for authentication
- RouterOS API access enabled

## Installation

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd mikroguard
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

# RouterOS Configuration (REST API)
ROUTEROS_HOST=192.168.1.1
ROUTEROS_PORT=8080
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

2. REST API enabled:
```routeros
/ip service
set www-ssl disabled=no
# Or for HTTP (not recommended for production)
set www address=0.0.0.0/0 disabled=no port=8080
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
   - Copy the configuration to clipboard
4. **Update Public Key**: Change your public key without recreating the configuration
5. **Renew**: Extend expiration by configured duration (default: 90 days)
6. **Copy Config**: Copy configuration to clipboard for manual import
7. **Delete**: Remove your configuration when no longer needed

### Administrators

1. **Access Admin Panel**: Navigate to `/admin`
2. **View All Peers**: See status, expiration, and IP assignments
3. **Manage Peers**:
   - View all active and inactive peers
   - Enable/disable peers
   - Update public keys for any user
   - Renew expiration for any user
   - Delete configurations
4. **Template Management**: Configure global defaults for DNS, allowed IPs, endpoint, and keepalive
5. **Check Expired**: Manually trigger expiration check

## API Endpoints

### User Endpoints

**`/api/config`** (RESTful resource - current user's peer)
- `GET` - Get peer configuration and status
- `PUT` - Create/update/renew peer
  - With `{ publicKey }` - Create new peer or update existing peer's key
  - Without body - Renew existing peer's TTL
- `DELETE` - Delete peer configuration

**`/api/config/file`**
- `GET` - Get configuration file content as plain text (for display and copy)

### Admin Endpoints (Requires Admin Role)

**`/api/admin/peers`**
- `GET` - List all peers with status and expiration

**`/api/admin/peers/[username]`**
- `GET` - Get specific user's peer details
- `PATCH` - Update peer with `{ action, ... }`
  - `{ action: 'enable' }` - Enable peer
  - `{ action: 'disable' }` - Disable peer
  - `{ action: 'renew' }` - Extend expiration
  - `{ action: 'update-key', publicKey }` - Update public key
- `DELETE` - Delete peer configuration

**`/api/admin/template`**
- `GET` - Get current global template
- `POST` - Update global template (DNS, allowed IPs, endpoint, keepalive)

**`/api/admin/check-expired`**
- `POST` - Manually trigger expiration check

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

- **Credentials**: Store sensitive credentials in environment variables, never in code
- **RouterOS API**: Use HTTPS for RouterOS REST API in production (`ROUTEROS_USE_TLS=true`)
- **Cron Security**: Protect the cron endpoint with `CRON_SECRET` token
- **Session Security**: Keep `NEXTAUTH_SECRET` secure and random (use `openssl rand -base64 32`)
- **HTTPS**: Always use HTTPS in production environments
- **Rate Limiting**: Consider implementing rate limiting on API routes for production
- **LDAP Access Control**: Review LDAP group assignments for admin access
- **Middleware Protection**: All authenticated routes are protected by Next.js middleware
- **Public Key Validation**: Public keys are validated before being submitted to RouterOS

## Project Structure

```
├── app/
│   ├── api/                          # API routes
│   │   ├── auth/[...nextauth]/      # NextAuth endpoints
│   │   ├── config/                  # User endpoints
│   │   │   ├── my/                 # Get user's peer
│   │   │   ├── create/             # Create configuration
│   │   │   ├── renew/              # Renew expiration
│   │   │   ├── update-key/         # Update public key
│   │   │   ├── download/           # Get config text
│   │   │   └── template/           # Get template
│   │   ├── admin/                   # Admin endpoints
│   │   │   ├── peers/              # List/manage all peers
│   │   │   ├── check-expired/      # Manual expiration check
│   │   │   └── template/           # Manage global template
│   │   └── cron/                    # Cron job endpoints
│   │       └── check-expired/      # Automated expiration check
│   ├── dashboard/                   # User dashboard
│   │   ├── page.tsx                # Main dashboard
│   │   └── new/                    # Create configuration
│   ├── admin/                       # Admin panel
│   │   ├── page.tsx                # Peer management
│   │   └── template/               # Template editor
│   ├── login/                       # Login page
│   ├── page.tsx                     # Landing page
│   └── layout.tsx                   # Root layout with providers
├── components/                       # React components
│   ├── ui/                          # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── tooltip.tsx
│   │   └── ...
│   ├── app-header.tsx              # Navigation header with user menu
│   ├── authenticated-layout.tsx    # Layout wrapper for auth pages
│   ├── PeerTable.tsx               # Admin peer management table
│   └── loading-skeletons.tsx       # Loading state components
├── lib/
│   ├── auth/                        # Authentication
│   │   ├── ldap.ts                 # LDAP client and verification
│   │   └── auth-options.ts         # NextAuth configuration
│   ├── routeros/                    # RouterOS integration
│   │   ├── client.ts               # REST API client
│   │   └── wireguard.ts            # WireGuard peer operations
│   ├── wireguard/                   # WireGuard utilities
│   │   └── config-builder.ts       # Generate .conf files
│   ├── store/                       # In-memory stores
│   │   └── template.ts             # Global template store
│   ├── cron/                        # Scheduled tasks
│   │   └── expiration-checker.ts   # Expiration logic
│   ├── config.ts                    # Environment config with Zod validation
│   ├── constants.ts                 # Application constants
│   ├── api-helpers.ts              # API response helpers
│   └── utils.ts                     # Utility functions
├── middleware.ts                     # Next.js middleware for route protection
├── types/                            # TypeScript type definitions
├── .env.example                      # Environment variables template
└── CLAUDE.md                         # AI assistant instructions
```

## Troubleshooting

### Cannot connect to RouterOS

- Verify RouterOS REST API (www or www-ssl service) is enabled and accessible
- Check firewall rules allow REST API port (default: 8080 for HTTP, 443 for HTTPS)
- Confirm credentials are correct in `.env.local`
- Test REST API: `curl -u admin:password http://<routeros-host>:8080/rest/system/resource`
- Check `ROUTEROS_PORT` matches your RouterOS REST API port

### LDAP authentication fails

- Verify LDAP server is accessible
- Check bind DN and password
- Confirm search base is correct
- Test LDAP connection with `ldapsearch`

### Configuration not displaying

- Ensure peer configuration exists (check `/api/config/my`)
- Verify WireGuard server public key is correctly set in `WG_SERVER_PUBLIC_KEY`
- Check browser console for errors
- Confirm RouterOS peer has valid allowed-address
- Check that `/api/config/download` returns text (not a 404 or error)

### Expired peers not disabling

- Verify cron job is configured and running
- Check `CRON_SECRET` matches in request
- Review server logs for errors
- Manually trigger: `/api/admin/check-expired` (admin only)

### Middleware redirects not working

- Check that `NEXTAUTH_URL` matches your deployment URL
- Verify session token is being set (check browser cookies)
- Review `middleware.ts` matcher configuration
- Ensure NextAuth callbacks are returning proper token data

### Public key update fails

- Verify public key is valid base64 (44 characters)
- Check that peer exists before updating
- Review server logs for RouterOS API errors
- Confirm RouterOS REST API has write permissions

## Security

### Authentication & Authorization

This application uses Next.js middleware as the **sole method of route protection**. This design choice is based on:

1. **CVE-2025-29927 is Fixed**: The middleware bypass vulnerability was patched in Next.js 15.2.3
2. **Linus Principle**: No redundant code. Middleware already checks auth/admin - API routes don't duplicate checks
3. **Single Source of Truth**: All authentication logic lives in [middleware.ts](middleware.ts)

**Security Requirements:**
- Next.js >= 15.2.3 (enforced in package.json)
- All protected routes must be listed in middleware matcher
- LDAP admin group membership determines admin role

**Protected Routes:**
- `/dashboard/*` - Requires authentication
- `/admin/*` - Requires authentication + admin role
- `/api/config/*` - Requires authentication
- `/api/admin/*` - Requires authentication + admin role
- `/api/cron/*` - Requires `CRON_SECRET` token (separate from session auth)

### Cron Token Security

External cron jobs must provide `CRON_SECRET` via:
- Query parameter: `?token=YOUR_CRON_SECRET`
- Header: `x-cron-token: YOUR_CRON_SECRET`

Generate a strong token:
```bash
openssl rand -hex 32
```

## Development

### Code Quality Standards

This project follows strict TypeScript and ESLint rules:
- **Zero `any` types** - Use `unknown`, generics, or proper types
- **All warnings must be fixed** - Warnings are treated as errors
- **Pre-commit checks** - Run `npm run build` and `npm run lint` before committing

See [CLAUDE.md](CLAUDE.md) for detailed code standards and architecture guidelines.

### Adding New Features

1. **API Routes**: Create handlers in `app/api/` following existing patterns
2. **UI Components**: Use shadcn/ui components from `components/ui/`
3. **Type Safety**: Define interfaces and use Zod for validation
4. **Error Handling**: Use `jsonResponse` helpers for consistent API responses

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Ensure code passes linting (`npm run lint`)
4. Ensure build succeeds (`npm run build`)
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

MIT License

## Support

For issues and questions, please open an issue on GitHub.
