/**
 * Treaty plan step 4: what this board pushes must validate against treaty's schemas, unchanged.
 *
 * `test/setup.ts` runs every push body the suite reads back (`getPushDeliveries`) through
 * `checkAgainstTreaty`, so each scenario the suite already builds (plain, subject-bound, variant,
 * quorum, release-time and checked gates, questions, approval requests, follow-ups, waiting cards,
 * reminders and escalations, held approvals, machine checks, record events) is checked against
 * `@superjackfruitlabs/treaty-event-schemas`. Every pushed body is typed: a body whose event
 * treaty has no schema for fails the test that read it, as does one that fails its schema.
 */
import { Validator } from '@cfworker/json-schema';
import catalog from '@superjackfruitlabs/treaty-event-schemas/catalog.json';
import cardReady from '@superjackfruitlabs/treaty-event-schemas/superpipeline/card.ready.v1.json';
import attentionPending from '@superjackfruitlabs/treaty-event-schemas/superpipeline/attention.pending.v1.json';
import checkFailed from '@superjackfruitlabs/treaty-event-schemas/superpipeline/check.failed.v1.json';
import checkOverridden from '@superjackfruitlabs/treaty-event-schemas/superpipeline/check.overridden.v1.json';
import decisionPulledBack from '@superjackfruitlabs/treaty-event-schemas/superpipeline/decision.pulled_back.v1.json';
import decisionReleased from '@superjackfruitlabs/treaty-event-schemas/superpipeline/decision.released.v1.json';
import decisionTimeout from '@superjackfruitlabs/treaty-event-schemas/superpipeline/decision.timeout.v1.json';
import deliveryPending from '@superjackfruitlabs/treaty-event-schemas/superpipeline/delivery.pending.v1.json';
import elicitationPending from '@superjackfruitlabs/treaty-event-schemas/superpipeline/elicitation.pending.v1.json';
import gateApprovalRecorded from '@superjackfruitlabs/treaty-event-schemas/superpipeline/gate.approval_recorded.v1.json';
import gatePending from '@superjackfruitlabs/treaty-event-schemas/superpipeline/gate.pending.v1.json';
import cardsStale from '@superjackfruitlabs/treaty-event-schemas/superpipeline/cards.stale.v1.json';
import record from '@superjackfruitlabs/treaty-event-schemas/superpipeline/record.v1.json';
import workAvailable from '@superjackfruitlabs/treaty-event-schemas/superpipeline/work.available.v1.json';

const validators = new Map<string, Validator>();
/** Every SuperPipeline schema treaty publishes; `decision.timeout` covers `decision.reminded` and `decision.escalated`. */
const SCHEMAS = [
  gatePending,
  elicitationPending,
  deliveryPending,
  attentionPending,
  decisionTimeout,
  gateApprovalRecorded,
  decisionReleased,
  decisionPulledBack,
  checkFailed,
  checkOverridden,
  cardReady,
  record,
  workAvailable,
  cardsStale,
];
for (const schema of SCHEMAS) {
  const asData: object = schema;
  validators.set(schema.$id, new Validator(asData, '2020-12', false));
}
const byEvent = new Map(
  catalog.events.filter((e) => e.producer === 'superpipeline').map((e) => [e.pushName, validators.get(e.dataschema)]),
);

/** How many bodies have been checked in this test file, so a test can prove the check ran. */
export const treatyChecked = { count: 0 };

export function checkAgainstTreaty(json: string): void {
  const body: unknown = JSON.parse(json);
  const event = typeof body === 'object' && body !== null && 'event' in body ? body.event : undefined;
  const validator = typeof event === 'string' ? byEvent.get(event) : undefined;
  if (!validator) throw new Error(`${String(event)} has no treaty schema: every pushed body must be one treaty's catalog names`);
  treatyChecked.count++;
  const result = validator.validate(body);
  if (!result.valid) {
    const errors = result.errors.slice(0, 5).map((e) => `${e.instanceLocation}: ${e.error}`);
    throw new Error(`${String(event)} does not validate against treaty's schema:\n${errors.join('\n')}`);
  }
}
