import 'dotenv/config';
import { launchGame } from './launchGame.js';
import { createDriver } from './createDriver.js';

const main = async (): Promise<void> => {
  const baseUrl = process.env.BASE_URL;
  if (!baseUrl) {
    throw new Error('BASE_URL is not set. Create .env from env.example');
  }

  const driver = await createDriver();
  try {
    const result = await launchGame(driver, baseUrl);
    console.log('Game result:', result);
  } finally {
    // await driver.quit();
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});

