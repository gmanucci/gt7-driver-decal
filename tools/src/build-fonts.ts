import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { FONTS_OUTPUT_DIR } from './config.ts';
import { buildFont } from './font-builder.ts';

interface FontSource {
  id: string;
  name: string;
  /** npm package that ships the OFL-licensed font files. */
  packageName: string;
  /** File inside the package's `files/` directory (WOFF; opentype.js cannot read WOFF2). */
  file: string;
  weight: number;
  description: string;
}

const SOURCES: FontSource[] = [
  {
    id: 'orbitron',
    name: 'Orbitron',
    packageName: '@fontsource/orbitron',
    file: 'orbitron-latin-700-normal.woff',
    weight: 700,
    description: 'Wide geometric sci-fi lettering',
  },
  {
    id: 'rajdhani',
    name: 'Rajdhani',
    packageName: '@fontsource/rajdhani',
    file: 'rajdhani-latin-700-normal.woff',
    weight: 700,
    description: 'Compact squared motorsport lettering',
  },
  {
    id: 'saira',
    name: 'Saira',
    packageName: '@fontsource/saira',
    file: 'saira-latin-700-normal.woff',
    weight: 700,
    description: 'Sporty extended lettering',
  },
];

const require = createRequire(import.meta.url);
let failed = false;

for (const source of SOURCES) {
  const packageDir = dirname(require.resolve(`${source.packageName}/package.json`));
  const packageJson = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
  const bytes = readFileSync(join(packageDir, 'files', source.file));
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

  const built = buildFont({ id: source.id, name: source.name, data });
  const directory = join(FONTS_OUTPUT_DIR, source.id);
  mkdirSync(directory, { recursive: true });

  writeFileSync(join(directory, 'font.json'), JSON.stringify(built.font) + '\n');
  writeFileSync(
    join(directory, 'metadata.json'),
    JSON.stringify(
      {
        id: source.id,
        name: source.name,
        description: source.description,
        weight: source.weight,
        license: packageJson.license,
        source: `${source.packageName}@${packageJson.version}`,
        glyphCount: Object.keys(built.font.glyphs).length,
        kerningPairs: built.kerningPairs,
        missingCharacters: built.missing,
      },
      null,
      2,
    ) + '\n',
  );
  copyFileSync(join(packageDir, 'LICENSE'), join(directory, 'LICENSE.txt'));

  console.log(
    `${source.id}: ${Object.keys(built.font.glyphs).length} glyphs, avg ${built.pathBytes.average.toFixed(0)} B / max ${built.pathBytes.max} B per path, ${built.kerningPairs} kerning pairs` +
      (built.missing.length ? `, missing: ${built.missing.join('')}` : ''),
  );
  if (!packageJson.license?.includes('OFL')) {
    console.error(`  unexpected license: ${packageJson.license}`);
    failed = true;
  }
}

if (failed) process.exitCode = 1;
