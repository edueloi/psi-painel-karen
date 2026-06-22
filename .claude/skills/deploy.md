# /deploy — Deploy PsiFlux na VPS

Quando o usuário invocar `/deploy`, execute IMEDIATAMENTE os passos abaixo sem pedir confirmação:

1. **git push**: `git push origin main`
2. **Deploy na VPS** via plink:
   ```powershell
   & "$env:USERPROFILE\tools\plink.exe" -batch -ssh -no-antispoof -hostkey "SHA256:LONqE9f+BvMJqJ4J5eWPfkoT4mwg3HxReDa9UaLWXbk" root@72.62.8.195 -pw 'Edu@06051992' "cd /var/www/psiflux && git pull && npm install && npm run build && cd backend && npm install && pm2 restart psiflux psiflux-bot && echo DEPLOY_OK"
   ```
3. Confirme se apareceu `DEPLOY_OK` nos logs. Se sim, informe o usuário que o deploy foi concluído.

## Variações

- `/deploy migrate` — adicionar `&& node migrate.js && node patch_database.js && node patch_products_packages.js` antes do `pm2 restart`
- `/deploy logs` — executar apenas `pm2 logs psiflux --lines 100 --nostream` na VPS
- `/deploy status` — executar apenas `pm2 list` na VPS

## Contexto

- VPS: `72.62.8.195`, usuário `root`
- plink em: `%USERPROFILE%\tools\plink.exe`  
- Hostkey: `SHA256:LONqE9f+BvMJqJ4J5eWPfkoT4mwg3HxReDa9UaLWXbk`
- Projeto: `/var/www/psiflux` (frontend) + `/var/www/psiflux/backend` (API Node.js)
- PM2: processos `psiflux` (API) e `psiflux-bot` (fila de notificações)
