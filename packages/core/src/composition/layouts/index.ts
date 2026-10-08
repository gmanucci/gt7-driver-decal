import type { DecalLayout } from '../decal-layout';
import {
  horizontalLayout,
  horizontalReverseLayout,
  textOnlyLayout,
  verticalLayout,
  verticalReverseLayout,
} from './stack-layouts';

export const builtInLayouts: readonly DecalLayout[] = [
  horizontalLayout,
  horizontalReverseLayout,
  verticalLayout,
  verticalReverseLayout,
  textOnlyLayout,
];

export {
  horizontalLayout,
  horizontalReverseLayout,
  textOnlyLayout,
  verticalLayout,
  verticalReverseLayout,
};
