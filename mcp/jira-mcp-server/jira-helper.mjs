import 'dotenv/config';
import { Version3Client, AgileClient } from 'jira.js';

const jira = new Version3Client({
  host: process.env.JIRA_HOST,
  authentication: {
    basic: {
      email: process.env.JIRA_EMAIL,
      apiToken: process.env.JIRA_API_TOKEN,
    },
  },
});

const agile = new AgileClient({
  host: process.env.JIRA_HOST,
  authentication: {
    basic: {
      email: process.env.JIRA_EMAIL,
      apiToken: process.env.JIRA_API_TOKEN,
    },
  },
});

async function main() {
  const action = process.argv[2];

  if (action === 'list') {
    const res = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
      jql: 'project=AG ORDER BY created DESC',
      maxResults: 20,
      fields: ['key', 'summary', 'status', 'assignee', 'issuetype', 'created'],
    });
    for (const issue of res.issues) {
      const a = issue.fields.assignee;
      console.log(`${issue.key.padEnd(10)} | ${issue.fields.issuetype.name.padEnd(8)} | ${issue.fields.status.name.padEnd(14)} | ${(a ? a.displayName : 'Sin asignar').padEnd(22)} | ${issue.fields.summary}`);
    }
    console.log(`\nTotal: ${res.issues.length} issues`);
  }

  if (action === 'sprints') {
    const boards = await agile.board.getAllBoards({ projectKeyOrId: 'AG' });
    console.log('=== Boards ===');
    for (const b of boards.values || []) {
      console.log(`  Board ${b.id}: ${b.name} (${b.type})`);
      try {
        const sprints = await agile.board.getAllSprints({ boardId: b.id });
        for (const s of sprints.values || []) {
          console.log(`    Sprint ${s.id}: "${s.name}" — state: ${s.state}${s.state === 'active' ? ' 👈 ACTIVO' : ''}`);
        }
      } catch (e) {
        console.log(`    (error getting sprints: ${e.message})`);
      }
    }
  }

  if (action === 'create') {
    const summary = process.argv[3];
    const desc = process.argv[4] || '';
    const type = process.argv[5] || 'Story';
    const assigneeId = process.argv[6];

    const fields = {
      project: { key: 'AG' },
      summary,
      issuetype: { name: type },
      description: {
        type: 'doc', version: 1,
        content: [{ type: 'paragraph', content: [{ type: 'text', text: desc }] }],
      },
    };
    if (assigneeId) fields.assignee = { accountId: assigneeId };

    const issue = await jira.issues.createIssue({ fields });
    console.log(`Creado: ${issue.key} — ${issue.id}`);
  }

  if (action === 'addToSprint') {
    const issueIdOrKey = process.argv[3];
    const sprintId = parseInt(process.argv[4]);
    await agile.sprint.moveIssuesToSprintAndRank({ sprintId, issueIdsOrKeys: [issueIdOrKey] });
    console.log(`${issueIdOrKey} → sprint ${sprintId}`);
  }

  if (action === 'users') {
    const res = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearch({
      jql: 'project=AG ORDER BY created DESC',
      maxResults: 50,
      fields: ['assignee'],
    });
    const seen = new Map();
    for (const issue of res.issues) {
      if (issue.fields.assignee) {
        const a = issue.fields.assignee;
        if (!seen.has(a.accountId)) {
          seen.set(a.accountId, a.displayName);
        }
      }
    }
    console.log('=== Usuarios asignados en AG ===');
    for (const [id, name] of seen) {
      console.log(`  ${id} — ${name}`);
    }
  }
}

main().catch(e => console.error('Error:', e.response?.data || e.message || e));
