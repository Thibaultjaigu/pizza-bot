import { describe, expect, it } from "vitest";
import { parseMcpJson } from "./mcp-json.js";

describe("parseMcpJson", () => {
  it("requires the mcpServers wrapper and preserves the server name", () => {
    expect(parseMcpJson(JSON.stringify({ command: "uvx" }))).toMatchObject({ ok: false });
    expect(parseMcpJson(JSON.stringify({ mcpServers: { arbitrary: { command: "uvx" } } }))).toEqual({
      ok: true,
      value: { name: "arbitrary", entry: { command: "uvx" } },
    });
  });

  it("accepts local stdio servers and validates args and env", () => {
    expect(
      parseMcpJson(
        JSON.stringify({
          mcpServers: {
            local: {
              command: "uvx",
              args: ["server", "${VAR}"],
              env: { API_KEY: "${MY_API_KEY}", DEBUG: "true" },
            },
          },
        }),
      ),
    ).toMatchObject({ ok: true, value: { entry: { command: "uvx", args: ["server", "${VAR}"] } } });
    expect(parseMcpJson(JSON.stringify({ mcpServers: { local: { args: ["server"] } } }))).toMatchObject({ ok: false });
    expect(parseMcpJson(JSON.stringify({ mcpServers: { local: { command: "" } } }))).toMatchObject({ ok: false });
    expect(parseMcpJson(JSON.stringify({ mcpServers: { local: { command: "   " } } }))).toMatchObject({ ok: false });
    expect(parseMcpJson(JSON.stringify({ mcpServers: { local: { command: "uvx", env: { PORT: 8080 } } } }))).toMatchObject({ ok: false });
    expect(parseMcpJson(JSON.stringify({ mcpServers: { local: { command: "uvx", env: { DEBUG: true } } } }))).toMatchObject({ ok: false });
  });

  it("accepts remote HTTP and SSE servers with string headers", () => {
    expect(parseMcpJson(JSON.stringify({ mcpServers: { remote: { url: "https://example.com/mcp" } } }))).toMatchObject({
      ok: true,
      value: { entry: { url: "https://example.com/mcp" } },
    });
    expect(parseMcpJson(JSON.stringify({ mcpServers: { remote: { type: "sse", url: "https://example.com/sse" } } }))).toMatchObject({
      ok: true,
      value: { entry: { type: "sse" } },
    });
    expect(parseMcpJson(JSON.stringify({ mcpServers: { remote: { url: "https://example.com", headers: { Authorization: "Bearer ${TOKEN}" } } } }))).toMatchObject({ ok: true });
    expect(parseMcpJson(JSON.stringify({ mcpServers: { remote: { url: "https://example.com", headers: { Port: 8080 } } } }))).toMatchObject({ ok: false });
  });

  it("enforces mutually exclusive transports and type values", () => {
    expect(parseMcpJson(JSON.stringify({ mcpServers: { invalid: { command: "uvx", url: "https://example.com" } } }))).toMatchObject({ ok: false });
    expect(parseMcpJson(JSON.stringify({ mcpServers: { invalid: {} } }))).toMatchObject({ ok: false });
    expect(parseMcpJson(JSON.stringify({ mcpServers: { invalid: { type: "stdio", url: "https://example.com" } } }))).toMatchObject({ ok: false });
    expect(parseMcpJson(JSON.stringify({ mcpServers: { invalid: { type: "grpc", url: "https://example.com" } } }))).toMatchObject({ ok: false });
    expect(parseMcpJson(JSON.stringify({ mcpServers: { remote: { type: "streamable-http", url: "https://example.com" } } }))).toMatchObject({ ok: true });
    expect(parseMcpJson(JSON.stringify({ mcpServers: { local: { type: "stdio", command: "npx" } } }))).toMatchObject({ ok: true });
  });
});
