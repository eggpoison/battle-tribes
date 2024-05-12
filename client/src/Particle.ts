let idCounter = 0;

const getAvailableID = (): number => {
   return idCounter++;
}

class Particle {
   public readonly id = getAvailableID();

   public age = 0;
   public readonly lifetime: number;
   
   constructor(lifetime: number) {
      this.lifetime = lifetime;
   }

   // @Speed: Polymorphism
   public getOpacity?(): number;
   public getScale?(): number;
}

export default Particle;