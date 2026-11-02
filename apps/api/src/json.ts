/** JSON-serializable value — used for everything that crosses the Durable Object RPC boundary. */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
