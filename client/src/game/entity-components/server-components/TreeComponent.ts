import { randFloat, randItem, randInt, Point, randAngle, HitFlags, ServerComponentType, PacketReader, Entity, TreeSize } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { createLeafParticle, LeafParticleSize, createLeafSpeckParticle, createWoodSpeckParticle, LEAF_SPECK_COLOUR_HIGH, LEAF_SPECK_COLOUR_LOW } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";

export interface TreeComponentData {
   readonly treeSize: TreeSize;
}

interface IntermediateInfo {}

export interface TreeComponent {
   readonly treeSize: TreeSize;
}

const treeTextures: { [T in TreeSize]: string } = {
   [TreeSize.small]: "entities/tree/tree-small.png",
   [TreeSize.large]: "entities/tree/tree-large.png"
};

export const TREE_HIT_SOUNDS: ReadonlyArray<string> = ["tree-hit-1.mp3", "tree-hit-2.mp3", "tree-hit-3.mp3", "tree-hit-4.mp3"];
export const TREE_DESTROY_SOUNDS: ReadonlyArray<string> = ["tree-destroy-1.mp3", "tree-destroy-2.mp3", "tree-destroy-3.mp3", "tree-destroy-4.mp3"];

const getRadius = (treeSize: TreeSize): number => {
   return 40 + treeSize * 10;
}

export const TreeComponentArray = new ServerComponentArray<TreeComponent, TreeComponentData, IntermediateInfo>(ServerComponentType.tree, true, createComponent, getMaxRenderParts, decodeData);
TreeComponentArray.populateIntermediateInfo = populateIntermediateInfo;
TreeComponentArray.onHit = onHit;
TreeComponentArray.onDie = onDie;

function decodeData(reader: PacketReader): TreeComponentData {
   const treeSize = reader.readNumber();
   return {
      treeSize: treeSize
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const treeComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tree);
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex(treeTextures[treeComponentData.treeSize])
      )
   );

   return {};
}

function createComponent(entityComponentData: EntityComponentData): TreeComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const treeComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tree);
   return {
      treeSize: treeComponentData.treeSize
   };
}

function getMaxRenderParts(): number {
   return 1;
}
   
function onHit(entity: Entity, hitbox: Hitbox, hitPosition: Point, hitFlags: number): void {
   const treeComponent = TreeComponentArray.getComponent(entity);

   const radius = getRadius(treeComponent.treeSize);

   // @Cleanup: copy and paste
   const isDamagingHit = (hitFlags & HitFlags.NON_DAMAGING_HIT) === 0;
   
   // Create leaf particles
   {
      const moveDirection = randAngle();

      const spawnPositionX = hitbox.box.position.x + radius * Math.sin(moveDirection);
      const spawnPositionY = hitbox.box.position.y + radius * Math.cos(moveDirection);

      createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
   }
   
   // Create leaf specks
   const numSpecks = treeComponent.treeSize === TreeSize.small ? 4 : 7;
   for (let i = 0; i < numSpecks; i++) {
      createLeafSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, radius, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH);
   }

   if (isDamagingHit) {
      // Create wood specks at the point of hit
      const spawnOffsetDirection = hitbox.box.position.angleTo(hitPosition);
      const spawnPositionX = hitbox.box.position.x + (radius + 2) * Math.sin(spawnOffsetDirection);
      const spawnPositionY = hitbox.box.position.y + (radius + 2) * Math.cos(spawnOffsetDirection);
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

   const treeComponent = TreeComponentArray.getComponent(entity);

   const radius = getRadius(treeComponent.treeSize);

   let numLeaves: number;
   if (treeComponent.treeSize === TreeSize.small) {
      numLeaves = randInt(2, 3);
   } else {
      numLeaves = randInt(4, 5);
   }
   for (let i = 0; i < numLeaves; i++) {
      const spawnOffsetMagnitude = radius * Math.random();
      const spawnOffsetDirection = randAngle();
      const spawnPositionX = hitbox.box.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      const spawnPositionY = hitbox.box.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

      createLeafParticle(spawnPositionX, spawnPositionY, Math.random(), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
   }
   
   // Create leaf specks
   const numSpecks = treeComponent.treeSize === TreeSize.small ? 4 : 7;
   for (let i = 0; i < numSpecks; i++) {
      createLeafSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, radius, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH);
   }

   for (let i = 0; i < 10; i++) {
      createWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, radius * Math.random());
   }

   playSoundOnHitbox(randItem(TREE_DESTROY_SOUNDS), 0.5, 1, entity, hitbox, false);
}