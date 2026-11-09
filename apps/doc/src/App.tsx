import { SolidBaseRoot } from "@kobalte/solidbase/client";
import HeaderExtras from "./components/HeaderExtras";
import { Router } from "./router";

export default function App() {
  return (
    <>
      <HeaderExtras />
      <Router>{(props) => <SolidBaseRoot>{props.children}</SolidBaseRoot>}</Router>
    </>
  );
}
