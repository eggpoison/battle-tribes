import { EntityType } from "webgl-test-shared/dist/entities";
import { randItem } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import { playSound, ROCK_HIT_SOUNDS } from "../sound";
import { ServerComponentType } from "webgl-test-shared/dist/components";

class Golem extends Entity {
   constructor(id: number) {
      super(id, EntityType.golem);
   }

   protected onHit(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playSound(randItem(ROCK_HIT_SOUNDS), 0.3, 1, transformComponent.position);
   }
}

export default Golem;