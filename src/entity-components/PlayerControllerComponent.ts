import Component from "../Component";
import { toggleDevtoolsVisibility } from "../components/Devtools";
import { isDev, Vector } from "../utils";
import AttackComponent from "./AttackComponent";
import TransformComponent from "./TransformComponent";

const keyListeners = new Array<(key: string) => void>();

const pressedKeys = new Array<string>();

const addPressedKey = (key: string): void => {
   if (pressedKeys.includes(key)) return;
   pressedKeys.push(key);

   for (const func of keyListeners) func(key);
}
const removePressedKey = (key: string): void => {
   pressedKeys.splice(pressedKeys.indexOf(key), 1);
}

export function keyIsPressed(key: string): boolean {
   return pressedKeys.includes(key);
}

class PlayerControllerComponent extends Component {
   private previousMoveBitmap = 0;
   private currentMoveBitmap = 0;

   /** The number of tiles that the player traverses in a second */
   private readonly moveSpeed = 5;

   private changeDirection(): void {
      const angle = this.getMoveAngle();

      const velocity = new Vector(angle !== null ? this.moveSpeed : 0, angle || 0);

      const entity = this.getEntity();
      const transformComponent = entity.getComponent(TransformComponent)!;
      transformComponent.setVelocity(velocity);

      // Update the entity's rotation to match the move direction
      if (angle !== null) {
         transformComponent.rotation = angle;
      }
   }

   public tick(): void {
      if (this.currentMoveBitmap !== this.previousMoveBitmap) {
         this.changeDirection();
      }

      this.previousMoveBitmap = this.currentMoveBitmap;
   }

   private getMoveAngle(): number | null {
      let angle!: number;

      switch (this.currentMoveBitmap) {
         case 0: return null;
         case 1: angle = 0; break;
         case 2: angle = 90; break;
         case 3: angle = 45; break;
         case 4: angle = 180; break;
         case 5: return null;
         case 6: angle = 135; break;
         case 7: angle = 90; break;
         case 8: angle = 270; break;
         case 9: angle = 315; break;
         case 10: return null;
         case 11: angle = 0; break;
         case 12: angle = 225; break;
         case 13: angle = 270; break;
         case 14: angle = 180; break;
         case 15: return null;
      }

      return (angle - 90) * Math.PI / 180
   }

   public onLoad(): void {
      document.addEventListener("mousedown", e => this.validateInput(e) ? this.startAttack() : null);

      document.addEventListener("keydown", e => this.validateInput(e) ? this.checkKey(e, true) : null);
      document.addEventListener("keyup", e => this.validateInput(e) ? this.checkKey(e, false) : null);
   }

   private validateInput(e: Event): boolean {
      if (e instanceof MouseEvent) {
         // Return false if the player clicked something other than the game canvas.
         if ((e.target as HTMLElement).id !== "canvas") {
            e.preventDefault();
            return false;
         }
      }

      return true;
   }

   private startAttack(): void {
      const attackComponent = this.getEntity().getComponent(AttackComponent)!;
      attackComponent.startAttack("baseAttack");
   }

   public static createKeyEvent(func: (key: string) => void): void {
      keyListeners.push(func);
   }

   private checkKey(e: KeyboardEvent, isKeyDown: boolean): void {
      const key = e.key;
      isKeyDown ? addPressedKey(key) : removePressedKey(key);

      let bitPos!: number;

      switch (key) {
         // Devtools
         case "`":
            if (isKeyDown && isDev()) toggleDevtoolsVisibility();
            break;

         // Movement
         case "w":
         case "ArrowUp": bitPos = 0; break;
         case "d":
         case "ArrowRight": bitPos = 1; break;
         case "s":
         case "ArrowDown": bitPos = 2; break;
         case "a":
         case "ArrowLeft": bitPos = 3; break;
      }

      if (typeof bitPos !== "undefined") {
         const bitmap = 1 << bitPos;
         if (isKeyDown) {
            this.currentMoveBitmap |= bitmap;
         } else {
            this.currentMoveBitmap &= ~bitmap;
         }
      }
   }
}

export default PlayerControllerComponent;