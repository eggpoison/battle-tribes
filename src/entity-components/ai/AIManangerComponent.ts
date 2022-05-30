import Component from "../../Component";
import Mob from "../../entities/mobs/Mob";
import EntityAI from "./EntityAI";

class AIManagerComponent extends Component {
   private currentAI!: EntityAI;

   private readonly ai: { [key: string]: EntityAI } = {};

   public addAI<A extends EntityAI>(ai: A): A {
      if (this.ai.hasOwnProperty(ai.id)) {
         throw new Error(`Tried to add an AI with the ID '${ai.id}', but it already existed!`);
      }

      this.ai[ai.id] = ai;

      // Set the AI's entity
      const entity = this.getEntity() as Mob;
      ai.setEntity(entity);

      return ai;
   }

   public changeCurrentAI(id: string): void {
      if (id in this.ai) {
         this.currentAI = this.ai[id];
         return;
      }

      throw new Error(`Tried to switch to an AI with the ID '${id}', but none existed!`);
   }

   public tick(): void {
      this.currentAI.checkTargetPosition();
      this.currentAI.tick();
   }
}

export default AIManagerComponent;