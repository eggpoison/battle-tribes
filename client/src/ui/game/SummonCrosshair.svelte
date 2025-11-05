<script lang="ts">
   const [position, setPosition] = useState<[number, number] | null>(null);
   
   useEffect(() => {
      // @Hack
      if (!hasLoaded.current) {
         hasLoaded.current = true;
       
         document.addEventListener("mousemove", (e) => {
            setPosition([e.clientX, e.clientY]);
         });
      }
   }, []);
</script>

<div id="summon-crosshair" style={{"left": position[0] + "px", "top": position[1] + "px"}}>
   <img src={require("../../images/ui/summon-crosshair.png")} alt="" />
</div>