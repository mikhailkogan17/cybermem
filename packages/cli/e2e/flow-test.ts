#!/usr/bin/env npx ts-node
/**
 * MCP E2E Flow Test: write_local → check_dashboard → backup → restore_rpi → check_tailscale
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

// Config
const LOCAL_MCP = 'http://127.0.0.1:8626/mcp';
const LOCAL_DASHBOARD = 'http://localhost:3000';
const RPI_MCP = 'https://raspberrypi.tail7242ed.ts.net/cybermem/mcp';
const RPI_DASHBOARD = 'https://raspberrypi.tail7242ed.ts.net/';

// API Keys
const LOCAL_API_KEY = 'sk-dd1184f372dad9ac648c139de96c4547';
const RPI_API_KEY = 'sk-27983acf050d09f6d0311a8e31a9f620';

const RPC = (method: string, params: any = {}, id: number) => ({
    jsonrpc: "2.0", id, method, params
});

const mcpPost = async (url: string, apiKey: string, body: any) => {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/event-stream',
            'x-api-key': apiKey,
            'User-Agent': 'CyberMem-FlowTest/1.0.0'
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
    }
    return res.json();
};

async function main() {
    console.log('🚀 MCP Flow Test: write_local → backup → restore_rpi → verify\n');
    
    const testContent = `Flow Test ${new Date().toISOString()} - Migration test from local to RPi`;
    let memoryId: string;
    let backupPath: string;

    // ============================================
    // STEP 1: Write Memory on LOCAL via MCP
    // ============================================
    console.log('📝 Step 1: Writing memory on LOCAL via MCP...');
    try {
        // Initialize
        const initRes: any = await mcpPost(LOCAL_MCP, LOCAL_API_KEY, RPC("initialize", {
            protocolVersion: "2024-11-05",
            capabilities: { roots: { listChanged: true } },
            clientInfo: { name: "flow-test", version: "1.0.0" }
        }, 1));
        console.log(`   ✅ Connected to ${initRes.result.serverInfo.name}`);

        await mcpPost(LOCAL_MCP, LOCAL_API_KEY, RPC("notifications/initialized", {}, 2));

        // Store
        const storeRes: any = await mcpPost(LOCAL_MCP, LOCAL_API_KEY, RPC("tools/call", {
            name: "openmemory_store",
            arguments: { content: testContent, tags: ["flow-test", "migration"] }
        }, 3));

        if (storeRes.error) throw new Error(storeRes.error.message);
        const storePayload = JSON.parse(storeRes.result.content[1].text);
        memoryId = storePayload.id;
        console.log(`   ✅ Memory stored: ID=${memoryId}`);
        console.log(`   📄 Content: "${testContent.substring(0, 50)}..."`);
    } catch (e: any) {
        console.error(`   ❌ FAILED: ${e.message}`);
        process.exit(1);
    }

    // ============================================
    // STEP 2: Verify via LOCAL Dashboard API
    // ============================================
    console.log('\n📊 Step 2: Checking LOCAL dashboard for memory count...');
    try {
        const statsRes = await fetch(`${LOCAL_DASHBOARD}/api/stats`);
        if (statsRes.ok) {
            const stats = await statsRes.json();
            console.log(`   ✅ Dashboard stats: ${JSON.stringify(stats)}`);
        } else {
            console.log(`   ⚠️ Dashboard API returned ${statsRes.status}`);
        }
    } catch (e: any) {
        console.log(`   ⚠️ Dashboard check skipped: ${e.message}`);
    }

    // ============================================
    // STEP 3: Backup LOCAL database
    // ============================================
    console.log('\n💾 Step 3: Creating backup of LOCAL database...');
    try {
        backupPath = path.join(os.tmpdir(), `cybermem-backup-${Date.now()}.sqlite`);
        
        // Copy from docker volume
        execSync(`docker cp cybermem-openmemory:/data/openmemory.sqlite "${backupPath}"`, { stdio: 'pipe' });
        
        const stats = fs.statSync(backupPath);
        console.log(`   ✅ Backup created: ${backupPath}`);
        console.log(`   📦 Size: ${(stats.size / 1024).toFixed(1)} KB`);
    } catch (e: any) {
        console.error(`   ❌ Backup FAILED: ${e.message}`);
        process.exit(1);
    }

    // ============================================
    // STEP 4: Restore to RPi
    // ============================================
    console.log('\n🔄 Step 4: Restoring backup to RPi...');
    try {
        const sshKey = path.join(os.homedir(), '.ssh', 'id_ed25519');
        const rpiHost = 'pi@raspberrypi.local';
        
        // Stop container, copy, restart
        console.log('   ⏳ Stopping RPi container...');
        execSync(`ssh -i ${sshKey} ${rpiHost} '/usr/local/bin/docker stop cybermem-openmemory'`, { stdio: 'pipe' });
        
        console.log('   📤 Uploading backup...');
        execSync(`scp -i ${sshKey} "${backupPath}" ${rpiHost}:~/.cybermem/data/openmemory.sqlite`, { stdio: 'pipe' });
        
        console.log('   🔧 Fixing permissions...');
        execSync(`ssh -i ${sshKey} ${rpiHost} 'chmod 666 ~/.cybermem/data/openmemory.sqlite'`, { stdio: 'pipe' });
        
        console.log('   ▶️ Starting RPi container...');
        execSync(`ssh -i ${sshKey} ${rpiHost} '/usr/local/bin/docker start cybermem-openmemory'`, { stdio: 'pipe' });
        
        // Wait for startup
        await new Promise(r => setTimeout(r, 5000));
        console.log(`   ✅ Restore complete`);
    } catch (e: any) {
        console.error(`   ❌ Restore FAILED: ${e.message}`);
        process.exit(1);
    }

    // ============================================
    // STEP 5: Verify via RPi MCP (Tailscale)
    // ============================================
    console.log('\n🌐 Step 5: Verifying memory on RPi via Tailscale MCP...');
    try {
        // Wait a bit more for service to stabilize
        await new Promise(r => setTimeout(r, 3000));
        
        // Initialize
        const initRes: any = await mcpPost(RPI_MCP, RPI_API_KEY, RPC("initialize", {
            protocolVersion: "2024-11-05",
            capabilities: { roots: { listChanged: true } },
            clientInfo: { name: "flow-test-rpi", version: "1.0.0" }
        }, 1));
        console.log(`   ✅ Connected to RPi: ${initRes.result.serverInfo.name}`);

        await mcpPost(RPI_MCP, RPI_API_KEY, RPC("notifications/initialized", {}, 2));

        // Get the specific memory by ID
        const getRes: any = await mcpPost(RPI_MCP, RPI_API_KEY, RPC("tools/call", {
            name: "openmemory_get",
            arguments: { id: memoryId }
        }, 3));

        if (getRes.error) throw new Error(getRes.error.message);
        
        const getPayload = JSON.parse(getRes.result.content[0].text);
        
        if (getPayload.content === testContent) {
            console.log(`   ✅ Memory VERIFIED on RPi!`);
            console.log(`   📄 Content matches: "${getPayload.content.substring(0, 50)}..."`);
        } else {
            throw new Error(`Content mismatch: expected "${testContent}", got "${getPayload.content}"`);
        }
    } catch (e: any) {
        console.error(`   ❌ RPi verification FAILED: ${e.message}`);
        process.exit(1);
    }

    // ============================================
    // STEP 6: Check RPi Dashboard via Tailscale
    // ============================================
    console.log('\n🖥️ Step 6: Checking RPi Tailscale dashboard...');
    try {
        const dashRes = await fetch(RPI_DASHBOARD, { redirect: 'follow' });
        if (dashRes.ok) {
            const html = await dashRes.text();
            if (html.includes('CyberMem')) {
                console.log(`   ✅ Dashboard accessible via Tailscale`);
            } else {
                console.log(`   ⚠️ Dashboard loaded but content unexpected`);
            }
        } else {
            console.log(`   ⚠️ Dashboard returned ${dashRes.status}`);
        }
    } catch (e: any) {
        console.log(`   ⚠️ Dashboard check: ${e.message}`);
    }

    // Cleanup
    if (backupPath && fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
    }

    console.log('\n✨ FLOW TEST PASSED! Memory successfully migrated from LOCAL to RPi via backup/restore.\n');
}

main().catch(e => {
    console.error(`Fatal: ${e.message}`);
    process.exit(1);
});
