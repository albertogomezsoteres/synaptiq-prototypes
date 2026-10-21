FROM python:3.12-slim
WORKDIR /app
COPY server.py build.py ./
COPY src ./src
COPY assets ./assets
RUN python build.py
ENV PORT=8000 DATA_DIR=/data PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["python", "server.py"]
