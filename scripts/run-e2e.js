const path = require('path');
const { spawnSync } = require('child_process');
const cli = path.join('node_modules', '@playwright', 'test', 'cli.js');
const testArgs = ['test', ...process.argv.slice(2)];

function finish(result) {
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

if (process.platform === 'linux' && process.env.WSL_DISTRO_NAME) {
  const converted = spawnSync('wslpath', ['-w', process.cwd()], { encoding: 'utf8' });
  if (converted.status !== 0) finish(converted);
  const windowsCwd = converted.stdout.trim().replace(/'/g, "''");
  const extraArgs = process.argv.slice(2).map((arg) => "'" + arg.replace(/'/g, "''") + "'").join(' ');
  const command = [
    "$env:PLAYWRIGHT_USE_SYSTEM_CHROME='1'",
    "Set-Location -LiteralPath '" + windowsCwd + "'",
    "& 'C:\\Program Files\\nodejs\\node.exe' 'node_modules\\@playwright\\test\\cli.js' test " + extraArgs,
    'exit $LASTEXITCODE',
  ].join('; ');
  finish(spawnSync('powershell.exe', ['-NoProfile', '-Command', command], { stdio: 'inherit' }));
}

const env = {
  ...process.env,
  PLAYWRIGHT_USE_SYSTEM_CHROME: process.platform === 'win32' ? '1' : process.env.PLAYWRIGHT_USE_SYSTEM_CHROME,
};
finish(spawnSync(process.execPath, [cli, ...testArgs], { stdio: 'inherit', env }));
