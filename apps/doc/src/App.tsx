import { SolidBaseRoot } from "@kobalte/solidbase/client";
import { Router } from "./router";

export default function App() {
  return <Router>{(props) => <SolidBaseRoot>{props.children}</SolidBaseRoot>}</Router>;
}
