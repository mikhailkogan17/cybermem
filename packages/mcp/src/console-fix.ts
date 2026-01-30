// Redirect all stdout to stderr IMMEDIATELY to protect Stdio protocol
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
(process.stdout as any).write = (chunk: any, encoding: any, callback: any) => {
  const str = typeof chunk === "string" ? chunk : chunk.toString();
  if (str.includes('"jsonrpc":')) {
    return originalStdoutWrite(chunk, encoding, callback);
  }
  return process.stderr.write(chunk, encoding, callback);
};

// Also redirect console outputs
console.log = console.error;
console.info = console.error;
