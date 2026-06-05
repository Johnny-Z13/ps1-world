import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const MESHY_API_BASE = 'https://api.meshy.ai/openapi/v2/text-to-3d';
const DEFAULT_PROMPT = [
  'low-poly golden goblet trophy game prop',
  'PlayStation 1 early PlayStation 2 style',
  'chunky faceted silhouette',
  'simple gold material with low resolution pixel texture',
  'no text, no base, no background, game-ready collectible',
].join(', ');

const options = parseArgs(process.argv.slice(2));
const prompt = options.prompt ?? DEFAULT_PROMPT;
const output = options.output ?? 'assets/models/props/meshy-golden-goblet.glb';
const texturePrompt = options.texturePrompt ?? [
  'flat low resolution pixel-art gold texture',
  'simple darker orange shadow patches',
  'PS1 game prop texture',
].join(', ');
const pollMs = Number(options.pollMs ?? 10000);
const timeoutMs = Number(options.timeoutMs ?? 12 * 60 * 1000);

const apiKey = await getMeshyApiKey();
const previewId = await createTask({
  mode: 'preview',
  prompt,
  model_type: 'lowpoly',
  target_formats: ['glb'],
});
console.log(`Meshy preview task: ${previewId}`);
await waitForTask(previewId, { pollMs, timeoutMs });

const refineId = await createTask({
  mode: 'refine',
  preview_task_id: previewId,
  target_formats: ['glb'],
  enable_pbr: false,
  hd_texture: false,
  texture_prompt: texturePrompt,
});
console.log(`Meshy refine task: ${refineId}`);
const refined = await waitForTask(refineId, { pollMs, timeoutMs });

if (!refined.model_urls?.glb) {
  throw new Error(`Meshy refine task ${refineId} did not return a GLB URL.`);
}

const outputPath = path.resolve(output);
await mkdir(path.dirname(outputPath), { recursive: true });
const glb = await fetch(refined.model_urls.glb);
if (!glb.ok) {
  throw new Error(`Could not download Meshy GLB: ${glb.status} ${glb.statusText}`);
}
await writeFile(outputPath, Buffer.from(await glb.arrayBuffer()));
console.log(`Saved ${outputPath}`);

async function createTask(body) {
  const response = await fetch(MESHY_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(`Meshy create task failed: ${response.status} ${JSON.stringify(payload)}`);
  }
  if (!payload.result) {
    throw new Error(`Meshy create task response did not include a result id: ${JSON.stringify(payload)}`);
  }
  return payload.result;
}

async function waitForTask(id, { pollMs, timeoutMs }) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const response = await fetch(`${MESHY_API_BASE}/${id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const task = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(`Meshy task lookup failed: ${response.status} ${JSON.stringify(task)}`);
    }

    console.log(`Meshy ${id}: ${task.status} ${task.progress ?? 0}%`);
    if (task.status === 'SUCCEEDED') return task;
    if (task.status === 'FAILED' || task.status === 'CANCELED') {
      throw new Error(`Meshy task ${id} ended as ${task.status}: ${JSON.stringify(task.task_error ?? {})}`);
    }
    await sleep(pollMs);
  }
  throw new Error(`Timed out waiting for Meshy task ${id}.`);
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

async function getMeshyApiKey() {
  const env = await readEnvFile('.env');
  const key = process.env.MESHY_API_KEY ?? env.MESHY_API_KEY;
  if (!key) {
    throw new Error('MESHY_API_KEY is not set in the environment or .env.');
  }
  return key;
}

async function readEnvFile(filePath) {
  try {
    const text = await readFile(filePath, 'utf8');
    return Object.fromEntries(text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        if (separator === -1) return [line, ''];
        const key = line.slice(0, separator).trim();
        const rawValue = line.slice(separator + 1).trim();
        return [key, rawValue.replace(/^["']|["']$/g, '')];
      }));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith('--')) continue;

    const [key, inlineValue] = arg.slice(2).split('=');
    parsed[toCamelCase(key)] = inlineValue ?? args[index + 1];
    if (inlineValue === undefined) index += 1;
  }
  return parsed;
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
