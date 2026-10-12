// Instalador de deploy: altera somente o virtual host público da Plaelo.
// Conserva uma cópia recuperável e só recarrega após nginx -t passar.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const target = fs.realpathSync('/etc/nginx/sites-enabled/plaelo');
if (!target.startsWith('/etc/nginx/')) throw new Error('Virtual host fora do diretório esperado.');
const snippet = '/etc/nginx/snippets/plaelo-public-seo.conf';
const source = path.join(__dirname, '../deploy/plaelo-public-seo.nginx.inc');
const original = fs.readFileSync(target, 'utf8');
const previousSnippet = fs.existsSync(snippet) ? fs.readFileSync(snippet, 'utf8') : null;
const include = '    include /etc/nginx/snippets/plaelo-public-seo.conf;';
const anchor = '    index index.html;';
if (!original.includes('server_name plaelo.com.br www.plaelo.com.br;') || !original.includes(anchor)) throw new Error('Configuração pública diferente do esperado; nenhuma alteração feita.');
const updated = original.includes(include) ? original : original.replace(anchor, `${anchor}\n${include}`);
const backup = `${target}.seo-${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
fs.copyFileSync(target, backup);
fs.mkdirSync(path.dirname(snippet), { recursive: true });
try {
  fs.copyFileSync(source, snippet);
  fs.writeFileSync(target, updated, 'utf8');
  execFileSync('nginx', ['-t'], { stdio: 'inherit' });
  execFileSync('systemctl', ['reload', 'nginx'], { stdio: 'inherit' });
  console.log(`SEO público ativado. Backup: ${backup}`);
} catch (error) {
  fs.writeFileSync(target, original, 'utf8');
  if (previousSnippet !== null) fs.writeFileSync(snippet, previousSnippet, 'utf8');
  execFileSync('nginx', ['-t'], { stdio: 'inherit' });
  execFileSync('systemctl', ['reload', 'nginx'], { stdio: 'inherit' });
  throw error;
}
