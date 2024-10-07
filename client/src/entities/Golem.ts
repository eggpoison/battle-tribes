import { randItem } from "battletribes-shared/utils";
import Entity from "../Entity";
import { playSound, ROCK_HIT_SOUNDS } from "../sound";
import { ServerComponentType } from "battletribes-shared/components";

class Golem extends Entity {
   protected onHit(): void {
      const transformComponent = this.getServerComponent(ServerComponentType.transform);
      playSound(randItem(ROCK_HIT_SOUNDS), 0.3, 1, transformComponent.position);
   }
}

export default Golem;