/**
 * The List's grouping and sort keys: a leaf, so the app store (which holds the
 * chosen grouping and sort), the List's types and its transient UI state can all name them
 * without importing each other.
 */
export type ListGroupBy = 'stage' | 'state' | 'owner' | 'priority';
export type ListSortKey = 'priority' | 'title' | 'state' | 'agent' | 'due' | 'cost' | 'attempts' | 'age';
export interface ListSort { key: ListSortKey; ascending: boolean }
