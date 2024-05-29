import { EntityType } from "webgl-test-shared/dist/entities";
import { Point, randItem } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import { playSound, ROCK_HIT_SOUNDS } from "../sound";

class Golem extends Entity {
   constructor(position: Point, id: number, ageTicks: number) {
      super(position, id, EntityType.golem, ageTicks);
   }

   protected onHit(): void {
      playSound(randItem(ROCK_HIT_SOUNDS), 0.3, 1, this.position.x, this.position.y);
   }
}

export default Golem;