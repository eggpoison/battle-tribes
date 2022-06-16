import Component from "../Component";
import { toggleDevtoolsVisibility } from "../components/Devtools";
import Player from "../entities/tribe-members/Player";
import { gameIsInFocus, isDev, Vector } from "../utils";
import TransformComponent from "./TransformComponent";

const keyEvents = new Array<(key: string) => void>();

const pressedKeys = new Array<string>();

const addPressedKey = (key: string): void => {
   if (pressedKeys.includes(key)) return;
   pressedKeys.push(key);

   for (const func of keyEvents) func(key);
}
const removePressedKey = (key: string): void => {
   pressedKeys.splice(pressedKeys.indexOf(key), 1);
}

export function keyIsPressed(key: string): boolean {
   return pressedKeys.includes(key);
}

export function stopPlayerMovement(): void {
   Player.instance.getComponent(PlayerControllerComponent)!.stopMovement();
}

class PlayerControllerComponent extends Component {
   private currentMoveBitmap = 0;

   public stopMovement(): void {
      this.currentMoveBitmap = 0;
   }

   public tick(): void {
      const transformComponent = this.getEntity().getComponent(TransformComponent)!;
      const angle = this.getMoveAngle();
      
      if (angle === null || !gameIsInFocus()) {
         // Stop the player moving
         transformComponent.isMoving = false;
         transformComponent.acceleration = null;
         return;
      }

      transformComponent.isMoving = true;
      
      // Set the entity's acceleration
      const acceleration = new Vector(Player.ACCELERATION, angle);
      transformComponent.acceleration = acceleration;
      
      // Update the entity's rotation to match the move direction
      transformComponent.rotation = angle;
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
      document.addEventListener("keydown", e => this.validateInput(e) ? this.checkKey(e, true) : null);
      document.addEventListener("keyup", e => this.validateInput(e) ? this.checkKey(e, false) : null);
   }

   private validateInput(e: Event): boolean {
      if (e instanceof MouseEvent) {
         // Return false if the player clicked something other than the game canvas.
         if ((e.target as HTMLElement).id !== "canvas") {
            return false;
         }
      }

      return true;
   }

   public static createKeyEvent(func: (key: string) => void): void {
      keyEvents.push(func);
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
         case "W":
         case "ArrowUp": bitPos = 0; break;
         case "d":
         case "D":
         case "ArrowRight": bitPos = 1; break;
         case "s":
         case "S":
         case "ArrowDown": bitPos = 2; break;
         case "a":
         case "A":
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