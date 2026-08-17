import cors from '@fastify/cors'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import Fastify from 'fastify'
import { appRouter } from './router'
import { createContext } from './trpc'

const server = Fastify({ logger: true })

await server.register(cors, {
  origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  credentials: true,
})

await server.register(fastifyTRPCPlugin, {
  prefix: '/trpc',
  trpcOptions: { router: appRouter, createContext },
})

server.get('/healthz', () => ({ ok: true }))

const port = Number(process.env.PORT ?? 3000)
await server.listen({ port, host: '127.0.0.1' })
