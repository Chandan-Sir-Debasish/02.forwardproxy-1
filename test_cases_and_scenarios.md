# Test Cases and Scenarios: Forward Proxy Lab

This document defines the test cases and testing scenarios for validating the Forward Proxy Server & Management Console.

---

## 🎯 Test Scenarios

### Scenario 1: Functional Proxy Forwarding
Validate that the proxy server correctly forwards clean traffic for both standard HTTP requests and secure HTTPS sessions (using CONNECT tunneling).

### Scenario 2: Active Domain Filtering (Blocklist ACL)
Validate that configured blocklist rules are respected: blocked domains must return a 403 Forbidden, and attempts must be logged accordingly.

### Scenario 3: Real-Time Auditing and Statistics
Validate that traffic forwarding and blocking operations are correctly recorded in the MongoDB backend and reflected accurately in the UI statistics.

### Scenario 4: User Interface Responsiveness
Validate that adding/deleting blocklist rules in the UI updates the rules instantly and that testing a URL via the UI outputs correct indicators.

---

## 📋 Test Cases

### Functional Proxy Verification (CLI & API)

| Test Case ID | Test Case Title | Pre-Conditions | Execution Steps | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **TC-FP-01** | Verify HTTP GET Forwarding | Docker containers running; `httpbin.org` accessible | Run `curl -x http://localhost:8888 http://httpbin.org/ip` | Returns HTTP 200 containing client origin IP. Logs are written to MongoDB. |
| **TC-FP-02** | Verify HTTPS CONNECT Tunneling | Docker containers running; `google.com` accessible | Run `curl -x http://localhost:8888 https://www.google.com` | Connection establishes successfully. TLS handshake completes; returns HTML. |
| **TC-FP-03** | Verify Domain Blocking (HTTP) | `example.com` added to blocklist rule | Run `curl -i -x http://localhost:8888 http://example.com` | Returns `HTTP/1.1 403 Forbidden` with body: "Access to example.com is blocked by proxy policy." |
| **TC-FP-04** | Verify Domain Blocking (HTTPS CONNECT) | `badsite.com` added to blocklist rule | Run `curl -i -x http://localhost:8888 https://badsite.com` | Returns `HTTP/1.1 403 Forbidden` and client connection is terminated. |

---

### Dashboard API Verification

| Test Case ID | Test Case Title | Execution Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-API-01**| Retrieve Stats | Send `GET /api/stats` | Returns JSON with `success: true` and counts for `total` and `blocked` requests. |
| **TC-API-02**| Retrieve Logs | Send `GET /api/logs?limit=10` | Returns JSON array of the 10 most recent logs (method, url, statusCode, blocked, clientIp). |
| **TC-API-03**| Create Rule | Send `POST /api/blocklist` with body `{"domain":"spam.com"}` | Returns JSON confirming creation. Rule is saved in MongoDB. |
| **TC-API-04**| Delete Rule | Send `DELETE /api/blocklist/<id>` with ObjectId | Returns JSON with `success: true`. Domain is removed from MongoDB rules. |
| **TC-API-05**| Execute Proxy Test (Allowed) | Send `POST /api/test-proxy` with body `{"url":"https://httpbin.org/ip"}` | Returns `success: true` and `statusCode: 200`, including headers and body preview. |
| **TC-API-06**| Execute Proxy Test (Blocked) | Send `POST /api/test-proxy` with body `{"url":"http://spam.com/index.html"}` | Returns `success: false`, `blocked: true`, and error message. |

---

### GUI Console Verification

| Test Case ID | Test Case Title | Execution Steps | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-UI-01** | Add Block Rule from Dashboard | 1. Open GUI dashboard<br>2. Type `blockme.com` in Blocklist field<br>3. Click **Add Block Rule** | Domain is appended to the active list instantly without requiring page reload. |
| **TC-UI-02** | Remove Block Rule from Dashboard | Click **Delete** next to `blockme.com` in the table | Domain is removed from the active list instantly and no longer blocked. |
| **TC-UI-03** | Test Non-Blocked URL in UI | 1. Enter `https://httpbin.org/ip` in testing URL field<br>2. Click **Test via Proxy** | Status `200` is displayed along with headers, content preview, and total length. |
| **TC-UI-04** | Test Blocked URL in UI | 1. Ensure `blockeddomain.com` is in rules<br>2. Enter `https://blockeddomain.com` in testing field<br>3. Click **Test via Proxy** | Red alert banner is shown stating the domain is blacklisted. |
| **TC-UI-05** | Real-Time Log and Stats Refresh | 1. Perform testing requests<br>2. Observe top stats and bottom log table | Stats totals increase and log rows are appended dynamically. |
