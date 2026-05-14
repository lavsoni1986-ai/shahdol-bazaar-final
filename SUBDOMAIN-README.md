# Subdomain + CDN Architecture Setup

## Overview
This implementation enables subdomain-based multi-tenancy with CDN support for faster, SEO-friendly district isolation.

## Architecture Flow
```
User → shahdol.yourapp.com
        ↓
DNS → CDN (Cloudflare)
        ↓
Edge → inject header (x-district-slug)
        ↓
Server → tenantResolver
        ↓
DB (isolated data)
```

## SSL Certificate Setup
### Wildcard SSL Certificate (*.yourapp.com)
- **Required**: Wildcard SSL certificate for all subdomains
- **Cloudflare**: Universal SSL automatically handles *.yourapp.com certificates
- **Manual**: If using other providers, obtain wildcard certificate covering all subdomains

## Cookie Scoping (Critical Security)
### Sovereign Session Isolation
**Question**: If user logs into `shahdol.yourapp.com`, should they remain logged in on `anuppur.yourapp.com`?

**Answer**: NO - Each district maintains sovereign isolation

### Implementation
- **Cookies set at subdomain level**: `shahdol.yourapp.com` (not domain level)
- **Result**: User logged into `shahdol.yourapp.com` is COMPLETELY isolated from `anuppur.yourapp.com`
- **Localhost**: No domain attribute (uses current host)

### Cookie Configuration
```javascript
res.cookie('accessToken', token, {
  domain: 'shahdol.yourapp.com'  // STRICT SUBDOMAIN ISOLATION
  // ... other options
});
```

### Enhanced Branding Features
**Dynamic Favicon & Meta Tags**: Each district gets its own branding in social media shares

**Favicon Updates:**
- Browser tab icon changes based on district
- Mobile bookmark icons update dynamically

**OpenGraph Meta Tags:**
- `og:title`: District-specific page title
- `og:description`: District-specific description
- `og:image`: District logo for social media previews
- `og:url`: Current page URL
- `og:site_name`: "Shahdol Bazaar" etc.

**Twitter Card Meta Tags:**
- `twitter:card`: Large image card format
- `twitter:title`: District title
- `twitter:description`: District description
- `twitter:image`: District logo

**SEO Enhancements:**
- Dynamic meta descriptions
- Canonical URLs
- Keywords based on district and location
- Author and contact information

### Why Subdomain Level?
- **Domain level** (`.yourapp.com`): Cookie shared across all subdomains ❌
- **Subdomain level** (`shahdol.yourapp.com`): Cookie isolated to specific subdomain ✅

## Implementation Status
- ✅ Frontend domain detection
- ✅ API client header injection
- ✅ Backend host-based fallback
- ✅ Domain mismatch security
- ✅ Local testing setup

## Local Testing Setup

### Windows Hosts File Setup
1. Run `setup-hosts.bat` as administrator
2. Or manually add to `C:\Windows\System32\drivers\etc\hosts`:

```
127.0.0.1 shahdol.localhost
127.0.0.1 anuppur.localhost
127.0.0.1 umaria.localhost
```

3. Start your dev server: `npm run dev`
4. Access districts at:
   - http://shahdol.localhost:5174
   - http://anuppur.localhost:5174
   - http://umaria.localhost:5174

## Production Setup

### DNS Configuration
Add wildcard A record:
```
Type: A
Name: *
Value: YOUR_SERVER_IP
```

### Cloudflare CDN Setup
1. Enable proxy (orange cloud)
2. Enable auto minify, Brotli compression, HTTP/3
3. Add Edge Rule:
   - If hostname matches `*.yourapp.com`
   - Then: Set Header `X-District-Slug = subdomain`

## Security Features
### Spoof Shield (Domain Mismatch Protection)
**Prevents**: Users accessing `anuppur` data from `shahdol.yourapp.com` by spoofing headers

**Implementation**: Server validates that hostname subdomain matches resolved district slug
- If `shahdol.yourapp.com` sends `X-District-Slug: anuppur` → **BLOCKED**
- Returns `403 Domain mismatch attack blocked - Sovereign Gate Closed`
- **Surgical Precision**: `hostSlug !== slug && !isLocalhost` check

### Cookie Domain Lockdown (100% Session Isolation)
**Mechanism**: Cookies set to `req.hostname` for maximum isolation
- **shahdol.yourapp.com** cookies ≠ **anuppur.yourapp.com** cookies
- **Localhost**: No domain attribute (current host only)
- **Dynamic**: Adapts to any hostname automatically

### CORS Strict Whitelist
**Database-Driven**: Only registered districts allowed
```javascript
// Built from database at startup
const districts = await prisma.district.findMany({ select: { slug: true } });
const allowedOrigins = [
  ...districts.map(d => `https://${d.slug}.yourapp.com`),
  ...districts.map(d => `http://${d.slug}.localhost:5173`),
  ...districts.map(d => `http://${d.slug}.localhost:5174`),
];
```
**No Wildcards**: Eliminates wildcard attack vectors

### Additional Security
- Multi-source district resolution (header, query, path, subdomain)
- Sovereign gate blocking for unauthorized access
- Surgical precision implementation across all layers

## Performance Benefits
- ⚡ Ultra-fast CDN caching
- 🌍 Global edge routing
- 📈 High SEO rankings for subdomains
- 🔻 Reduced API latency