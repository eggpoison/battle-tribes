<script lang="ts">
   import { TamingSkillNode } from "webgl-test-shared/src/taming";
   import { hasTamingSkill, TamingComponent } from "../../../game/entity-components/server-components/TamingComponent";
   import { SKILL_TRANSFORM_SCALE_FACTOR } from "./TamingMenu.svelte";

   interface Props {
      readonly tamingComponent: TamingComponent;
      readonly toSkillNode: TamingSkillNode;
   }

   let props: Props = $props();

   let parentSkillNode: TamingSkillNode | undefined;
   for (const currentSkillNode of tamingSpec.skillNodes) {
      if (currentSkillNode.skill.id === skillNode.parent) {
         parentSkillNode = currentSkillNode;
         break;
      }
   }
   assert(typeof parentSkillNode !== "undefined");
   

   // Position it at the start skill
   const x = props.fromSkillNode.x * SKILL_TRANSFORM_SCALE_FACTOR + "rem";
   const y = props.fromSkillNode.y * SKILL_TRANSFORM_SCALE_FACTOR + "rem";

   const offsetX = props.toSkillNode.x - props.fromSkillNode.x;
   const offsetY = props.toSkillNode.y - props.fromSkillNode.y;
   const offsetDirection = Math.atan2(offsetY, offsetX);
   const offsetMagnitude = Math.sqrt(offsetX * offsetX + offsetY * offsetY) * SKILL_TRANSFORM_SCALE_FACTOR + "rem";
</script>

<div class="skill-connector{hasTamingSkill(props.tamingComponent, props.toSkillNode.skill.id) ? " confirmed" : ""}" style:--x={x} style:--y={y} style:--direction-rad="{offsetDirection}rad" style:--magnitude={offsetMagnitude}></div>;