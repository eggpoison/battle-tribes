import { ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import { Settings } from "webgl-test-shared/dist/settings";
import { randFloat } from "webgl-test-shared/dist/utils";
import { createFlyParticle } from "../particles";
import { playSound } from "../sound";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

class PunjiSticksComponent extends ServerComponent {
   public ticksSinceLastFly = 0;
   public ticksSinceLastFlySound = 0;

   public padData(): void {}
   public updateFromData(): void {}
}

export default PunjiSticksComponent;

export const PunjiSticksComponentArray = new ComponentArray<PunjiSticksComponent>(ComponentArrayType.server, ServerComponentType.punjiSticks, true, {
   onTick: onTick
});
   
function onTick(punjiSticksComponent: PunjiSticksComponent): void {
   const transformComponent = punjiSticksComponent.entity.getServerComponent(ServerComponentType.transform);

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