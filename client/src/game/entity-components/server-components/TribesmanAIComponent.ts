import { ServerComponentType, TribesmanAIType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { TribeType } from "battletribes-shared/tribes";
import { randInt, randItem } from "battletribes-shared/utils";
import { PacketReader } from "battletribes-shared/packets";
import { TribeComponentArray } from "./TribeComponent";
import { Entity } from "../../../../../shared/src/entities";
import { playSoundOnHitbox } from "../../sound";
import ServerComponentArray from "../ServerComponentArray";
import { ItemType } from "../../../../../shared/src/items/items";
import { EntityComponentData } from "../../world";
import { TransformComponentArray } from "./TransformComponent";

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

const GOBLIN_ANGRY_SOUNDS: ReadonlyArray<string> = ["goblin-angry-1.mp3", "goblin-angry-2.mp3", "goblin-angry-3.mp3", "goblin-angry-4.mp3"];
const GOBLIN_ESCAPE_SOUNDS: ReadonlyArray<string> = ["goblin-escape-1.mp3", "goblin-escape-2.mp3", "goblin-escape-3.mp3"];
const GOBLIN_AMBIENT_SOUNDS: ReadonlyArray<string> = ["goblin-ambient-1.mp3", "goblin-ambient-2.mp3", "goblin-ambient-3.mp3", "goblin-ambient-4.mp3", "goblin-ambient-5.mp3"];

export const TribesmanAIComponentArray = new ServerComponentArray<TribesmanAIComponent, TribesmanAIComponentData, never>(ServerComponentType.tribesmanAI, true, createComponent, getMaxRenderParts, decodeData);
TribesmanAIComponentArray.onTick = onTick;
TribesmanAIComponentArray.updateFromData = updateFromData;

export function createTribesmanAIComponentData(): TribesmanAIComponentData {
   return {
      aiType: TribesmanAIType.idle,
      relationsWithPlayer: 0,
      craftingItemType: 0,
      craftingProgress: 0
   };
}

function decodeData(reader: PacketReader): TribesmanAIComponentData {
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

function createComponent(entityComponentData: EntityComponentData): TribesmanAIComponent {
   const tribesmanAIComponentData = entityComponentData.serverComponentData[ServerComponentType.tribesmanAI]!;

   return {
      aiType: tribesmanAIComponentData.aiType,
      relationsWithPlayer: tribesmanAIComponentData.relationsWithPlayer,
      craftingItemType: tribesmanAIComponentData.craftingItemType,
      craftingProgress: tribesmanAIComponentData.craftingProgress
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function onTick(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   
   const tribeComponent = TribeComponentArray.getComponent(entity);
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(entity);

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

function updateFromData(data: TribesmanAIComponentData, entity: Entity): void {
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(entity);

   tribesmanAIComponent.aiType = data.aiType;
   tribesmanAIComponent.relationsWithPlayer = data.relationsWithPlayer;
   tribesmanAIComponent.craftingItemType = data.craftingItemType;
   tribesmanAIComponent.craftingProgress = data.craftingProgress;
}