# MCP Integration Guide

## Overview

CyberMem включает MCP (Model Context Protocol) сервер, который позволяет Claude Code использовать OpenMemory как долгосрочную память для сохранения контекста между сессиями.

## Архитектура

```
┌─────────────┐         MCP          ┌──────────────────┐        HTTP        ┌─────────────┐
│ Claude Code │ ◄─────────────────► │ OpenMemory MCP   │ ◄──────────────► │ OpenMemory  │
│             │      stdio/JSON       │ Server (Python)  │     REST API       │ Container   │
└─────────────┘                       └──────────────────┘                    └─────────────┘
                                              │
                                              ▼
                                        Grafana Dashboard
                                    (Audit Trail Monitoring)
```

## Возможности MCP сервера

### 1. add_memory
Сохранение информации в долгосрочной памяти.

**Пример:**
```
User: Запомни, что production API key - xyz-123-prod

Claude: [Использует add_memory tool]
✅ Memory stored successfully!
ID: 4176b276-8e26-41aa-9219-3b0f88998e50
Chunks: 1
Sectors: semantic
```

### 2. search_memory
Семантический поиск по сохраненным воспоминаниям.

**Пример:**
```
User: Какой у нас production API key?

Claude: [Использует search_memory tool]
🔍 Found 1 memory:

Result 1 (score: 0.95, sector: semantic)
production API key - xyz-123-prod
```

### 3. list_memories
Просмотр последних сохраненных воспоминаний.

**Пример:**
```
User: Покажи что ты запомнил

Claude: [Использует list_memories tool]
📋 Recent memories (5):

1. [semantic] production API key - xyz-123-prod
2. [semantic] User prefers burgundy/teal color scheme
3. [semantic] Main focus: audit trail for data access
...
```

## Установка

### 1. Установить зависимости

```bash
cd /Users/mikhailkogan/cybermem/mcp_server
uv venv --python 3.11
uv pip install mcp httpx
```

### 2. Проверить конфигурацию

Файл `.mcp.json` уже настроен в корне проекта:

```json
{
  "mcpServers": {
    "openmemory": {
      "command": "/Users/mikhailkogan/cybermem/mcp_server/.venv/bin/python",
      "args": [
        "/Users/mikhailkogan/cybermem/mcp_server/openmemory_mcp.py"
      ],
      "env": {
        "OPENMEMORY_URL": "http://localhost/memory",
        "OPENMEMORY_API_KEY": "dev-secret-key"
      }
    }
  }
}
```

### 3. Запустить тестирование

```bash
cd /Users/mikhailkogan/cybermem/mcp_server
.venv/bin/python test_mcp.py
```

Ожидаемый результат:
```
============================================================
OpenMemory MCP Server - Integration Test
============================================================

🧪 Test 1: Adding memory...
✅ Memory added successfully!

🧪 Test 2: Searching memory...
✅ Found 3 memories:

============================================================
✅ Integration test completed!
============================================================
```

### 4. Перезапустить Claude Code

После настройки перезапустите Claude Code, чтобы MCP сервер был загружен.

## Мониторинг

Все операции с памятью через MCP логируются и видны в Grafana dashboard:

**URL:** http://localhost:3000/d/cybermem-memory

**Что можно отслеживать:**
- Какие клиенты (Claude Code через MCP) обращались к памяти
- Какие операции выполнялись (add, query)
- Время отклика
- Статусы запросов (успех/ошибки)
- Audit trail: КТО, КОГДА, ЧТО

## Использование в Claude Code

После настройки MCP сервер автоматически доступен Claude Code:

```
User: Помни что я предпочитаю burgundy/teal цветовую схему

Claude: ✅ Запомнил! Сохранил в долгосрочную память:
- Цветовая схема: burgundy/teal

[В следующей сессии]

User: Какие цвета мне нравятся?

Claude: 🔍 Из памяти: вы предпочитаете burgundy/teal цветовую схему.
```

## Технические детали

### Протокол
- **Transport:** stdio (standard input/output)
- **Format:** JSON-RPC 2.0
- **Authentication:** Bearer token через OpenMemory API

### API Endpoints
- `POST /memory/add` - Добавить память
- `POST /memory/query` - Поиск памяти
- Параметры:
  - `query` - поисковый запрос
  - `k` - количество результатов
  - Ответ: `{"query": "...", "matches": [...]}`

### Секторы памяти (OpenMemory HSG)
- **semantic** - Семантическая информация (факты, знания)
- **episodic** - Эпизодическая память (события)
- **procedural** - Процедурная память (как делать)
- **emotional** - Эмоциональный контекст
- **reflective** - Рефлексивные заметки

## Troubleshooting

### MCP server not loading
1. Проверьте Python версию: `python3 --version` (требуется >=3.10)
2. Проверьте путь в `.mcp.json`
3. Проверьте логи Claude Code

### Connection refused
1. Убедитесь что OpenMemory запущен: `docker-compose ps`
2. Проверьте `OPENMEMORY_URL` в `.mcp.json`
3. Проверьте Traefik routing

### No data in searches
1. Добавьте тестовые данные: `python test_mcp.py`
2. Проверьте Grafana - есть ли запросы
3. Проверьте API key

## Следующие шаги

1. **Персистентность памяти** - OpenMemory использует SQLite/PostgreSQL для хранения
2. **Multi-user support** - добавить `user_id` для разграничения пользователей
3. **Memory consolidation** - периодическая консолидация и очистка старых воспоминаний
4. **Enhanced search** - фильтры по секторам, временным диапазонам
5. **Memory reinforcement** - укрепление важных воспоминаний через повторный доступ

## Security

- ⚠️ **Dev mode:** API key `dev-secret-key` только для разработки
- 🔒 **Production:** Используйте secure API keys и HTTPS
- 🔐 **Authentication:** OpenMemory проверяет Bearer token
- 📊 **Audit:** Все операции логируются в Grafana
