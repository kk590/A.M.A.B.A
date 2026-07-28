<<<<<<< HEAD
import fs from 'fs';
import path from 'path';

const outDir = path.join(process.cwd(), 'out');

if (!fs.existsSync(outDir)) {
  console.log('out directory not found');
  process.exit(0);
}

// 1. Rename _next to next_assets
const nextDir = path.join(outDir, '_next');
const newNextDir = path.join(outDir, 'next_assets');
if (fs.existsSync(nextDir)) {
  fs.renameSync(nextDir, newNextDir);
}

// 2. Delete any file or directory starting with _ (like _not-found, __next.*)
// Chrome extensions do not allow files starting with _ except _locales
const files = fs.readdirSync(outDir);
for (const f of files) {
  if (f.startsWith('_')) {
    const fullPath = path.join(outDir, f);
    if (fs.existsSync(fullPath)) {
      if (fs.statSync(fullPath).isDirectory()) {
         fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
         fs.rmSync(fullPath);
      }
    }
  }
}

// 3. Replace all string references from _next to next_assets
function replaceInDir(dir) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const filePath = path.join(dir, entry);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      replaceInDir(filePath);
    } else if (filePath.match(/\.(html|js|css|json|txt)$/)) {
      let content = fs.readFileSync(filePath, 'utf8');
      const original = content;
      content = content.replace(/\/_next\//g, '/next_assets/');
      content = content.replace(/\\\/_next\\\//g, '\\/next_assets\\/');
      content = content.replace(/"_next"/g, '"next_assets"');
      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
      }
    }
  }
}

replaceInDir(outDir);
console.log('Successfully prepared out directory for Chrome Extension.');
=======
import fs from 'fs';
import path from 'path';

const outDir = path.join(process.cwd(), 'out');

if (!fs.existsSync(outDir)) {
  console.log('out directory not found');
  process.exit(0);
}

// 1. Rename _next to next_assets
const nextDir = path.join(outDir, '_next');
const newNextDir = path.join(outDir, 'next_assets');
if (fs.existsSync(nextDir)) {
  fs.renameSync(nextDir, newNextDir);
}

// 2. Delete any file or directory starting with _ (like _not-found, __next.*)
// Chrome extensions do not allow files starting with _ except _locales
const files = fs.readdirSync(outDir);
for (const f of files) {
  if (f.startsWith('_')) {
    const fullPath = path.join(outDir, f);
    if (fs.existsSync(fullPath)) {
      if (fs.statSync(fullPath).isDirectory()) {
         fs.rmSync(fullPath, { recursive: true, force: true });
      } else {
         fs.rmSync(fullPath);
      }
    }
  }
}

// 3. Replace all string references from _next to next_assets
function replaceInDir(dir) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const filePath = path.join(dir, entry);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      replaceInDir(filePath);
    } else if (filePath.match(/\.(html|js|css|json|txt)$/)) {
      let content = fs.readFileSync(filePath, 'utf8');
      const original = content;
      content = content.replace(/\/_next\//g, '/next_assets/');
      content = content.replace(/\\\/_next\\\//g, '\\/next_assets\\/');
      content = content.replace(/"_next"/g, '"next_assets"');
      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
      }
    }
  }
}

replaceInDir(outDir);
console.log('Successfully prepared out directory for Chrome Extension.');
>>>>>>> 82c0811f7c0a09c3faa3264140fc4eae6738b72c
