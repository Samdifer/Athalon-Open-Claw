import { defineConfig, devices } from '@playwright/test';
import path from 'path';
const AUTH_FILE = path.join(__dirname, 'playwright/.auth/user.json');
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: 'line',
  timeout: 45000,
  use: { baseURL: 'http://localhost:3000', trace: 'off' },
  projects: [{
    name: 'chromium-authenticated',
    use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
  }],
});