import { SlimewispComponentData } from "webgl-test-shared/dist/components";
import { SLIMEWISP_MERGE_TIME } from "../entities/mobs/slimewisp";

export class SlimewispComponent {
   public mergeTimer = SLIMEWISP_MERGE_TIME;
}

export function serialiseSlimewispComponent(): SlimewispComponentData {
   return {};
}