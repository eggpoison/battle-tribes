import Component from "../../Component";
import Mob from "../../entities/mobs/Mob";
import EntityAI from "./EntityAI";

export type SwitchCondition = {
   readonly newID: string;
   shouldSwitch(): boolean;
   onSwitch?(): void;
}

class AIManagerComponent extends Component {
   private currentAI!: EntityAI;

   private readonly ai: { [key: string]: EntityAI } = {};

   private readonly switchConditions = new Array<SwitchCondition>();

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

   public getAI(id: string): EntityAI {
      if (this.ai.hasOwnProperty(id)) {
         return this.ai[id];
      }

      throw new Error(`Couldn't find an AI with id ${id}`);
   }

   public tick(): void {
      for (const switchCondition of this.switchConditions) {
         if (switchCondition.shouldSwitch()) {
            this.changeCurrentAI(switchCondition.newID);

            if (typeof switchCondition.onSwitch !== "undefined") switchCondition.onSwitch();

            break;
         }
      }

      this.currentAI.checkTargetPosition();
      this.currentAI.tick();
   }

   public addGlobalSwitchCondition(switchCondition: SwitchCondition): void {
      this.switchConditions.push(switchCondition);
   }
}

export default AIManagerComponent;