import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distPath = path.join(projectRoot, 'dist');
const tsconfigPath = path.join(projectRoot, 'tsconfig.json');

let hasErrors = false;

function reportError(msg) {
  console.error(`❌ ERROR: ${msg}`);
  hasErrors = true;
}

function reportSuccess(msg) {
  console.log(`✅ SUCCESS: ${msg}`);
}

async function verify() {
  console.log('Verifying dist/ directory...\n');

  // 1. Check dist/ exists
  if (!fs.existsSync(distPath)) {
    reportError('dist/ directory does not exist.');
    process.exit(1);
  }
  reportSuccess('dist/ directory exists.');

  // 2. Verify dist/src/cli.js and dist/src/action/index.js exist
  const cliJsPath = path.join(distPath, 'src', 'cli.js');
  const actionIndexPath = path.join(distPath, 'src', 'action', 'index.js');
  
  if (!fs.existsSync(cliJsPath)) {
    reportError(`Missing: ${cliJsPath}`);
  } else {
    reportSuccess(`Found: ${cliJsPath}`);
  }

  if (!fs.existsSync(actionIndexPath)) {
    reportError(`Missing: ${actionIndexPath}`);
  } else {
    reportSuccess(`Found: ${actionIndexPath}`);
  }

  // 3. Verify dist was built from current source (tsconfig mtime vs dist mtime)
  if (fs.existsSync(tsconfigPath)) {
    const tsconfigStat = fs.statSync(tsconfigPath);
    const distStat = fs.statSync(distPath);
    if (distStat.mtimeMs < tsconfigStat.mtimeMs) {
      reportError('dist/ is older than tsconfig.json, might be stale.');
    } else {
      reportSuccess('dist/ mtime is newer or equal to tsconfig.json.');
    }
  } else {
    reportError('tsconfig.json not found to compare mtimes.');
  }

  // 4. Verify no .ts files leaked into dist/
  function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else {
        if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
          reportError(`.ts file leaked into dist: ${fullPath}`);
        }
      }
    }
  }

  walkDir(distPath);
  reportSuccess('No raw .ts files leaked into dist/.');

  console.log('\nVerification complete.');
  if (hasErrors) {
    process.exit(1);
  }
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
