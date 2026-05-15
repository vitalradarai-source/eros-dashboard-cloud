#!/usr/bin/env node
// Hash a password for the DASHBOARD_PASSWORD_HASH env var.
// Usage: node scripts/hash-password.mjs <password>
import { randomBytes, pbkdf2Sync } from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs <password>');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const iterations = 100000;
const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');

console.log(`DASHBOARD_PASSWORD_HASH=${salt}$${iterations}$${hash}`);
console.log('');
console.log('Copy that value into the Cloudflare Pages environment variable.');
