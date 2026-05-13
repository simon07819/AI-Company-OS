const themeBootScript = `
(() => {
  try {
    const stored = localStorage.getItem("ai-company-os-theme");
    const theme = stored || "dark";
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = "dark";
  }
})();
`;

export default function ThemeBootScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />;
}
