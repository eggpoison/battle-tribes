import { ServerComponentType } from "../../../../../shared/src/components";
import { CircularBox } from "../../../../../shared/src/boxes";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { randAngle, randFloat, randInt } from "../../../../../shared/src/utils";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData, getEntityRenderObject } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { createLeafParticle, LeafParticleSize, createLeafSpeckParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { registerDirtyRenderObject } from "../../rendering/render-part-matrices";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface BerryBushComponentData {
   readonly numBerries: number;
}

interface IntermediateInfo {
   readonly renderPart: TexturedRenderPart;
}

export interface BerryBushComponent {
   numBerries: number;
   readonly renderPart: TexturedRenderPart;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.berryBush, typeof BerryBushComponentArray> {}
}

const BERRY_BUSH_TEXTURE_SOURCES = [
   TextureIndex.entities_berryBush1,
   TextureIndex.entities_berryBush2,
   TextureIndex.entities_berryBush3,
   TextureIndex.entities_berryBush4,
   TextureIndex.entities_berryBush5,
   TextureIndex.entities_berryBush6
];

const LEAF_SPECK_COLOUR_LOW = [63/255, 204/255, 91/255] as const;
const LEAF_SPECK_COLOUR_HIGH = [35/255, 158/255, 88/255] as const;

export const BerryBushComponentArray = registerServerComponentArray(
   ServerComponentType.berryBush,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
BerryBushComponentArray.populateIntermediateInfo = populateIntermediateInfo;
BerryBushComponentArray.updateFromData = updateFromData;
BerryBushComponentArray.onHit = onHit;
BerryBushComponentArray.onDie = onDie;

function decodeData(reader: PacketReader): BerryBushComponentData {
   const numBerries = reader.readNumber();
   return {
      numBerries: numBerries
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const berryBushComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.berryBush);
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      BERRY_BUSH_TEXTURE_SOURCES[berryBushComponentData.numBerries]
   );
   addRenderPartTag(renderPart, "berryBushComponent:renderPart");
   renderObject.attachRenderPart(renderPart)

   return {
      renderPart: renderPart
   };
}

function createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): BerryBushComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const berryBushComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.berryBush);

   return {
      numBerries: berryBushComponentData.numBerries,
      renderPart: intermediateInfo.renderPart
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function updateFromData(data: BerryBushComponentData, entity: Entity): void {
   const berryBushComponent = BerryBushComponentArray.getComponent(entity);
   berryBushComponent.numBerries = data.numBerries;

   berryBushComponent.renderPart.switchTextureSource(BERRY_BUSH_TEXTURE_SOURCES[berryBushComponent.numBerries]);

   const renderObject = getEntityRenderObject(entity);
   registerDirtyRenderObject(entity, renderObject);
}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   const radius = (hitbox.box as CircularBox).radius;

   const moveDirection = randAngle();
   
   const spawnPositionX = hitbox.box.posX + radius * Math.sin(moveDirection);
   const spawnPositionY = hitbox.box.posY + radius * Math.cos(moveDirection);

   createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), LeafParticleSize.small);
   
   // Create leaf specks
   for (let i = 0; i < 5; i++) {
      createLeafSpeckParticle(hitbox.box.posX, hitbox.box.posY, radius, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH);
   }

   playSoundOnHitbox("berry-bush-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   const radius = (hitbox.box as CircularBox).radius;

   for (let i = 0; i < 6; i++) {
      const offsetMagnitude = radius * Math.random();
      const spawnOffsetDirection = randAngle();
      const spawnPositionX = hitbox.box.posX + offsetMagnitude * Math.sin(spawnOffsetDirection);
      const spawnPositionY = hitbox.box.posY + offsetMagnitude * Math.cos(spawnOffsetDirection);

      createLeafParticle(spawnPositionX, spawnPositionY, randAngle(), LeafParticleSize.small);
   }
   
   // Create leaf specks
   for (let i = 0; i < 9; i++) {
      createLeafSpeckParticle(hitbox.box.posX, hitbox.box.posY, radius * Math.random(), LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH);
   }

   playSoundOnHitbox("berry-bush-destroy-1.mp3", 0.4, 1, entity, hitbox, false);
}