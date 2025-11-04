export function imageIsLoaded(image: HTMLImageElement): Promise<boolean> {
   return new Promise(resolve => {
      image.addEventListener("load", () => {
         resolve(true);
      });
   });
}

/**
 * Checks if the game is in development mode.
 * @returns If the game is in development mode.
 */
export function isDev(): boolean {
   return !process.env.NODE_ENV || process.env.NODE_ENV === "development";
}

export const NEIGHBOUR_OFFSETS = [
   [1, 0],
   [-1, 0],
   [0, -1],
   [-1, -1],
   [1, 1],
   [-1, 1],
   [0, 1],
   [1, -1]
];

// @Cleanup: These are here instead of in the actual Ballista file as that causes a circular dependency. Investigate

export const BALLISTA_GEAR_X = -12;
export const BALLISTA_GEAR_Y = 30;

export const BALLISTA_AMMO_BOX_OFFSET_X = 35;
export const BALLISTA_AMMO_BOX_OFFSET_Y = -20;