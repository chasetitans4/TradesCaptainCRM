const fs = require('fs');
const path = require('path');

const dir = 'supabase/migrations';
const targetDir = 'docs';
const targetName = 'TRADESCAPTAIN_CRM_UPDATE_PROMPT_v6.md';

fs.readdir(dir, (err, files) => {
  if (err) {
    console.error('Error reading directory:', err);
    return;
  }

  const jsFile = files.find(f => f.endsWith('.js') && f.includes('TRADESCAPTAIN'));
  
  if (!jsFile) {
    console.error('Could not find the JS file.');
    console.log('Files found:', files);
    return;
  }

  const oldPath = path.join(dir, jsFile);
  const newPath = path.join(targetDir, targetName);

  console.log(`Renaming "${oldPath}" to "${newPath}"`);

  fs.rename(oldPath, newPath, (err) => {
    if (err) {
      console.error('Error renaming file:', err);
    } else {
      console.log('Successfully renamed file.');
    }
  });
});
