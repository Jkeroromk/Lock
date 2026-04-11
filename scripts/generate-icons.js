const sharp = require('sharp');
const path = require('path');
const assetsDir = path.join(__dirname, '..', 'assets');

const iconSVG = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="#007AFF"/>
  <path d="M 33 50 L 33 36 C 33 21 50 15 50 15 C 50 15 67 21 67 36 L 67 50"
        stroke="white" stroke-width="7.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="23" y="47" width="54" height="40" rx="10" fill="white"/>
  <circle cx="50" cy="64" r="6.5" fill="#007AFF"/>
  <rect x="47" y="64" width="6" height="11" rx="3" fill="#007AFF"/>
</svg>`;

const splashSVG = `<svg width="1284" height="2778" viewBox="0 0 1284 2778" xmlns="http://www.w3.org/2000/svg">
  <rect width="1284" height="2778" fill="#007AFF"/>
  <g transform="translate(492, 1139)">
    <rect width="300" height="300" rx="68" fill="rgba(255,255,255,0.15)"/>
    <path d="M 99 150 L 99 108 C 99 63 150 45 150 45 C 150 45 201 63 201 108 L 201 150"
          stroke="white" stroke-width="22" fill="none" stroke-linecap="round"/>
    <rect x="69" y="141" width="162" height="120" rx="30" fill="white"/>
    <circle cx="150" cy="189" r="19" fill="#007AFF"/>
    <rect x="141" y="189" width="18" height="33" rx="9" fill="#007AFF"/>
  </g>
  <text x="642" y="1510" font-family="Helvetica Neue, Arial, sans-serif" font-size="72"
        font-weight="800" fill="white" text-anchor="middle" letter-spacing="-2">LOCK</text>
</svg>`;

async function generate() {
  console.log('Generating icons...');

  await sharp(Buffer.from(iconSVG(1024))).png().toFile(path.join(assetsDir, 'icon.png'));
  console.log('✓ icon.png (1024x1024)');

  await sharp(Buffer.from(iconSVG(1024))).png().toFile(path.join(assetsDir, 'adaptive-icon.png'));
  console.log('✓ adaptive-icon.png (1024x1024)');

  await sharp(Buffer.from(iconSVG(32))).png().toFile(path.join(assetsDir, 'favicon.png'));
  console.log('✓ favicon.png (32x32)');

  await sharp(Buffer.from(splashSVG)).png().toFile(path.join(assetsDir, 'splash.png'));
  console.log('✓ splash.png (1284x2778)');

  console.log('\nAll icons generated successfully!');
}

generate().catch(console.error);
