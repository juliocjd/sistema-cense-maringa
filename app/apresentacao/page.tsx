import path from "node:path";
import { promises as fs } from "node:fs";

export const dynamic = "force-static";
export const revalidate = 300;

async function carregarHtmlApresentacao() {
  const arquivo = path.join(process.cwd(), "docs", "Apresentacao.html");
  try {
    const conteudo = await fs.readFile(arquivo, "utf-8");
    return conteudo;
  } catch (error) {
    console.error("Falha ao carregar Apresentacao.html:", error);
    return "<h1>Arquivo não encontrado</h1>";
  }
}

export default async function PaginaApresentacao() {
  const html = await carregarHtmlApresentacao();
  return (
    <main className="min-h-screen bg-white">
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  );
}
