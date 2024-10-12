import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { createIceSpeckProjectile, createSnowflakeParticle } from "../particles";
import ServerComponent from "./ServerComponent";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { EntityID } from "../../../shared/src/entities";

class IceArrowComponent extends ServerComponent {
   public onRemove(): void {
      const transformComponent = TransformComponentArray.getComponent(this.entity.id)
      for (let i = 0; i < 6; i++) {
         createIceSpeckProjectile(transformComponent);
      }
   }
   
   public padData(): void {}
   public updateFromData(): void {}
}

export default IceArrowComponent;

export const IceArrowComponentArray = new ComponentArray<IceArrowComponent>(ComponentArrayType.server, ServerComponentType.iceArrow, true, {
   onTick: onTick
});

function onTick(_iceArrowComponent: IceArrowComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   if (Math.random() < 30 / Settings.TPS) {
      createSnowflakeParticle(transformComponent.position.x, transformComponent.position.y);
   }

   if (Math.random() < 30 / Settings.TPS) {
      // @Incomplete: These types of particles don't fit
      createIceSpeckProjectile(transformComponent);
   }

   // @Incomplete: Need snow speck particles
}