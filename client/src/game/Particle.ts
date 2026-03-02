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

   // @Speed: Polymorphism. have a particle type and switch based on that
   public getOpacity?(): number;
   public getScale?(): number;
}

export default Particle;