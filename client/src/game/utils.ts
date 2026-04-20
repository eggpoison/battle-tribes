// @Cleanup: These are here instead of in the actual Ballista file as that causes a circular dependency. Investigate

export const BALLISTA_GEAR_X = -12;
export const BALLISTA_GEAR_Y = 30;

export const BALLISTA_AMMO_BOX_OFFSET_X = 35;
export const BALLISTA_AMMO_BOX_OFFSET_Y = -20;

export function imageIsLoaded(image: HTMLImageElement): Promise<boolean> {
   return new Promise(resolve => {
      image.addEventListener("load", () => {
         resolve(true);
      });
   });
}

export function preventDefault(e: Event): void {
   e.preventDefault();
}