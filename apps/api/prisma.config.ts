import { defineConfig } from 'prisma/config'
import { databaseUrl } from './src/env'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl(),
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
})
