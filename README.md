# Forward Proxy Server

## Overview
This project demonstrates a **Forward Proxy** implementation using Nginx. A forward proxy acts as an intermediary between clients and external servers, controlling outbound traffic from internal networks.

## Project Structure
```
2.1.forwardProxy/
├── backend/               # Backend service
├── frontend/              # Frontend application
├── nginx/                 # Nginx forward proxy config
├── docker-compose.yml     # Docker Compose setup
└── .dockerignore         # Docker ignore file
```

## Components

### 1. **Frontend**
- Client application
- Makes requests through the proxy
- Configured to route all traffic through Nginx

### 2. **Backend**
- Internal service
- Only accessible through the proxy
- Runs on internal network

### 3. **Nginx Forward Proxy**
- Acts as intermediary between clients and backends
- Controls and logs all traffic
- Implements caching policies
- Rate limiting capabilities

## Architecture Diagram

```
┌──────────────────────────┐
│    Client Browser        │
└────────────┬─────────────┘
             │ HTTP Request
             ▼
┌──────────────────────────────────────────┐
│   Nginx Forward Proxy (Port 3128)        │
├──────────────────────────────────────────┤
│ - Intercepts client requests             │
│ - Routes to backend servers              │
│ - Caches responses                       │
│ - Logs traffic                           │
└────────────┬─────────────────────────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
┌─────────────┐  ┌──────────────┐
│   Backend   │  │ External API │
└─────────────┘  └──────────────┘
```

## Setup & Usage

### Prerequisites
- Docker
- Docker Compose

### Run the Project
```bash
cd 2.1.forwardProxy
docker-compose up -d
```

### Configure Proxy
```bash
# For curl
curl -x http://localhost:3128 http://example.com

# For browser
Proxy: localhost:3128
```

### Access Services
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000` (via proxy)
- Proxy: `http://localhost:3128`

### Stop the Project
```bash
docker-compose down
```

## Key Features
✅ Request/response caching  
✅ Traffic logging and monitoring  
✅ Rate limiting support  
✅ HTTPS tunneling support  
✅ Access control lists (ACL)  
✅ Authentication support  

## Configuration

### Proxy Rules
- Block certain domains
- Allow/deny specific IPs
- Cache rules for different content types
- Compression settings

### Performance Tuning
- Connection pooling
- Buffer size optimization
- Timeout configuration
- Worker process tuning

## Security Features
- Traffic inspection
- Access logging
- Request filtering
- Authentication/authorization
- SSL/TLS inspection capable

## Use Cases
1. **Corporate Networks** - Control outbound internet access
2. **Content Filtering** - Block malicious sites
3. **Traffic Analysis** - Monitor employee browsing
4. **Bandwidth Management** - Limit connection speeds
5. **Security Gateway** - First line of defense
6. **Caching Layer** - Reduce bandwidth usage

## Monitoring & Logging
```bash
docker-compose logs -f nginx
```

### Log Files Location
- Nginx access log: `/var/log/nginx/access.log`
- Nginx error log: `/var/log/nginx/error.log`

## Common Issues

### Proxy Connection Refused
```bash
docker-compose down -v
docker-compose up -d
```

### Traffic Not Routing
- Check nginx configuration
- Verify backend connectivity
- Review firewall rules

## Next Steps
- Add SSL/TLS interception
- Implement user authentication
- Configure advanced filtering
- Set up monitoring and alerts
- Implement DLP (Data Loss Prevention)

---

**Tech Stack:** Nginx, Docker, Docker Compose
