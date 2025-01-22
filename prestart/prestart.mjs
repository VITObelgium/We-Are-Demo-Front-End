import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import { initializeEnvironment } from './environment-validate.mjs';
import * as angularJson from '../angular.json' assert { type: 'json' };

config();

initializeEnvironment('.env.example');

const targetPath = resolve('./src/environments/environment.ts');
const envConfigFile = `
export const environment = {
  production: false,
  frontendUrl: "${process.env['PROTOCOL']}://${process.env['HOST']}:${process.env['PORT']}",
  backendUrl: "${process.env['BACKEND_URL']}",
  amaUrl: "${process.env['AMA_URL']}",
  amaConsentPath: "${process.env['AMA_CONSENT_PATH']}"
};
`;
writeFileSync(targetPath, envConfigFile, { encoding: 'utf8' });
console.log('environment.ts has been updated');