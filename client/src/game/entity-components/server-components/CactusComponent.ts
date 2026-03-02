import { assert, randAngle, randInt, PacketReader, ServerComponentType, CactusFlowerSize, Entity } from "webgl-test-shared";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { createCactusSpineParticle, createFlowerParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import { playSoundOnHitbox } from "../../sound";
import { EntityComponentData } from "../../world";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { getHitboxByLocalID } from "../../hitboxes";

export interface CactusFlower {
   readonly parentHitboxLocalID: number;
   readonly offsetX: number;
   readonly offsetY: number;
   readonly rotation: number;
   readonly flowerType: number;
   readonly size: CactusFlowerSize;
}

export interface CactusComponentData {
   readonly flowers: Array<CactusFlower>;
}

interface IntermediateInfo {}

export interface CactusComponent {
   // @Memory: we could just infer these frmo the render parts on the cactus... But first will need to make flowers into client entities (?)
   readonly flowers: ReadonlyArray<CactusFlower>;
}

export const CACTUS_RADIUS = 40;

const getFlowerTextureSource = (type: number, size: CactusFlowerSize): string => {
   if (type === 4) {
      return "entities/cactus/cactus-flower-5.png";
   } else {
      return `entities/cactus/cactus-flower-${size === CactusFlowerSize.small ? "small" : "large"}-${type + 1}.png`;
   }
}

export const CactusComponentArray = new ServerComponentArray<CactusComponent, CactusComponentData, IntermediateInfo>(ServerComponentType.cactus, true, createComponent, getMaxRenderParts, decodeData);
CactusComponentArray.populateIntermediateInfo = populateIntermediateInfo;
CactusComponentArray.onHit = onHit;
CactusComponentArray.onDie = onDie;

function decodeData(reader: PacketReader): CactusComponentData {
   const flowers = new Array<CactusFlower>();
   const numFlowers = reader.readNumber();
   for (let i = 0; i < numFlowers; i++) {
      const parentHitboxLocalID = reader.readNumber();
      const offsetX = reader.readNumber();
      const offsetY = reader.readNumber();
      const rotation = reader.readNumber();
      const flowerType = reader.readNumber();
      const size = reader.readNumber();

      const flower: CactusFlower = {
         parentHitboxLocalID: parentHitboxLocalID,
         offsetX: offsetX,
         offsetY: offsetY,
         rotation: rotation,
         flowerType: flowerType,
         size: size
      };
      flowers.push(flower);
   }

   return {
      flowers: flowers
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   for (let i = 0; i < transformComponentData.hitboxes.length; i++) {
      const hitbox = transformComponentData.hitboxes[i];

      const baseRenderPart = new TexturedRenderPart(
         hitbox,
         i === 0 ? 2 : Math.random(),
         0,
         getTextureArrayIndex(i === 0 ? "entities/cactus/cactus.png" : "entities/cactus/cactus-limb.png")
      );
      renderInfo.attachRenderPart(baseRenderPart);
   }

   // Flowers
   const cactusComponentConfig = entityComponentData.serverComponentData[ServerComponentType.cactus]!;
   for (const flower of cactusComponentConfig.flowers) {
      const hitbox = getHitboxByLocalID(transformComponentData.hitboxes, flower.parentHitboxLocalID);
      assert(hitbox !== null);
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         3 + Math.random(),
         flower.rotation,
         getTextureArrayIndex(getFlowerTextureSource(flower.flowerType, flower.size))
      );
      renderPart.offset.x = flower.offsetX;
      renderPart.offset.y = flower.offsetY;
      renderInfo.attachRenderPart(renderPart);
   }

   return {};
}

function createComponent(entityComponentData: EntityComponentData): CactusComponent {
   const cactusComponentConfig = entityComponentData.serverComponentData[ServerComponentType.cactus]!;
   return {
      flowers: cactusComponentConfig.flowers
   };
}

function getMaxRenderParts(entityComponentData: EntityComponentData): number {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const cactusComponentConfig = entityComponentData.serverComponentData[ServerComponentType.cactus]!;
   return transformComponentData.hitboxes.length + cactusComponentConfig.flowers.length;
}

function onHit(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   // Create cactus spine particles when hurt
   const numSpines = randInt(3, 5);
   for (let i = 0; i < numSpines; i++) {
      createCactusSpineParticle(transformComponent, CACTUS_RADIUS - 5, randAngle());
   }

   playSoundOnHitbox("cactus-hit.mp3", 0.4, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   const cactusComponent = CactusComponentArray.getComponent(entity);

   playSoundOnHitbox("cactus-destroy.mp3", 0.4, 1, entity, hitbox, false);
   
   for (const flower of cactusComponent.flowers) {
      const spawnPositionX = hitbox.box.position.x + flower.offsetX;
      const spawnPositionY = hitbox.box.position.y + flower.offsetY;

      createFlowerParticle(spawnPositionX, spawnPositionY, flower.flowerType, flower.size, flower.rotation);
   }
}