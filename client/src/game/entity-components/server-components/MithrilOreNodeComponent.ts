import { randFloat, randInt, PacketReader, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { getRandomPositionInBox, Hitbox } from "../../hitboxes";
import { createColouredParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getRandomPositionInEntity, TransformComponentArray } from "./TransformComponent";

export interface MithrilOreNodeComponentData {
   readonly size: number;
   readonly variant: number;
   readonly renderHeight: number;
}

interface IntermediateInfo {}

export interface MithrilOreNodeComponent {}

export const MithrilOreNodeComponentArray = new ServerComponentArray<MithrilOreNodeComponent, MithrilOreNodeComponentData, IntermediateInfo>(ServerComponentType.mithrilOreNode, true, createComponent, getMaxRenderParts, decodeData);
MithrilOreNodeComponentArray.populateIntermediateInfo = populateIntermediateInfo;
MithrilOreNodeComponentArray.onHit = onHit;
MithrilOreNodeComponentArray.onDie = onDie;

function decodeData(reader: PacketReader): MithrilOreNodeComponentData {
   const size = reader.readNumber();
   const variant = reader.readNumber();
   const renderHeight = reader.readNumber();
   return {
      size: size,
      variant: variant,
      renderHeight: renderHeight
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData.get(ServerComponentType.transform)!;
   const hitbox = transformComponentData.hitboxes[0];
   
   const mithrilOreNodeComponentData = entityComponentData.serverComponentData.get(ServerComponentType.mithrilOreNode)!;
   const size = mithrilOreNodeComponentData.size;
   const variant = mithrilOreNodeComponentData.variant;

   let textureSource: string;
   switch (size) {
      case 0: {
         textureSource = "entities/mithril-ore-node/mithril-ore-node-large-" + (variant + 1) + ".png";
         break;
      }
      case 1: {
         textureSource = "entities/mithril-ore-node/mithril-ore-node-medium-" + (variant + 1) + ".png";
         break;
      }
      case 2: {
         textureSource = "entities/mithril-ore-node/mithril-ore-node-small-" + (variant + 1) + ".png";
         break;
      }
      default: {
         throw new Error();
      }
   }
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(textureSource)
   );
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): MithrilOreNodeComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   for (let i = 0; i < 3; i++) {
      const c = randFloat(0.25, 0.4);
      
      const position = getRandomPositionInBox(hitbox.box);
      createColouredParticle(position.x, position.y, randFloat(50, 80), c, c, c);
   }
   
   playSoundOnHitbox("mithril-hit-" + randInt(1, 3) + ".mp3", 0.4, randFloat(0.9, 1.1), entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   for (let i = 0; i < 6; i++) {
      const c = randFloat(0.25, 0.4);
      
      const position = getRandomPositionInEntity(transformComponent);
      createColouredParticle(position.x, position.y, randFloat(50, 80), c, c, c);
   }

   playSoundOnHitbox("mithril-hit-" + randInt(1, 3) + ".mp3", 0.4, randFloat(0.9, 1.1), entity, hitbox, false);
   playSoundOnHitbox("mithril-death.mp3", 0.4, randFloat(0.9, 1.1), entity, hitbox, false);
}