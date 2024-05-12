import { CowSpecies } from "webgl-test-shared/dist/entities";

export class CowComponent {
   public readonly species: CowSpecies;
   public grazeProgressTicks = 0;
   public grazeCooldownTicks: number;

   // For shaking berry bushes
   public targetBushID = 0;
   public bushShakeTimer = 0;

   constructor(species: CowSpecies, grazeCooldownTicks: number) {
      this.species = species;
      this.grazeCooldownTicks = grazeCooldownTicks;
   }
}

export function updateCowComponent(cowComponent: CowComponent): void {
   if (cowComponent.grazeCooldownTicks > 0) {
      cowComponent.grazeCooldownTicks--;
   }
}