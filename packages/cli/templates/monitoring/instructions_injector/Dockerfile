FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY injector.py .

ENV UPSTREAM_URL=http://openmemory:8080
ENV PORT=8081

EXPOSE 8081

CMD ["gunicorn", "-b", "0.0.0.0:8081", "-w", "2", "injector:app"]
