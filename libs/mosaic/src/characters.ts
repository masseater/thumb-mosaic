import characters from "./characters.json" with { type: "json" };

interface Character {
  readonly slug: string;
  readonly name: string;
  readonly vocadbArtistId: number;
  readonly targets: readonly Readonly<{ url: string; member?: string; alphaFloor?: number }>[];
  readonly credit: string;
  readonly og: Readonly<{ left: number; top: number; width: number }>;
  readonly variants: number;
}

const CHARACTERS: readonly Character[] = characters;

export type { Character };
export { CHARACTERS };
