import type { Env } from '../env';
import type { ServiceTokenCache } from '../superwitness/client';
import type { BoardContext } from './context';
import * as approvalSubjects from './approval-subjects';
import * as checkVerdicts from './check-verdicts';
import * as machineChecks from './machine-checks';
import * as store from './card-store';
import * as claims from './claims';
import * as comments from './comments';
import * as decisionTimeouts from './decision-timeouts';
import * as elicitations from './elicitations';
import * as gateExpiry from './gate-expiry';
import * as gateRelease from './gate-release';
import * as gates from './gates';
import * as holds from './holds';
import * as maintenance from './maintenance';
import * as metering from './metering';
import * as moves from './moves';
import * as pipeline from './pipeline';
import * as ready from './ready';
import * as references from './references';
import * as runReports from './run-reports';
import * as stale from './stale';
import * as triggers from './triggers';

/** What the Durable Object hands the board: its storage, its environment and the reporter's token. */
export interface BoardBase {
  readonly sql: SqlStorage;
  readonly ctx: DurableObjectState;
  readonly env: Env;
  readonly reporterToken: ServiceTokenCache;
}

/**
 * The operations a call inside the board makes through the Durable Object itself, as `this.x()`
 * did before the split: its public verbs, and the private methods tests reach on the instance.
 */
export type ShellRoutes = Pick<
  BoardContext,
  | 'addComment'
  | 'addLink'
  | 'addReference'
  | 'backfillDueDates'
  | 'backfillLabelNames'
  | 'backfillTerminalStageCards'
  | 'createCard'
  | 'createCardFromTrigger'
  | 'createChildCard'
  | 'fireDueSchedules'
  | 'getRunEvidence'
  | 'listComments'
  | 'moveCard'
  | 'notify'
  | 'now'
  | 'nowMs'
  | 'reportRun'
  | 'scheduleReclaim'
  | 'updateCard'
>;

/**
 * Builds the board context: each operation bound to the board, either to its module or, for the
 * ones a test may replace on the instance, back through the Durable Object.
 */
export function wireBoard(base: BoardBase, routes: ShellRoutes): BoardContext {
  const board: BoardContext = {
    sql: base.sql,
    ctx: base.ctx,
    env: base.env,
    reporterToken: base.reporterToken,
    reportDrain: null,
    addComment: (...a) => routes.addComment(...a),
    addLink: (...a) => routes.addLink(...a),
    addReference: (...a) => routes.addReference(...a),
    advanceCard: (...a) => moves.advanceCard(board, ...a),
    allCards: (...a) => store.allCards(board, ...a),
    allReferences: (...a) => references.allReferences(board, ...a),
    approvalSubjectView: (...a) => approvalSubjects.approvalSubjectView(board, ...a),
    authorizeRun: (...a) => claims.authorizeRun(board, ...a),
    backfillArchivedReviews: (...a) => maintenance.backfillArchivedReviews(board, ...a),
    backfillDueDates: (...a) => routes.backfillDueDates(...a),
    backfillLabelNames: (...a) => routes.backfillLabelNames(...a),
    backfillTerminalStageCards: (...a) => routes.backfillTerminalStageCards(...a),
    blockersOf: (...a) => holds.blockersOf(board, ...a),
    boardOverBudget: (...a) => metering.boardOverBudget(board, ...a),
    boardUsage: (...a) => metering.boardUsage(board, ...a),
    budgetCap: (...a) => metering.budgetCap(board, ...a),
    cancelElicitationsForCard: (...a) => elicitations.cancelElicitationsForCard(board, ...a),
    cancelElicitationsForRun: (...a) => elicitations.cancelElicitationsForRun(board, ...a),
    cancelPendingReviews: (...a) => gates.cancelPendingReviews(board, ...a),
    cardCost: (...a) => metering.cardCost(board, ...a),
    childrenCost: (...a) => metering.childrenCost(board, ...a),
    claimableWhere: (...a) => holds.claimableWhere(...a),
    commentsForRunContext: (...a) => comments.commentsForRunContext(board, ...a),
    completesOnArrival: (...a) => moves.completesOnArrival(board, ...a),
    countInStage: (...a) => store.countInStage(board, ...a),
    createCard: (...a) => routes.createCard(...a),
    createCardFromTrigger: (...a) => routes.createCardFromTrigger(...a),
    createChildCard: (...a) => routes.createChildCard(...a),
    createGate: (...a) => gates.createGate(board, ...a),
    denyForeignRun: (...a) => claims.denyForeignRun(...a),
    elicitationsForRun: (...a) => elicitations.elicitationsForRun(board, ...a),
    emit: (...a) => store.emit(board, ...a),
    endAttempt: (...a) => moves.endAttempt(board, ...a),
    endLapsedDeliveries: (...a) => gateExpiry.endLapsedDeliveries(board, ...a),
    actOnApproval: (...a) => gates.actOnApproval(board, ...a),
    sendBackForChanges: (...a) => gates.sendBackForChanges(board, ...a),
    releaseHeldApprovals: (...a) => gateRelease.releaseHeldApprovals(board, ...a),
    awaitChecks: (...a) => machineChecks.awaitChecks(board, ...a),
    recordCiResult: (...a) => machineChecks.recordCiResult(board, ...a),
    resetCiChecksForCard: (...a) => machineChecks.resetCiChecksForCard(board, ...a),
    pollVerdictChecks: (...a) => checkVerdicts.pollVerdictChecks(board, ...a),
    endReviewsOfArchivedCard: (...a) => gates.endReviewsOfArchivedCard(board, ...a),
    expireGate: (...a) => gateExpiry.expireGate(board, ...a),
    expireLapsedGates: (...a) => gateExpiry.expireLapsedGates(board, ...a),
    sweepDecisionTimeouts: (...a) => decisionTimeouts.sweepDecisionTimeouts(board, ...a),
    startDecisionWait: (...a) => decisionTimeouts.startDecisionWait(board, ...a),
    decisionDeadline: (...a) => decisionTimeouts.decisionDeadline(board, ...a),
    fireDueSchedules: (...a) => routes.fireDueSchedules(...a),
    gatesForCard: (...a) => gates.gatesForCard(board, ...a),
    getCard: (...a) => store.getCard(board, ...a),
    getCardHandoffJson: (...a) => store.getCardHandoffJson(board, ...a),
    getCardRow: (...a) => store.getCardRow(board, ...a),
    getMeta: (...a) => store.getMeta(board, ...a),
    getRunEvidence: (...a) => routes.getRunEvidence(...a),
    getRunRow: (...a) => claims.getRunRow(board, ...a),
    invalidateApprovalSubject: (...a) => approvalSubjects.invalidateApprovalSubject(board, ...a),
    isAgentClaimable: (...a) => claims.isAgentClaimable(...a),
    isHeldBack: (...a) => holds.isHeldBack(board, ...a),
    listComments: (...a) => routes.listComments(...a),
    moveCard: (...a) => routes.moveCard(...a),
    mustGetCard: (...a) => store.mustGetCard(board, ...a),
    mustGetReference: (...a) => references.mustGetReference(board, ...a),
    notify: (...a) => routes.notify(...a),
    notifyDependents: (...a) => holds.notifyDependents(board, ...a),
    notifyWorkAvailable: (...a) => ready.cardBecameReady(board, ...a),
    openPlacementWindow: (...a) => ready.openPlacementWindow(board, ...a),
    now: (...a) => routes.now(...a),
    nowMs: (...a) => routes.nowMs(...a),
    openChildCount: (...a) => holds.openChildCount(board, ...a),
    openChildren: (...a) => holds.openChildren(board, ...a),
    openElicitation: (...a) => elicitations.openElicitation(board, ...a),
    parentIdOf: (...a) => holds.parentIdOf(board, ...a),
    parkForHuman: (...a) => moves.parkForHuman(board, ...a),
    parseHandoff: (...a) => store.parseHandoff(...a),
    pendingElicitations: (...a) => elicitations.pendingElicitations(board, ...a),
    pendingGates: (...a) => gates.pendingGates(board, ...a),
    prepareApprovalSubject: (...a) => approvalSubjects.prepareApprovalSubject(board, ...a),
    reportRun: (...a) => routes.reportRun(...a),
    resolveCard: (...a) => moves.resolveCard(board, ...a),
    resumeParentAdvanceIfFree: (...a) => moves.resumeParentAdvanceIfFree(board, ...a),
    reworkOrPark: (...a) => moves.reworkOrPark(board, ...a),
    rowToCard: (...a) => store.rowToCard(board, ...a),
    rowToReference: (...a) => references.rowToReference(...a),
    runJudgedByGate: (...a) => runReports.runJudgedByGate(board, ...a),
    scheduleReclaim: (...a) => routes.scheduleReclaim(...a),
    setMeta: (...a) => store.setMeta(board, ...a),
    setNeedsHuman: (...a) => moves.setNeedsHuman(board, ...a),
    subjectExpired: (...a) => gateExpiry.subjectExpired(board, ...a),
    snapshot: (...a) => pipeline.snapshot(board, ...a),
    stages: (...a) => store.stages(board, ...a),
    staleSettings: (...a) => stale.staleSettings(board, ...a),
    triggerGrant: (...a) => triggers.triggerGrant(board, ...a),
    unresolvedBlockerCount: (...a) => holds.unresolvedBlockerCount(board, ...a),
    updateCard: (...a) => routes.updateCard(...a),
    writeComment: (...a) => comments.writeComment(board, ...a),
  };
  return board;
}
