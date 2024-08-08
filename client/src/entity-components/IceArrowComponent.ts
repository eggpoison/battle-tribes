import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import { createIceSpeckProjectile, createSnowflakeParticle } from "../particles";
import ServerComponent from "./ServerComponent";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

class IceArrowComponent extends ServerComponent {
   public onRemove(): void {
      const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
      for (let i = 0; i < 6; i++) {
         createIceSpeckProjectile(transformComponent);
      }
   }
   
   public padData(): void {}
   public updateFromData(): void {}
}

export default IceArrowComponent;

export const IceArrowComponentArray = new ComponentArray<IceArrowComponent>(ComponentArrayType.server, ServerComponentType.iceArrow, {
   onTick: onTick
});

function onTick(iceArrowComponent: IceArrowComponent): void {
   const transformComponent = iceArrowComponent.entity.getServerComponent(ServerComponentType.transform);

   if (Math.random() < 30 / Settings.TPS) {
      createSnowflakeParticle(transformComponent.position.x, transformComponent.position.y);
   }

   if (Math.random() < 30 / Settings.TPS) {
      // @Incomplete: These types of particles don't fit
      createIceSpeckProjectile(transformComponent);
   }

   // @Incomplete: Need snow speck particles
}