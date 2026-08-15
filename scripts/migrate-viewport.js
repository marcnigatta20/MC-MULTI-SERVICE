import fs from 'fs';
import path from 'path';

function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walk(filepath, filelist);
    } else if (/\.tsx?$/.test(file)) {
      filelist.push(filepath);
    }
  });
  return filelist;
}

const appDir = path.join(process.cwd(), 'app');
if (!fs.existsSync(appDir)) {
  console.error('No app directory found.');
  process.exit(1);
}

const files = walk(appDir);
const hits = [];
for (const f of files) {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('viewport:')) {
    hits.push(f);
  }
}

if (hits.length === 0) {
  console.log('No files with "viewport:" found.');
  process.exit(0);
}

console.log('Files with viewport found:');
hits.forEach((h) => console.log(' -', h));
console.log('\nRecommendation: move viewport into a generateViewport export in each file, or keep it centralized in app/layout.tsx.');
