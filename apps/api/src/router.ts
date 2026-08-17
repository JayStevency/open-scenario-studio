import { checkIntegrity, type ProjectData } from '@oss/domain'
import { z } from 'zod'
import { assertUpdated, toTrpcError } from './concurrency'
import type { Prisma } from './generated/prisma/client'
import type { Db } from './prisma'
import { authedProcedure, publicProcedure, router } from './trpc'

// [잠정] readProjectData 와 rule.update 는 화면 설계 전에 미리 쓴 코드다.
//        편집 단위와 응답 형태는 논의 결과에 따라 바뀐다. CLAUDE.md '잠정' 절 참고.

const projectInput = z.object({ projectId: z.string() })

/** DB 행을 도메인 타입으로. 도메인은 Prisma 를 모른다. */
async function readProjectData(prisma: Db, projectId: string): Promise<ProjectData> {
  const [scenarios, rules, relations, links, capabilities, devScenarios] = await Promise.all([
    prisma.scenario.findMany({ where: { projectId } }),
    prisma.rule.findMany({ where: { projectId }, orderBy: { orderIndex: 'asc' } }),
    prisma.scenarioRelation.findMany({ where: { projectId } }),
    prisma.ruleLink.findMany({ where: { projectId } }),
    prisma.capabilityGroup.findMany({
      where: { projectId },
      include: { rules: { select: { id: true } } },
    }),
    prisma.devScenario.findMany({
      where: { projectId },
      include: { capabilities: { select: { id: true } } },
    }),
  ])

  return {
    scenarios: scenarios.map((s) => ({
      id: s.id,
      name: s.name,
      displayName: s.displayName,
      area: s.area,
      ...(s.trigger !== null && { trigger: s.trigger }),
      ...(s.endCondition !== null && { endCondition: s.endCondition }),
      ...(s.lifecycle !== null && { lifecycleStage: s.lifecycle }),
      ...(s.x !== null && { x: s.x }),
      ...(s.y !== null && { y: s.y }),
    })),
    rules: rules.map((r) => ({
      id: r.id,
      scenarioId: r.scenarioId,
      statement: r.statement,
      ruleType: r.ruleType,
      owner: r.owner ?? '',
      capabilityId: r.capabilityId,
      status: r.status,
      ...(r.openIssue !== null && { openIssue: r.openIssue }),
    })),
    relations: relations.map((r) => ({
      id: r.id,
      fromScenarioId: r.fromId,
      toScenarioId: r.toId,
      kind: r.kind,
      condition: r.condition ?? '',
      basisRuleId: r.basisRuleId,
    })),
    links: links.map((l) => ({
      id: l.id,
      fromRuleId: l.fromId,
      toRuleId: l.toId,
      kind: l.kind,
      note: l.note ?? '',
    })),
    capabilities: capabilities.map((c) => ({
      id: c.id,
      devScenarioId: c.devId,
      name: c.name,
      description: c.description ?? '',
      ruleIds: c.rules.map((r) => r.id),
    })),
    devScenarios: devScenarios.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description ?? '',
      owner: d.owner ?? '',
      capabilityIds: d.capabilities.map((c) => c.id),
      prerequisiteDevIds: d.prerequisiteDevIds,
      ...(d.acceptanceCriteria !== null && { acceptanceCriteria: d.acceptanceCriteria }),
    })),
  }
}

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true })),

  /** 프로젝트 데이터 한 벌. 화면 다섯 개가 같은 데이터를 본다. */
  project: router({
    data: publicProcedure.input(projectInput).query(({ ctx, input }) => {
      return readProjectData(ctx.prisma, input.projectId)
    }),

    /** 참조 무결성 위반. 도메인 검사를 서버에서도 그대로 돌린다. */
    integrity: publicProcedure.input(projectInput).query(async ({ ctx, input }) => {
      return checkIntegrity(await readProjectData(ctx.prisma, input.projectId))
    }),
  }),

  rule: router({
    /**
     * 규칙 셀 편집(FR-102). 낙관적 잠금 + 이력 적재를 한 트랜잭션에 묶는다.
     * 새 필드를 추가할 때 이 패턴을 그대로 복사해 쓴다.
     */
    update: authedProcedure
      .input(
        z.object({
          projectId: z.string(),
          id: z.string(),
          version: z.number().int(),
          patch: z
            .object({
              statement: z.string(),
              ruleType: z.string(),
              owner: z.string(),
              status: z.string(),
              scenarioId: z.string(),
              capabilityId: z.string().nullable(),
              openIssue: z.string(),
            })
            .partial(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          // exactOptionalPropertyTypes 아래에서는 undefined 키를 남기면 안 된다.
          const patch = Object.fromEntries(
            Object.entries(input.patch).filter(([, value]) => value !== undefined),
          ) as Prisma.RuleUncheckedUpdateManyInput

          return await ctx.prisma.$transaction(async (tx) => {
            const { count } = await tx.rule.updateMany({
              where: { id: input.id, projectId: input.projectId, version: input.version },
              data: { ...patch, version: { increment: 1 } },
            })

            if (count === 0) {
              const current = await tx.rule.findUnique({
                where: { id: input.id },
                select: { version: true },
              })
              assertUpdated(count, 'Rule', input.id, input.version, current?.version ?? null)
            }

            await tx.changeLog.create({
              data: {
                projectId: input.projectId,
                authorId: ctx.userId,
                entityType: 'Rule',
                entityId: input.id,
                action: 'update',
                patch: input.patch,
              },
            })

            return { version: input.version + 1 }
          })
        } catch (error) {
          throw toTrpcError(error)
        }
      }),
  }),

  /** 자동 기록과 사용자 메모를 시간순으로(FR-407). */
  history: publicProcedure
    .input(projectInput.extend({ limit: z.number().int().min(1).max(200).default(50) }))
    .query(({ ctx, input }) =>
      ctx.prisma.changeLog.findMany({
        where: { projectId: input.projectId },
        orderBy: { at: 'desc' },
        take: input.limit,
        include: { author: { select: { name: true } } },
      }),
    ),
})

export type AppRouter = typeof appRouter
