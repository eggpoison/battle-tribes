import { getLightLevelNodeX, getLightLevelNodeY, LightLevelVars } from "../../../../shared/src/light-levels";
import { distance, roundNum } from "../../../../shared/src/utils";
import { getLightLevelNodeInfos } from "../light-levels";
import { cursorWorldPos } from "../mouse-input";
import { getTextContext, getXPosInTextCanvas, getYPosInTextCanvas } from "../text-canvas";

const enum Vars {
   NODE_DISPLAY_DIST = 32
}

export function renderLightLevelsText() {
   const nodeInfos = getLightLevelNodeInfos();
   
   const ctx = getTextContext();

   const height = 12;
   
   ctx.font = `400 ${height}px Helvetica`;
   ctx.lineJoin = "round";
   ctx.miterLimit = 2;
   ctx.globalAlpha = 0.8;
   ctx.fillStyle = `#ffffff`;

   for (const pair of nodeInfos) {
      const node = pair[0];

      const nodeInfo = pair[1];
      const lightLevel = nodeInfo.lightLevel;

      const nodeX = getLightLevelNodeX(node);
      const nodeY = getLightLevelNodeY(node);
      const x = (nodeX + 0.5) * LightLevelVars.LIGHT_NODE_SIZE;
      const y = (nodeY + 0.5) * LightLevelVars.LIGHT_NODE_SIZE;

      const dist = distance(x, y, cursorWorldPos.x, cursorWorldPos.y);
      if (dist > Vars.NODE_DISPLAY_DIST) {
         continue;
      }

      const left = getXPosInTextCanvas(x);
      const top = getYPosInTextCanvas(y);

      const text = roundNum(lightLevel, 1).toString();
      const textWidth = ctx.measureText(text).width;
      ctx.fillText(text, left - textWidth * 0.5, top + height * 0.5);
   }

   ctx.globalAlpha = 1;
}