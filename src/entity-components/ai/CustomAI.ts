import EntityAI from "./EntityAI";

class CustomAI extends EntityAI {
   public readonly id: string;

   constructor(id: string) {
      super();

      this.id = id;
   }
}

export default CustomAI;