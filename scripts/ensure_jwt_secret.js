
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.join(process.cwd(), '.env.local');

let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

if (envContent.includes('JWT_SECRET=')) {
  console.log('JWT_SECRET already exists in .env.local');
} else {
  console.log('JWT_SECRET missing. Generating...');
  const secret = crypto.randomBytes(32).toString('hex');
  const newContent = envContent + `\nJWT_SECRET="${secret}"\n`;
  fs.writeFileSync(envPath, newContent);
  console.log('JWT_SECRET added to .env.local');
}
