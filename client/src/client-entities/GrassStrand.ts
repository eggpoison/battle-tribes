import { ServerComponentType } from "webgl-test-shared/dist/components";
import Entity, { ComponentDataRecord } from "../Entity";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import Board from "../Board";
import { lerp } from "webgl-test-shared/dist/utils";

class GrassStrand extends Entity {
   constructor(id: number, componentRecord: ComponentDataRecord) {
      super(id, EntityType.grassStrand);
   }
}

export default GrassStrand;