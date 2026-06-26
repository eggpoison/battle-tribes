import { HitFlags } from "../../../../../shared/src/client-server-types";
import { ServerComponentType } from "../../../../../shared/src/components";
import { TreeSize, Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { randFloat, Point, randAngle, angle, randItem, randInt } from "../../../../../shared/src/utils";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { createLeafParticle, LeafParticleSize, createLeafSpeckParticle, createWoodSpeckParticle, LEAF_SPECK_COLOUR_HIGH, LEAF_SPECK_COLOUR_LOW } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface SpruceTreeComponentData {
   readonly treeSize: TreeSize;
   readonly snowVariant: number;
}

export interface SpruceTreeComponent {
   readonly treeSize: TreeSize;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.spruceTree, typeof SpruceTreeComponentArray> {}
}

const treeTextures: Record<TreeSize, TextureIndex> = {
   [TreeSize.small]: TextureIndex.entities_spruceTree_treeSmall,
   [TreeSize.large]: TextureIndex.entities_spruceTree_treeLarge
};

export const TREE_HIT_SOUNDS: readonly string[] = ["tree-hit-1.mp3", "tree-hit-2.mp3", "tree-hit-3.mp3", "tree-hit-4.mp3"];
export const TREE_DESTROY_SOUNDS: readonly string[] = ["tree-destroy-1.mp3", "tree-destroy-2.mp3", "tree-destroy-3.mp3", "tree-destroy-4.mp3"];

const getRadius = (treeSize: TreeSize): number => {
   return 40 + treeSize * 10;
}

export const SpruceTreeComponentArray = registerServerComponentArray(
   ServerComponentType.spruceTree,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
SpruceTreeComponentArray.populateIntermediateInfo = populateIntermediateInfo;
SpruceTreeComponentArray.onHit = onHit;
SpruceTreeComponentArray.onDie = onDie;

function decodeData(reader: PacketReader): SpruceTreeComponentData {
   const treeSize = reader.readNumber();
   const snowVariant = reader.readNumber();
   return {
      treeSize: treeSize,
      snowVariant: snowVariant
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const spruceTreeComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.spruceTree);
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      treeTextures[spruceTreeComponentData.treeSize]
   )
   renderPart.tintR = randFloat(-0.05, 0.05);
   renderPart.tintG = randFloat(-0.05, 0.05);
   renderPart.tintB = randFloat(-0.05, 0.05);
   renderObject.attachRenderPart(renderPart);

   // Snow overlay
   const snowVariant = spruceTreeComponentData.snowVariant;
   if (snowVariant !== 0) {
      const sizeOffset = spruceTreeComponentData.treeSize === TreeSize.large ? 0 : 2;
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            1,
            0,
            0, 0,
            TextureIndex.entities_spruceTree_snowOverlayLarge1 + sizeOffset + snowVariant - 1
         )
      );
   }
}

function createComponent(entityComponentData: EntityComponentData): SpruceTreeComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const spruceTreeComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.spruceTree);
   return {
      treeSize: spruceTreeComponentData.treeSize
   };
}

function getMaxRenderParts(): number {
   return 2;
}
   
function onHit(entity: Entity, hitbox: Hitbox, hitPosition: Point, hitFlags: number): void {
   const spruceTreeComponent = SpruceTreeComponentArray.getComponent(entity);

   const radius = getRadius(spruceTreeComponent.treeSize);

   // @Cleanup: copy and paste
   const isDamagingHit = (hitFlags & HitFlags.NON_DAMAGING_HIT) === 0;
   
   // Create leaf particles
   {
      const moveDirection = randAngle();

      const spawnPositionX = hitbox.box.posX + radius * Math.sin(moveDirection);
      const spawnPositionY = hitbox.box.posY + radius * Math.cos(moveDirection);

      createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
   }
   
   // Create leaf specks
   const numSpecks = spruceTreeComponent.treeSize === TreeSize.small ? 4 : 7;
   for (let i = 0; i < numSpecks; i++) {
      createLeafSpeckParticle(hitbox.box.posX, hitbox.box.posY, radius, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH);
   }

   if (isDamagingHit) {
      // Create wood specks at the point of hit
      const spawnOffsetDirection = angle(hitPosition.x - hitbox.box.posX, hitPosition.y - hitbox.box.posY);
      const spawnPositionX = hitbox.box.posX + (radius + 2) * Math.sin(spawnOffsetDirection);
      const spawnPositionY = hitbox.box.posY + (radius + 2) * Math.cos(spawnOffsetDirection);
      for (let i = 0; i < 4; i++) {
         createWoodSpeckParticle(spawnPositionX, spawnPositionY, 3);
      }
      
      playSoundOnHitbox(randItem(TREE_HIT_SOUNDS), 0.4, 1, entity, hitbox, false);
   } else {
      // @Temporary
      playSoundOnHitbox("berry-bush-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, hitbox, false);
   }
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   const spruceTreeComponent = SpruceTreeComponentArray.getComponent(entity);

   const radius = getRadius(spruceTreeComponent.treeSize);

   let numLeaves: number;
   if (spruceTreeComponent.treeSize === TreeSize.small) {
      numLeaves = randInt(2, 3);
   } else {
      numLeaves = randInt(4, 5);
   }
   for (let i = 0; i < numLeaves; i++) {
      const spawnOffsetMagnitude = radius * Math.random();
      const spawnOffsetDirection = randAngle();
      const spawnPositionX = hitbox.box.posX + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      const spawnPositionY = hitbox.box.posY + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

      createLeafParticle(spawnPositionX, spawnPositionY, Math.random(), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
   }
   
   // Create leaf specks
   const numSpecks = spruceTreeComponent.treeSize === TreeSize.small ? 4 : 7;
   for (let i = 0; i < numSpecks; i++) {
      createLeafSpeckParticle(hitbox.box.posX, hitbox.box.posY, radius, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH);
   }

   for (let i = 0; i < 10; i++) {
      createWoodSpeckParticle(hitbox.box.posX, hitbox.box.posY, radius * Math.random());
   }

   playSoundOnHitbox(randItem(TREE_DESTROY_SOUNDS), 0.5, 1, entity, hitbox, false);
}