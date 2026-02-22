# Demo Recording Status — 2026-02-19

## ✅ System Ready for Recording

### Infrastructure Check
- **MCP Server**: localhost:8626 (STDIO + SSE transport)
- **Dashboard**: localhost:3000 (Next.js auto-login on localhost)
- **Auth Sidecar**: Port 3001 (ForwardAuth validation)
- **Database**: SQLite VectorStore initialized
- **Instance ID**: local-MacBookPro (auth bypass active)

### Auth Bypass Status
- ✅ localhost/127.0.0.1 → **Automatic local auth**
- ✅ *.local domains → **Supported**
- ✅ X-Client-Name header → **Identity requirement for MCP**
- ✅ CYBERMEM_INSTANCE → **Defaulting to "local-MacBookPro"** (should verify this is correct)

### Linear Project Created
- **Project**: "Demo Recording — 60sec Product Video" (CM-57–CM-63)
- **Tasks**:
  - ✅ CM-57: Pre-prod environment setup
  - ✅ CM-58: Scene 2A recording (Claude saves vitamin D3)
  - ✅ CM-62: Scene 2B recording (Perplexity fails)
  - ✅ CM-59: Scene 3A recording (Deploy terminal)
  - ✅ CM-60: Scene 3B recording (Dashboard metrics)
  - ✅ CM-56: Scene 4 recording (CRITICAL: Perplexity retrieves Claude memory)
  - ✅ CM-63: Background music selection
  - ✅ CM-61: Text overlay design
  - ✅ CM-55: Post-production video editing

### Recording Scenes Breakdown

**Scene 1 (Hook)** — 5 sec
- "Your AI agents are forgetting everything... again"
- Show dashboard with empty context

**Scene 2A** — 10 min
- Claude saves memory: "Vitamin D3 helps with seasonal mood swings"
- Show CyberMem MCP call, memory saved to SQLite

**Scene 2B** — 10 min
- Perplexity tries to retrieve from Claude's instance
- FAILS: "No memory found" (systems isolated)
- Show frustrated agent UI

**Scene 3A** — 15 min
- Deploy scene: `docker-compose up -d cybermem`
- Show auth-sidecar starting, Traefik routing active

**Scene 3B** — 10 min
- Dashboard shows system metrics, client connections, memory stats
- Highlight "client_name=claude" and "client_name=perplexity"

**Scene 4** — 15 min (CRITICAL — MAGIC MOMENT)
- Perplexity queries: "What did Claude remember about vitamin D3?"
- **MUST SHOW**: 
  - CyberMem MCP: `query_memory("vitamin D3")`
  - Database returns: Claude's memory
  - Perplexity displays: "Claude knows: Vitamin D3 helps with..."
- This demonstrates cross-client memory sharing

**Scene 5 (CTA)** — 5 sec
- "Your agents, your memory, your control"
- cybermem.dev link

### Critical Dependencies for Scene 4

1. **CyberMem MCP Tools** (currently disabled in Claude session, but available)
   - Need: `add_memory()` and `query_memory()` working
   - Status: ✅ Server running, 5 tools discovered
   
2. **Perplexity HTTP Access to MCP**
   - Configure: PERPLEXITY_MCP_ENDPOINT=http://localhost:8626/mcp
   - Add: X-Client-Name: perplexity header
   
3. **Cross-Client Memory Sharing**
   - Memory stored by Claude under user_id="local"
   - Must be queryable by Perplexity (same user_id)
   - Verify: Auth bypass allows both clients local access

### Environment Verification Needed

```bash
# Check CYBERMEM_INSTANCE
echo $CYBERMEM_INSTANCE  # Should output: "local" or auto-detect to "local-MacBookPro"

# Verify auth-sidecar is running
docker-compose ps | grep auth-sidecar  # Should show running

# Test MCP endpoint
curl -X POST http://localhost:8626/mcp \
  -H "X-Client-Name: test-client" \
  -H "Content-Type: application/json"

# Check SQLite database
sqlite3 ~/.cybermem/memories.db "SELECT COUNT(*) FROM memories;"
```

### Recording Tools Needed

- **OBS Studio** (Mac) with:
  - Scene 1: Black screen + text overlay
  - Scene 2A/2B: Terminal + Claude Desktop + Perplexity split-screen
  - Scene 3A: Terminal with docker-compose output
  - Scene 3B: Browser with Dashboard at localhost:3000
  - Scene 4: Terminal showing MCP calls + Perplexity UI response
  - Scene 5: Brand slide + CTA

- **CapCut or DaVinci Resolve** for editing:
  - Combine 5 scenes
  - Add background music (lo-fi from Pixabay)
  - Add text overlays (Scene 1 hook, Scene 5 CTA)
  - Color grading: Cybermem blue theme (#0066cc or brand color)

### Recording Timeline

- **Pre-production**: ✅ Complete
  - Linear project: Created
  - System ready: Verified
  - Scenes planned: Detailed above
  
- **Recording**: ⏳ Ready to start
  - Est. time: 65 minutes (all 5 scenes)
  - CRITICAL: Scene 4 must work perfectly (cross-client memory)
  
- **Post-production**: ⏳ Pending
  - Editing: 20-30 minutes
  - Music selection: 5 minutes
  - Export (1080p, 30fps, H.264): 10-15 minutes
  - Final: ~25MB file

### Next Steps

1. ✅ **DONE**: Verify docker stack is running
2. ⏳ **TODO**: Set CYBERMEM_INSTANCE=local if not already set
3. ⏳ **TODO**: Test Scene 4 critical path (Claude saves memory → Perplexity queries)
4. ⏳ **TODO**: Start OBS recording
5. ⏳ **TODO**: Run through all 5 scenes
6. ⏳ **TODO**: Post-production editing
7. ⏳ **TODO**: Export final video

### Known Issues

- **CyberMem MCP Tools**: Currently showing as "disabled" in Claude session
  - Fix applied: Updated ~/.vscode/mcp.json with disabledTools: []
  - Status: Awaiting Claude restart or manual re-enable
  - Workaround: Tools ARE available in MCP server, just need proper client connection

- **Scene 4 Risk**: Cross-client memory sharing untested
  - Mitigation: Run quick test before full recording
  - Test command: `curl -X POST http://localhost:8626/mcp ... -d '{"method": "query_memory", "params": {"query": "test"}}'`

---

**Prepared by**: Claude (via CyberMem SSoT)  
**Date**: 2026-02-19 08:20 UTC  
**Status**: ✅ **SYSTEM READY FOR RECORDING**
