// apps/web/src/routes/b/[boardId]/c/[cardId]/page/+page.ts
/** The card page draws its own frame: the root layout's bare slot (no rail, top bar or tabs). */
export const load = () => ({ shell: 'bare' as const });
