# Perde sitesi: derlenmiş statik dosyalar + nginx (yetkisiz kullanıcı, 8080). Sürüm sabit, elle güncellenir.
FROM nginxinc/nginx-unprivileged:1.30.1-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/ /usr/share/nginx/html/
