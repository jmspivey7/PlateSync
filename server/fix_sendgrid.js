const fs = require('fs');
const filePath = 'sendgrid.ts';

fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }
  
  // Find the second occurrence of the function and replace it
  const pattern = /export async function sendPasswordResetEmail\(params: PasswordResetEmailParams\): Promise<boolean> \{[\s\S]+?return false;\s+\}\s+\}/;
  let count = 0;
  const newContent = data.replace(pattern, (match) => {
    count++;
    if (count === 2) {
      return '// This duplicate function was removed to fix TypeScript errors\n// Using the implementation from earlier in this file';
    }
    return match;
  });
  
  fs.writeFile(filePath, newContent, 'utf8', (writeErr) => {
    if (writeErr) {
      console.error('Error writing file:', writeErr);
      return;
    }
    console.log('Successfully removed duplicate function');
  });
});
