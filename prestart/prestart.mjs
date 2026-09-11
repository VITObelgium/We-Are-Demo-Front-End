import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import { initializeEnvironment } from './environment-validate.mjs';
import * as angularJson from '../angular.json' with { type: 'json' };

config();

initializeEnvironment('.env.example');

const targetPath = resolve('./src/environments/environment.ts');
const envConfigFile = `
export const environment = {
  production: false,
  frontendUrl: "${process.env['PROTOCOL']}://${process.env['HOST']}:${process.env['PORT']}",
  backendUrl: "${process.env['BACKEND_URL']}"
};
`;
writeFileSync(targetPath, envConfigFile, { encoding: 'utf8' });
console.log('environment.ts has been updated');