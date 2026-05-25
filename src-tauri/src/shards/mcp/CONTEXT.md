# LeagueJax MCP Context

This context defines the language for LeagueJax's local MCP server. It exists to keep session, tool-result transport, and cached JSON payload terms precise.

## Language

**MCP Session**:
A logical interaction between one MCP client and the LeagueJax MCP server after initialization.
_Avoid_: client connection, browser session, user session

**MCP Session ID**:
A server-assigned identifier returned during initialization and sent back by the client on later MCP requests.
_Avoid_: auth token, client id, payload id

**MCP Tool Call**:
A non-initialization MCP request that invokes one LeagueJax tool.
_Avoid_: command call, IPC call, Tauri command

**JSON Result Envelope**:
The structured result wrapper used by LeagueJax MCP tools to distinguish inline data from a payload handle.
_Avoid_: hint, annotation, metadata-only result

**Inline Result**:
A JSON result envelope whose payload is small enough to include directly as `data`.
_Avoid_: raw result, direct result

**Payload Result**:
A JSON result envelope that returns a handle to a cached JSON payload instead of returning the full data inline.
_Avoid_: large inline result, file result, paged result

**JSON Payload**:
A transient cached JSON result owned by one MCP session.
_Avoid_: server-wide cache, durable artifact, shared payload

**Payload Handle**:
The identifier a client uses to describe, query, list, or drop one JSON payload in its own MCP session.
_Avoid_: session id, tool id, file handle

**Payload Owner**:
The MCP session that created and may access a JSON payload.
_Avoid_: client name, user, process

**JSON Pointer Query**:
A request for selected values inside a JSON payload using RFC 6901 JSON Pointer paths.
_Avoid_: JSONPath, search query, pagination

**Payload Drop**:
An optional request to release one transient JSON payload before it expires.
_Avoid_: delete data, destructive tool, clear history

## Relationships

- An **MCP Session** has exactly one **MCP Session ID** after initialization.
- An **MCP Tool Call** must belong to exactly one **MCP Session**.
- A **JSON Result Envelope** is either an **Inline Result** or a **Payload Result**.
- A **Payload Result** references exactly one **Payload Handle**.
- A **JSON Payload** has exactly one **Payload Owner**.
- A **Payload Owner** may own zero or more **JSON Payloads**.
- A **JSON Pointer Query** reads values from exactly one **JSON Payload** owned by the caller's **MCP Session**.
- A **Payload Drop** targets exactly one **Payload Handle** owned by the caller's **MCP Session**.

## Example dialogue

> **Dev:** "Can this tool return a raw match details object when it is small, and a payload id when it is large?"
> **Domain expert:** "No. It always returns a **JSON Result Envelope**. The envelope is an **Inline Result** for small data or a **Payload Result** for a cached **JSON Payload**."
>
> **Dev:** "Can another MCP client query a payload if it knows the payload id?"
> **Domain expert:** "No. A **Payload Handle** is only valid for the **MCP Session** that owns the **JSON Payload**."

## Flagged ambiguities

- "session id" was used as if the client created it. Resolved: the server creates the **MCP Session ID** during initialization, and the client returns it on later MCP requests.
- "payload" was used as if it were a server-wide cache entry. Resolved: a **JSON Payload** is owned by one **MCP Session**.
- "hint" was considered for inline-vs-payload transport. Resolved: this is a **JSON Result Envelope** contract, not a tool annotation or metadata hint.
- "drop" may sound destructive. Resolved: **Payload Drop** only releases a transient cached **JSON Payload** and does not delete user data.
