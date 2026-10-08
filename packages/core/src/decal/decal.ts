import type { Alignment } from '../composition/decal-layout';
import type { NameMode } from '../names/name-formatter';
import type { SizeStatus } from '../svg/svg-size-validator';

/** Serializable, so it can later be sent as-is to a backend (POST /api/decals). */
export interface DecalRequest {
  /** ISO 3166-1 alpha-2 code. Omit for a text-only decal. */
  country?: string | undefined;
  name: string;
  nameMode: NameMode;
  /** Font id. */
  font: string;
  /** Layout id. */
  layout: string;
  gap?: number | undefined;
  alignment?: Alignment | undefined;
  /** Canvas size in SVG units. Defaults to 500 x 120. */
  width?: number | undefined;
  height?: number | undefined;
}

export interface GeneratedDecal {
  svg: string;
  width: number;
  height: number;
  sizeBytes: number;
  /** True when the SVG fits GT7's 15 KB limit. Downloads must be blocked when false. */
  valid: boolean;
  status: SizeStatus;
  maxBytes: number;
  targetBytes: number;
  /** The formatted text that was rendered. */
  text: string;
  /** Characters the chosen font cannot draw. */
  missingCharacters: string[];
}
