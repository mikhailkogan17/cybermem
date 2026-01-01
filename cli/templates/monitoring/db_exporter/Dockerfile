FROM python:3.11-alpine

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy exporter script
COPY exporter.py .

# Make script executable
RUN chmod +x exporter.py

# Expose Prometheus metrics port
EXPOSE 8000

# Run exporter
CMD ["python", "-u", "exporter.py"]
