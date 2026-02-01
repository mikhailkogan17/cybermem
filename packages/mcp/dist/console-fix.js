"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Redirect all stdout to stderr IMMEDIATELY to protect Stdio protocol
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, encoding, callback) => {
    const str = typeof chunk === "string" ? chunk : chunk.toString();
    if (str.includes('"jsonrpc":')) {
        return originalStdoutWrite(chunk, encoding, callback);
    }
    return process.stderr.write(chunk, encoding, callback);
};
// Also redirect console outputs
console.log = console.error;
console.info = console.error;
