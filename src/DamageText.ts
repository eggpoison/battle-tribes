import Board from "./Board";
import Camera from "./Camera";
import { getGameCanvasContext } from "./components/Canvas";
import SETTINGS from "./settings";
import { Point, roundNum, Vector } from "./utils";

const TEXT_COLOURS: { [key: number]: string } = {
   0: "#aaa", // Gray
   3: "#fff", // White
   5: "#ff8800", // Orange
   10: "#f00" // Red
}

const getDamageTextColour = (damage: number): string => {
   const entries = Object.entries(TEXT_COLOURS) as unknown as Array<[number, string]>;
   for (const [damageCutoff, colour] of entries) {
      if (damage <= damageCutoff) {
         return colour;
      }
   }

   // If all else fails, return the highest colour
   const len = Object.keys(TEXT_COLOURS).length;
   return Object.values(TEXT_COLOURS)[len - 1];
}

class DamageText {
   private static readonly DISAPPEAR_TIME = 1;
   /** Number of seconds before the text starts to disappear */
   private static readonly TIME_BEFORE_DISAPPEAR = 0.3;
   private static readonly LIFESPAN: number = this.DISAPPEAR_TIME + this.TIME_BEFORE_DISAPPEAR;

   private readonly text: string;
   private readonly colour: string;

   private x: number;
   private y: number;

   private age: number = 0;

   private static readonly BUOYANCY = 1;
   private static readonly OFFSET_RANGE = 0.4;

   constructor(damage: number, x: number, y: number) {
      this.text = roundNum(damage, 0).toString();

      // Get a random offset for the position
      const offset = Vector.randomUnitVector();
      offset.magnitude *= DamageText.OFFSET_RANGE * Board.tileSize;
      
      // Calculate the starting position for the damage text
      const originPoint = new Point(x, y);
      const position = originPoint.add(offset.convertToPoint());
      this.x = position.x;
      this.y = position.y;

      this.colour = getDamageTextColour(damage);

      Board.damageTexts.push(this);
   }

   public tick(): void {
      this.age += 1 / SETTINGS.tps;
      if (this.age >= DamageText.LIFESPAN) {
         this.destroy();
         return;
      }
   }

   public render(): void {
      const fractionalAge = Math.max((this.age - DamageText.TIME_BEFORE_DISAPPEAR) / DamageText.DISAPPEAR_TIME, 0);

      // Calculate the opacity for the text
      const opacity = Math.pow(1 - fractionalAge, 0.6);

      const ctx = getGameCanvasContext();

      ctx.save();

      ctx.globalAlpha = opacity;
      ctx.font = "900 26px Courier New";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;

      const x = Camera.getXPositionInCamera(this.x);
      const y = Camera.getYPositionInCamera(this.y - DamageText.BUOYANCY * Board.tileSize * Math.pow(fractionalAge, 0.6));

      // Draw text outline
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#000";
      ctx.strokeText(this.text, x, y);
      
      // Draw text
      // ctx.globalAlpha = 1;
      ctx.fillStyle = this.colour;
      ctx.fillText(this.text, x, y);

      ctx.restore();
   }

   private destroy(): void {
      Board.damageTexts.splice(Board.damageTexts.indexOf(this), 1);
   }
}

export default DamageText;