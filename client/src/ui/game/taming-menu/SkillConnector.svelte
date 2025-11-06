<script lang="ts">
   import { assert, type EntityTamingSpec, type TamingSkillNode } from "webgl-test-shared";
   import { hasTamingSkill, type TamingComponent } from "../../../game/entity-components/server-components/TamingComponent";
   import { SKILL_TRANSFORM_SCALE_FACTOR } from "../../../ui-state/taming-menu-state.svelte";

   interface Props {
      readonly tamingComponent: TamingComponent;
      readonly tamingSpec: EntityTamingSpec;
      readonly toSkillNode: TamingSkillNode;
   }

   let props: Props = $props();

   let fromSkillNode: TamingSkillNode | undefined;
   for (const currentSkillNode of props.tamingSpec.skillNodes) {
      if (currentSkillNode.skill.id === props.toSkillNode.parent) {
         fromSkillNode = currentSkillNode;
         break;
      }
   }
   assert(typeof fromSkillNode !== "undefined");
   
   // Position it at the start skill
   const x = fromSkillNode.x * SKILL_TRANSFORM_SCALE_FACTOR + "rem";
   const y = fromSkillNode.y * SKILL_TRANSFORM_SCALE_FACTOR + "rem";

   const offsetX = props.toSkillNode.x - fromSkillNode.x;
   const offsetY = props.toSkillNode.y - fromSkillNode.y;
   const offsetDirection = Math.atan2(offsetY, offsetX);
   const offsetMagnitude = Math.sqrt(offsetX * offsetX + offsetY * offsetY) * SKILL_TRANSFORM_SCALE_FACTOR + "rem";
</script>

<div class="skill-connector{hasTamingSkill(props.tamingComponent, props.toSkillNode.skill.id) ? " confirmed" : ""}" style:--x={x} style:--y={y} style:--direction-rad="{offsetDirection}rad" style:--magnitude={offsetMagnitude}></div>