/** @type {import('../../src/types/theme-config.js').ThemeConfig} */
export default {
  metadata: {
    description: 'A traditional single-column layout with serif fonts and conservative styling',
    author: 'Vitae',
    version: '1.0.0',
    license: 'MIT',
    tags: ['single-column', 'traditional', 'serif'],
  },
  filters: [
    {
      name: 'initials',
      filter: (name) => {
        if (!name || typeof name !== 'string') return '';
        return name.split(' ').map((w) => w[0]).join('');
      },
    },
  ],
  helpers: (resume) => ({
    totalExperienceYears: (() => {
      const starts = resume.experience
        .flatMap((e) => e.roles)
        .map((r) => parseInt(r.start?.split('-')[0] ?? '0', 10))
        .filter((y) => y > 0);
      if (starts.length === 0) return 0;
      return new Date().getFullYear() - Math.min(...starts);
    })(),
    skillCount: (resume.skills ?? []).reduce((sum, cat) => sum + cat.items.length, 0),
  }),
};
