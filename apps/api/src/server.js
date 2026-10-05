import { createApp } from './app.js';
import { getContainer } from './container.js';

const port = Number.parseInt(process.env.PORT ?? '4000', 10);
const container = getContainer();
const app = createApp();

app.listen(port, () => {
  const status = container.services.demo.status();
  console.log(`Homestay API listening on http://localhost:${port}/api/v1`);
  console.log(`Demo data seeded (version ${status.seedVersion}, anchor ${status.anchorDate}, instance ${status.instanceId})`);
  if (container.config.usingDemoSecret) {
    console.warn('AUTH_TOKEN_SECRET not set - using the built-in demo signing secret.');
  }
});
