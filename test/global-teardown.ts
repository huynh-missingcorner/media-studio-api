import { execSync } from 'child_process';

module.exports = () => {
  console.log('Stopping test database...');
  execSync('docker-compose -f docker-compose.test.yml down', { stdio: 'inherit' });
};
