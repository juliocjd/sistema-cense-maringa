const fs = require('fs');
const path = require('path');

// Lê o arquivo Markdown
const mdPath = path.join(__dirname, 'docs', 'APRESENTACAO-EXECUTIVA-VISUAL.md');
const mdContent = fs.readFileSync(mdPath, 'utf-8');

// Conversão de Markdown para HTML
function markdownToHtml(markdown) {
  const lines = markdown.split('\n');
  let html = '';
  let inList = false;
  let inTable = false;
  let tableLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Detectar tabelas
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableLines = [];
      }
      tableLines.push(line);

      // Verificar se é a última linha da tabela
      const nextLine = lines[i + 1];
      if (!nextLine || (!nextLine.trim().startsWith('|') || !nextLine.trim().endsWith('|'))) {
        // Processar tabela
        html += processTable(tableLines);
        inTable = false;
        tableLines = [];
      }
      continue;
    }

    // Blocos de código
    if (line.trim().startsWith('```')) {
      let codeBlock = '';
      i++; // Pular linha com ```
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeBlock += lines[i] + '\n';
        i++;
      }
      html += `<pre><code>${escapeHtml(codeBlock)}</code></pre>\n`;
      continue;
    }

    // Títulos
    if (line.startsWith('# ')) {
      html += `<h1>${processInline(line.substring(2))}</h1>\n`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${processInline(line.substring(3))}</h2>\n`;
    } else if (line.startsWith('### ')) {
      html += `<h3>${processInline(line.substring(4))}</h3>\n`;
    } else if (line.startsWith('#### ')) {
      html += `<h4>${processInline(line.substring(5))}</h4>\n`;
    }
    // Separador horizontal
    else if (line.trim() === '---') {
      html += '<hr>\n';
    }
    // Listas
    else if (line.match(/^[\-\*\+] /)) {
      if (!inList) {
        html += '<ul>\n';
        inList = true;
      }
      html += `<li>${processInline(line.substring(2))}</li>\n`;
    } else if (line.match(/^\d+\. /)) {
      if (!inList) {
        html += '<ol>\n';
        inList = true;
      }
      html += `<li>${processInline(line.substring(line.indexOf('.') + 2))}</li>\n`;
    } else {
      // Fechar lista se estava aberta
      if (inList) {
        html += '</ul>\n';
        inList = false;
      }

      // Parágrafos (não criar <p> para linhas que são apenas formatação)
      const trimmed = line.trim();
      if (trimmed !== '' && !trimmed.match(/^[\*\-\=\_\#]+$/)) {
        // Não criar parágrafo vazio se a linha tem só espaços ou caracteres especiais
        html += `<p>${processInline(line)}</p>\n`;
      }
    }
  }

  // Fechar lista se ficou aberta
  if (inList) {
    html += '</ul>\n';
  }

  return html;
}

function processTable(tableLines) {
  if (tableLines.length < 2) return '';

  let html = '<table>\n';

  // Cabeçalho (primeira linha)
  const headerCells = tableLines[0]
    .split('|')
    .filter(cell => cell.trim())
    .map(cell => `<th>${processInline(cell.trim())}</th>`)
    .join('');
  html += `<thead><tr>${headerCells}</tr></thead>\n`;

  // Corpo (pular linha separadora, começar da terceira linha)
  html += '<tbody>\n';
  for (let i = 2; i < tableLines.length; i++) {
    const rowCells = tableLines[i]
      .split('|')
      .filter(cell => cell.trim())
      .map(cell => `<td>${processInline(cell.trim())}</td>`)
      .join('');
    html += `<tr>${rowCells}</tr>\n`;
  }
  html += '</tbody>\n</table>\n';

  return html;
}

function processInline(text) {
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Negrito
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Itálico
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Código inline
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  return text;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const htmlContent = markdownToHtml(mdContent);

// Template HTML com estilos profissionais
const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Socio Inteligencia - Apresentação Executiva</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px;
      background: #fff;
    }

    h1 {
      font-size: 2.5em;
      color: #1a365d;
      margin-top: 0;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 4px solid #3182ce;
    }

    h2 {
      font-size: 2em;
      color: #2c5282;
      margin-top: 50px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #4299e1;
    }

    h3 {
      font-size: 1.5em;
      color: #2d3748;
      margin-top: 30px;
      margin-bottom: 15px;
    }

    h4 {
      font-size: 1.2em;
      color: #4a5568;
      margin-top: 20px;
      margin-bottom: 10px;
    }

    p {
      margin-top: 0;
      margin-bottom: 12px;
      text-align: justify;
    }

    /* Remover espaçamento extra */
    p:empty {
      display: none;
      margin: 0;
    }

    /* Zerar margem superior de parágrafos logo após títulos */
    h1 + p,
    h2 + p,
    h3 + p,
    h4 + p {
      margin-top: 0;
    }

    /* Zerar margem inferior de parágrafos seguidos de títulos */
    p + h1,
    p + h2,
    p + h3,
    p + h4 {
      margin-top: 40px;
    }

    /* Zerar margem entre parágrafos vazios e títulos */
    p:empty + h1,
    p:empty + h2,
    p:empty + h3,
    p:empty + h4 {
      margin-top: 50px;
    }

    ul, ol {
      margin: 15px 0 15px 30px;
    }

    li {
      margin-bottom: 8px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    th {
      background: #3182ce;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }

    td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
    }

    tr:nth-child(even) {
      background: #f7fafc;
    }

    tr:hover {
      background: #edf2f7;
    }

    code {
      background: #f7fafc;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      color: #e53e3e;
    }

    pre {
      background: #2d3748;
      color: #e2e8f0;
      padding: 20px;
      border-radius: 5px;
      overflow-x: auto;
      margin: 20px 0;
    }

    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }

    hr {
      border: none;
      border-top: 2px solid #cbd5e0;
      margin: 30px 0;
    }

    strong {
      color: #2d3748;
      font-weight: 600;
    }

    a {
      color: #3182ce;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    blockquote {
      border-left: 4px solid #4299e1;
      padding-left: 20px;
      margin: 20px 0;
      color: #4a5568;
      font-style: italic;
    }

    .page-break {
      page-break-after: always;
    }

    @media print {
      body {
        padding: 0;
      }

      h1, h2 {
        page-break-after: avoid;
      }

      table, pre, blockquote {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;

// Salva o HTML
const outputPath = path.join(__dirname, 'docs', 'APRESENTACAO-EXECUTIVA.html');
fs.writeFileSync(outputPath, fullHtml, 'utf-8');

console.log('✅ Arquivo HTML gerado com sucesso!');
console.log('📄 Localização:', outputPath);
console.log('\n📋 Próximos passos:');
console.log('1. Abra o arquivo HTML no navegador (Chrome/Edge)');
console.log('2. Pressione Ctrl+P para imprimir');
console.log('3. Selecione "Salvar como PDF"');
console.log('4. Configure margens e layout conforme necessário');
