import { randInt, Entity, PacketReader, ServerComponentType, randAngle, CircularBox, randFloat } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { playSoundOnHitbox } from "../../sound";
import { EntityComponentData } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { createLeafParticle, LeafParticleSize, createLeafSpeckParticle, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH } from "../../particles";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";

export interface BerryBushPlantedComponentData {
   readonly growthProgress: number;
   readonly numFruits: number;
}

interface IntermediateInfo {
   readonly renderPart: TexturedRenderPart;
}

export interface BerryBushPlantedComponent {
   readonly renderPart: TexturedRenderPart;
}

const TEXTURE_SOURCES = ["entities/plant/berry-bush-sapling-1.png", "entities/plant/berry-bush-sapling-2.png", "entities/plant/berry-bush-sapling-3.png", "entities/plant/berry-bush-sapling-4.png", "entities/plant/berry-bush-sapling-5.png", "entities/plant/berry-bush-sapling-6.png", "entities/plant/berry-bush-sapling-7.png", "entities/plant/berry-bush-sapling-8.png", "entities/plant/berry-bush-sapling-9.png", ""];

const FULLY_GROWN_TEXTURE_SOURCES: ReadonlyArray<string> = [
   "entities/plant/berry-bush-plant-1.png",
   "entities/plant/berry-bush-plant-2.png",
   "entities/plant/berry-bush-plant-3.png",
   "entities/plant/berry-bush-plant-4.png",
   "entities/plant/berry-bush-plant-5.png"
];

export const BerryBushPlantedComponentArray = new ServerComponentArray<BerryBushPlantedComponent, BerryBushPlantedComponentData, IntermediateInfo>(ServerComponentType.berryBushPlanted, true, createComponent, getMaxRenderParts, decodeData);
BerryBushPlantedComponentArray.populateIntermediateInfo = populateIntermediateInfo;
BerryBushPlantedComponentArray.updateFromData = updateFromData;
BerryBushPlantedComponentArray.onHit = onHit;
BerryBushPlantedComponentArray.onDie = onDie;

const getTextureSource = (growthProgress: number, numFruits: number): string => {
   if (growthProgress < 1) {
      const idx = Math.floor(growthProgress * (TEXTURE_SOURCES.length - 1))
      return TEXTURE_SOURCES[idx];
   } else {
      // @Cleanup
      const maxNumFruits = 4;
      
      const progress = numFruits / maxNumFruits;
      const idx = Math.floor(progress * (FULLY_GROWN_TEXTURE_SOURCES.length - 1))
      return FULLY_GROWN_TEXTURE_SOURCES[idx];
   }
}

function decodeData(reader: PacketReader): BerryBushPlantedComponentData {
   const growthProgress = reader.readNumber();
   const numFruits = reader.readNumber();
   return {
      growthProgress: growthProgress,
      numFruits: numFruits
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const berryBushPlantedComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.berryBushPlanted);
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      // @Cleanup: why is this 9 instead of 0?
      9,
      0,
      0, 0,
      getTextureArrayIndex(getTextureSource(berryBushPlantedComponentData.growthProgress, berryBushPlantedComponentData.numFruits))
   );
   renderObject.attachRenderPart(renderPart);

   return {
      renderPart: renderPart
   };
}

function createComponent(_entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): BerryBushPlantedComponent {
   return {
      renderPart: intermediateInfo.renderPart
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function updateFromData(data: BerryBushPlantedComponentData, entity: Entity): void {
   const berryBushPlantedComponent = BerryBushPlantedComponentArray.getComponent(entity);
   berryBushPlantedComponent.renderPart.switchTextureSource(getTextureSource(data.growthProgress, data.numFruits));
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   const radius = (hitbox.box as CircularBox).radius;

   // @Copynpaste from BerryBushComponent

   const moveDirection = randAngle();
   
   const spawnPositionX = hitbox.box.position.x + radius * Math.sin(moveDirection);
   const spawnPositionY = hitbox.box.position.y + radius * Math.cos(moveDirection);

   createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), LeafParticleSize.small);
   
   // Create leaf specks
   for (let i = 0; i < 5; i++) {
      createLeafSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, radius, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH);
   }

   // @Incomplete: particles?
   playSoundOnHitbox("berry-bush-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   const radius = (hitbox.box as CircularBox).radius;

   for (let i = 0; i < 6; i++) {
      const offsetMagnitude = radius * Math.random();
      const spawnOffsetDirection = randAngle();
      const spawnPositionX = hitbox.box.position.x + offsetMagnitude * Math.sin(spawnOffsetDirection);
      const spawnPositionY = hitbox.box.position.y + offsetMagnitude * Math.cos(spawnOffsetDirection);

      createLeafParticle(spawnPositionX, spawnPositionY, randAngle(), LeafParticleSize.small);
   }
   
   // Create leaf specks
   for (let i = 0; i < 9; i++) {
      createLeafSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, radius * Math.random(), LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH);
   }
   
   playSoundOnHitbox("berry-bush-destroy-1.mp3", 0.4, 1, entity, hitbox, false);
}