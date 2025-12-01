#!/usr/bin/env python3
"""
OpenMemory MCP Server

MCP server that exposes OpenMemory (CyberMem) functionality to Claude Code.
Allows Claude to store and retrieve memories using the CyberMem memory system.
"""

import os
import asyncio
import httpx
from typing import Any
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.server.stdio import stdio_server
from mcp import types

# OpenMemory configuration
OPENMEMORY_URL = os.getenv("OPENMEMORY_URL", "http://localhost/memory")
OPENMEMORY_API_KEY = os.getenv("OPENMEMORY_API_KEY", "dev-secret-key")

# Create MCP server instance
server = Server("openmemory")


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
        )
    ]


@server.call_tool()
async def handle_call_tool(
    name: str,
    arguments: dict[str, Any]
) -> list[types.TextContent]:
    """Handle tool execution requests."""

    headers = {
        "Authorization": f"Bearer {OPENMEMORY_API_KEY}",
        "Content-Type": "application/json"
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
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="openmemory",
                server_version="0.1.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={}
                )
            )
        )


if __name__ == "__main__":
    asyncio.run(main())
