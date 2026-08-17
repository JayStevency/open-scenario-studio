import { checkIntegrity, type ProjectData, runChecks } from '@oss/domain'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { changeLogData, pickChanged, resolveAuthorId } from './changelog'
import { assertUpdated, toTrpcError } from './concurrency'
import type { Prisma } from './generated/prisma/client'
import type { Db } from './prisma'
import { authedProcedure, publicProcedure, router } from './trpc'

// [잠정] readProjectData 와 rule.update 는 화면 설계 전에 미리 쓴 코드다.
//        편집 단위와 응답 형태는 논의 결과에 따라 바뀐다. CLAUDE.md '잠정' 절 참고.

const projectInput = z.object({ projectId: z.string() })

/** SQLite 가 배열을 못 담아 JSON 으로 둔 필드를 도메인 쪽 배열로 되돌린다. */
function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

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
      prerequisiteDevIds: asStringArray(d.prerequisiteDevIds),
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

    /**
     * FR-500 정합성 검사 8종. 데이터가 바뀌면 즉시 다시 계산한다 —
     * 저장해 두지 않고 매번 도메인 함수를 돌린다.
     */
    checks: publicProcedure.input(projectInput).query(async ({ ctx, input }) => {
      return runChecks(await readProjectData(ctx.prisma, input.projectId))
    }),

    /**
     * 셀 편집에 쓸 선택 목록(FR-107).
     * 관리자 설정 화면이 생기기 전까지는 지금 데이터에 실제로 쓰인 값을 모아 쓴다.
     */
    options: publicProcedure.input(projectInput).query(async ({ ctx, input }) => {
      const [rules, scenarios, capabilities, saved] = await Promise.all([
        ctx.prisma.rule.findMany({
          where: { projectId: input.projectId },
          select: { ruleType: true, owner: true, status: true },
        }),
        ctx.prisma.scenario.findMany({
          where: { projectId: input.projectId },
          select: { id: true, name: true },
          orderBy: { id: 'asc' },
        }),
        ctx.prisma.capabilityGroup.findMany({
          where: { projectId: input.projectId },
          select: { id: true, name: true },
          orderBy: { id: 'asc' },
        }),
        ctx.prisma.optionList.findMany({ where: { projectId: input.projectId } }),
      ])

      const savedFor = (kind: string) =>
        asStringArray(saved.find((o) => o.kind === kind)?.values ?? [])

      const collect = (values: (string | null)[], kind: string) => {
        const fromAdmin = savedFor(kind)
        if (fromAdmin.length > 0) return fromAdmin
        return [...new Set(values.filter((v): v is string => v !== null && v !== ''))].sort()
      }

      return {
        ruleType: collect(
          rules.map((r) => r.ruleType),
          'ruleType',
        ),
        owner: collect(
          rules.map((r) => r.owner),
          'owner',
        ),
        status: collect(
          rules.map((r) => r.status),
          'status',
        ),
        scenarios,
        capabilities,
      }
    }),
  }),

  rule: router({
    /** 표가 그리는 것. 도메인 타입과 달리 version 을 포함한다 — 편집에 필요하다. */
    list: publicProcedure.input(projectInput).query(({ ctx, input }) =>
      ctx.prisma.rule.findMany({
        where: { projectId: input.projectId },
        orderBy: { orderIndex: 'asc' },
      }),
    ),

    /** 규칙 한 건. 에이전트가 고치기 전에 현재 값과 version 을 확인한다. */
    get: publicProcedure
      .input(projectInput.extend({ id: z.string() }))
      .query(async ({ ctx, input }) => {
        const rule = await ctx.prisma.rule.findFirst({
          where: { id: input.id, projectId: input.projectId },
        })
        if (rule === null) {
          throw new TRPCError({ code: 'NOT_FOUND', message: `규칙 ${input.id} 가 없다` })
        }
        return rule
      }),

    /**
     * 규칙 편집(FR-102). 낙관적 잠금 + 이력 적재를 한 트랜잭션에 묶는다.
     * 사람의 셀 편집과 에이전트의 문장 수정이 같은 경로를 탄다.
     * 새 쓰기 프로시저는 이 패턴을 그대로 복사해 쓴다.
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
          )
          if (Object.keys(patch).length === 0) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: '바꿀 필드가 없다' })
          }

          return await ctx.prisma.$transaction(async (tx) => {
            // 되돌리기 근거를 남기려면 갱신 전에 읽어야 한다(NFR-04).
            const before = await tx.rule.findFirst({
              where: { id: input.id, projectId: input.projectId },
            })

            const { count } = await tx.rule.updateMany({
              where: { id: input.id, projectId: input.projectId, version: input.version },
              data: {
                ...(patch as Prisma.RuleUncheckedUpdateManyInput),
                version: { increment: 1 },
              },
            })
            assertUpdated(count, 'Rule', input.id, input.version, before?.version ?? null)

            await tx.changeLog.create({
              data: changeLogData({
                projectId: input.projectId,
                actor: ctx.actor,
                authorId: await resolveAuthorId(tx, ctx.actor),
                entityType: 'Rule',
                entityId: input.id,
                action: 'update',
                before: before === null ? null : pickChanged(before, patch),
                after: patch,
              }),
            })

            return { version: input.version + 1 }
          })
        } catch (error) {
          throw toTrpcError(error)
        }
      }),

    /**
     * 규칙 추가·복제(FR-103). 복제는 원본 바로 아래에 초안으로 놓는다.
     * ID 는 서버가 정한다 — 삭제한 ID 는 재사용하지 않는다(4절).
     */
    create: authedProcedure
      .input(
        projectInput.extend({
          scenarioId: z.string(),
          /** 주면 그 규칙을 복제한다. 없으면 빈 규칙을 만든다. */
          copyOfId: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await ctx.prisma.$transaction(async (tx) => {
            const source =
              input.copyOfId === undefined
                ? null
                : await tx.rule.findFirst({
                    where: { id: input.copyOfId, projectId: input.projectId },
                  })

            const scenarioId = source?.scenarioId ?? input.scenarioId
            const siblings = await tx.rule.findMany({
              where: { projectId: input.projectId, scenarioId },
              select: { id: true },
            })

            // SC-1.7 형태를 잇는다. 쓰인 적 있는 번호는 피한다.
            const used = new Set(
              (
                await tx.changeLog.findMany({
                  where: { projectId: input.projectId, entityType: 'Rule' },
                  select: { entityId: true },
                })
              ).map((c) => c.entityId),
            )
            for (const s of siblings) used.add(s.id)

            let next = siblings.length + 1
            while (used.has(`${scenarioId}.${next}`)) next++
            const id = `${scenarioId}.${next}`

            const created = await tx.rule.create({
              data: {
                id,
                projectId: input.projectId,
                scenarioId,
                statement: source?.statement ?? '',
                ruleType: source?.ruleType ?? '',
                owner: source?.owner ?? null,
                capabilityId: source?.capabilityId ?? null,
                // 복제본은 원본을 그대로 확정으로 두면 안 된다.
                status: '초안',
                orderIndex: (source?.orderIndex ?? siblings.length) + 1,
              },
            })

            await tx.changeLog.create({
              data: changeLogData({
                projectId: input.projectId,
                actor: ctx.actor,
                authorId: await resolveAuthorId(tx, ctx.actor),
                entityType: 'Rule',
                entityId: id,
                action: 'create',
                before: null,
                after: { scenarioId, copyOf: input.copyOfId ?? null },
              }),
            })

            return created
          })
        } catch (error) {
          throw toTrpcError(error)
        }
      }),

    /**
     * 규칙 삭제(FR-108). 참조하는 LINK 와 근거 규칙 지정을 함께 정리하고,
     * 무엇이 함께 지워졌는지 돌려준다 — 화면이 사용자에게 알려야 한다.
     */
    delete: authedProcedure
      .input(projectInput.extend({ id: z.string(), version: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await ctx.prisma.$transaction(async (tx) => {
            const before = await tx.rule.findFirst({
              where: { id: input.id, projectId: input.projectId },
            })

            const links = await tx.ruleLink.findMany({
              where: {
                projectId: input.projectId,
                OR: [{ fromId: input.id }, { toId: input.id }],
              },
              select: { id: true },
            })
            const relations = await tx.scenarioRelation.findMany({
              where: { projectId: input.projectId, basisRuleId: input.id },
              select: { id: true },
            })

            // 복합 키라 DB 가 대신 풀어주지 않는다. 앱이 먼저 정리한다.
            await tx.ruleLink.deleteMany({
              where: { projectId: input.projectId, id: { in: links.map((l) => l.id) } },
            })
            await tx.scenarioRelation.updateMany({
              where: { projectId: input.projectId, basisRuleId: input.id },
              data: { basisRuleId: null },
            })

            const { count } = await tx.rule.deleteMany({
              where: { id: input.id, projectId: input.projectId, version: input.version },
            })
            assertUpdated(count, 'Rule', input.id, input.version, before?.version ?? null)

            await tx.changeLog.create({
              data: changeLogData({
                projectId: input.projectId,
                actor: ctx.actor,
                authorId: await resolveAuthorId(tx, ctx.actor),
                entityType: 'Rule',
                entityId: input.id,
                action: 'delete',
                before:
                  before === null
                    ? null
                    : {
                        scenarioId: before.scenarioId,
                        statement: before.statement,
                        ruleType: before.ruleType,
                        owner: before.owner,
                        capabilityId: before.capabilityId,
                        status: before.status,
                      },
                after: null,
              }),
            })

            return {
              deletedLinkIds: links.map((l) => l.id),
              clearedRelationIds: relations.map((r) => r.id),
            }
          })
        } catch (error) {
          throw toTrpcError(error)
        }
      }),

    /** 규칙을 기능 그룹에 배정하거나 미배정으로 되돌린다(FR-302). */
    assignCapability: authedProcedure
      .input(
        projectInput.extend({
          id: z.string(),
          version: z.number().int(),
          capabilityId: z.string().nullable(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        try {
          return await ctx.prisma.$transaction(async (tx) => {
            const before = await tx.rule.findFirst({
              where: { id: input.id, projectId: input.projectId },
              select: { version: true, capabilityId: true },
            })

            const { count } = await tx.rule.updateMany({
              where: { id: input.id, projectId: input.projectId, version: input.version },
              data: { capabilityId: input.capabilityId, version: { increment: 1 } },
            })
            assertUpdated(count, 'Rule', input.id, input.version, before?.version ?? null)

            await tx.changeLog.create({
              data: changeLogData({
                projectId: input.projectId,
                actor: ctx.actor,
                authorId: await resolveAuthorId(tx, ctx.actor),
                entityType: 'Rule',
                entityId: input.id,
                action: 'update',
                before: { capabilityId: before?.capabilityId ?? null },
                after: { capabilityId: input.capabilityId },
              }),
            })

            return { version: input.version + 1 }
          })
        } catch (error) {
          throw toTrpcError(error)
        }
      }),
  }),

  /** BR 간 관계(FR-400). 에이전트가 주로 만들어내는 데이터다. */
  link: router({
    /**
     * 관계 목록. project.data 는 도메인 타입이라 version 이 빠지는데,
     * 삭제하려면 version 이 필요하므로 원본 행을 그대로 돌려준다.
     */
    list: publicProcedure.input(projectInput).query(({ ctx, input }) =>
      ctx.prisma.ruleLink.findMany({
        where: { projectId: input.projectId },
        orderBy: { id: 'asc' },
      }),
    ),

    create: authedProcedure
      .input(
        projectInput.extend({
          id: z.string(),
          fromRuleId: z.string(),
          toRuleId: z.string(),
          kind: z.string(),
          note: z.string().default(''),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // FR-405 자기 자신과는 연결하지 않는다. 사람은 잘 안 하지만 에이전트는 한다.
        if (input.fromRuleId === input.toRuleId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: '규칙을 자기 자신과 연결할 수 없다' })
        }

        try {
          return await ctx.prisma.$transaction(async (tx) => {
            // FR-405 같은 두 규칙 사이 같은 종류는 하나뿐이다.
            const duplicate = await tx.ruleLink.findFirst({
              where: {
                projectId: input.projectId,
                fromId: input.fromRuleId,
                toId: input.toRuleId,
                kind: input.kind,
              },
              select: { id: true },
            })
            if (duplicate !== null) {
              throw new TRPCError({
                code: 'CONFLICT',
                message: `같은 종류의 관계가 이미 있다: ${duplicate.id}`,
              })
            }

            const created = await tx.ruleLink.create({
              data: {
                id: input.id,
                projectId: input.projectId,
                fromId: input.fromRuleId,
                toId: input.toRuleId,
                kind: input.kind,
                note: input.note,
              },
            })

            await tx.changeLog.create({
              data: changeLogData({
                projectId: input.projectId,
                actor: ctx.actor,
                authorId: await resolveAuthorId(tx, ctx.actor),
                entityType: 'RuleLink',
                entityId: input.id,
                action: 'create',
                before: null,
                after: {
                  fromId: input.fromRuleId,
                  toId: input.toRuleId,
                  kind: input.kind,
                  note: input.note,
                },
              }),
            })

            return created
          })
        } catch (error) {
          throw toTrpcError(error)
        }
      }),

    delete: authedProcedure
      .input(projectInput.extend({ id: z.string(), version: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        try {
          return await ctx.prisma.$transaction(async (tx) => {
            const before = await tx.ruleLink.findFirst({
              where: { id: input.id, projectId: input.projectId },
            })

            const { count } = await tx.ruleLink.deleteMany({
              where: { id: input.id, projectId: input.projectId, version: input.version },
            })
            assertUpdated(count, 'RuleLink', input.id, input.version, before?.version ?? null)

            await tx.changeLog.create({
              data: changeLogData({
                projectId: input.projectId,
                actor: ctx.actor,
                authorId: await resolveAuthorId(tx, ctx.actor),
                entityType: 'RuleLink',
                entityId: input.id,
                action: 'delete',
                before:
                  before === null
                    ? null
                    : {
                        fromId: before.fromId,
                        toId: before.toId,
                        kind: before.kind,
                        note: before.note,
                      },
                after: null,
              }),
            })

            return { deleted: true }
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
