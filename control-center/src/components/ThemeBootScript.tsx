const themeBootScript = `
(() => {
  try {
    const stored = localStorage.getItem("ai-company-os-theme");
    const theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();
`;

export default function ThemeBootScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />;
}
