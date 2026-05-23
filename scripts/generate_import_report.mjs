import fs from 'fs';
import path from 'path';
const root = process.cwd();
const before = fs.readFileSync(path.join(root,'import_restore_before.txt'),'utf8');
const after = fs.readFileSync(path.join(root,'import_restore_after.txt'),'utf8');
const audit = fs.readFileSync(path.join(root,'IMPORT_AUDIT.md'),'utf8');

function countPattern(text, pat){ return (text.match(new RegExp(pat,'g'))||[]).length }

const targets = ["@/shared/api/response-normalizers","@/shared/routing/sovereign-routes","@/shared/query-governance"];
const report = [];
let resolvedCount =0;
let beforeTotal = countPattern(before,"@/shared/");
let afterTotal = countPattern(after,"@/shared/");

for(const t of targets){
  const b = countPattern(before, t.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&'));
  const a = countPattern(after, t.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&'));
  report.push({target:t,before:b,after:a});
  if (b>0 && a===0) resolvedCount++;
}

// list unresolved canonical targets from IMPORT_AUDIT.md where canonical source = MISSING
const lines = audit.split(/\r?\n/).slice(4);
const unresolved = [];
for(const ln of lines){
  const cols = ln.split('|').map(s=>s.trim());
  if(cols.length>=4){
    const broken = cols[1]; const canonical = cols[2]; const action = cols[4];
    if(canonical==='MISSING') unresolved.push({broken:cols[1],client:cols[3],action:cols[4]});
  }
}

// created bridges: list files under client/src/shared matching ours
const created = [];
const walk = (dir)=>{
  fs.readdirSync(dir,{withFileTypes:true}).forEach(d=>{
    const p=path.join(dir,d.name);
    if(d.isDirectory()) walk(p);
    else if(d.isFile() && p.includes(path.join('client','src','shared'))) created.push(p);
  })
}
walk(path.join(root,'client','src'));

// check bridges content for import path referencing 'shared' vs 'client'
const bridges = [];
for(const f of created){
  try{
    const c = fs.readFileSync(f,'utf8');
    if(c.includes('export * from')){
      const m = c.match(/export \* from ['\"](.+)['\"];?/);
      const imp = m?m[1]:'<unknown>';
      const circular = imp.includes('client/src');
      bridges.push({file:path.relative(root,f),import:imp,circular});
    }
  }catch(e){}
}

// Newly exposed constitutional clusters: top files by error count in after
const errs = after.split(/\r?\n/).filter(l=>l.trim());
const fileCounts = {};
for(const l of errs){
  const m = l.match(/^([^\(]+)\(\d+,\d+\):/);
  if(m){ fileCounts[m[1]] = (fileCounts[m[1]]||0)+1 }
}
const top = Object.entries(fileCounts).sort((a,b)=>b[1]-a[1]).slice(0,10);

// write IMPORT_RESTORATION_REPORT.md
let md = '# IMPORT_RESTORATION_REPORT\n\n';
md += 'Category\tCount\n\n';
md += `import errors resolved: ${resolvedCount}\n`;
md += `import errors before ("@/shared/"): ${beforeTotal}\n`;
md += `import errors after ("@/shared/"): ${afterTotal}\n`;
md += `bridges created: ${bridges.length}\n`;
md += `unresolved canonical targets: ${unresolved.length}\n`;
md += `circular risks detected: ${bridges.filter(b=>b.circular).length}\n\n`;
md += 'Unresolved canonical targets:\n';
unresolved.forEach(u=> md += `- ${u.broken} (client bridge: ${u.client}, action: ${u.action})\n`);
md += '\nBridges created (sample):\n';
bridges.forEach(b=> md += `- ${b.file} -> ${b.import} ${b.circular? ' (CIRCULAR_RISK)':''}\n`);
md += '\nTop files with remaining errors (post-restore):\n';
top.forEach(t=> md += `- ${t[0]}: ${t[1]} errors\n`);

fs.writeFileSync(path.join(root,'IMPORT_RESTORATION_REPORT.md'), md,'utf8');
console.log('WROTE IMPORT_RESTORATION_REPORT.md');
