import CircularHitbox from "./CircularHitbox";
import RectangularHitbox from "./RectangularHitbox";

export type Hitbox = CircularHitbox | RectangularHitbox;

export function hitboxIsCircular(hitbox: Hitbox): hitbox is CircularHitbox {
   return typeof (hitbox as CircularHitbox).radius !== "undefined";
}