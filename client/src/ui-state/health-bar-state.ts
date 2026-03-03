// @Cleanup: 20 default is strange
let previousHealth = 20;
let health = 20;

export const healthBarState = {
   get health() {
      return health;
   },
   get previousHealth() {
      return previousHealth
   },
   setHealth(newHealth: number): void {
      if (newHealth !== health) {
         previousHealth = health;
         health = newHealth;
      }
   }
};