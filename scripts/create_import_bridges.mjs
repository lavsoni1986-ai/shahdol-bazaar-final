import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const targets = [
  '@/shared/api/response-normalizers',
  '@/shared/routing/sovereign-routes',
  '@/shared/query-governance',
  '@shared/contracts/ontology/index',
  '@/shared/district-intelligence/types',
  '@/shared/routing/reserved-routes',
  '@/shared/schema',
  '@/shared/intent-taxonomy',
  '@/shared/cognition/search-taxonomy',
  '@/shared/cognition/entity-search-indexing',
  '@/shared/domain/canonical-entities',
  '@/shared/roles',
  '@/shared/contracts'
];

const results = [];

for (const t of targets) {
  const cleaned = t.replace(/^@/,'').replace(/^\//,'');
  const clientPath = path.join(projectRoot,'client','src',cleaned + '.ts');
  const clientPathIndex = path.join(projectRoot,'client','src',cleaned,'index.ts');
  const sharedPath = path.join(projectRoot, cleaned + '.ts');
  const sharedPathIndex = path.join(projectRoot, cleaned,'index.ts');

  const clientExists = fs.existsSync(clientPath) || fs.existsSync(clientPathIndex);
  const sharedExists = fs.existsSync(sharedPath) || fs.existsSync(sharedPathIndex);

  results.push({ target: t, clientExists, sharedExists, clientPath, clientPathIndex, sharedPath, sharedPathIndex });
}

// Write IMPORT_AUDIT.md
let md = '# IMPORT_AUDIT\n\n';
md += '| Broken Import | Canonical Source under shared/ | Client bridge exists | Action |\n';
md += '|---|---:|---:|---|\n';
for (const r of results) {
  const canonical = r.sharedExists ? path.relative(projectRoot, r.sharedPath).replace(/\\/g,'/') : 'MISSING';
  const client = r.clientExists ? path.relative(projectRoot, r.clientPath).replace(/\\/g,'/') : 'MISSING';
  const action = (!r.clientExists && r.sharedExists) ? 'CREATE_BRIDGE' : (r.clientExists ? 'NO_ACTION' : 'MANUAL_REVIEW');
  md += `| ${r.target} | ${canonical} | ${client} | ${action} |\n`;
}
fs.writeFileSync(path.join(projectRoot,'IMPORT_AUDIT.md'), md, 'utf8');

// Create thin bridges for CREATE_BRIDGE entries
for (const r of results) {
  if (!r.clientExists && r.sharedExists) {
    // create client file under client/src/<cleaned>.ts or index.ts
    const cleaned = r.target.replace(/^@/,'').replace(/^\//,'');
    const clientFileDir = path.join(projectRoot,'client','src', path.dirname(cleaned));
    const clientFile = path.join(clientFileDir, path.basename(cleaned) + '.ts');
    const relToShared = path.relative(clientFileDir, path.join(projectRoot, path.dirname(cleaned)));
    // prefer to export from shared path (projectRoot/cleaned)
    const sharedImportPath = path.relative(clientFileDir, path.join(projectRoot, cleaned));
    const importPath = sharedImportPath.startsWith('.') ? sharedImportPath : './' + sharedImportPath;
    const content = `export * from '${importPath}';\n`;
    fs.mkdirSync(clientFileDir, { recursive: true });
    if (!fs.existsSync(clientFile)) {
      fs.writeFileSync(clientFile, content, 'utf8');
      console.log('Created bridge:', path.relative(projectRoot, clientFile));
    }
  }
}

console.log('IMPORT_AUDIT.md and bridges created.');
