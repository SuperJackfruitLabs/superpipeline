// The board routes, in the order they are tried against what follows `/v1/boards/:id/`. Where two
// patterns overlap the earlier wins: a card's `resume` POST before its any-method 405,
// `runs/:id/evidence-reference` and `runs/:id/approval-subject/verify` before `runs/:id/:verb`,
// and `gates/pending` before `gates/:id`. A path no route takes is a 405 (`methodNotAllowed`).
// Before any of these runs, `entry.ts` has resolved the caller and answered the board collection.
import { liveFeed, boardSnapshot, boardRename, stageEdit, stagesReplace, boardDelete, boardEvents, boardUsage, notificationsList, notificationRead, profilesList, profileSet, staleSettings, budgetSet, decisionTimeoutSet } from './board';
import { cardArchive, cardCreate, cardMove, cardResume, cardRead, cardEdit, cardDelete, cardSplit, cardReference, cardAttempts, cardActivities, cardEstimate } from './cards';
import { commentsList, commentAdd, commentDelete, commentNeverEdited } from './comments';
import { gatesPending, gateRead, gateResolve, gatePullBack, gateDelivery, deliveriesPending, elicitationsPending, elicitationAnswer, attentionPending } from './gates';
import { pushConfigRegister, pushDispatch, pushDeliveries, githubConfig, triggerCreate, forgeSecret, forgeWebhook, githubWebhook } from './integrations';
import { linksEdit, cardLinks } from './links';
import { claim, runRead, runAttempts, evidenceReference, approvalSubjectVerify, runVerb } from './runs';
import { schedules } from './schedules';
import { methodNotAllowed } from '../errors';
import { route, type Route } from '../router';
import type { BoardRequest } from './request';

export const BOARD_ROUTES: readonly Route<BoardRequest>[] = [
  route('*', /^ws$/, liveFeed),
  route('GET', /^$/, boardSnapshot),
  route('PATCH', /^$/, boardRename),
  route('PATCH', /^stages\/([^/]+)$/, stageEdit),
  route('PUT', /^stages$/, stagesReplace),
  route('DELETE', /^$/, boardDelete),
  route('POST', /^cards$/, cardCreate),
  route('POST', /^cards\/([^/]+)\/move$/, cardMove),
  route('POST', /^cards\/([^/]+)\/resume$/, cardResume),
  route('*', /^cards\/([^/]+)\/resume$/, methodNotAllowed),
  route('POST', /^cards\/([^/]+)\/archive$/, cardArchive),
  route('GET', /^cards\/([^/]+)$/, cardRead),
  route('PATCH', /^cards\/([^/]+)$/, cardEdit),
  route('DELETE', /^cards\/([^/]+)$/, cardDelete),
  route('GET', /^cards\/([^/]+)\/comments$/, commentsList),
  route('POST', /^cards\/([^/]+)\/comments$/, commentAdd),
  route('*', /^cards\/([^/]+)\/comments$/, methodNotAllowed),
  route('DELETE', /^cards\/([^/]+)\/comments\/([^/]+)$/, commentDelete),
  route('*', /^cards\/([^/]+)\/comments\/([^/]+)$/, commentNeverEdited),
  route('POST,DELETE', /^links$/, linksEdit),
  route('POST', /^cards\/([^/]+)\/split$/, cardSplit),
  route('PUT', /^cards\/([^/]+)\/references$/, cardReference),
  route('GET', /^cards\/([^/]+)\/attempts$/, cardAttempts),
  route('GET', /^cards\/([^/]+)\/activities$/, cardActivities),
  route('GET', /^cards\/([^/]+)\/estimate$/, cardEstimate),
  route('GET', /^cards\/([^/]+)\/links$/, cardLinks),
  route('GET', /^events$/, boardEvents),
  route('GET', /^usage$/, boardUsage),
  route('GET', /^notifications$/, notificationsList),
  route('POST', /^notifications\/(\d+)\/read$/, notificationRead),
  route('GET', /^profiles$/, profilesList),
  route('POST', /^profiles$/, profileSet),
  route('*', /^schedules(?:\/([^/]+))?$/, schedules),
  route('POST', /^push-configs$/, pushConfigRegister),
  route('POST', /^push\/dispatch$/, pushDispatch),
  route('GET', /^push\/deliveries$/, pushDeliveries),
  route('PUT', /^stale$/, staleSettings),
  route('PUT', /^decision-timeout$/, decisionTimeoutSet),
  route('PUT', /^budget$/, budgetSet),
  route('PUT', /^github$/, githubConfig),
  route('POST', /^triggers$/, triggerCreate),
  route('PUT', /^forge$/, forgeSecret),
  route('POST', /^webhooks\/forge$/, forgeWebhook),
  route('POST', /^webhooks\/github$/, githubWebhook),
  route('POST', /^claims$/, claim),
  route('GET', /^runs\/([^/]+)$/, runRead),
  route('GET', /^runs\/([^/]+)\/attempts$/, runAttempts),
  route('POST', /^runs\/([^/]+)\/evidence-reference$/, evidenceReference),
  route('POST', /^runs\/([^/]+)\/approval-subject\/verify$/, approvalSubjectVerify),
  route('POST', /^runs\/([^/]+)\/([^/]+)$/, runVerb),
  route('GET', /^gates\/pending$/, gatesPending),
  route('GET', /^gates\/([^/]+)$/, gateRead),
  route('POST', /^gates\/([^/]+)\/resolve$/, gateResolve),
  route('POST', /^gates\/([^/]+)\/pull-back$/, gatePullBack),
  route('POST', /^gates\/([^/]+)\/delivery$/, gateDelivery),
  route('GET', /^deliveries\/pending$/, deliveriesPending),
  route('GET', /^elicitations\/pending$/, elicitationsPending),
  route('GET', /^attention\/pending$/, attentionPending),
  route('POST', /^elicitations\/([^/]+)\/answer$/, elicitationAnswer),
];
