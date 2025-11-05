<script lang="ts">
   import { TamingTier } from "webgl-test-shared/src/taming";
   import { SKILL_TRANSFORM_SCALE_FACTOR, TAMING_TIER_ICONS } from "./TamingMenu.svelte";

   interface Props {
      readonly tamingTier: TamingTier;
   }

   const TAMING_TIER_Y_POSITIONS: Record<TamingTier, number> = {
      0: 0,
      1: 0,
      2: 20,
      3: 40
   };

   let props: Props = $props();

   const y = TAMING_TIER_Y_POSITIONS[props.tamingTier];
</script>

<div class="tier-separator-container" style:top="{y * SKILL_TRANSFORM_SCALE_FACTOR}rem">
   <img class="tier-icon" src={TAMING_TIER_ICONS[props.tamingTier]} alt="" />
   <div class="tier-separator"></div>
</div>