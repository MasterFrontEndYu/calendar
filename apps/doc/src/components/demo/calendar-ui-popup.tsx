import CalendarUIPopupDefault from "./calendar-ui-popup-default";
import CalendarUIPopupCustom from "./calendar-ui-popup-custom";

export default function CalendarUIPopup() {
  return (
    <div class="demo-popup-grid">
      <CalendarUIPopupDefault />
      <CalendarUIPopupCustom />
    </div>
  );
}
