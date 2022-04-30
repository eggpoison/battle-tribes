import Component from "../../Component";
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
      const entity = this.getEntity();
      ai.setEntity(entity);
   }

   private getCurrentAI(): EntityAI {
      if (typeof this.currentAIType === "undefined") {
         throw new Error("The currentAIType field wasn't set! Make sure to call the setCurrentAIType function.");
      }
      return this.ai[this.currentAIType]!;
   }

   public tick(): void {
      const currentAI = this.getCurrentAI();
      currentAI.tick();
   }
}

export default AIManagerComponent;