// Publica en producción lo que está en develop (o en la rama indicada).
// Uso:  npm run desplegar            → integra develop en test y la sube
//       npm run desplegar -- <rama>  → integra otra rama en test
//
// Subir la rama `test` dispara el workflow "Desplegar" de GitHub Actions, que
// verifica, construye la imagen Docker, la publica en GHCR y la despliega en
// Render sin preguntar (ver .github/workflows/desplegar.yml y docs/DESPLIEGUE.md).
import { execFileSync } from 'node:child_process';

const origen = process.argv[2] ?? 'develop';
const DESTINO = 'test';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const paso = (texto) => console.log(`\n→ ${texto}`);

function fallar(mensaje) {
  console.error(`\n✗ ${mensaje}`);
  process.exit(1);
}

const ramaInicial = git('branch', '--show-current');

if (git('status', '--porcelain', '--untracked-files=no')) {
  fallar('Hay cambios sin commitear. Commitealos o guardalos (git stash) antes de desplegar.');
}

try {
  paso('Trayendo los cambios de GitHub');
  git('fetch', 'origin', '--prune');

  paso(`Actualizando ${origen}`);
  git('switch', origen);
  if (git('ls-remote', '--heads', 'origin', origen)) git('merge', '--ff-only', `origin/${origen}`);
  git('push', 'origin', origen);

  paso(`Integrando ${origen} en ${DESTINO}`);
  const existeLocal = git('branch', '--list', DESTINO);
  const existeRemota = git('ls-remote', '--heads', 'origin', DESTINO);
  if (existeLocal) git('switch', DESTINO);
  else if (existeRemota) git('switch', '-c', DESTINO, '--track', `origin/${DESTINO}`);
  else git('switch', '-c', DESTINO, origen);
  if (existeRemota) git('merge', '--ff-only', `origin/${DESTINO}`);
  git('merge', '--no-ff', origen, '-m', `merge: ${origen} en ${DESTINO}`);

  paso(`Subiendo ${DESTINO}: GitHub Actions despliega a producción`);
  git('push', '-u', 'origin', DESTINO);
} catch (error) {
  console.error(error.stderr?.toString() || error.message);
  fallar('El despliegue se detuvo. Nada se publicó después del paso que falló.');
} finally {
  if (ramaInicial && git('branch', '--show-current') !== ramaInicial) git('switch', ramaInicial);
}

const remoto = git('remote', 'get-url', 'origin').replace(/\.git$/, '').replace(/^git@github\.com:/, 'https://github.com/');
console.log(`\n✓ Listo. Seguí el avance en ${remoto}/actions/workflows/desplegar.yml`);
