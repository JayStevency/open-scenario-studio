import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 기본값으로 두면 뜰 때마다 IPv4(127.0.0.1) 나 IPv6(::1) 중 한쪽에만 붙는다.
    // 브라우저가 반대쪽으로 연결하면 그대로 실패한다. '::' 는 양쪽을 다 받는다.
    // 대신 같은 망의 다른 기기에서도 열린다 — 곤란하면 '127.0.0.1' 로 바꾼다.
    host: '::',
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
    setupFiles: ['./vitest.setup.ts'],
    // 화면 테스트는 파일 상단의 @vitest-environment jsdom 으로 개별 지정한다.
  },
})
