const fs = require('fs');
const path = require('path');

const workersDir = path.join(__dirname, 'src', 'workers');
const files = fs.readdirSync(workersDir).filter(f => f.endsWith('Worker.ts'));

for (const file of files) {
  const filePath = path.join(workersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('import { redisConnection } from \'../config/queue\'')) {
    content = content.replace(
      'import { redisConnection } from \'../config/queue\'',
      'import { getRedisConnectionForWorker } from \'../config/queue\''
    );
    content = content.replace(
      /connection:\s*redisConnection\s*(as\s+any)?/,
      'connection: getRedisConnectionForWorker() as any'
    );
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
}
