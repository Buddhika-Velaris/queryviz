import kleur from 'kleur';
import ora from 'ora';
import { analyzeSingle, ApiError } from '../lib/api.js';
import { loadConfig } from '../lib/config.js';
import { readPlanFile } from '../lib/io.js';
import { renderSingle } from '../lib/render.js';

export interface UploadOptions {
  file: string;
  apiUrl?: string;
}

export async function uploadCommand(options: UploadOptions): Promise<void> {
  const config = loadConfig({ apiUrl: options.apiUrl });
  const plan = await readPlanFile(options.file);

  const spinner = ora('Analyzing with QueryViz…').start();
  try {
    const result = await analyzeSingle(config.apiUrl, plan);
    spinner.succeed('Analysis complete');
    console.log(renderSingle(result));
    console.log(kleur.gray(`Processed in ${result.metadata.processingTime}ms`));
  } catch (err) {
    spinner.fail('Analysis failed');
    if (err instanceof ApiError) {
      const detail = err.details ? ` (${err.details})` : '';
      throw new Error(`${err.message}${detail}`);
    }
    throw err;
  }
}
