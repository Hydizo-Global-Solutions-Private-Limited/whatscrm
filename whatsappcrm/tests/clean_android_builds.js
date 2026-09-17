const fs = require('fs');
const path = require('path');

const targetDir = 'C:\\msgmagnet\\node_modules';

function findAndDelete(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'android') {
          const buildDir = path.join(fullPath, 'build');
          if (fs.existsSync(buildDir)) {
            console.log('Deleting:', buildDir);
            try {
              fs.rmSync('\\\\?\\' + path.resolve(buildDir), { recursive: true, force: true });
            } catch (e) {
              console.error('Error deleting:', buildDir, e.message);
            }
          }
        } else {
          findAndDelete(fullPath);
        }
      }
    }
  } catch (err) {}
}

console.log('Scanning for android/build folders...');
findAndDelete(targetDir);

['C:\\msgmagnet\\android\\app\\.cxx', 'C:\\msgmagnet\\android\\app\\build'].forEach(d => {
  if (fs.existsSync(d)) {
    console.log('Deleting:', d);
    try {
      fs.rmSync('\\\\?\\' + path.resolve(d), { recursive: true, force: true });
    } catch (e) {
      console.error('Error deleting:', d, e.message);
    }
  }
});

console.log('Finished cleanup!');
