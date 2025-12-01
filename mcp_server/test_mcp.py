#!/usr/bin/env python3
"""
Test script for OpenMemory MCP Server

Demonstrates MCP server functionality by simulating tool calls.
"""

import asyncio
import httpx
import json


OPENMEMORY_URL = "http://localhost/memory"
OPENMEMORY_API_KEY = "dev-secret-key"


async def test_add_memory():
    """Test adding a memory."""
    print("\n🧪 Test 1: Adding memory...")

    headers = {
        "Authorization": f"Bearer {OPENMEMORY_API_KEY}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{OPENMEMORY_URL}/add",
            json={
                "content": "MCP server test: Claude Code can now remember conversations and context",
                "metadata": {
                    "source": "mcp_test",
                    "category": "integration_test",
                    "timestamp": "2025-11-30"
                }
            },
            headers=headers
        )

        if response.status_code == 200:
            result = response.json()
            print(f"✅ Memory added successfully!")
            print(f"   ID: {result.get('id')}")
            print(f"   Chunks: {result.get('chunks')}")
            print(f"   Sectors: {', '.join(result.get('sectors', []))}")
            return result.get('id')
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return None


async def test_search_memory():
    """Test searching memories."""
    print("\n🧪 Test 2: Searching memory...")

    headers = {
        "Authorization": f"Bearer {OPENMEMORY_API_KEY}",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{OPENMEMORY_URL}/query",
            json={
                "query": "Claude Code remember conversations",
                "k": 3
            },
            headers=headers
        )

        if response.status_code == 200:
            data = response.json()
            matches = data.get("matches", [])
            print(f"✅ Found {len(matches)} memories:")
            for i, memory in enumerate(matches, 1):
                content = memory.get("content", "")
                score = memory.get("score", 0)
                sector = memory.get("primary_sector", "")
                print(f"\n   Result {i} (score: {score:.2f}, sector: {sector}):")
                print(f"   {content[:100]}...")
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")


async def test_mcp_integration():
    """Run full MCP integration test."""
    print("=" * 60)
    print("OpenMemory MCP Server - Integration Test")
    print("=" * 60)

    # Test 1: Add memory
    memory_id = await test_add_memory()

    # Wait a bit for indexing
    await asyncio.sleep(2)

    # Test 2: Search memory
    await test_search_memory()

    print("\n" + "=" * 60)
    print("✅ Integration test completed!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Restart Claude Code to load the MCP server")
    print("2. Try asking Claude Code to remember something")
    print("3. Check Grafana dashboard for audit trail")
    print("   → http://localhost:3000/d/cybermem-memory")


if __name__ == "__main__":
    asyncio.run(test_mcp_integration())
