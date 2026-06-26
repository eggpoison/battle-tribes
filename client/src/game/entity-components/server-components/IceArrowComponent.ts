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
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.iceArrow, typeof IceArrowComponentArray> {}
}

export const IceArrowComponentArray = registerServerComponentArray(
   ServerComponentType.iceArrow,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
IceArrowComponentArray.onTick = onTick;
IceArrowComponentArray.onRemove = onRemove;

function decodeData(): IceArrowComponentData {
   return {};
}

function createComponent(): IceArrowComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}

function onTick(entity: Entity): void {
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

function onRemove(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (let i = 0; i < 6; i++) {
      createIceSpeckProjectile(transformComponent);
   }
}