<script lang="ts">
   import { type EntityTamingSpec, type TamingSkillNode } from "webgl-test-shared";
   import { SKILL_TRANSFORM_SCALE_FACTOR } from "../../../ui-state/taming-menu-state";

   interface Props {
      tamingSpec: EntityTamingSpec;
      toSkillNode: TamingSkillNode;
      hasSkill: boolean;
   }

   let { tamingSpec, toSkillNode, hasSkill }: Props = $props();

   const getFromSkillNode = (): TamingSkillNode => {
      for (const currentSkillNode of tamingSpec.skillNodes) {
         if (currentSkillNode.skill.id === toSkillNode.parent) {
            return currentSkillNode;
         }
      }
      throw new Error();
   }

   const fromSkillNode = getFromSkillNode();
   
   const offsetX = $derived(toSkillNode.x - fromSkillNode.x);
   const offsetY = $derived(toSkillNode.y - fromSkillNode.y);
   const offsetDirection = $derived(Math.atan2(offsetY, offsetX));
   const offsetMagnitude = $derived(Math.sqrt(offsetX * offsetX + offsetY * offsetY) * SKILL_TRANSFORM_SCALE_FACTOR + "rem");
</script>

<div
   class="skill-connector"
   class:confirmed={hasSkill}
   style:--x="{fromSkillNode.x * SKILL_TRANSFORM_SCALE_FACTOR}rem"
   style:--y="{fromSkillNode.y * SKILL_TRANSFORM_SCALE_FACTOR}rem"
   style:--direction-rad="{offsetDirection}rad"
   style:--magnitude={offsetMagnitude}
></div>