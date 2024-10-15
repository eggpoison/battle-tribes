import { ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { createIceSpeckProjectile, createSnowflakeParticle } from "../../particles";
import ServerComponent from "../ServerComponent";
import { TransformComponentArray } from "./TransformComponent";
import { EntityID } from "battletribes-shared/entities";
import ServerComponentArray from "../ServerComponentArray";

class IceArrowComponent extends ServerComponent {}

export default IceArrowComponent;

export const IceArrowComponentArray = new ServerComponentArray<IceArrowComponent>(ServerComponentType.iceArrow, true, {
   onTick: onTick,
   onRemove: onRemove,
   padData: padData,
   updateFromData: updateFromData
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

function onRemove(entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (let i = 0; i < 6; i++) {
      createIceSpeckProjectile(transformComponent);
   }
}

function padData(): void {}

function updateFromData(): void {}