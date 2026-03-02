<script lang="ts">
   interface Props {
      readonly relation: number;
   }

   let props: Props = $props();
   const sliderProgress = (props.relation + 100) / 200;

   const markerColour = (() => {
      if (props.relation <= -30) {
         return "#e68383";
      } else if (props.relation >= 50) {
         return "#83e69d";
      } else {
         return "#eee";
      }
   })();
</script>

<div class="relation-slider-container">
   <div class="enemy-region"></div>
   <div class="friendly-region"></div>
   <div class="slider-marker" style:left="{sliderProgress * 100}%" style:backgroundColor={markerColour}></div>
   <div class="inner-shadow"></div>
</div>