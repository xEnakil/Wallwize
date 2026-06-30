import { createRequire } from 'node:module';

const requireFrom = process.env.WALLWIZE_NODE_MODULES
  ? `${process.env.WALLWIZE_NODE_MODULES}/package.json`
  : import.meta.url;
const require = createRequire(requireFrom);
const { env, pipeline } = require('@huggingface/transformers');

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function configureEnvironment(payload) {
  env.useFSCache = true;
  env.cacheDir = payload.cacheDir || './.wallwize/models';
  env.allowRemoteModels = !payload.localOnly;
  env.allowLocalModels = true;
}

async function main() {
  const payload = JSON.parse(await readStdin());
  configureEnvironment(payload);

  const classifier = await pipeline(
    'zero-shot-image-classification',
    payload.modelId,
    { dtype: payload.dtype || 'q8' },
  );

  const results = [];
  try {
    for (const image of payload.images || []) {
      try {
        const labels = await classifier(image.path, payload.labels || []);
        results.push({ path: image.path, labels });
      } catch (error) {
        results.push({
          path: image.path,
          labels: [],
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    await classifier.dispose();
  }

  process.stdout.write(JSON.stringify({ results }));
}

main().catch(error => {
  process.stderr.write(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
