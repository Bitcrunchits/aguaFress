import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Version3Client } from 'jira.js';
import * as z from 'zod';

// Initialize Jira client
const jira = new Version3Client({
  host: process.env.JIRA_HOST,
  authentication: {
    basic: {
      email: process.env.JIRA_EMAIL,
      apiToken: process.env.JIRA_API_TOKEN,
    },
  },
});

// Create the MCP server
const server = new McpServer({
  name: 'jira-mcp',
  version: '1.0.0',
});

// Tool: Get issues by JQL
server.registerTool(
  'getIssuesByJQL',
  {
    description: 'Fetch Jira issues using a JQL query',
    inputSchema: z.object({
      jql: z.string().describe('JQL string (e.g., project = AG)'),
      maxResults: z.number().describe('Limit results').default(50),
    }),
  },
  async ({ jql, maxResults = 50 }) => {
    console.error(`Running JQL: ${jql}`);
    const response = await jira.issueSearch.searchForIssuesUsingJql({ jql, maxResults });
    console.error(`Found ${response.issues?.length || 0} issues`);
    return {
      content: [{ type: 'text', text: JSON.stringify(response.issues, null, 2) }],
    };
  }
);

// Tool: Create new Jira issue
server.registerTool(
  'createIssue',
  {
    description: 'Create a new Jira issue',
    inputSchema: z.object({
      projectKey: z.string().describe('Project key (e.g., AG)'),
      summary: z.string().describe('Issue title'),
      description: z.string().describe('Issue details'),
      issueType: z.string().describe('Type (Story, Task, Bug, etc.)').default('Story'),
    }),
  },
  async ({ projectKey, summary, description, issueType = 'Story' }) => {
    console.error(`Creating issue in ${projectKey}`);
    const issue = await jira.issues.createIssue({
      fields: {
        project: { key: projectKey },
        summary,
        description,
        issuetype: { name: issueType },
      },
    });
    console.error(`Created issue: ${issue.key}`);
    return {
      content: [{ type: 'text', text: JSON.stringify(issue, null, 2) }],
    };
  }
);

// Tool: Get all projects
server.registerTool(
  'getProjects',
  {
    description: 'Get all Jira projects',
    inputSchema: z.object({}),
  },
  async () => {
    console.error('Fetching projects');
    const projects = await jira.projects.getAllProjects();
    return {
      content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }],
    };
  }
);

// Tool: Get project info
server.registerTool(
  'getProject',
  {
    description: 'Get project details by key',
    inputSchema: z.object({
      projectKey: z.string().describe('Project key (e.g., AG)'),
    }),
  },
  async ({ projectKey }) => {
    console.error(`Fetching project: ${projectKey}`);
    const project = await jira.projects.getProject(projectKey);
    return {
      content: [{ type: 'text', text: JSON.stringify(project, null, 2) }],
    };
  }
);

// Tool: Get sprints from board
server.registerTool(
  'getSprints',
  {
    description: 'Get sprints from a board',
    inputSchema: z.object({
      boardId: z.number().describe('Board ID'),
    }),
  },
  async ({ boardId }) => {
    console.error(`Fetching sprints for board: ${boardId}`);
    const sprints = await jira.agile.getSprints({ boardId });
    return {
      content: [{ type: 'text', text: JSON.stringify(sprints, null, 2) }],
    };
  }
);

// Tool: Add issue to sprint
server.registerTool(
  'addIssueToSprint',
  {
    description: 'Add issue to sprint',
    inputSchema: z.object({
      issueIdOrKey: z.string().describe('Issue key (e.g., AG-1)'),
      sprintId: z.number().describe('Sprint ID'),
    }),
  },
  async ({ issueIdOrKey, sprintId }) => {
    console.error(`Adding ${issueIdOrKey} to sprint ${sprintId}`);
    const result = await jira.agile.addIssueToSprint({ issueIdOrKey, sprintId });
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }
);

// Tool: Update issue
server.registerTool(
  'updateIssue',
  {
    description: 'Update a Jira issue',
    inputSchema: z.object({
      issueIdOrKey: z.string().describe('Issue key (e.g., AG-1)'),
      summary: z.string().describe('New summary'),
      description: z.string().describe('New description'),
    }),
  },
  async ({ issueIdOrKey, summary, description }) => {
    console.error(`Updating issue: ${issueIdOrKey}`);
    const issue = await jira.issues.editIssue({
      issueIdOrKey,
      fields: {
        summary,
        description,
      },
    });
    return {
      content: [{ type: 'text', text: JSON.stringify(issue, null, 2) }],
    };
  }
);

// Tool: Search issues
server.registerTool(
  'searchIssues',
  {
    description: 'Search issues with JQL',
    inputSchema: z.object({
      jql: z.string().describe('JQL query'),
    }),
  },
  async ({ jql }) => {
    console.error(`Searching: ${jql}`);
    const response = await jira.issueSearch.searchForIssuesUsingJql({ jql });
    return {
      content: [{ type: 'text', text: JSON.stringify(response.issues, null, 2) }],
    };
  }
);

// Start the MCP server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Jira MCP Server is running');
}
main().catch((err) => console.error('Error:', err));