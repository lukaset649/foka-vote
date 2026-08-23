import { hashPassword } from '../lib/password.js';

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run admin:hash-password -w apps/api -- <password>');
  process.exit(1);
}

console.log(hashPassword(password));
