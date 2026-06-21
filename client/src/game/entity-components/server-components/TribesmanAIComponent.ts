import { TribesmanAIType, ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { ItemType } from "../../../../../shared/src/items/items";
import { PacketReader } from "../../../../../shared/src/packets";
import { Settings } from "../../../../../shared/src/settings";
import { TribeType } from "../../../../../shared/src/tribes";
import { randItem, randInt } from "../../../../../shared/src/utils";
import { tribeComponentArray } from "./TribeComponent";
import { playSoundOnHitbox } from "../../sound";
import ServerComponentArray from "../ServerComponentArray";
import { EntityComponentData } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import { getEntityServerComponentTypes } from "../component-types";
import { getServerComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface TribesmanAIComponentData {
   readonly aiType: TribesmanAIType;
   readonly relationsWithPlayer: number;
   readonly craftingItemType: ItemType;
   readonly craftingProgress: number;
}

export interface TribesmanAIComponent {
   aiType: TribesmanAIType;
   relationsWithPlayer: number;

   craftingItemType: ItemType;
   craftingProgress: number;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.tribesmanAI, TribesmanAIComponentArray> {}
}

const GOBLIN_ANGRY_SOUNDS: readonly string[] = ["goblin-angry-1.mp3", "goblin-angry-2.mp3", "goblin-angry-3.mp3", "goblin-angry-4.mp3"];
const GOBLIN_ESCAPE_SOUNDS: readonly string[] = ["goblin-escape-1.mp3", "goblin-escape-2.mp3", "goblin-escape-3.mp3"];
const GOBLIN_AMBIENT_SOUNDS: readonly string[] = ["goblin-ambient-1.mp3", "goblin-ambient-2.mp3", "goblin-ambient-3.mp3", "goblin-ambient-4.mp3", "goblin-ambient-5.mp3"];

class TribesmanAIComponentArray extends ServerComponentArray<TribesmanAIComponent, TribesmanAIComponentData> {
   public decodeData(reader: PacketReader): TribesmanAIComponentData {
      const aiType = reader.readNumber();
      const relationsWithPlayer = reader.readNumber();
      const craftingItemType = reader.readNumber();
      const craftingProgress = reader.readNumber();

      return {
         aiType: aiType,
         relationsWithPlayer: relationsWithPlayer,
         craftingItemType: craftingItemType,
         craftingProgress: craftingProgress
      };
   }

   public createComponent(entityComponentData: EntityComponentData): TribesmanAIComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const tribesmanAIComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tribesmanAI);

      return {
         aiType: tribesmanAIComponentData.aiType,
         relationsWithPlayer: tribesmanAIComponentData.relationsWithPlayer,
         craftingItemType: tribesmanAIComponentData.craftingItemType,
         craftingProgress: tribesmanAIComponentData.craftingProgress
      };
   }

   public getMaxRenderParts(): number {
      return 0;
   }

   public onTick(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      
      const tribeComponent = tribeComponentArray.getComponent(entity);
      const tribesmanAIComponent = tribesmanAIComponentArray.getComponent(entity);

      // Sounds
      switch (tribesmanAIComponent.aiType) {
         case TribesmanAIType.attacking: {
            if (Math.random() < 0.2 * Settings.DT_S) {
               switch (tribeComponent.tribeType) {
                  case TribeType.goblins: {
                     playSoundOnHitbox(randItem(GOBLIN_ANGRY_SOUNDS), 0.4, 1, entity, hitbox, true);
                     break;
                  }
                  case TribeType.barbarians: {
                     playSoundOnHitbox("barbarian-angry-1.mp3", 0.4, 1, entity, hitbox, true);
                     break;
                  }
               }
            }
            break;
         }
         case TribesmanAIType.escaping: {
            if (Math.random() < 0.2 * Settings.DT_S) {
               switch (tribeComponent.tribeType) {
                  case TribeType.goblins: {
                     playSoundOnHitbox(randItem(GOBLIN_ESCAPE_SOUNDS), 0.4, 1, entity, hitbox, true);
                     break;
                  }
               }
            }
            break;
         }
         default: {
            if (Math.random() < 0.2 * Settings.DT_S) {
               switch (tribeComponent.tribeType) {
                  case TribeType.goblins: {
                     playSoundOnHitbox(randItem(GOBLIN_AMBIENT_SOUNDS), 0.4, 1, entity, hitbox, true);
                     break;
                  }
                  case TribeType.barbarians: {
                     playSoundOnHitbox("barbarian-ambient-" + randInt(1, 2) + ".mp3", 0.4, 1, entity, hitbox, true);
                     break;
                  }
               }
            }
            break;
         }
      }
   }

   public updateFromData(data: TribesmanAIComponentData, entity: Entity): void {
      const tribesmanAIComponent = tribesmanAIComponentArray.getComponent(entity);

      tribesmanAIComponent.aiType = data.aiType;
      tribesmanAIComponent.relationsWithPlayer = data.relationsWithPlayer;
      tribesmanAIComponent.craftingItemType = data.craftingItemType;
      tribesmanAIComponent.craftingProgress = data.craftingProgress;
   }
}

export const tribesmanAIComponentArray = registerServerComponentArray(ServerComponentType.tribesmanAI, TribesmanAIComponentArray, true);

export function createTribesmanAIComponentData(): TribesmanAIComponentData {
   return {
      aiType: TribesmanAIType.idle,
      relationsWithPlayer: 0,
      craftingItemType: 0,
      craftingProgress: 0
   };
}