/** Seeded random number generator, kindly stoleified from https://stackoverflow.com/questions/424292/seedable-javascript-random-number-generator */
abstract class SRandom {
   // LCG using GCC's constants
   private static m = 0x80000000; // 2^31;
   private static a = 1103515245;
   private static c = 12345;

   private static state = 0;
   public static num = 0;

   public static seed(n: number): void {
      console.log("seed: " + n);
      this.num = 0;
      this.state = n;

      // Skip first 5 values
      for (let i = 0; i < 5; i++) {
         SRandom.next();
      }
   }

   private static nextInt(): number {
      this.num++; // @Temporary
      this.state = (this.a * this.state + this.c) % this.m;
      return this.state;
   }
   
   public static next(): number {
      return this.nextInt() / (this.m - 1);
   }

   public static randInt(min: number, max: number): number {
      const rand = this.next();
      return Math.floor(rand * (max - min + 1)) + min;
   }

   public static randFloat(min: number, max: number): number {
      const rand = this.next();
      return rand * (max - min + 1) + min;
   }
}

export default SRandom;