import { Entity, Settings, ServerComponentType } from "webgl-test-shared";
import { createIceSpeckProjectile, createSnowflakeParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import _ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface IceArrowComponentData {}

export interface IceArrowComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.iceArrow, _IceArrowComponentArray, IceArrowComponentData> {}
}

class _IceArrowComponentArray extends _ServerComponentArray<IceArrowComponent, IceArrowComponentData> {
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
         createSnowflakeParticle(hitbox.box.position.x, hitbox.box.position.y);
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