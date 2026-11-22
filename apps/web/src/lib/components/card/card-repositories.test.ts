// apps/web/src/lib/components/card/card-repositories.test.ts
import { describe, expect, it } from 'vitest';
import type { Stage } from '$lib/api';
import { choicePatch, choosableRepositories, needsPrimary, repositoriesFact, repositoriesWait, startRepository } from './card-repositories';

const policy = { repositories: [{ name: 'api' }, { name: 'app' }, { name: 'docs' }], checkpointRepository: 'app' };
const chooses: Stage = { key: 'build', name: 'Build', order: 1, cardCheckpointPolicy: policy };
const withDefault: Stage = { ...chooses, cardCheckpointPolicy: { ...policy, defaultRepositories: ['app'] } };
const one: Stage = { ...chooses, cardCheckpointPolicy: { repositories: [{ name: 'app' }], checkpointRepository: 'app' } };
const plain: Stage = { key: 'plan', name: 'Plan', order: 0 };

describe('a card on a stage whose cards choose', () => {
  it('waits for a person only when it names none and the stage gives it nothing', () => {
    expect(repositoriesWait({}, chooses)).toMatch(/^Waits for a person: choose the repositories/);
    expect(repositoriesWait({ repositories: ['api'] }, chooses)).toBeNull();
    expect(repositoriesWait({}, withDefault)).toBeNull();
    expect(repositoriesWait({}, one)).toBeNull();
    expect(repositoriesWait({}, plain)).toBeNull();
  });
  it('says what it works in, or what it will get', () => {
    expect(repositoriesFact({ repositories: ['api', 'app'] }, chooses)).toBe('api, app · starts in app');
    expect(repositoriesFact({ repositories: ['api', 'docs'], primaryRepository: 'docs' }, chooses)).toBe('api, docs · starts in docs');
    expect(repositoriesFact({ repositories: ['docs'] }, chooses)).toBe('docs');
    expect(repositoriesFact({}, withDefault)).toBe("none chosen · the stage's default: app");
    expect(repositoriesFact({}, one)).toBe("none chosen · the stage's only one: app");
    expect(repositoriesFact({}, chooses)).toBe('none');
  });
  it('finds the start repository the way the board narrows', () => {
    expect(startRepository(['api', 'app'], '', policy)).toBe('app');
    expect(startRepository(['docs'], '', policy)).toBe('docs');
    expect(startRepository(['api', 'docs'], '', policy)).toBeNull();
    expect(startRepository(['api', 'docs'], 'api', policy)).toBe('api');
    expect(needsPrimary(['api', 'docs'], '', policy)).toBe(true);
    expect(needsPrimary(['api', 'app'], '', policy)).toBe(false);
  });
  it('offers its stage\'s allowlist, or every choosing stage\'s from elsewhere', () => {
    const other: Stage = { key: 'ship', name: 'Ship', order: 2, cardCheckpointPolicy: { repositories: [{ name: 'site' }], checkpointRepository: 'site' } };
    expect(choosableRepositories([plain, chooses, other], 'build')).toEqual(['api', 'app', 'docs']);
    expect(choosableRepositories([plain, chooses, other], 'plan')).toEqual(['api', 'app', 'docs', 'site']);
  });
  it('sends the whole choice, sorted, with a primary only when it says something', () => {
    expect(choicePatch(['docs', 'api'], 'docs', policy)).toEqual({ repositories: ['api', 'docs'], primaryRepository: 'docs' });
    expect(choicePatch(['api', 'app'], 'app', policy)).toEqual({ repositories: ['api', 'app'] });
    expect(choicePatch(['api', 'app'], 'api', policy)).toEqual({ repositories: ['api', 'app'], primaryRepository: 'api' });
    expect(choicePatch([], '', policy)).toEqual({ repositories: null });
  });
});
