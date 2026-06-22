import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

mkdirSync('public/icons', { recursive: true })

const mark = (size, padRatio) => {
  const r = (size / 2) * (1 - padRatio)
  const c = size / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><radialGradient id="g" cx="82%" cy="8%" r="95%">
    <stop offset="0%" stop-color="#17241d"/><stop offset="100%" stop-color="#0a0a0c"/>
  </radialGradient></defs>
  <rect width="${size}" height="${size}" fill="url(#g)"/>
  <circle cx="${c}" cy="${c}" r="${r}" fill="#2be8a0"/>
  <path d="M${c} ${c - r}a${r} ${r} 0 0 0 0 ${2 * r}z" fill="#0a0a0c"/>
</svg>`
}

const jobs = [
  { name: 'icon-192.png', size: 192, pad: 0.34 },
  { name: 'icon-512.png', size: 512, pad: 0.34 },
  { name: 'icon-maskable.png', size: 512, pad: 0.46 },
]

for (const j of jobs) {
  await sharp(Buffer.from(mark(j.size, j.pad))).png().toFile(`public/icons/${j.name}`)
  console.log('wrote', j.name)
}
// apple-touch-icon (180, no transparency)
await sharp(Buffer.from(mark(180, 0.34))).png().toFile('public/apple-touch-icon.png')
console.log('wrote apple-touch-icon.png')
