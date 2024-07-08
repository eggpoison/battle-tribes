import { ServerComponentType, TribesmanAIType, TribesmanAIComponentData } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import { TribeType } from "webgl-test-shared/dist/tribes";
import { randInt, randItem } from "webgl-test-shared/dist/utils";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { AudioFilePath, playSound } from "../sound";
import { ItemType } from "webgl-test-shared/dist/items/items";

const GOBLIN_ANGRY_SOUNDS: ReadonlyArray<AudioFilePath> = ["goblin-angry-1.mp3", "goblin-angry-2.mp3", "goblin-angry-3.mp3", "goblin-angry-4.mp3"];
const GOBLIN_ESCAPE_SOUNDS: ReadonlyArray<AudioFilePath> = ["goblin-escape-1.mp3", "goblin-escape-2.mp3", "goblin-escape-3.mp3"];
const GOBLIN_AMBIENT_SOUNDS: ReadonlyArray<AudioFilePath> = ["goblin-ambient-1.mp3", "goblin-ambient-2.mp3", "goblin-ambient-3.mp3", "goblin-ambient-4.mp3", "goblin-ambient-5.mp3"];

class TribesmanAIComponent extends ServerComponent<ServerComponentType.tribesmanAI> {
   public readonly name: number;
   public readonly untitledDescriptor: number;
   public aiType: TribesmanAIType;
   public relationsWithPlayer: number;

   public craftingProgress: number;
   public craftingItemType: ItemType;

   constructor(entity: Entity, data: TribesmanAIComponentData) {
      super(entity);

      this.name = data.name;
      this.untitledDescriptor = data.untitledDescriptor;
      this.aiType = data.currentAIType;
      this.relationsWithPlayer = data.relationsWithPlayer;
      this.craftingProgress = data.craftingProgress;
      this.craftingItemType = data.craftingItemType;
   }

   public tick(): void {
      const tribeComponent = this.entity.getServerComponent(ServerComponentType.tribe);

      // Sounds
      switch (this.aiType) {
         case TribesmanAIType.attacking: {
            if (Math.random() < 0.2 / Settings.TPS) {
               switch (tribeComponent.tribeType) {
                  case TribeType.goblins: {
                     playSound(randItem(GOBLIN_ANGRY_SOUNDS), 0.4, 1, this.entity.position.x, this.entity.position.y);
                     break;
                  }
                  case TribeType.barbarians: {
                     playSound("barbarian-angry-1.mp3", 0.4, 1, this.entity.position.x, this.entity.position.y);
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
                     playSound(randItem(GOBLIN_ESCAPE_SOUNDS), 0.4, 1, this.entity.position.x, this.entity.position.y);
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
                     playSound(randItem(GOBLIN_AMBIENT_SOUNDS), 0.4, 1, this.entity.position.x, this.entity.position.y);
                     break;
                  }
                  case TribeType.barbarians: {
                     playSound(("barbarian-ambient-" + randInt(1, 2) + ".mp3") as AudioFilePath, 0.4, 1, this.entity.position.x, this.entity.position.y);
                     break;
                  }
               }
            }
            break;
         }
      }
   }

   public updateFromData(data: TribesmanAIComponentData): void {
      this.aiType = data.currentAIType;
      this.relationsWithPlayer = data.relationsWithPlayer;
      this.craftingProgress = data.craftingProgress;
      this.craftingItemType = data.craftingItemType;
   }
}

export default TribesmanAIComponent;