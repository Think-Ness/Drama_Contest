const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

if (!fs.existsSync('public/thumbnails')) {
  fs.mkdirSync('public/thumbnails', { recursive: true });
}

const files = fs.readdirSync('public/video').filter(f => f.endsWith('.mp4'));
files.forEach(f => {
  const base = path.basename(f, '.mp4');
  const outFile = `public/thumbnails/${base}.jpg`;
  try {
    execSync(`ffmpeg -y -ss 00:00:02 -i "public/video/${f}" -vframes 1 -q:v 2 "${outFile}"`, { stdio: 'ignore' });
    console.log(`Generated: ${outFile}`);
  } catch (e) {
    console.error(`Failed ${f}:`, e.message);
  }
});
