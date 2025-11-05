import { ServerComponentType } from "webgl-test-shared/src/components";
import { Settings } from "webgl-test-shared/src/settings";
import { createIceSpeckProjectile, createSnowflakeParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import { Entity } from "webgl-test-shared/src/entities";
import ServerComponentArray from "../ServerComponentArray";

export interface IceArrowComponentData {}

export interface IceArrowComponent {}

export const IceArrowComponentArray = new ServerComponentArray<IceArrowComponent, IceArrowComponentData, never>(ServerComponentType.iceArrow, true, createComponent, getMaxRenderParts, decodeData);
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
      createSnowflakeParticle(hitbox.box.position.x, hitbox.box.position.y);
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