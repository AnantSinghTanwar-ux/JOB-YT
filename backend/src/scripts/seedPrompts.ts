import prisma from '../config/prisma';
import { PromptTemplatesService } from '../services/promptTemplates.service';

async function seedPrompts() {
  console.log('Seeding prompt templates to the database...');
  const templates = await PromptTemplatesService.getAllTemplates();

  for (const t of templates) {
    const existing = await prisma.prompt_templates.findUnique({
      where: { name: t.name },
    });

    if (!existing) {
      await prisma.prompt_templates.create({
        data: {
          name: t.name,
          description: t.description,
          template: t.template,
          variables: t.variables,
          version: 1,
        },
      });
      console.log(`Created prompt template: ${t.name}`);
    } else {
      console.log(`Prompt template ${t.name} already exists. Skipping.`);
    }
  }

  console.log('Seeding complete.');
}

seedPrompts()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
