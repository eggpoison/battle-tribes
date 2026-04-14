import { Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../../texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getTransformComponentData } from "../../entity-component-types";

export interface SpearProjectileComponentData {}

interface IntermediateInfo {}

export interface SpearProjectileComponent {}

export const SpearProjectileComponentArray = new ServerComponentArray<SpearProjectileComponent, SpearProjectileComponentData, IntermediateInfo>(ServerComponentType.spearProjectile, true, createComponent, getMaxRenderParts, decodeData);
SpearProjectileComponentArray.populateIntermediateInfo = populateIntermediateInfo;
SpearProjectileComponentArray.onSpawn = onSpawn;
SpearProjectileComponentArray.onDie = onDie;

function decodeData(): SpearProjectileComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponent = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponent.hitboxes[0];
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         // @HACK
         getTextureArrayIndex("items/misc/ivory-spear.png")
      )
   );

   return {};
}

function createComponent(): SpearProjectileComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onSpawn(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("spear-throw.mp3", 0.4, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("spear-hit.mp3", 0.4, 1, entity, hitbox, false);
}