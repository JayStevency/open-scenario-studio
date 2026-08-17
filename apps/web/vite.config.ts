import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 개발 중에는 API 를 같은 오리진으로 프록시해 CORS 를 피한다.
    proxy: { '/trpc': 'http://localhost:3000' },
    fs: {
      // ?raw 로 읽는 design/data 가 워크스페이스 루트 밖이 아님을 명시한다.
      allow: ['../..'],
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
