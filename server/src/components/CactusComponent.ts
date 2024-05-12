import { CactusBodyFlowerData, CactusLimbData } from "webgl-test-shared/dist/entities";

export class CactusComponent {
   public readonly flowers: ReadonlyArray<CactusBodyFlowerData>;
   public readonly limbs: ReadonlyArray<CactusLimbData>;

   constructor(flowers: ReadonlyArray<CactusBodyFlowerData>, limbs: ReadonlyArray<CactusLimbData>) {
      this.flowers = flowers;
      this.limbs = limbs;
   }
}