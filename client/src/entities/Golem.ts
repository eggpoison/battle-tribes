import { randItem } from "battletribes-shared/utils";
import Entity from "../Entity";
import { playSound, ROCK_HIT_SOUNDS } from "../sound";
import { TransformComponentArray } from "../entity-components/TransformComponent";

class Golem extends Entity {
   protected onHit(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      playSound(randItem(ROCK_HIT_SOUNDS), 0.3, 1, transformComponent.position);
   }
}

export default Golem;