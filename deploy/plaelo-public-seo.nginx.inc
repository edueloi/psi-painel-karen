# Incluído somente no bloco HTTPS do site plaelo.com.br.
# O painel continua usando o index.html privado; estas páginas têm HTML próprio.
if ($host = www.plaelo.com.br) { return 301 https://plaelo.com.br$request_uri; }
location = / {
    try_files /public-pages/home.html =404;
    add_header Cache-Control "no-cache";
}
location = /encontrar-psicologo { return 301 /encontrar-profissional$is_args$args; }
location ~ ^/(funcionalidades|planos|sobre|cadastro|encontrar-profissional|termos-de-uso|politica-privacidade)$ {
    try_files /public-pages$uri.html =404;
    add_header Cache-Control "no-cache";
}
location ~ ^/(funcionalidades|planos|sobre|cadastro|encontrar-profissional|termos-de-uso|politica-privacidade)/+$ {
    rewrite ^/(.*?)/+$ /$1 permanent;
}
location ~ ^/p/[^/]+/?$ {
    proxy_pass http://localhost:3013;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
