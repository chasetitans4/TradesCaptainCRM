
const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'components', 'ui', 'nul');

try {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log('Successfully deleted nul file');
  } else {
    console.log('File does not exist');
  }
} catch (error) {
  console.error('Error deleting file:', error);
}
