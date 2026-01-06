

// Use DB Exporter directly (port 8000) to verify data presence without Prometheus scraping delay
const METRICS_URL = 'http://127.0.0.1:8000/metrics';
const MCP_URL = process.env.CYBERMEM_URL || 'http://127.0.0.1:8626/mcp';
const CLIENT_NAME = `test-metrics-${Date.now()}`;

async function main() {
    console.log(`🧪 Testing Metrics for Client: ${CLIENT_NAME}`);

    // 1. Generate Traffic
    console.log(`   [1/3] Generating traffic to ${MCP_URL}...`);
    const payload = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
            name: "openmemory_store",
            arguments: {
                content: `Metrics test from ${CLIENT_NAME}`,
                tags: ["metrics-test"]
            }
        }
    };

    try {
        const res = await fetch(MCP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/event-stream',
                'X-Client-Name': CLIENT_NAME
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            throw new Error(`Traffic generation failed: ${res.status} ${await res.text()}`);
        }
        console.log('      ✅ Traffic sent');
    } catch (e) {
        console.error('      ❌ Failed to send traffic', e);
        process.exit(1);
    }

    // 2. Wait for Metrics
    console.log(`   [2/3] Waiting for Metrics (polling ${METRICS_URL} up to 30s)...`);
    const start = Date.now();
    let found = false;

    while (Date.now() - start < 30000) {
        try {
            const res = await fetch(METRICS_URL);
            const text = await res.text();

            // Look for: openmemory_requests_total{...,client_name="CLIENT_NAME",...}
            if (text.includes(`client_name="${CLIENT_NAME}"`)) {
                 if (text.includes(`openmemory_requests_total`) && text.includes(CLIENT_NAME)) {
                     console.log(`      ✅ Found metric for client ${CLIENT_NAME}`);
                     found = true;
                     break;
                 }
            }
        } catch (e) {
            // ignore network errors during wait
        }
        await new Promise(r => setTimeout(r, 1000));
        process.stdout.write('.');
    }
    console.log(''); // newline

    if (!found) {
        console.error('      ❌ Metric not found in db-exporter after 30s');
        process.exit(1);
    }

    console.log('   [3/3] Success');
    console.log(`   ✨ METRICS VERIFICATION PASSED!`);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
