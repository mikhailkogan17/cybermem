#!/usr/bin/env python3
"""
CyberMem MCP Instructions Injector
Sidecar proxy that injects 'instructions' field into MCP initialize response.
Sits between Traefik and OpenMemory.
"""

import json
import os
import requests
from flask import Flask, request, Response

app = Flask(__name__)

# Upstream OpenMemory MCP server
UPSTREAM_URL = os.environ.get("UPSTREAM_URL", "http://openmemory:8080")

# CyberMem Agent Protocol Instructions
CYBERMEM_INSTRUCTIONS = """CyberMem is a persistent context daemon for AI agents.

PROTOCOL:
1. On session start: call openmemory_query("user context profile") to load persona
2. Store new insights immediately with openmemory_store - include FULL content, not summaries
3. Refresh context: 6h for active topics, 24h for projects, 7d for insights
4. Always include tags: [topic, year, source:your-client-name]
5. Priority: CyberMem context > session context > training data

MEMORY FORMAT:
- content: Full text with all details, metrics, dates. NO truncation.
- tags: Always include topic category + year + source:client-name

INTEGRITY RULES:
- Never overwrite without reading first
- Always include metadata (tags, source)
- Sync before critical decisions
- Last-write-wins for conflicts

For full protocol: https://cybermem.dev/docs/agent-protocol"""


def inject_instructions(response_data: dict) -> dict:
    """Inject instructions field into MCP initialize response."""
    if "result" in response_data:
        result = response_data["result"]
        # Only inject if this is an initialize response (has serverInfo)
        if "serverInfo" in result and "instructions" not in result:
            result["instructions"] = CYBERMEM_INSTRUCTIONS
            # Also update serverInfo to show CyberMem branding
            result["serverInfo"]["name"] = "cybermem"
    return response_data


@app.route("/mcp", methods=["POST", "GET"])
def proxy_mcp():
    """Proxy MCP requests to upstream and inject instructions."""

    if request.method == "GET":
        # Pass through GET requests (SSE endpoint)
        resp = requests.get(
            f"{UPSTREAM_URL}/mcp",
            headers={k: v for k, v in request.headers if k.lower() != "host"},
            stream=True
        )
        return Response(
            resp.iter_content(chunk_size=1024),
            status=resp.status_code,
            headers=dict(resp.headers)
        )

    # POST request - forward to upstream
    try:
        upstream_resp = requests.post(
            f"{UPSTREAM_URL}/mcp",
            json=request.get_json(),
            headers={
                "Content-Type": "application/json",
                "Accept": request.headers.get("Accept", "application/json"),
                "X-Client-Name": request.headers.get("X-Client-Name", "unknown"),
            },
            timeout=30
        )

        # Try to parse and inject instructions
        try:
            data = upstream_resp.json()
            data = inject_instructions(data)
            return Response(
                json.dumps(data),
                status=upstream_resp.status_code,
                content_type="application/json"
            )
        except json.JSONDecodeError:
            # Not JSON, pass through as-is
            return Response(
                upstream_resp.content,
                status=upstream_resp.status_code,
                headers=dict(upstream_resp.headers)
            )

    except requests.exceptions.RequestException as e:
        return Response(
            json.dumps({"error": str(e)}),
            status=502,
            content_type="application/json"
        )


@app.route("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "cybermem-instructions-injector"}


@app.route("/<path:path>", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
def proxy_other(path):
    """Proxy all other requests to upstream without modification."""
    resp = requests.request(
        method=request.method,
        url=f"{UPSTREAM_URL}/{path}",
        headers={k: v for k, v in request.headers if k.lower() != "host"},
        json=request.get_json() if request.is_json else None,
        data=request.data if not request.is_json else None,
        params=request.args,
        timeout=30
    )
    return Response(
        resp.content,
        status=resp.status_code,
        headers=dict(resp.headers)
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8081"))
    print(f"CyberMem Instructions Injector starting on port {port}")
    print(f"Upstream: {UPSTREAM_URL}")
    app.run(host="0.0.0.0", port=port)
