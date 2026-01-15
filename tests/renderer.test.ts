import { describe, it, expect } from 'vitest';
import { renderHtml, renderStandaloneHtml } from '../src/lib/renderer.js';
import type { Resume } from '../src/types/index.js';

describe('renderer', () => {
  const testResume: Resume = {
    meta: {
      name: 'Jane Smith',
      title: 'Software Engineer',
      email: 'jane@example.com',
      phone: '555-123-4567',
      location: 'San Francisco, CA',
      links: [
        { label: 'GitHub', url: 'https://github.com/janesmith' },
        { url: 'https://linkedin.com/in/janesmith' },
      ],
    },
    summary: 'Experienced engineer specializing in web development.',
    skills: [{ category: 'Languages', items: ['TypeScript', 'Python', 'Go'] }],
    experience: [
      {
        company: 'Tech Corp',
        roles: [
          {
            title: 'Senior Engineer',
            start: '2020-01',
            end: 'present',
            location: 'Remote',
            highlights: ['Led team of 5', 'Improved performance'],
          },
          {
            title: 'Engineer',
            start: '2018-06',
            end: '2020-01',
            highlights: ['Built features'],
          },
        ],
      },
    ],
    projects: [
      {
        name: 'Open Source',
        url: 'https://github.com/project',
        description: 'A useful tool',
        highlights: ['1000+ stars'],
      },
    ],
    education: [
      {
        institution: 'University',
        degree: 'BS',
        field: 'Computer Science',
        end: '2018',
      },
    ],
    certifications: [
      {
        name: 'AWS Certified',
        issuer: 'Amazon',
        date: '2023',
      },
    ],
  };

  describe('renderHtml', () => {
    it('renders resume to HTML with CSS', async () => {
      const { html, css } = await renderHtml(testResume, 'minimal');

      expect(html).toContain('Jane Smith');
      expect(html).toContain('Software Engineer');
      expect(css).toBeDefined();
      expect(css).toContain('.resume');
    });

    it('includes all sections in rendered HTML', async () => {
      const { html } = await renderHtml(testResume, 'minimal');

      // Meta
      expect(html).toContain('jane@example.com');
      expect(html).toContain('555-123-4567');
      expect(html).toContain('San Francisco, CA');

      // Links
      expect(html).toContain('GitHub');
      expect(html).toContain('linkedin.com');

      // Summary
      expect(html).toContain('Experienced engineer');

      // Skills
      expect(html).toContain('Languages');
      expect(html).toContain('TypeScript');

      // Experience
      expect(html).toContain('Tech Corp');
      expect(html).toContain('Senior Engineer');
      expect(html).toContain('Led team of 5');

      // Projects
      expect(html).toContain('Open Source');
      expect(html).toContain('useful tool');

      // Education
      expect(html).toContain('University');
      expect(html).toContain('Computer Science');

      // Certifications
      expect(html).toContain('AWS Certified');
      expect(html).toContain('Amazon');
    });

    it('handles resume without optional sections', async () => {
      const minimal: Resume = {
        meta: { name: 'Minimal User' },
        experience: [
          {
            company: 'Co',
            roles: [{ title: 'Dev', start: '2020' }],
          },
        ],
      };

      const { html } = await renderHtml(minimal, 'minimal');

      expect(html).toContain('Minimal User');
      expect(html).toContain('Co');
      expect(html).not.toContain('Summary');
      expect(html).not.toContain('Skills');
    });

    it('escapes HTML in user content', async () => {
      const xssResume: Resume = {
        meta: { name: '<script>alert("xss")</script>' },
        experience: [
          {
            company: '<img onerror="alert(1)" src="x">',
            roles: [{ title: 'Dev', start: '2020' }],
          },
        ],
      };

      const { html } = await renderHtml(xssResume, 'minimal');

      // Script tags should be escaped
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
      // Event handlers should be escaped (quotes become &quot;)
      expect(html).not.toContain('onerror="alert');
      expect(html).toContain('onerror=&quot;');
    });

    it('throws on non-existent theme', async () => {
      await expect(renderHtml(testResume, 'non-existent-theme')).rejects.toThrow(
        "Theme 'non-existent-theme' not found"
      );
    });
  });

  describe('renderStandaloneHtml', () => {
    it('renders complete HTML document', async () => {
      const html = await renderStandaloneHtml(testResume, 'minimal');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</html>');
    });

    it('includes title with name', async () => {
      const html = await renderStandaloneHtml(testResume, 'minimal');

      expect(html).toContain('<title>Jane Smith - Resume</title>');
    });

    it('embeds CSS in style tag', async () => {
      const html = await renderStandaloneHtml(testResume, 'minimal');

      expect(html).toContain('<style>');
      expect(html).toContain('.resume');
      expect(html).toContain('</style>');
    });

    it('includes viewport meta tag', async () => {
      const html = await renderStandaloneHtml(testResume, 'minimal');

      expect(html).toContain('viewport');
      expect(html).toContain('width=device-width');
    });
  });

  describe('date formatting filters', () => {
    it('formats full dates correctly', async () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [
          {
            company: 'Co',
            roles: [{ title: 'Dev', start: '2020-06', end: '2021-12' }],
          },
        ],
      };

      const { html } = await renderHtml(resume, 'minimal');

      expect(html).toContain('Jun 2020');
      expect(html).toContain('Dec 2021');
    });

    it('handles "present" end dates', async () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [
          {
            company: 'Co',
            roles: [{ title: 'Dev', start: '2020-01', end: 'present' }],
          },
        ],
      };

      const { html } = await renderHtml(resume, 'minimal');

      expect(html).toContain('Present');
    });

    it('handles year-only dates', async () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [
          {
            company: 'Co',
            roles: [{ title: 'Dev', start: '2020' }],
          },
        ],
      };

      const { html } = await renderHtml(resume, 'minimal');

      expect(html).toContain('2020');
    });
  });

  describe('URL domain filter', () => {
    it('extracts domain from URL for link labels', async () => {
      const resume: Resume = {
        meta: {
          name: 'Test',
          links: [{ url: 'https://www.github.com/user' }],
        },
        experience: [
          {
            company: 'Co',
            roles: [{ title: 'Dev', start: '2020' }],
          },
        ],
      };

      const { html } = await renderHtml(resume, 'minimal');

      // The displayed link text should show domain without www (may have whitespace)
      expect(html).toMatch(/>\s*github\.com\s*</);
      // The href should still contain the full URL
      expect(html).toContain('href="https://www.github.com/user"');
    });
  });
});
