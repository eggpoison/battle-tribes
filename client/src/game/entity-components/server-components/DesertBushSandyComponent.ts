import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { randFloat } from "../../../../../shared/src/utils";
import { EntityRenderObject } from "../../EntityRenderObject";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface DesertBushSandyComponentData {
   readonly size: number;
}

export interface DesertBushSandyComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.desertBushSandy, typeof DesertBushSandyComponentArray> {}
}

export const DesertBushSandyComponentArray = registerServerComponentArray(
   ServerComponentType.desertBushSandy,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
DesertBushSandyComponentArray.populateIntermediateInfo = populateIntermediateInfo;
DesertBushSandyComponentArray.onHit = onHit;
DesertBushSandyComponentArray.onDie = onDie;

function decodeData(reader: PacketReader): DesertBushSandyComponentData {
   const size = reader.readNumber();
   return {
      size: size
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const desertBushSandyComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.desertBushSandy);
   
   let textureIndex: TextureIndex;
   if (desertBushSandyComponentData.size === 0) {
      textureIndex = TextureIndex.entities_desertBushSandy_desertBushSandy;
   } else {
      textureIndex = TextureIndex.entities_desertBushSandy_desertBushSandyLarge;
   }
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      textureIndex
   );
   renderPart.tintR = randFloat(-0.02, 0.02);
   renderPart.tintG = randFloat(-0.02, 0.02);
   renderPart.tintB = randFloat(-0.02, 0.02);
   renderObject.attachRenderPart(renderPart)
}

function createComponent(): DesertBushSandyComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   playSoundOnHitbox("desert-plant-hit.mp3", randFloat(0.375, 0.425), randFloat(0.85, 1.15), entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("desert-plant-hit.mp3", randFloat(0.375, 0.425), randFloat(0.85, 1.15), entity, hitbox, false);
}