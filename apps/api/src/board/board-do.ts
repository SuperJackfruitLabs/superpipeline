import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../env';
import { ServiceTokenCache } from '../superwitness/client';
import { logReporter } from '../superwitness/log';
import type { BoardContext, OpArgs } from './context';
import { migrateBoardSchema } from './schema';
import { wireBoard } from './wiring';
import * as approvalSubjects from './approval-subjects';
import * as store from './card-store';
import * as cards from './cards';
import * as claims from './claims';
import * as comments from './comments';
import * as elicitations from './elicitations';
import * as gates from './gates';
import * as holds from './holds';
import * as maintenance from './maintenance';
import * as metering from './metering';
import * as moves from './moves';
import * as pipeline from './pipeline';
import * as push from './push';
import * as references from './references';
import * as runHistory from './run-history';
import * as runReports from './run-reports';
import * as runVerbs from './run-verbs';
import * as schedules from './schedules';
import * as stale from './stale';
import * as triggers from './triggers';

export type { JsonValue } from '../json';
export type { GateOption } from './gate-option';
export type { GateDecision } from '@superpipeline/contract';
export type { ReferenceInput } from '../references/input';
export { RUN_CONTEXT_COMMENTS, RUN_CONTEXT_COMMENT_BYTES } from './comments';
export type { AgentActivityInput, AgentActivityType, BoardErrorCode, BoardEvent, BoardInit, BoardUsage, CardNeedsHuman, CardView, ClaimResult, CompleteVerbInput, EstimateView, LinkInput, LinkView, NotificationView, ProfileInput, ProfileView, PushConfigInput, PushDeliveryView, Result, RunReportDrainResult, RunReportOutboxRow, RunVerbInput, ScheduleView, StageDef, StagePatch, StaleCardView, StaleSettings, UsageInput, UsageSummary } from './model';
export { STAGE_INSTRUCTIONS_MAX, STAGE_SUMMARY_MAX, completionShapeError, stageFieldError } from './pipeline';
export type { BoardStub } from './rpc';
export { BOARD_INTRO_MAX, COMMENT_MAX_BYTES, boardIntroError, handoffSummary } from './rules';
export { STALE_DEFAULT_HOURS } from './stale';
export type { ActivityView, ApprovalSubjectVerification, ApprovalSubjectView, AttemptView, BoardSnapshot, CommentView, ElicitationAnswer, ElicitationPendingBody, ElicitationStatus, ElicitationView, EvidenceReferenceInput, GatePendingBody, GateView, ReferenceView, RunContext, RunEvidence, RunEvidenceGate, RunEvidenceV1 } from './views';

/**
 * Board Durable Object — one instance per (tenant, board). The single-threaded DO is the live
 * authority for the board: card state in DO SQLite, an append-only event log, atomic mutations,
 * and a hibernatable WebSocket hub (docs/02, docs/07).
 *
 * P2 adds the agent execution loop (docs/04, docs/08): agents claim ready cards (capability-routed,
 * concurrency-limited), heartbeat, stream activities, and finish via complete/block/fail/release.
 * Each claim takes a lease with a fencing epoch; a missed heartbeat is reclaimed via a DO alarm,
 * and repeated failures trip a circuit breaker.
 *
 * This class is the shell: its RPC methods, `fetch`, the WebSocket handlers and the alarm. Each
 * method hands its arguments to the module that owns the behaviour (see the imports), with the
 * board context built in the constructor.
 */
export class BoardDO extends DurableObject<Env> {
  /** The board's SQLite storage (`ctx.storage.sql`). */
  private sql: SqlStorage;
  /** The board's operations, bound to this object's storage and environment. */
  private readonly board: BoardContext;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    migrateBoardSchema(this.sql);
    this.board = wireBoard(
      { sql: this.sql, ctx: this.ctx, env: this.env, reporterToken: new ServiceTokenCache() },
      {
        addComment: (...a) => this.addComment(...a),
        addLink: (...a) => this.addLink(...a),
        addReference: (...a) => this.addReference(...a),
        backfillDueDates: (...a) => this.backfillDueDates(...a),
        backfillLabelNames: (...a) => this.backfillLabelNames(...a),
        backfillTerminalStageCards: (...a) => this.backfillTerminalStageCards(...a),
        createCard: (...a) => this.createCard(...a),
        createCardFromTrigger: (...a) => this.createCardFromTrigger(...a),
        createChildCard: (...a) => this.createChildCard(...a),
        fireDueSchedules: (...a) => this.fireDueSchedules(...a),
        getRunEvidence: (...a) => this.getRunEvidence(...a),
        listComments: (...a) => this.listComments(...a),
        moveCard: (...a) => this.moveCard(...a),
        notify: (...a) => this.notify(...a),
        now: (...a) => this.now(...a),
        nowMs: (...a) => this.nowMs(...a),
        reportRun: (...a) => this.reportRun(...a),
        scheduleReclaim: (...a) => this.scheduleReclaim(...a),
        updateCard: (...a) => this.updateCard(...a),
      },
    );
  }

  // Cards

  createCard(...args: OpArgs<typeof cards.createCard>): ReturnType<typeof cards.createCard> {
    return cards.createCard(this.board, ...args);
  }

  createChildCard(...args: OpArgs<typeof cards.createChildCard>): ReturnType<typeof cards.createChildCard> {
    return cards.createChildCard(this.board, ...args);
  }

  splitCard(...args: OpArgs<typeof cards.splitCard>): ReturnType<typeof cards.splitCard> {
    return cards.splitCard(this.board, ...args);
  }

  updateCard(...args: OpArgs<typeof cards.updateCard>): ReturnType<typeof cards.updateCard> {
    return cards.updateCard(this.board, ...args);
  }

  deleteCard(...args: OpArgs<typeof cards.deleteCard>): ReturnType<typeof cards.deleteCard> {
    return cards.deleteCard(this.board, ...args);
  }

  getCardView(...args: OpArgs<typeof cards.getCardView>): ReturnType<typeof cards.getCardView> {
    return cards.getCardView(this.board, ...args);
  }

  // Maintenance

  importFixture(...args: OpArgs<typeof maintenance.importFixture>): ReturnType<typeof maintenance.importFixture> {
    return maintenance.importFixture(this.board, ...args);
  }

  backfillDueDates(...args: OpArgs<typeof maintenance.backfillDueDates>): ReturnType<typeof maintenance.backfillDueDates> {
    return maintenance.backfillDueDates(this.board, ...args);
  }

  backfillLabelNames(...args: OpArgs<typeof maintenance.backfillLabelNames>): ReturnType<typeof maintenance.backfillLabelNames> {
    return maintenance.backfillLabelNames(this.board, ...args);
  }

  __testResetDueToSpec(...args: OpArgs<typeof maintenance.testResetDueToSpec>): ReturnType<typeof maintenance.testResetDueToSpec> {
    return maintenance.testResetDueToSpec(this.board, ...args);
  }

  backfillTerminalStageCards(...args: OpArgs<typeof maintenance.backfillTerminalStageCards>): ReturnType<typeof maintenance.backfillTerminalStageCards> {
    return maintenance.backfillTerminalStageCards(this.board, ...args);
  }

  debugForceCardState(...args: OpArgs<typeof maintenance.debugForceCardState>): ReturnType<typeof maintenance.debugForceCardState> {
    return maintenance.debugForceCardState(this.board, ...args);
  }

  // Moves

  moveCard(...args: OpArgs<typeof moves.moveCard>): ReturnType<typeof moves.moveCard> {
    return moves.moveCard(this.board, ...args);
  }

  resumeCard(...args: OpArgs<typeof moves.resumeCard>): ReturnType<typeof moves.resumeCard> {
    return moves.resumeCard(this.board, ...args);
  }

  // The pipeline

  init(...args: OpArgs<typeof pipeline.init>): ReturnType<typeof pipeline.init> {
    return pipeline.init(this.board, ...args);
  }

  setStages(...args: OpArgs<typeof pipeline.setStages>): ReturnType<typeof pipeline.setStages> {
    return pipeline.setStages(this.board, ...args);
  }

  updateStage(...args: OpArgs<typeof pipeline.updateStage>): ReturnType<typeof pipeline.updateStage> {
    return pipeline.updateStage(this.board, ...args);
  }

  setName(...args: OpArgs<typeof pipeline.setName>): ReturnType<typeof pipeline.setName> {
    return pipeline.setName(this.board, ...args);
  }

  getState(...args: OpArgs<typeof pipeline.getState>): ReturnType<typeof pipeline.getState> {
    return pipeline.getState(this.board, ...args);
  }

  destroy(...args: OpArgs<typeof pipeline.destroy>): ReturnType<typeof pipeline.destroy> {
    return pipeline.destroy(this.board, ...args);
  }

  getEvents(...args: OpArgs<typeof pipeline.getEvents>): ReturnType<typeof pipeline.getEvents> {
    return pipeline.getEvents(this.board, ...args);
  }

  setProfile(...args: OpArgs<typeof pipeline.setProfile>): ReturnType<typeof pipeline.setProfile> {
    return pipeline.setProfile(this.board, ...args);
  }

  getProfiles(...args: OpArgs<typeof pipeline.getProfiles>): ReturnType<typeof pipeline.getProfiles> {
    return pipeline.getProfiles(this.board, ...args);
  }

  // Holds

  addLink(...args: OpArgs<typeof holds.addLink>): ReturnType<typeof holds.addLink> {
    return holds.addLink(this.board, ...args);
  }

  removeLink(...args: OpArgs<typeof holds.removeLink>): ReturnType<typeof holds.removeLink> {
    return holds.removeLink(this.board, ...args);
  }

  listLinks(...args: OpArgs<typeof holds.listLinks>): ReturnType<typeof holds.listLinks> {
    return holds.listLinks(this.board, ...args);
  }

  // Claims

  claim(...args: OpArgs<typeof claims.claim>): ReturnType<typeof claims.claim> {
    return claims.claim(this.board, ...args);
  }

  countReadyForCapabilities(...args: OpArgs<typeof claims.countReadyForCapabilities>): ReturnType<typeof claims.countReadyForCapabilities> {
    return claims.countReadyForCapabilities(this.board, ...args);
  }

  heartbeat(...args: OpArgs<typeof claims.heartbeat>): ReturnType<typeof claims.heartbeat> {
    return claims.heartbeat(this.board, ...args);
  }

  reclaimExpired(...args: OpArgs<typeof claims.reclaimExpired>): ReturnType<typeof claims.reclaimExpired> {
    return claims.reclaimExpired(this.board, ...args);
  }

  agentLoad(...args: OpArgs<typeof claims.agentLoad>): ReturnType<typeof claims.agentLoad> {
    return claims.agentLoad(this.board, ...args);
  }

  summaryCounts(...args: OpArgs<typeof claims.summaryCounts>): ReturnType<typeof claims.summaryCounts> {
    return claims.summaryCounts(this.board, ...args);
  }

  // The run verbs

  postActivity(...args: OpArgs<typeof runVerbs.postActivity>): ReturnType<typeof runVerbs.postActivity> {
    return runVerbs.postActivity(this.board, ...args);
  }

  complete(...args: OpArgs<typeof runVerbs.complete>): ReturnType<typeof runVerbs.complete> {
    return runVerbs.complete(this.board, ...args);
  }

  submitForReview(...args: OpArgs<typeof runVerbs.submitForReview>): ReturnType<typeof runVerbs.submitForReview> {
    return runVerbs.submitForReview(this.board, ...args);
  }

  block(...args: OpArgs<typeof runVerbs.block>): ReturnType<typeof runVerbs.block> {
    return runVerbs.block(this.board, ...args);
  }

  fail(...args: OpArgs<typeof runVerbs.fail>): ReturnType<typeof runVerbs.fail> {
    return runVerbs.fail(this.board, ...args);
  }

  release(...args: OpArgs<typeof runVerbs.release>): ReturnType<typeof runVerbs.release> {
    return runVerbs.release(this.board, ...args);
  }

  // Gates

  resolveGate(...args: OpArgs<typeof gates.resolveGate>): ReturnType<typeof gates.resolveGate> {
    return gates.resolveGate(this.board, ...args);
  }

  updateApprovalDelivery(...args: OpArgs<typeof gates.updateApprovalDelivery>): ReturnType<typeof gates.updateApprovalDelivery> {
    return gates.updateApprovalDelivery(this.board, ...args);
  }

  recordAutomaticDelivery(...args: OpArgs<typeof gates.recordAutomaticDelivery>): ReturnType<typeof gates.recordAutomaticDelivery> {
    return gates.recordAutomaticDelivery(this.board, ...args);
  }

  getGate(...args: OpArgs<typeof gates.getGate>): ReturnType<typeof gates.getGate> {
    return gates.getGate(this.board, ...args);
  }

  pendingGateDeliveries(...args: OpArgs<typeof gates.pendingGateDeliveries>): ReturnType<typeof gates.pendingGateDeliveries> {
    return gates.pendingGateDeliveries(this.board, ...args);
  }

  pendingDeliveryFollowUps(...args: OpArgs<typeof gates.pendingDeliveryFollowUps>): ReturnType<typeof gates.pendingDeliveryFollowUps> {
    return gates.pendingDeliveryFollowUps(this.board, ...args);
  }

  // Approval subjects

  verifyApprovalSubject(...args: OpArgs<typeof approvalSubjects.verifyApprovalSubject>): ReturnType<typeof approvalSubjects.verifyApprovalSubject> {
    return approvalSubjects.verifyApprovalSubject(this.board, ...args);
  }

  confirmApprovalSubject(...args: OpArgs<typeof approvalSubjects.confirmApprovalSubject>): ReturnType<typeof approvalSubjects.confirmApprovalSubject> {
    return approvalSubjects.confirmApprovalSubject(this.board, ...args);
  }

  // Questions

  answerElicitation(...args: OpArgs<typeof elicitations.answerElicitation>): ReturnType<typeof elicitations.answerElicitation> {
    return elicitations.answerElicitation(this.board, ...args);
  }

  pendingElicitationDeliveries(...args: OpArgs<typeof elicitations.pendingElicitationDeliveries>): ReturnType<typeof elicitations.pendingElicitationDeliveries> {
    return elicitations.pendingElicitationDeliveries(this.board, ...args);
  }

  // Comments

  listComments(...args: OpArgs<typeof comments.listComments>): ReturnType<typeof comments.listComments> {
    return comments.listComments(this.board, ...args);
  }

  addComment(...args: OpArgs<typeof comments.addComment>): ReturnType<typeof comments.addComment> {
    return comments.addComment(this.board, ...args);
  }

  deleteComment(...args: OpArgs<typeof comments.deleteComment>): ReturnType<typeof comments.deleteComment> {
    return comments.deleteComment(this.board, ...args);
  }

  listRunComments(...args: OpArgs<typeof comments.listRunComments>): ReturnType<typeof comments.listRunComments> {
    return comments.listRunComments(this.board, ...args);
  }

  addRunComment(...args: OpArgs<typeof comments.addRunComment>): ReturnType<typeof comments.addRunComment> {
    return comments.addRunComment(this.board, ...args);
  }

  // Run history

  getRunContext(...args: OpArgs<typeof runHistory.getRunContext>): ReturnType<typeof runHistory.getRunContext> {
    return runHistory.getRunContext(this.board, ...args);
  }

  getRunEvidence(...args: OpArgs<typeof runHistory.getRunEvidence>): ReturnType<typeof runHistory.getRunEvidence> {
    return runHistory.getRunEvidence(this.board, ...args);
  }

  getRunEvidenceV1(...args: OpArgs<typeof runHistory.getRunEvidenceV1>): ReturnType<typeof runHistory.getRunEvidenceV1> {
    return runHistory.getRunEvidenceV1(this.board, ...args);
  }

  attachEvidenceReference(...args: OpArgs<typeof runHistory.attachEvidenceReference>): ReturnType<typeof runHistory.attachEvidenceReference> {
    return runHistory.attachEvidenceReference(this.board, ...args);
  }

  getAttempts(...args: OpArgs<typeof runHistory.getAttempts>): ReturnType<typeof runHistory.getAttempts> {
    return runHistory.getAttempts(this.board, ...args);
  }

  getCardActivities(...args: OpArgs<typeof runHistory.getCardActivities>): ReturnType<typeof runHistory.getCardActivities> {
    return runHistory.getCardActivities(this.board, ...args);
  }

  // References

  addRunReference(...args: OpArgs<typeof references.addRunReference>): ReturnType<typeof references.addRunReference> {
    return references.addRunReference(this.board, ...args);
  }

  addReference(...args: OpArgs<typeof references.addReference>): ReturnType<typeof references.addReference> {
    return references.addReference(this.board, ...args);
  }

  // Triggers

  setForgeSecret(...args: OpArgs<typeof triggers.setForgeSecret>): ReturnType<typeof triggers.setForgeSecret> {
    return triggers.setForgeSecret(this.board, ...args);
  }

  handleForgeWebhook(...args: OpArgs<typeof triggers.handleForgeWebhook>): ReturnType<typeof triggers.handleForgeWebhook> {
    return triggers.handleForgeWebhook(this.board, ...args);
  }

  setGithubSecret(...args: OpArgs<typeof triggers.setGithubSecret>): ReturnType<typeof triggers.setGithubSecret> {
    return triggers.setGithubSecret(this.board, ...args);
  }

  setGithubConfig(...args: OpArgs<typeof triggers.setGithubConfig>): ReturnType<typeof triggers.setGithubConfig> {
    return triggers.setGithubConfig(this.board, ...args);
  }

  handleGithubWebhook(...args: OpArgs<typeof triggers.handleGithubWebhook>): ReturnType<typeof triggers.handleGithubWebhook> {
    return triggers.handleGithubWebhook(this.board, ...args);
  }

  createCardFromTrigger(...args: OpArgs<typeof triggers.createCardFromTrigger>): ReturnType<typeof triggers.createCardFromTrigger> {
    return triggers.createCardFromTrigger(this.board, ...args);
  }

  // Metering

  setBudget(...args: OpArgs<typeof metering.setBudget>): ReturnType<typeof metering.setBudget> {
    return metering.setBudget(this.board, ...args);
  }

  getUsage(...args: OpArgs<typeof metering.getUsage>): ReturnType<typeof metering.getUsage> {
    return metering.getUsage(this.board, ...args);
  }

  projectSummary(...args: OpArgs<typeof metering.projectSummary>): ReturnType<typeof metering.projectSummary> {
    return metering.projectSummary(this.board, ...args);
  }

  estimateCardCost(...args: OpArgs<typeof metering.estimateCardCost>): ReturnType<typeof metering.estimateCardCost> {
    return metering.estimateCardCost(this.board, ...args);
  }

  // Push delivery

  getNotifications(...args: OpArgs<typeof push.getNotifications>): ReturnType<typeof push.getNotifications> {
    return push.getNotifications(this.board, ...args);
  }

  markNotificationRead(...args: OpArgs<typeof push.markNotificationRead>): ReturnType<typeof push.markNotificationRead> {
    return push.markNotificationRead(this.board, ...args);
  }

  registerPushConfig(...args: OpArgs<typeof push.registerPushConfig>): ReturnType<typeof push.registerPushConfig> {
    return push.registerPushConfig(this.board, ...args);
  }

  getPushDeliveries(...args: OpArgs<typeof push.getPushDeliveries>): ReturnType<typeof push.getPushDeliveries> {
    return push.getPushDeliveries(this.board, ...args);
  }

  dispatchPushDeliveries(...args: OpArgs<typeof push.dispatchPushDeliveries>): ReturnType<typeof push.dispatchPushDeliveries> {
    return push.dispatchPushDeliveries(this.board, ...args);
  }

  // Run reports

  getRunReportOutbox(...args: OpArgs<typeof runReports.getRunReportOutbox>): ReturnType<typeof runReports.getRunReportOutbox> {
    return runReports.getRunReportOutbox(this.board, ...args);
  }

  drainRunReports(...args: OpArgs<typeof runReports.drainRunReports>): ReturnType<typeof runReports.drainRunReports> {
    return runReports.drainRunReports(this.board, ...args);
  }

  enqueueAllRunReports(...args: OpArgs<typeof runReports.enqueueAllRunReports>): ReturnType<typeof runReports.enqueueAllRunReports> {
    return runReports.enqueueAllRunReports(this.board, ...args);
  }

  // Schedules

  createSchedule(...args: OpArgs<typeof schedules.createSchedule>): ReturnType<typeof schedules.createSchedule> {
    return schedules.createSchedule(this.board, ...args);
  }

  updateSchedule(...args: OpArgs<typeof schedules.updateSchedule>): ReturnType<typeof schedules.updateSchedule> {
    return schedules.updateSchedule(this.board, ...args);
  }

  deleteSchedule(...args: OpArgs<typeof schedules.deleteSchedule>): ReturnType<typeof schedules.deleteSchedule> {
    return schedules.deleteSchedule(this.board, ...args);
  }

  listSchedules(...args: OpArgs<typeof schedules.listSchedules>): ReturnType<typeof schedules.listSchedules> {
    return schedules.listSchedules(this.board, ...args);
  }

  fireDueSchedules(...args: OpArgs<typeof schedules.fireDueSchedules>): ReturnType<typeof schedules.fireDueSchedules> {
    return schedules.fireDueSchedules(this.board, ...args);
  }

  // The sweep

  sweepBoard(...args: OpArgs<typeof stale.sweepBoard>): ReturnType<typeof stale.sweepBoard> {
    return stale.sweepBoard(this.board, ...args);
  }

  setStaleSettings(...args: OpArgs<typeof stale.setStaleSettings>): ReturnType<typeof stale.setStaleSettings> {
    return stale.setStaleSettings(this.board, ...args);
  }

  staleCards(...args: OpArgs<typeof stale.staleCards>): ReturnType<typeof stale.staleCards> {
    return stale.staleCards(this.board, ...args);
  }

  // The WebSocket hub (hibernatable) and the alarm

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('expected a websocket upgrade', { status: 426 });
    }
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.send(JSON.stringify({ kind: 'snapshot', state: this.board.snapshot() }));
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer): void {
    // The board is read-only over WebSocket; mutations go through the REST/RPC verbs.
  }

  webSocketClose(ws: WebSocket, code: number, _reason: string, _wasClean: boolean): void {
    try {
      ws.close(code);
    } catch {
      // already closed
    }
  }

  /** DO alarm: reclaim lapsed runs, then re-arm for the next-earliest heartbeat deadline. */
  async alarm(): Promise<void> {
    this.reclaimExpired(this.nowMs());
    // The queue's only unattended drain. See PUSH_DRAIN_BASE_MS for what this
    // fixes; `scheduleReclaim` below is what brings the alarm back while
    // anything is still pending.
    await this.dispatchPushDeliveries();
    // Its own try/catch: a reporter failure must not stop the alarm re-arming below.
    try {
      await this.drainRunReports();
    } catch (err) {
      logReporter('error', { msg: 'superwitness.drain_failed', 'board.id': this.board.getMeta('boardId') ?? '', code: err instanceof Error ? err.name : 'unknown' });
    }
    await this.scheduleReclaim();
  }

  // Reached on the instance by tests (called, spied on or replaced), so they stay methods here.

  private notify(...args: OpArgs<typeof store.notify>): ReturnType<typeof store.notify> {
    return store.notify(this.board, ...args);
  }

  private reportRun(...args: OpArgs<typeof runReports.reportRun>): ReturnType<typeof runReports.reportRun> {
    return runReports.reportRun(this.board, ...args);
  }

  private scheduleReclaim(...args: OpArgs<typeof claims.scheduleReclaim>): ReturnType<typeof claims.scheduleReclaim> {
    return claims.scheduleReclaim(this.board, ...args);
  }

  private now(): string {
    return new Date().toISOString();
  }

  private nowMs(): number {
    return Date.now();
  }
}
