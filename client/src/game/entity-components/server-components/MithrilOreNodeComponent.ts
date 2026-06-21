import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { randFloat, randInt } from "../../../../../shared/src/utils";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getRandomPositionInBox, Hitbox } from "../../hitboxes";
import { createColouredParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getRandomPositionInEntity, TransformComponentArray } from "./TransformComponent";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface MithrilOreNodeComponentData {
   readonly size: number;
   readonly variant: number;
   readonly renderHeight: number;
}

export interface MithrilOreNodeComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.mithrilOreNode, _MithrilOreNodeComponentArray> {}
}

class _MithrilOreNodeComponentArray extends ServerComponentArray<MithrilOreNodeComponent, MithrilOreNodeComponentData> {
   public decodeData(reader: PacketReader): MithrilOreNodeComponentData {
      const size = reader.readNumber();
      const variant = reader.readNumber();
      const renderHeight = reader.readNumber();
      return {
         size: size,
         variant: variant,
         renderHeight: renderHeight
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const mithrilOreNodeComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.mithrilOreNode);
      const size = mithrilOreNodeComponentData.size;
      const variant = mithrilOreNodeComponentData.variant;

      let textureIndex: TextureIndex;
      switch (size) {
         case 0: {
            textureIndex = TextureIndex.entities_mithrilOreNode_mithrilOreNodeLarge1 + variant;
            break;
         }
         case 1: {
            textureIndex = TextureIndex.entities_mithrilOreNode_mithrilOreNodeMedium1 + variant;
            break;
         }
         case 2: {
            textureIndex = TextureIndex.entities_mithrilOreNode_mithrilOreNodeSmall1 + variant;
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
         0, 0,
         textureIndex
      );
      renderObject.attachRenderPart(renderPart);
   }

   public createComponent(): MithrilOreNodeComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onHit(entity: Entity, hitbox: Hitbox): void {
      for (let i = 0; i < 3; i++) {
         const c = randFloat(0.25, 0.4);
         
         const position = getRandomPositionInBox(hitbox.box);
         createColouredParticle(position.x, position.y, randFloat(50, 80), c, c, c);
      }
      
      playSoundOnHitbox("mithril-hit-" + randInt(1, 3) + ".mp3", 0.4, randFloat(0.9, 1.1), entity, hitbox, false);
   }

   public onDie(entity: Entity): void {
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
}

export const MithrilOreNodeComponentArray = registerServerComponentArray(ServerComponentType.mithrilOreNode, _MithrilOreNodeComponentArray, true);