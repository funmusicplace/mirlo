FROM minio/minio:latest

COPY entrypoint.sh /opt/render/entrypoint.sh
RUN chmod +x /opt/render/entrypoint.sh

ENTRYPOINT ["/opt/render/entrypoint.sh"]