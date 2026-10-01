# Render ne parvient pas à tirer minio/minio via son mode "Existing Image"
# (erreur "No public image found" même pour une image publique Docker Hub) —
# on redéploie donc MinIO en mode Git+Dockerfile, exactement comme le
# gateway (infra/nginx/Dockerfile), qui lui fonctionne de façon fiable.
FROM minio/minio:latest

CMD ["server", "/data", "--console-address", ":9001"]
