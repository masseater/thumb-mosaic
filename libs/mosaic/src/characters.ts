import characters from "./characters.json" with { type: "json" };

interface Character {
  readonly slug: string;
  readonly name: string;
  readonly vocadbArtistId: number;
  readonly targetUrl: string;
  readonly cols: number;
  readonly credit: string;
  readonly og: Readonly<{ col: number; row: number; cols: number }>;
}

const CHARACTERS: readonly Character[] = characters;

export type { Character };
export { CHARACTERS };
