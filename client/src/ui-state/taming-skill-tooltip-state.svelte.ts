import { TamingSkillNode } from "../../../shared/src";

let skillNode = $state<TamingSkillNode | null>(null);
let x = $state(0);
let y = $state(0);

export const tamingSkillTooltipState = {
   get skillNode() {
      return skillNode;
   },
   setSkillNode(newSkillNode: TamingSkillNode | null): void {
      skillNode = newSkillNode;
   },

   get x() {
      return x;
   },
   setX(newX: number): void {
      x = newX;
   },

   get y() {
      return y;
   },
   setY(newY: number): void {
      y = newY;
   }
}