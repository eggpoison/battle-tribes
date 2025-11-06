import App from "./ui/App.svelte";
import { mount } from "svelte";
import "./css/index.css";
// @HACK i have to manually import this so that the component arrays are all detected
import "./game/entity-components/components";

const app = mount(App, {
   target: document.getElementById("app")!
});

export default app;