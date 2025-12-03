FROM python:3.11-alpine

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY exporter.py .
RUN chmod +x exporter.py

EXPOSE 8001

CMD ["python", "-u", "exporter.py"]
