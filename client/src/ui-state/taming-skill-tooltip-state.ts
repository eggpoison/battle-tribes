import { TamingSkillNode } from "../../../shared/src";

let skillNode: TamingSkillNode | null = null;
let x = 0;
let y = 0;

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