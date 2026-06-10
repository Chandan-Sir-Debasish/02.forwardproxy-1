import React, { useState, useEffect } from "react";
import { blocklistAPI, logsAPI, statsAPI } from "./services/api";
import axios from "axios";
import "./styles/main.css";
function App() {
  const [blocklist, setBlocklist] = useState([]);
  const [newDomain, setNewDomain] = useState("");
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ total: 0, blocked: 0 });
  const [loading, setLoading] = useState(false);

  // Test proxy state
  const [testUrl, setTestUrl] = useState("https://httpbin.org/ip");
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [blockRes, logsRes, statsRes] = await Promise.all([
        blocklistAPI.get(),
        logsAPI.get(50),
        statsAPI.get(),
      ]);
      setBlocklist(blockRes.data.data);
      setLogs(logsRes.data.data);
      setStats(statsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // auto-refresh logs
    return () => clearInterval(interval);
  }, []);

  const addDomain = async () => {
    if (!newDomain.trim()) return;
    await blocklistAPI.add(newDomain);
    setNewDomain("");
    fetchData();
  };

  const deleteDomain = async (id) => {
    await blocklistAPI.delete(id);
    fetchData();
  };

  const testProxy = async () => {
    if (!testUrl.trim()) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const response = await axios.post("/api/test-proxy", { url: testUrl });
      setTestResult(response.data);
    } catch (err) {
      setTestResult({
        success: false,
        error: err.response?.data?.error || err.message,
      });
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Forward Proxy Management Console</h1>
      <p>Configure blocking rules and monitor proxy traffic</p>
      <div className="card">
        <h2>Proxy Statistics</h2>
        <p>
          Total Requests: <strong>{stats.total}</strong>
        </p>
        <p>
          Blocked Requests: <strong>{stats.blocked}</strong>
        </p>
        <p>
          Block Rate:{" "}
          <strong>
            {stats.total ? ((stats.blocked / stats.total) * 100).toFixed(1) : 0}
            %
          </strong>
        </p>
      </div>
      {/* Test Proxy Area */}
      <div className="card">
        <h2>Test URL Through Proxy</h2>
        <p>
          Enter a URL to fetch through the forward proxy. If the domain is in the blocklist, the request will be blocked.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          <input
            type="text"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder="https://example.com"
            style={{ flex: 1 }}
          />
          <button onClick={testProxy} disabled={testLoading}>
            {testLoading ? "Fetching..." : "Test via Proxy"}
          </button>
        </div>
        {testResult && (
          <div
            style={{
              background: "#f8fafc",
              padding: "1rem",
              borderRadius: "0.5rem",
              fontFamily: "monospace",
              fontSize: "0.875rem",
              overflow: "auto",
              border: "1px solid #e2e8f0",
            }}
          >
            {testResult.blocked ? (
              <p style={{ color: "#dc2626" }}>
                <strong>Blocked:</strong> {testResult.message}
              </p>
            ) : testResult.success ? (
              <>
                <p>
                  <strong>Status Code:</strong> <span style={{ color: testResult.statusCode >= 200 && testResult.statusCode < 300 ? "#10b981" : "#d97706" }}>{testResult.statusCode}</span>
                </p>
                <p>
                  <strong>Headers:</strong>
                </p>
                <pre style={{ overflow: "auto", maxHeight: "150px", background: "#f1f5f9", padding: "0.5rem", borderRadius: "0.25rem" }}>
                  {JSON.stringify(testResult.headers, null, 2)}
                </pre>
                <p style={{ marginTop: "1rem" }}>
                  <strong>Response Preview:</strong>
                </p>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    maxHeight: "300px",
                    overflow: "auto",
                    background: "#f1f5f9",
                    padding: "0.5rem",
                    borderRadius: "0.25rem",
                  }}
                >
                  {testResult.contentPreview || testResult.preview}
                </pre>
                {testResult.fullLength !== undefined && (
                  <p style={{ marginTop: "0.5rem" }}>
                    <small style={{ color: "#64748b" }}>
                      Total length: {testResult.fullLength} characters
                    </small>
                  </p>
                )}
              </>
            ) : (
              <p style={{ color: "#dc2626" }}>
                <strong>Error:</strong> {testResult.error}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="card">
        <h2>Blocklist Rules</h2>
        <div>
          <input
            type="text"
            placeholder="example.com or .facebook.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
          />
          <button onClick={addDomain}>Add Block Rule</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Domain</th>
              <th>Added</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {blocklist.map((rule) => (
              <tr key={rule._id}>
                <td>{rule.domain}</td>
                <td>{new Date(rule.createdAt).toLocaleString()}</td>
                <td>
                  <button
                    className="delete-btn"
                    onClick={() => deleteDomain(rule._id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h2>Recent Proxy Logs</h2>
        <div className="logs-table">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Method</th>
                <th>URL</th>
                <th>Status</th>
                <th>Blocked</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td>{log.method}</td>
                  <td
                    style={{
                      maxWidth: "300px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {log.url}
                  </td>
                  <td>{log.statusCode}</td>
                  <td>
                    <span
                      className={`status ${log.blocked ? "status-blocked" : "status-allowed"}`}
                    ></span>
                    {log.blocked ? "Blocked" : "Allowed"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <p>Loading...</p>}
      </div>
    </div>
  );
}

export default App;
