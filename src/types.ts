export type JsonValue =
  | null
  | string
  | number
  | boolean
  | JsonValue[]
  | { [key: string]: JsonValue };

export type QueryRow = Record<string, JsonValue>;

export type SearchResult = {
  kind: 'document' | 'chunk' | 'entity' | 'topic';
  id: string;
  title: string;
  snippet: string;
  score: number;
  metadata?: Record<string, JsonValue>;
};

