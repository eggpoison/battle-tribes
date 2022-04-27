import Component from "../Component";
import { toggleDevtoolsVisibility } from "../components/Devtools";
import { isDev, Vector } from "../utils";
import AttackComponent from "./AttackComponent";
import TransformComponent from "./TransformComponent";

class PlayerControllerComponent extends Component {
   private isMovingUp: boolean = false;
   private isMovingRight: boolean = false;
   private isMovingDown: boolean = false;
   private isMovingLeft: boolean = false;

   /** The number of cells that the player traverses in a second */
   private readonly moveSpeed = 5;

   public tick(): void {
      const angle = this.getMoveAngle();

      const velocity = new Vector(angle !== null ? this.moveSpeed : 0, angle || 0);

      const entity = this.getEntity();
      const transformComponent = entity.getComponent(TransformComponent)!;
      transformComponent.velocity = velocity;

      // Update the entity's rotation to match the move direction
      if (angle !== null) {
         transformComponent.rotation = angle;
      }
   }

   private getMoveAngle(): number | null {
      let bitMask = 0;
      if (this.isMovingUp) bitMask += 1
      if (this.isMovingRight) bitMask += 2;
      if (this.isMovingDown) bitMask += 4;
      if (this.isMovingLeft) bitMask += 8;

      let angle!: number;

      switch (bitMask) {
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

   private checkKey(e: KeyboardEvent, isKeyDown: boolean): void {
      const key = e.key;

      switch (key) {
         // Devtools
         case "`":
            if (isKeyDown && isDev()) toggleDevtoolsVisibility();
            break;

         // Movement
         case "w":
         case "ArrowUp":
            this.isMovingUp = isKeyDown;
            break;
         case "d":
         case "ArrowRight":
            this.isMovingRight = isKeyDown;
            break;
         case "s":
         case "ArrowDown":
            this.isMovingDown = isKeyDown;
            break;
         case "a":
         case "ArrowLeft":
            this.isMovingLeft = isKeyDown;
            break;
      }
   }
}

export default PlayerControllerComponent;