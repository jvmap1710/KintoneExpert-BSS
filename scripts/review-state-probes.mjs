// Diagnostic probes: report current defects; do not change customer workspaces.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { bootstrapState, saveState, validateProject, replaceTableValue } from './lib/project-state.mjs';

await mkdir('.tmp', { recursive: true });
const root = await mkdtemp(path.resolve('.tmp', 'state-review-'));
try {
  const project = path.join(root, 'projects', 'probe');
  await mkdir(project, { recursive: true });
  await writeFile(path.join(project, 'PROJECT.md'), '# Probe\n');
  for (const dir of ['input', 'private', 'analysis', 'output', 'history']) {
    await mkdir(path.join(project, dir));
  }
  await writeFile(path.join(project, 'TEAM-NOTES.md'), '# Notes\n');
  const state = await bootstrapState(root, {
    slug: 'probe', projectType: 'analysis', entryRoute: 'discovery-intake',
    displayName: 'Probe', objective: 'Review only',
  });
  assert.deepEqual(await validateProject(root, 'probe'), []);
  const literal = 'literal $&';
  const rendered = replaceTableValue('| Objective | old |', 'Objective', literal);
  console.log(JSON.stringify({ probe: 'literal-dollar-replacement', defect: rendered !== `| Objective | ${literal} |`, rendered }));
  await rm(path.join(project, 'PROJECT.md'));
  const before = JSON.parse(await readFile(path.join(project, '.ke-project.json')));
  try { await saveState(root, { ...state, objective: 'Failed write' }); } catch {}
  const after = JSON.parse(await readFile(path.join(project, '.ke-project.json')));
  console.log(JSON.stringify({ probe: 'partial-state-commit', defect: after.revision !== before.revision }));
  try {
    await validateProject(root, 'probe');
    console.log('missing-markdown: returned diagnostics');
  } catch (error) { console.log(JSON.stringify({ probe: 'missing-markdown-validator', defect: true, code: error.code })); }
} finally {
  await rm(root, { recursive: true, force: true });
}
