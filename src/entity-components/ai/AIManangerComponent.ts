import Component from "../../Component";
import Mob from "../../entities/mobs/Mob";
import EntityAI, { AIType } from "./EntityAI";

class AIManagerComponent extends Component {
   private readonly ai: Partial<Record<AIType, EntityAI>> = {};

   private currentAIType!: AIType;

   public setCurrentAIType(aiType: AIType): void {
      this.currentAIType = aiType;
   }

   public addAI(ai: EntityAI): void {
      if (this.ai.hasOwnProperty(ai.type)) {
         throw new Error(`Tried to add an AI of type ${ai.type} but it already existed!`);
      }

      this.ai[ai.type] = ai;

      // Set the AI's entity
      const entity = this.getEntity() as Mob;
      ai.setEntity(entity);
   }

   public getCurrentAI(): EntityAI {
      return this.ai[this.currentAIType]!;
   }

   public tick(): void {
      const currentAI = this.getCurrentAI();
      currentAI.checkTargetPosition();
      if (typeof currentAI.tick !== "undefined") currentAI.tick();

      // If the next AI can be switched, switch
      for (const [aiType, ai] of Object.entries(this.ai)) {
         if (aiType === this.currentAIType) continue;

         if (typeof ai.shouldSwitch !== "undefined" && ai.shouldSwitch()) {
            this.setCurrentAIType(aiType as AIType);
            break;
         }
      }
   }
}

export default AIManagerComponent;