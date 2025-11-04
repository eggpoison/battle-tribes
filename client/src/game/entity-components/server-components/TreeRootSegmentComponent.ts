import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { randFloat } from "../../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import { createWoodSpeckParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface TreeRootSegmentComponentData {
   readonly variant: number;
}

interface IntermediateInfo {}

export interface TreeRootSegmentComponent {
   readonly variant: number;
}

export const TreeRootSegmentComponentArray = new ServerComponentArray<TreeRootSegmentComponent, TreeRootSegmentComponentData, IntermediateInfo>(ServerComponentType.treeRootSegment, true, createComponent, getMaxRenderParts, decodeData);
TreeRootSegmentComponentArray.populateIntermediateInfo = populateIntermediateInfo;
TreeRootSegmentComponentArray.onDie = onDie;
TreeRootSegmentComponentArray.onHit = onHit;

function decodeData(reader: PacketReader): TreeRootSegmentComponentData {
   const variant = reader.readNumber();
   return {
      variant: variant
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];

   const treeRootSegmentComponentData = entityComponentData.serverComponentData[ServerComponentType.treeRootSegment]!;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/tree-root-segment/tree-root-segment-" + (treeRootSegmentComponentData.variant + 1) + ".png")
   );
   if (Math.random() < 0.5) {
      renderPart.setFlipX(true);
   }
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(entityComponentData: EntityComponentData): TreeRootSegmentComponent {
   return {
      variant: entityComponentData.serverComponentData[ServerComponentType.treeRootSegment]!.variant
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   for (let i = 0; i < 6; i++) {
      createWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 16 * Math.random());
   }

   playSoundOnHitbox("tree-root-segment-hit.mp3", randFloat(0.47, 0.53), randFloat(0.9, 1.1), entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   for (let i = 0; i < 10; i++) {
      createWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 16 * Math.random());
   }

   const treeRootSegmentComponent = TreeRootSegmentComponentArray.getComponent(entity);
   playSoundOnHitbox("tree-root-segment-death-" + (treeRootSegmentComponent.variant % 3 + 1) + ".mp3", 0.5, 1, entity, hitbox, false);
}