import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { Settings } from "../../../../../shared/src/settings";
import { createIceSpeckProjectile, createSnowflakeParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface IceArrowComponentData {}

export interface IceArrowComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.iceArrow, _IceArrowComponentArray> {}
}

class _IceArrowComponentArray extends ServerComponentArray<IceArrowComponent, IceArrowComponentData> {
   public decodeData(): IceArrowComponentData {
      return {};
   }

   public createComponent(): IceArrowComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 0;
   }

   public onTick(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];

      if (Math.random() < 30 * Settings.DT_S) {
         createSnowflakeParticle(hitbox.box.posX, hitbox.box.posY);
      }

      if (Math.random() < 30 * Settings.DT_S) {
         // @Incomplete: These types of particles don't fit
         createIceSpeckProjectile(transformComponent);
      }

      // @Incomplete: Need snow speck particles
   }

   public onRemove(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      for (let i = 0; i < 6; i++) {
         createIceSpeckProjectile(transformComponent);
      }
   }
}

export const IceArrowComponentArray = registerServerComponentArray(ServerComponentType.iceArrow, _IceArrowComponentArray, true);