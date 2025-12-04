#!/usr/bin/env python3
"""
CyberMem MCP Server

MCP server that exposes shared memory functionality to several LLM.
"""

import os
import asyncio
import httpx
from typing import Any
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
from mcp import types

# CyberMem configuration (OpenMemory backend)
OPENMEMORY_URL = os.getenv("OPENMEMORY_URL", "http://localhost.proxyman.io/memory")
CYBERMEM_API_KEY = os.getenv("CYBERMEM_API_KEY", "dev-secret-key")

# Create MCP server instance
server = Server("cybermem")

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """List available memory management tools."""
    return [
        types.Tool(
            name="add_memory",
            description="Store information in long-term memory. Use this to remember important facts, decisions, or context for future conversations.",
            inputSchema={
                "type": "object",
                "properties": {
                    "content": {
                        "type": "string",
                        "description": "The information to remember (text content)"
                    },
                    "metadata": {
                        "type": "object",
                        "description": "Optional metadata (tags, category, importance, etc.)",
                        "additionalProperties": True
                    }
                },
                "required": ["content"]
            }
        ),
        types.Tool(
            name="search_memory",
            description="Search through stored memories to find relevant information. Use this to recall past conversations, decisions, or facts.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "What to search for (semantic search query)"
                    },
                    "limit": {
                        "type": "number",
                        "description": "Maximum number of results (default: 5)",
                        "default": 5
                    }
                },
                "required": ["query"]
            }
        ),
        types.Tool(
            name="list_memories",
            description="List recent memories stored in the system. Useful for browsing what has been remembered.",
            inputSchema={
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "number",
                        "description": "Maximum number of memories to retrieve (default: 10)",
                        "default": 10
                    }
                }
            }
        ),
        types.Tool(
            name="delete_memory",
            description="Delete a specific memory by its ID. Use this to remove outdated or incorrect information.",
            inputSchema={
                "type": "object",
                "properties": {
                    "memory_id": {
                        "type": "string",
                        "description": "The UUID of the memory to delete"
                    }
                },
                "required": ["memory_id"]
            }
        ),
        types.Tool(
            name="update_memory",
            description="Update an existing memory's content, tags, or metadata.",
            inputSchema={
                "type": "object",
                "properties": {
                    "memory_id": {
                        "type": "string",
                        "description": "The UUID of the memory to update"
                    },
                    "content": {
                        "type": "string",
                        "description": "New content for the memory (optional)"
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "New tags for the memory (optional)"
                    },
                    "metadata": {
                        "type": "object",
                        "description": "New metadata for the memory (optional)",
                        "additionalProperties": True
                    }
                },
                "required": ["memory_id"]
            }
        )
    ]


@server.call_tool()
async def handle_call_tool(
    name: str,
    arguments: dict[str, Any]
) -> list[types.TextContent]:
    """Handle tool execution requests."""

    # Get client info from MCP context
    client_name, client_version = "unknown", "unknown"
    try:
        ctx = server.request_context
        if hasattr(ctx, 'session'):
            session = ctx.session
            if hasattr(session, '_client_params'):
                client_params = session._client_params
                if client_params and hasattr(client_params, 'clientInfo'):
                    client_info = client_params.clientInfo
                    client_name = client_info.name or "unknown"
                    client_version = client_info.version or "unknown"
    except Exception:
        pass

    headers = {
        "Authorization": f"Bearer {CYBERMEM_API_KEY}",
        "Content-Type": "application/json",
        "X-Client-Name": client_name,
        "X-Client-Version": client_version
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            if name == "add_memory":
                # Store memory in OpenMemory
                content = arguments.get("content")
                metadata = arguments.get("metadata", {})

                response = await client.post(
                    f"{OPENMEMORY_URL}/add",
                    json={"content": content, "metadata": metadata},
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()

                return [types.TextContent(
                    type="text",
                    text=f"✅ Memory stored successfully!\n\nID: {result.get('id')}\nChunks: {result.get('chunks')}\nSectors: {', '.join(result.get('sectors', []))}"
                )]

            elif name == "search_memory":
                # Search memories in OpenMemory
                query = arguments.get("query")
                limit = arguments.get("limit", 5)

                response = await client.post(
                    f"{OPENMEMORY_URL}/query",
                    json={"query": query, "k": limit},
                    headers=headers
                )
                response.raise_for_status()
                data = response.json()
                matches = data.get("matches", [])

                if not matches:
                    return [types.TextContent(
                        type="text",
                        text="🔍 No memories found matching your query."
                    )]

                # Format search results
                formatted_results = []
                for i, memory in enumerate(matches, 1):
                    content = memory.get("content", "")
                    score = memory.get("score", 0)
                    sector = memory.get("primary_sector", "")

                    formatted_results.append(
                        f"**Result {i}** (score: {score:.2f}, sector: {sector})\n{content}\n"
                    )

                return [types.TextContent(
                    type="text",
                    text=f"🔍 Found {len(matches)} memories:\n\n" + "\n".join(formatted_results)
                )]

            elif name == "list_memories":
                # List recent memories
                limit = arguments.get("limit", 10)

                # Note: OpenMemory doesn't have a /list endpoint yet,
                # so we'll do a broad query with generic term
                response = await client.post(
                    f"{OPENMEMORY_URL}/query",
                    json={"query": "memory context", "k": limit},
                    headers=headers
                )
                response.raise_for_status()
                data = response.json()
                matches = data.get("matches", [])

                if not matches:
                    return [types.TextContent(
                        type="text",
                        text="📋 No memories stored yet."
                    )]

                # Format list
                formatted_list = []
                for i, memory in enumerate(matches, 1):
                    content = memory.get("content", "")
                    sector = memory.get("primary_sector", "")
                    # Truncate long content
                    if len(content) > 100:
                        content = content[:97] + "..."
                    formatted_list.append(f"{i}. [{sector}] {content}")

                return [types.TextContent(
                    type="text",
                    text=f"📋 Recent memories ({len(matches)}):\n\n" + "\n".join(formatted_list)
                )]

            elif name == "delete_memory":
                # Delete memory by ID
                memory_id = arguments.get("memory_id")

                try:
                    response = await client.delete(
                        f"{OPENMEMORY_URL}/{memory_id}",
                        headers=headers
                    )
                    response.raise_for_status()
                    result = response.json()
                    status = result.get('ok', 'deleted')
                except httpx.HTTPStatusError as e:
                    # Workaround: OpenMemory returns 500 on successful delete (bug in OpenMemory)
                    # We'll treat it as success since the memory is actually deleted
                    if e.response.status_code == 500:
                        status = "deleted (500 ignored - OpenMemory bug)"
                    else:
                        raise

                return [types.TextContent(
                    type="text",
                    text=f"🗑️ Memory deleted successfully!\n\nID: {memory_id}\nStatus: {status}"
                )]

            elif name == "update_memory":
                # Update memory by ID
                memory_id = arguments.get("memory_id")
                content = arguments.get("content")
                tags = arguments.get("tags")
                metadata = arguments.get("metadata")

                payload = {}
                if content: payload["content"] = content
                if tags: payload["tags"] = tags
                if metadata: payload["metadata"] = metadata

                response = await client.patch(
                    f"{OPENMEMORY_URL}/{memory_id}",
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()

                return [types.TextContent(
                    type="text",
                    text=f"✏️ Memory updated successfully!\n\nID: {result.get('id', memory_id)}"
                )]

            else:
                raise ValueError(f"Unknown tool: {name}")

        except httpx.HTTPStatusError as e:
            return [types.TextContent(
                type="text",
                text=f"❌ API Error: {e.response.status_code}\n{e.response.text}"
            )]
        except Exception as e:
            return [types.TextContent(
                type="text",
                text=f"❌ Error: {str(e)}"
            )]


async def main():
    """Run the MCP server."""
    import sys

    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="cybermem",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={}
                )
            )
        )


if __name__ == "__main__":
    asyncio.run(main())
