import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { EntityComponentData } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";
import ServerComponentArray from "../ServerComponentArray";

export interface SpearProjectileComponentData {}

export interface SpearProjectileComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.spearProjectile, typeof SpearProjectileComponentArray> {}
}

export const SpearProjectileComponentArray = registerServerComponentArray(
   ServerComponentType.spearProjectile,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
SpearProjectileComponentArray.populateIntermediateInfo = populateIntermediateInfo;
SpearProjectileComponentArray.onSpawn = onSpawn;
SpearProjectileComponentArray.onDie = onDie;

function decodeData(): SpearProjectileComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponent = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponent.hitboxes[0];
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         // @HACK
         TextureIndex.items_misc_ivorySpear
      )
   );
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