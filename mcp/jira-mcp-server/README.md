# Jira MCP Server - AguaFress

Servidor MCP para conectar con Jira Cloud. Permite crear issues, buscar con JQL, y manage sprints.

## Requisitos

- Node.js v20+
- Jira Cloud con API token generado

## Instalación

```bash
cd mcp/jira-mcp-server
npm install
```

## Configuración

1. Copiar `.env.example` a `.env`:

```bash
cp .env.example .env
```

2. Editar `.env` con tus credenciales:

```
JIRA_HOST="burdilesricardo407-1770491380810.atlassian.net"
JIRA_EMAIL="tu-email@ejemplo.com"
JIRA_API_TOKEN="tu-token-aqui"
```

3. Obtener API token:
   - Ir a https://id.atlassian.com/manage-profile/security/api-tokens
   - Click "Create API token"
   - Nombralo "Jira-MCP-AguaFress"
   - Copiar el token

## Testlocal

```bash
node index.js
```

Debería mostrar: `Jira MCP Server is running`

## Configuración en Cursor/Claude Desktop

### macOS

Editar `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jira": {
      "command": "node",
      "args": ["/path/to/aguaFress/mcp/jira-mcp-server/index.js"],
      "env": {
        "JIRA_HOST": "burdilesricardo407-1770491380810.atlassian.net",
        "JIRA_EMAIL": "tu-email@ejemplo.com",
        "JIRA_API_TOKEN": "tu-token"
      }
    }
  }
}
```

### Windows

Editar `%APPDATA%\Claude\claude_desktop_config.json`

### Linux

Editar `~/.config/Claude/claude_desktop_config.json`

## Herramientas Disponibles

| Tool | Descripción |
|------|-------------|
| `getIssuesByJQL` | Buscar issues con JQL |
| `createIssue` | Crear nuevo issue |
| `getProjects` | Listar proyectos |
| `getProject` | Ver detalles de proyecto |
| `getSprints` | Ver sprints del board |
| `addIssueToSprint` | Agregar issue a sprint |
| `updateIssue` | Actualizar issue |
| `searchIssues` | Buscar con JQL |

## Uso desde Claude/Cursor

```
Create a Jira issue titled "DOC-01: README.md" in project AG with description "Como desarrollador, necesito un README para levantar el proyecto"
```

```
Show all stories in the backlog for project AG
```

```
Add AG-5 to Sprint 1
```