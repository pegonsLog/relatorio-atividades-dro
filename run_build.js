const cp = require('child_process');
const fs = require('fs');
let out = '';
try {
  out = cp.execSync('node node_modules/@angular/cli/bin/ng.js build --progress=false', {
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 100,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  out += '\nEXIT=0';
} catch (e) {
  out = (e.stdout || '') + '\n--- STDERR ---\n' + (e.stderr || '') + '\nEXIT=' + e.status;
}
fs.writeFileSync('build_log.txt', out);
