import { randAngle, randFloat, randInt, Entity, ServerComponentType, PacketReader, CircularBox } from "webgl-test-shared";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData, getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { createLeafParticle, LeafParticleSize, createLeafSpeckParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { registerDirtyRenderInfo } from "../../rendering/render-part-matrices";
import { EntityRenderInfo } from "../../EntityRenderInfo";

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

const BERRY_BUSH_TEXTURE_SOURCES = [
   "entities/berry-bush1.png",
   "entities/berry-bush2.png",
   "entities/berry-bush3.png",
   "entities/berry-bush4.png",
   "entities/berry-bush5.png",
   "entities/berry-bush6.png"
];

const LEAF_SPECK_COLOUR_LOW = [63/255, 204/255, 91/255] as const;
const LEAF_SPECK_COLOUR_HIGH = [35/255, 158/255, 88/255] as const;

export const BerryBushComponentArray = new ServerComponentArray<BerryBushComponent, BerryBushComponentData, IntermediateInfo>(ServerComponentType.berryBush, true, createComponent, getMaxRenderParts, decodeData);
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

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData.get(ServerComponentType.transform)!;
   const hitbox = transformComponentData.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(BERRY_BUSH_TEXTURE_SOURCES[entityComponentData.serverComponentData.get(ServerComponentType.berryBush)!.numBerries])
   );
   renderPart.addTag("berryBushComponent:renderPart");
   renderInfo.attachRenderPart(renderPart)

   return {
      renderPart: renderPart
   };
}

function createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): BerryBushComponent {
   return {
      numBerries: entityComponentData.serverComponentData.get(ServerComponentType.berryBush)!.numBerries,
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

   const renderInfo = getEntityRenderInfo(entity);
   registerDirtyRenderInfo(renderInfo);
}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   const radius = (hitbox.box as CircularBox).radius;

   const moveDirection = randAngle();
   
   const spawnPositionX = hitbox.box.position.x + radius * Math.sin(moveDirection);
   const spawnPositionY = hitbox.box.position.y + radius * Math.cos(moveDirection);

   createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), LeafParticleSize.small);
   
   // Create leaf specks
   for (let i = 0; i < 5; i++) {
      createLeafSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, radius, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH);
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