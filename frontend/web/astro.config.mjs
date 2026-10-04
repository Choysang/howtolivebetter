import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  site: process.env.ASTRO_SITE || 'https://howtolivebetter.local',
  base: process.env.ASTRO_BASE || '/',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@kernel': path.resolve(import.meta.dirname, '../../kernel'),
        '@contracts': path.resolve(import.meta.dirname, '../../contracts'),
      },
    },
  },
  trailingSlash: 'always',
  redirects: {
    '/tools/assess': '/checkup/',
    '/tools/checkin': '/checkin/',
    '/moments': '/scenario/',
  },
})
