const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const orderedClips = [
  'First-person_continuous_zoom-in._A_white-gloved_20261016052517.mp4', // Scene 1: ARE YOU READY
  'Camera_zooms_straight_into_the_20261016052517.mp4',                // Scene 2: GET READY
  'Camera_flies_past_the_gold-sealed_20261016052517.mp4',             // Scene 3: RISE OF THE STAGE
  'Camera_moves_forward_between_the_20261016052517.mp4',              // Scene 4: OUR LEADERS
  'Camera_pushes_forward_into_the_20261016052517.mp4',               // Scene 5: THE PODIUM AWAITS
  'Locked_camera_slowly_pushing_in_20261016052517.mp4',               // Scene 6: 3D CROWN PHILOSOPHY
  'Camera_dives_down_past_the_20261016052517.mp4',                    // Scene 7: GOLDEN MASQUERADE MASK
  'Extreme_close-up_zoom_directly_into_20261016052517.mp4'            // Scene 8: THE WINNER'S CROWN
];

const inputArgs = orderedClips
  .map(f => `-i "${path.resolve(__dirname, 'public/Video2', f).replace(/\\/g, '/')}"`)
  .join(' ');

const filterConcat = orderedClips.map((_, i) => `[${i}:v]`).join('') + `concat=n=${orderedClips.length}:v=1:a=0[outv]`;

const cmd = `ffmpeg -y ${inputArgs} -filter_complex "${filterConcat}" -map "[outv]" -c:v libx264 -preset veryfast -crf 20 -g 12 -keyint_min 1 -sc_threshold 0 -pix_fmt yuv420p -movflags +faststart "public/video/master-video2.mp4"`;

console.log('Running robust concat filter across all 8 clips...');
try {
  execSync(cmd, { stdio: 'inherit' });
  if (!fs.existsSync('public/videos')) fs.mkdirSync('public/videos', { recursive: true });
  fs.copyFileSync('public/video/master-video2.mp4', 'public/videos/master-video2.mp4');
  console.log('SUCCESS! Master video 2 created with all 8 clips (80 seconds total).');
} catch (e) {
  console.error('Concat failed:', e.message);
}
