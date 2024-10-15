import { ServerComponentType } from "battletribes-shared/components";
import ServerComponent from "../ServerComponent";
import { Settings } from "battletribes-shared/settings";
import { randFloat } from "battletribes-shared/utils";
import { createFlyParticle } from "../../particles";
import { playSound } from "../../sound";
import { EntityID } from "../../../../shared/src/entities";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";

class PunjiSticksComponent extends ServerComponent {
   public ticksSinceLastFly = 0;
   public ticksSinceLastFlySound = 0;
}

export default PunjiSticksComponent;

export const PunjiSticksComponentArray = new ServerComponentArray<PunjiSticksComponent>(ServerComponentType.punjiSticks, true, {
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});
   
function onTick(punjiSticksComponent: PunjiSticksComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   punjiSticksComponent.ticksSinceLastFly++;
   const flyChance = ((punjiSticksComponent.ticksSinceLastFly / Settings.TPS) - 0.25) * 0.2;
   if (Math.random() / Settings.TPS < flyChance) {
      const offsetMagnitude = 32 * Math.random();
      const offsetDirection = 2 * Math.PI * Math.random();
      const x = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);
      createFlyParticle(x, y);
      punjiSticksComponent.ticksSinceLastFly = 0;
   }

   punjiSticksComponent.ticksSinceLastFlySound++;
   const soundChance = ((punjiSticksComponent.ticksSinceLastFlySound / Settings.TPS) - 0.3) * 2;
   if (Math.random() < soundChance / Settings.TPS) {
      playSound("flies.mp3", 0.15, randFloat(0.9, 1.1), transformComponent.position);
      punjiSticksComponent.ticksSinceLastFlySound = 0;
   }
}

function padData(): void {}

function updateFromData(): void {}