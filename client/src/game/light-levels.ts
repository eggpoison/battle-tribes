import { PacketReader, LightLevelNode } from "webgl-test-shared";
import { currentSnapshot } from "./game";
import { getLightLevelRenderingChunkIndex, LightLevelBGUpdateInfo, updateLightLevelRenderingChunks } from "./rendering/webgl/light-levels-bg-rendering";

interface LightLevelNodeInfo {
   lightLevel: number;
   lastUpdateTicks: number;
}

const nodeInfos = new Map<LightLevelNode, LightLevelNodeInfo>();

export function getLightLevelNodeInfos(): ReadonlyMap<LightLevelNode, LightLevelNodeInfo> {
   return nodeInfos;
}

export function updateLightLevelsFromData(reader: PacketReader): void {
   const bgUpdateInfos = new Map<number, LightLevelBGUpdateInfo>();
   
   const numLightLevelNodes = reader.readNumber();
   for (let i = 0; i < numLightLevelNodes; i++) {
      const node = reader.readNumber() as LightLevelNode;
      const lightLevel = reader.readNumber();

      const existingNodeInfo = nodeInfos.get(node);
      if (existingNodeInfo === undefined) {
         const nodeInfo: LightLevelNodeInfo = {
            lightLevel: lightLevel,
            lastUpdateTicks: currentSnapshot.tick
         };
         nodeInfos.set(node, nodeInfo);
      } else {
         existingNodeInfo.lightLevel = lightLevel;
         existingNodeInfo.lastUpdateTicks = currentSnapshot.tick;
      }

      const renderingChunkIdx = getLightLevelRenderingChunkIndex(node);
      if (bgUpdateInfos.get(renderingChunkIdx) === undefined) {
         bgUpdateInfos.set(renderingChunkIdx, {
            addedNodeInfos: [],
            removedNodeInfos: []
         });
      }

      const bgUpdateInfo = bgUpdateInfos.get(renderingChunkIdx)!;
      bgUpdateInfo.addedNodeInfos.push({
         node: node,
         lightLevel: lightLevel
      });
   }

   // Remove any node infos which weren't present
   for (const pair of nodeInfos) {
      const node = pair[0];
      const nodeInfo = pair[1];
      if (nodeInfo.lastUpdateTicks === currentSnapshot.tick) {
         continue;
      }
      
      nodeInfos.delete(node);

      const renderingChunkIdx = getLightLevelRenderingChunkIndex(node);
      if (bgUpdateInfos.get(renderingChunkIdx) === undefined) {
         bgUpdateInfos.set(renderingChunkIdx, {
            addedNodeInfos: [],
            removedNodeInfos: []
         });
      }

      const bgUpdateInfo = bgUpdateInfos.get(renderingChunkIdx)!;
      bgUpdateInfo.removedNodeInfos.push({
         node: node,
         lightLevel: nodeInfo.lightLevel
      });
   }

   updateLightLevelRenderingChunks(bgUpdateInfos);
}