/**
 * Assertions over the pure parts of each provider: format detection, token kind,
 * verdict grading and finding generation. Bundled with esbuild so the TypeScript
 * runs under plain node with no test framework.
 *
 *   npm test
 */
import { build } from 'esbuild';

let pass = 0;
let fail = 0;

const eq = (name, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) {
    pass++;
    return;
  }
  fail++;
  console.log(`FAIL ${name}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`);
};
const S = (...xs) => new Set(xs);

async function load(entry) {
  const out = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    alias: { '@': './src' },
    logLevel: 'silent',
  });
  return import(
    'data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64')
  );
}

// --- GitHub ----------------------------------------------------------------
{
  const { _internal: gh } = await load('src/providers/github.ts');
  const { detect, describeKind, buildVerdict, buildFindings, buildPermissions, gistLabel } = gh;

  eq('gh detect classic', detect('ghp_' + 'A'.repeat(36)), true);
  eq('gh detect fine-grained', detect('github_pat_11ABC_xyz'), true);
  eq('gh detect legacy 40hex', detect('a'.repeat(40)), true);
  eq('gh reject hf', detect('hf_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'), false);
  eq('gh reject glpat', detect('glpat-AAAAAAAAAAAAAAAAAAAA'), false);
  eq('gh reject junk', detect('not-a-token'), false);

  eq('gh ghp is classic', describeKind('ghp_x', true).fineGrained, false);
  eq('gh pat is fine-grained', describeKind('github_pat_x', false).fineGrained, true);
  eq('gh ghs is fine-grained', describeKind('ghs_x', false).fineGrained, true);
  eq('gh no header => fg', describeKind('weird', false).fineGrained, true);

  eq('gh no scopes', buildVerdict(S(), false).level, 'contained');
  eq('gh read only', buildVerdict(S('read:org', 'read:user'), false).level, 'contained');
  eq('gh repo', buildVerdict(S('repo'), false).level, 'elevated');
  eq('gh workflow', buildVerdict(S('workflow'), false).level, 'elevated');
  eq('gh admin:org', buildVerdict(S('repo', 'admin:org'), false).level, 'total');
  eq('gh delete_repo', buildVerdict(S('delete_repo'), false).level, 'total');
  eq('gh ssh key', buildVerdict(S('write:public_key'), false).level, 'total');
  eq('gh fine-grained', buildVerdict(S(), true).level, 'info');

  const takeover = buildVerdict(S('repo', 'delete_repo'), false);
  eq('gh takeover wins', takeover.headline, 'Can take over the account');
  eq('gh names the scope', takeover.summary.includes('`delete_repo`'), true);

  const ghTitles = (scopes, fg = false, sso = null) =>
    buildFindings(scopes, fg, sso).map((f) => f.title);
  eq('gh expiry noted', ghTitles(S()).includes('Expiry cannot be read'), true);
  eq('gh empty is good', ghTitles(S()).includes('No scopes granted'), true);
  eq('gh repo finding', ghTitles(S('repo')).includes('Reaches every private repository'), true);
  eq('gh workflow finding', ghTitles(S('workflow')).includes('Can change CI workflows'), true);
  eq(
    'gh persistence',
    ghTitles(S('admin:public_key')).includes('Can plant credentials that outlive the token'),
    true
  );
  eq('gh sso finding', ghTitles(S('repo'), false, 'required').includes('SAML authorization required'), true);
  eq('gh no sso finding', ghTitles(S('repo'), false, null).includes('SAML authorization required'), false);
  eq('gh fg cannot list', ghTitles(S(), true).includes('Permissions cannot be listed'), true);
  eq('gh fg has no "no scopes"', ghTitles(S(), true).includes('No scopes granted'), false);

  const ghOrdered = buildFindings(S('repo', 'admin:org', 'gist'), false, null);
  eq('gh most severe first', ghOrdered[0].level, 'total');
  eq('gh info last', ghOrdered[ghOrdered.length - 1].level, 'info');

  const ghPerms = buildPermissions(S('repo'));
  const ghGet = (label) => ghPerms.find((p) => p.label === label).allowed;
  eq('gh repo reads', ghGet('Read private repositories'), true);
  eq('gh repo writes', ghGet('Write to private repositories'), true);
  eq('gh repo risky', ghPerms.find((p) => p.label === 'Write to private repositories').risky, true);
  eq('gh repo not delete', ghGet('Delete repositories'), false);
  eq('gh repo not admin', ghGet('Administer organizations'), false);
  eq(
    'gh public_repo only',
    buildPermissions(S('public_repo')).find((p) => p.label === 'Read private repositories').allowed,
    false
  );

  eq('gh gist first file', gistLabel({ id: 'abc', files: { 'env.sh': {}, 'b.txt': {} } }), 'env.sh');
  eq('gh gist description', gistLabel({ id: 'abc', description: 'notes' }), 'notes');
  eq('gh gist id', gistLabel({ id: 'abc' }), 'abc');
  eq('gh gist empty files', gistLabel({ id: 'abc', files: {}, description: null }), 'abc');

  const gistFinding = buildFindings(S('gist'), false, null).find((f) => f.title.includes('gist'));
  eq('gh gist finding exists', Boolean(gistFinding), true);
  eq('gh gist elevated', gistFinding.level, 'elevated');
  eq('gh gist says unlisted', gistFinding.detail.includes('unlisted'), true);
}

// --- GitLab ----------------------------------------------------------------
{
  const { _internal: gl } = await load('src/providers/gitlab.ts');
  const { detect, opaqueKind, describeKind, buildVerdict, buildFindings, buildPermissions, toScopeEntries } = gl;
  const ALIVE = { revoked: false, expired: false, inactive: false };

  eq('gl detect glpat', detect('glpat-AAAAAAAAAAAAAAAAAAAA'), true);
  eq('gl detect deploy', detect('gldt-xxxx'), true);
  eq('gl detect runner', detect('glrt-xxxx'), true);
  eq('gl detect job', detect('glcbt-xxxx'), true);
  eq('gl detect agent', detect('glagent-xxxx'), true);
  eq('gl reject hf', detect('hf_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'), false);
  eq('gl reject ghp', detect('ghp_' + 'A'.repeat(36)), false);

  eq('gl glpat not opaque', opaqueKind('glpat-x'), null);
  eq('gl deploy opaque', opaqueKind('gldt-x'), 'deploy token');
  eq('gl runner opaque', opaqueKind('glrt-x'), 'runner authentication token');

  eq('gl project bot', describeKind({ username: 'project_1234_bot_abc' }), 'Project access token');
  eq('gl group bot', describeKind({ username: 'group_99_bot_xyz' }), 'Group access token');
  eq('gl human', describeKind({ username: 'devang' }), 'Personal access token');
  eq('gl other bot', describeKind({ username: 'some_bot', bot: true }), 'Bot account token');
  eq('gl no user', describeKind(null), 'Access token');

  eq('gl revoked beats scopes', buildVerdict(S('api'), { ...ALIVE, revoked: true }, []).level, 'breach');
  eq('gl expired', buildVerdict(S('api'), { ...ALIVE, expired: true }, []).level, 'breach');
  eq('gl inactive', buildVerdict(S('api'), { ...ALIVE, inactive: true }, []).level, 'breach');
  eq('gl sudo', buildVerdict(S('sudo'), ALIVE, []).level, 'total');
  eq('gl admin_mode', buildVerdict(S('admin_mode'), ALIVE, []).level, 'total');
  eq('gl sudo over api', buildVerdict(S('api', 'sudo'), ALIVE, []).headline, 'Can act as any user');
  eq('gl api', buildVerdict(S('api'), ALIVE, []).level, 'elevated');
  eq('gl runner', buildVerdict(S('create_runner'), ALIVE, []).level, 'elevated');
  eq('gl write_repo', buildVerdict(S('write_repository'), ALIVE, []).level, 'elevated');
  eq('gl read only', buildVerdict(S('read_api', 'read_user'), ALIVE, []).level, 'contained');
  eq('gl no scopes', buildVerdict(S(), ALIVE, []).level, 'contained');

  const groupScope = toScopeEntries([{ group_id: 7, permissions: ['read_code'] }]);
  const projScope = toScopeEntries([{ project_id: 42, permissions: ['read_code'] }]);
  eq('gl group target', groupScope[0].target, 'account');
  eq('gl project target', projScope[0].target, 'repository');
  eq('gl group verdict', buildVerdict(S(), ALIVE, groupScope).headline, 'Covers a whole group');
  eq('gl project verdict', buildVerdict(S(), ALIVE, projScope).headline, 'Scoped to 1 project');
  eq(
    'gl granular write escalates',
    buildVerdict(S(), ALIVE, toScopeEntries([{ project_id: 1, permissions: ['write_code'] }])).level,
    'elevated'
  );
  eq('gl granular read contained', buildVerdict(S(), ALIVE, projScope).level, 'contained');

  const glTitles = (scopes, self = {}, granular = [], expired = false) =>
    buildFindings(scopes, { expires_at: '2030-01-01', ...self }, granular, expired).map((f) => f.title);
  eq('gl sudo finding', glTitles(S('sudo')).includes('Can impersonate any user'), true);
  eq('gl api finding', glTitles(S('api')).includes('Full API access across the account'), true);
  eq('gl runner finding', glTitles(S('manage_runner')).includes('Can create or manage CI runners'), true);
  eq('gl registry push', glTitles(S('write_registry')).includes('Can push container images'), true);
  eq('gl k8s', glTitles(S('k8s_proxy')).includes('Reaches Kubernetes through the GitLab agent'), true);
  eq('gl self_rotate', glTitles(S('self_rotate')).includes('Can rotate itself'), true);
  eq('gl no expiry', glTitles(S('api'), { expires_at: null }).includes('No expiry set'), true);
  eq('gl expiry set', glTitles(S('api')).includes('No expiry set'), false);
  eq('gl revoked finding', glTitles(S('api'), { revoked: true }).includes('Token is revoked'), true);
  eq(
    'gl ips finding',
    glTitles(S('api'), { last_used_ips: ['1.2.3.4'] }).includes('Recently used from these addresses'),
    true
  );
  eq('gl group granular finding', glTitles(S(), {}, groupScope).includes('A granular scope covers a whole group'), true);
  eq('gl project granular good', glTitles(S(), {}, projScope).includes('Granular scopes in use'), true);
  eq(
    'gl severity ordered',
    buildFindings(S('sudo', 'api', 'self_rotate'), { expires_at: null }, [], false)[0].level,
    'total'
  );

  const glPerm = (scopes, label) => buildPermissions(scopes).find((x) => x.label === label);
  eq('gl api reads', glPerm(S('api'), 'Read the API').allowed, true);
  eq('gl api writes', glPerm(S('api'), 'Write through the API').allowed, true);
  eq('gl api pushes', glPerm(S('api'), 'Push to repositories').allowed, true);
  eq('gl read_api no write', glPerm(S('read_api'), 'Write through the API').allowed, false);
  eq('gl read_api reads', glPerm(S('read_api'), 'Read the API').allowed, true);
  eq('gl sudo risky', glPerm(S('sudo'), 'Act as any user').risky, true);
  eq('gl self_rotate risky', glPerm(S('self_rotate'), 'Rotate itself').risky, true);
  eq('gl duo not risky', glPerm(S('ai_features'), 'Use GitLab Duo').risky, undefined);
}

// --- Registry --------------------------------------------------------------
{
  const { PROVIDERS, detectProvider } = await load('src/providers/index.ts');
  eq('registry has three', PROVIDERS.length, 3);
  eq('every provider documents endpoints', PROVIDERS.every((p) => p.docs.endpoints.length > 0), true);
  eq('every provider documents limits', PROVIDERS.every((p) => p.docs.limits.length > 0), true);
  eq('every provider advertises a format', PROVIDERS.every((p) => p.formats.length > 0), true);
  eq('hf routes to huggingface', detectProvider('hf_abc').id, 'huggingface');
  eq('ghp routes to github', detectProvider('ghp_' + 'A'.repeat(36)).id, 'github');
  eq('glpat routes to gitlab', detectProvider('glpat-abc').id, 'gitlab');
  eq('junk routes nowhere', detectProvider('nonsense'), null);
}

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
