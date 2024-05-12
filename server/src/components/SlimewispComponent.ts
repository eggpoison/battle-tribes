import { SlimewispComponentData } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import { SLIMEWISP_MERGE_TIME } from "../entities/mobs/slimewisp";

export class SlimewispComponent {
   public mergeTimer = SLIMEWISP_MERGE_TIME;
}

export function serialiseSlimewispComponent(_slimewisp: Entity): SlimewispComponentData {
   return {};
}