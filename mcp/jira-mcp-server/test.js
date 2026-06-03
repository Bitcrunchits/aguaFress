// Script de test para verificar conexión con Jira
import 'dotenv/config';
import { Version3Client } from 'jira.js';

const jira = new Version3Client({
  host: process.env.JIRA_HOST,
  authentication: {
    basic: {
      email: process.env.JIRA_EMAIL,
      apiToken: process.env.JIRA_API_TOKEN,
    },
  },
});

async function test() {
  try {
    console.log('🔌 Conectando a Jira...\n');

    // Test 1: Get projects
    console.log('1. Obteniendo proyectos...');
    const projects = await jira.projects.getAllProjects();
    console.log(`   ✅ Proyectos encontrados: ${projects.length}`);
    projects.forEach(p => console.log(`   - ${p.key}: ${p.name}`));

    // Test 2: Get project AG
    console.log('\n2. Obteniendo proyecto AG...');
    const project = await jira.projects.getProject('AG');
    console.log(`   ✅ Proyecto: ${project.name} (${project.key})`);
    console.log(`   - ID: ${project.id}`);
    console.log(`   - Tipo: ${project.projectTypeKey}`);

    // Test 3: Search issues
    console.log('\n3. Buscando issues en AG...');
    const issues = await jira.issueSearch.searchForIssuesUsingJql({
      jql: 'project = AG ORDER BY created DESC',
      maxResults: 5
    });
    console.log(`   ✅ Issues encontrados: ${issues.issues?.length || 0}`);
    if (issues.issues) {
      issues.issues.forEach(i => console.log(`   - ${i.key}: ${i.fields.summary}`));
    }

    console.log('\n🎉 Conexión exitosa!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();