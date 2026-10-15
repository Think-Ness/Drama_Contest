const { execSync } = require('child_process');
const fs = require('fs');

const clips = [
  'Cinematic_first-person_POV._A_hand_20261016001537.mp4',
  'Camera_zooms_straight_into_the_20261016001537.mp4',
  'From_the_rehearsal_photo_album_20261016001537.mp4',
  'The_camera_glides_past_the_20261016001537.mp4',
  'The_white_invitation_card_moves_20261016001537.mp4',
  'The_camera_dives_down_into_20261016001537.mp4',
  'The_camera_pans_up_from_20261016001537.mp4'
];

const listContent = clips.map(c => `file 'video/${c}'`).join('\n');
fs.writeFileSync('public/concat_list.txt', listContent);

console.log('Concatenating clips with ffmpeg...');
try {
  execSync('ffmpeg -y -f concat -safe 0 -i public/concat_list.txt -c copy public/video/master-sequence.mp4', { stdio: 'inherit' });
  console.log('Successfully created public/video/master-sequence.mp4!');
} catch (e) {
  console.error('Concat failed:', e.message);
}
