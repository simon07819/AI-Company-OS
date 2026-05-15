import { type NextRequest, NextResponse } from "next/server";
import { listTraceableArtifacts } from "@/lib/providers/providerRegistry";

export const dynamic = "force-dynamic";

function stripImports(code: string): string {
  return code
    .replace(/^import\s+(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+(?:\s*,\s*\{[^}]*\})?)\s+from\s+['"][^'"]+['"];?\s*$/gm, "")
    .replace(/^import\s+['"][^'"]+['"];?\s*$/gm, "")
    .trim();
}

function buildComponentRef(code: string): { processed: string; componentName: string } {
  const exportDefaultFn = code.match(/export\s+default\s+(?:function|class)\s+([A-Z]\w*)/);
  const componentName = exportDefaultFn ? exportDefaultFn[1] : "__PreviewComponent__";

  const processed = code
    .replace(/^export\s+default\s+function\s+/gm, "function ")
    .replace(/^export\s+default\s+class\s+/gm, "class ")
    .replace(/^export\s+default\s+/gm, `var ${componentName} = `)
    .replace(/^export\s+/gm, "");

  return { processed, componentName };
}

function htmlForCode(code: string, title: string): string {
  const stripped = stripImports(code);
  const { processed, componentName } = buildComponentRef(stripped);
  const codeJson = JSON.stringify(processed);
  const nameJson = JSON.stringify(componentName);

  // Language-tag escape for </script> inside template literal
  const closeScript = "<" + "/script>";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title.replace(/</g, "&lt;")}</title>
<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js">${closeScript}
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js">${closeScript}
<script src="https://unpkg.com/@babel/standalone/babel.min.js">${closeScript}
<style>
*{box-sizing:border-box}
body{margin:0;padding:16px;font-family:system-ui,-apple-system,sans-serif;background:#09090b;color:#f4f4f5;font-size:14px;line-height:1.6}
#root{min-height:60px}
#preview-error{color:#f87171;font-size:11px;font-family:monospace;white-space:pre-wrap;padding:8px 0;line-height:1.5}
</style>
${closeScript}
<body>
<div id="root"></div>
<div id="preview-error"></div>
<script>window.__code__=${codeJson};window.__name__=${nameJson};${closeScript}
<script>
window.addEventListener('load',function(){
  var hooks='const{useState,useEffect,useRef,useCallback,useMemo,useContext,createContext,forwardRef,memo}=React;';
  try{
    var result=Babel.transform(hooks+window.__code__,{
      presets:[['react',{}],['typescript',{allExtensions:true,isTSX:true}]]
    });
    var fn=new Function('React','ReactDOM',result.code+'\\nreturn typeof '+window.__name__+' !== "undefined" ? '+window.__name__+' : null;');
    var Component=fn(React,ReactDOM);
    if(Component&&(typeof Component==='function'||typeof Component==='object')){
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Component,{}));
    }else{
      document.getElementById('preview-error').textContent='Composant introuvable: '+window.__name__;
    }
  }catch(e){
    document.getElementById('preview-error').textContent=e.message;
  }
});
${closeScript}
</body>
</html>`;
}

function htmlForSvg(svg: string, title: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title.replace(/</g, "&lt;")}</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#09090b}svg{max-width:100%;height:auto}</style></head><body>${svg}</body></html>`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ artifactId: string }> },
) {
  const { artifactId } = await params;
  const artifacts = listTraceableArtifacts();
  const artifact = artifacts.find((a) => a.artifactId === artifactId);

  if (!artifact?.content) {
    return new NextResponse("Artifact introuvable.", { status: 404, headers: { "Content-Type": "text/plain" } });
  }

  const content = artifact.content.trim();
  const title = artifact.title || "Preview";
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "X-Frame-Options": "SAMEORIGIN",
    "Cache-Control": "no-store",
  };

  if (content.startsWith("<!") || /<html[\s>]/i.test(content.slice(0, 100))) {
    return new NextResponse(content, { headers });
  }

  if (/<svg[\s>]/i.test(content.slice(0, 200))) {
    return new NextResponse(htmlForSvg(content, title), { headers });
  }

  return new NextResponse(htmlForCode(content, title), { headers });
}
