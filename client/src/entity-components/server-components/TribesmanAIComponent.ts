import { ServerComponentType, TribesmanAIType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { TribeType } from "battletribes-shared/tribes";
import { randInt, randItem } from "battletribes-shared/utils";
import { ItemType } from "battletribes-shared/items/items";
import { PacketReader } from "battletribes-shared/packets";
import { TransformComponentArray } from "./TransformComponent";
import { TribeComponentArray } from "./TribeComponent";
import { EntityID } from "../../../../shared/src/entities";
import { playSound } from "../../sound";
import ServerComponentArray from "../ServerComponentArray";

const GOBLIN_ANGRY_SOUNDS: ReadonlyArray<string> = ["goblin-angry-1.mp3", "goblin-angry-2.mp3", "goblin-angry-3.mp3", "goblin-angry-4.mp3"];
const GOBLIN_ESCAPE_SOUNDS: ReadonlyArray<string> = ["goblin-escape-1.mp3", "goblin-escape-2.mp3", "goblin-escape-3.mp3"];
const GOBLIN_AMBIENT_SOUNDS: ReadonlyArray<string> = ["goblin-ambient-1.mp3", "goblin-ambient-2.mp3", "goblin-ambient-3.mp3", "goblin-ambient-4.mp3", "goblin-ambient-5.mp3"];

class TribesmanAIComponent {
   public name = 0;
   public untitledDescriptor = 0;
   public aiType = TribesmanAIType.idle;
   public relationsWithPlayer = 0;

   public craftingItemType: ItemType = 0;
   public craftingProgress = 0;
}

export default TribesmanAIComponent;

export const TribesmanAIComponentArray = new ServerComponentArray<TribesmanAIComponent>(ServerComponentType.tribesmanAI, true, {
   onTick: onTick,
   padData: padData,
   updateFromData: updateFromData
});

function onTick(tribesmanAIComponent: TribesmanAIComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const tribeComponent = TribeComponentArray.getComponent(entity);

   // Sounds
   switch (tribesmanAIComponent.aiType) {
      case TribesmanAIType.attacking: {
         if (Math.random() < 0.2 / Settings.TPS) {
            switch (tribeComponent.tribeType) {
               case TribeType.goblins: {
                  playSound(randItem(GOBLIN_ANGRY_SOUNDS), 0.4, 1, transformComponent.position);
                  break;
               }
               case TribeType.barbarians: {
                  playSound("barbarian-angry-1.mp3", 0.4, 1, transformComponent.position);
                  break;
               }
            }
         }
         break;
      }
      case TribesmanAIType.escaping: {
         if (Math.random() < 0.2 / Settings.TPS) {
            switch (tribeComponent.tribeType) {
               case TribeType.goblins: {
                  playSound(randItem(GOBLIN_ESCAPE_SOUNDS), 0.4, 1, transformComponent.position);
                  break;
               }
            }
         }
         break;
      }
      default: {
         if (Math.random() < 0.2 / Settings.TPS) {
            switch (tribeComponent.tribeType) {
               case TribeType.goblins: {
                  playSound(randItem(GOBLIN_AMBIENT_SOUNDS), 0.4, 1, transformComponent.position);
                  break;
               }
               case TribeType.barbarians: {
                  playSound("barbarian-ambient-" + randInt(1, 2) + ".mp3", 0.4, 1, transformComponent.position);
                  break;
               }
            }
         }
         break;
      }
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(6 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(entity);
   tribesmanAIComponent.name = reader.readNumber();
   tribesmanAIComponent.untitledDescriptor = reader.readNumber();
   tribesmanAIComponent.aiType = reader.readNumber();
   tribesmanAIComponent.relationsWithPlayer = reader.readNumber();
   tribesmanAIComponent.craftingItemType = reader.readNumber();
   tribesmanAIComponent.craftingProgress = reader.readNumber();
}