import "./css/index.css";
import "./ui/MainMenu"; // From here everything should be imported
import "./game/entity-components/components"; // So that the component arrays are all detected
// @HACK because the whole nerdVision tree would otherwise never be imported
import "./ui/game/dev/NerdVision";
// @HACK
import "./ui/game/DeathScreen";

// There are many components which are never imported anywhere
import.meta.glob("./game/entity-components/**/*Component.ts", {
   eager: true
});

if (import.meta.hot) {
   import.meta.hot.accept();
}