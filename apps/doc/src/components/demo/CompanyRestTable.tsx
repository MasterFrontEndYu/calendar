import { For } from "solid-js";
import { COMPANY_REST } from "../../demo/company-holidays";
import "./demo.css";

export default function CompanyRestTable() {
  return (
    <table class="demo-table">
      <thead>
        <tr>
          <th>年份</th>
          <th>xiu（放假）</th>
          <th>ban（补班）</th>
          <th>subtitle 数据</th>
        </tr>
      </thead>
      <tbody>
        <For each={Object.entries(COMPANY_REST)}>
          {([year, entry]) => (
            <tr>
              <td>{year}</td>
              <td>{entry.xiu?.join("、") || "-"}</td>
              <td>{entry.ban?.join("、") || "-"}</td>
              <td>
                {Object.entries(entry.names ?? {})
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, name]) => `${date} ${name}`)
                  .join("、") || "-"}
              </td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}
