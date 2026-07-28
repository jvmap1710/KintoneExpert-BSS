import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

function parseArgs(argv) {
  const result = { overwrite: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--overwrite") {
      result.overwrite = true;
      continue;
    }
    if (!["--input", "--output", "--title"].includes(argument)) {
      throw new Error(`Unknown argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}`);
    }
    result[argument.slice(2)] = value;
    index += 1;
  }
  if (!result.input) throw new Error("--input is required.");
  return result;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeHref(value) {
  const trimmed = value.trim();
  if (
    /^(?:https?:\/\/|mailto:|#|\.{0,2}\/)/iu.test(trimmed) ||
    /^[A-Za-z0-9][A-Za-z0-9._/-]*(?:#[A-Za-z0-9._-]+)?$/u.test(trimmed)
  ) {
    return escapeHtml(trimmed);
  }
  return "#";
}

function renderInline(value) {
  const tokens = [];
  const reserve = (html) => {
    const token = `\u0000${tokens.length}\u0000`;
    tokens.push(html);
    return token;
  };

  let rendered = value
    .replace(/`([^`\n]+)`/gu, (_, code) =>
      reserve(`<code>${escapeHtml(code)}</code>`),
    )
    .replace(/\[([^\]\n]+)\]\(([^)\n]+)\)/gu, (_, label, href) =>
      reserve(`<a href="${safeHref(href)}">${escapeHtml(label)}</a>`),
    );

  rendered = escapeHtml(rendered)
    .replace(/\*\*([^*\n]+)\*\*/gu, "<strong>$1</strong>")
    .replace(/__([^_\n]+)__/gu, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/gu, "<em>$1</em>")
    .replace(/(?<!_)_([^_\n]+)_(?!_)/gu, "<em>$1</em>");

  return rendered.replace(/\u0000(\d+)\u0000/gu, (_, index) => tokens[Number(index)]);
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/u, "")
    .replace(/\|$/u, "")
    .split("|")
    .map((cell) => cell.trim());
}

function slugify(value, used) {
  const base =
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-|-$/gu, "") || "section";
  const count = used.get(base) || 0;
  used.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

function renderMarkdown(markdown) {
  const lines = markdown.replace(/\r\n?/gu, "\n").split("\n");
  const output = [];
  const headings = [];
  const usedSlugs = new Map();
  let paragraph = [];
  let listType = null;

  const closeParagraph = () => {
    if (paragraph.length) {
      output.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listType) {
      output.push(`</${listType}>`);
      listType = null;
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const next = lines[index + 1] || "";

    if (/^```/u.test(line)) {
      closeParagraph();
      closeList();
      const language = line.slice(3).trim();
      const code = [];
      index += 1;
      while (index < lines.length && !/^```/u.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      output.push(
        `<pre><code${language ? ` class="language-${escapeHtml(language)}"` : ""}>` +
          `${escapeHtml(code.join("\n"))}</code></pre>`,
      );
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/u);
    if (heading) {
      closeParagraph();
      closeList();
      const level = heading[1].length;
      const text = heading[2].trim();
      const id = slugify(text, usedSlugs);
      headings.push({ level, text, id });
      output.push(`<h${level} id="${id}">${renderInline(text)}</h${level}>`);
      continue;
    }

    if (
      line.includes("|") &&
      /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/u.test(next)
    ) {
      closeParagraph();
      closeList();
      const headers = splitTableRow(line);
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      index -= 1;
      output.push("<div class=\"table-wrap\"><table><thead><tr>");
      output.push(headers.map((cell) => `<th>${renderInline(cell)}</th>`).join(""));
      output.push("</tr></thead><tbody>");
      for (const row of rows) {
        output.push("<tr>");
        output.push(
          headers
            .map((_, cellIndex) => `<td>${renderInline(row[cellIndex] || "")}</td>`)
            .join(""),
        );
        output.push("</tr>");
      }
      output.push("</tbody></table></div>");
      continue;
    }

    const unordered = line.match(/^\s*[-*+]\s+(.+)$/u);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/u);
    if (unordered || ordered) {
      closeParagraph();
      const desiredType = unordered ? "ul" : "ol";
      if (listType !== desiredType) {
        closeList();
        listType = desiredType;
        output.push(`<${listType}>`);
      }
      output.push(`<li>${renderInline((unordered || ordered)[1])}</li>`);
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/u);
    if (quote) {
      closeParagraph();
      closeList();
      output.push(`<blockquote>${renderInline(quote[1])}</blockquote>`);
      continue;
    }

    if (/^\s*(?:---+|\*\*\*+)\s*$/u.test(line)) {
      closeParagraph();
      closeList();
      output.push("<hr>");
      continue;
    }

    if (!line.trim()) {
      closeParagraph();
      closeList();
      continue;
    }

    paragraph.push(line.trim());
  }

  closeParagraph();
  closeList();
  return { body: output.join("\n"), headings };
}

function buildToc(headings) {
  const visible = headings.filter(({ level }) => level >= 2 && level <= 3);
  if (!visible.length) return "";
  return `<nav class="toc" aria-label="Table of contents">
  <h2>Nội dung</h2>
  <ul>${visible
    .map(
      ({ level, text, id }) =>
        `<li class="toc-level-${level}"><a href="#${id}">${escapeHtml(text)}</a></li>`,
    )
    .join("")}</ul>
</nav>`;
}

function buildHtml({ title, source, body, headings }) {
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; --ink:#172033; --muted:#667085; --line:#d0d5dd; --accent:#175cd3; }
    * { box-sizing: border-box; }
    body { margin:0; background:#f6f8fb; color:var(--ink); font:16px/1.62 system-ui,-apple-system,"Segoe UI",sans-serif; }
    main { width:min(100% - 32px, 980px); margin:32px auto; padding:48px 56px; background:#fff; border:1px solid #e4e7ec; border-radius:14px; box-shadow:0 10px 30px rgba(16,24,40,.06); }
    h1,h2,h3,h4 { line-height:1.25; margin:1.5em 0 .55em; color:#101828; }
    h1 { margin-top:0; font-size:2.1rem; } h2 { font-size:1.45rem; border-bottom:1px solid var(--line); padding-bottom:.35em; }
    a { color:var(--accent); } code { padding:.12em .35em; background:#f2f4f7; border-radius:4px; }
    pre { overflow:auto; padding:16px; background:#101828; color:#f8fafc; border-radius:8px; }
    pre code { padding:0; background:transparent; }
    blockquote { margin:1em 0; padding:.5em 1em; border-left:4px solid #84adff; background:#f5f8ff; }
    .table-wrap { overflow:auto; margin:1em 0; } table { width:100%; border-collapse:collapse; }
    th,td { padding:10px 12px; border:1px solid var(--line); text-align:left; vertical-align:top; }
    th { background:#f2f4f7; } .toc { padding:16px 20px; background:#f8f9fc; border:1px solid #eaecf0; border-radius:8px; }
    .toc h2 { margin-top:0; border:0; } .toc ul { margin-bottom:0; } .toc-level-3 { margin-left:20px; }
    footer { margin-top:40px; padding-top:16px; border-top:1px solid var(--line); color:var(--muted); font-size:.85rem; }
    @media (max-width:640px) { main { width:100%; margin:0; padding:28px 20px; border:0; border-radius:0; } }
    @media print { body { background:#fff; } main { width:auto; margin:0; padding:0; border:0; box-shadow:none; } a { color:inherit; text-decoration:none; } }
  </style>
</head>
<body>
<main>
${buildToc(headings)}
${body}
<footer>Generated from ${escapeHtml(source)} by KE Document Writer.</footer>
</main>
</body>
</html>
`;
}

const args = parseArgs(process.argv.slice(2));
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.resolve(process.cwd(), args.input);
const inputRelative = path.relative(repositoryRoot, inputPath);
const segments = inputRelative.split(path.sep);

if (inputRelative.startsWith("..") || path.isAbsolute(inputRelative)) {
  throw new Error("Input must stay inside the repository.");
}
if (path.extname(inputPath).toLowerCase() !== ".md") {
  throw new Error("Input must be a Markdown (.md) file.");
}
if (
  segments[0] !== "projects" ||
  !segments[1] ||
  segments[1] === "_template" ||
  segments[2] !== "input"
) {
  throw new Error(
    "Input must belong to projects/<project-slug>/input/.",
  );
}
if (segments.includes("private")) {
  throw new Error("Private documents cannot be exported.");
}

const outputRoot = path.join(repositoryRoot, "projects", segments[1], "output");
const defaultOutput = path.join(outputRoot, `${path.basename(inputPath, ".md")}.html`);
const outputPath = path.resolve(process.cwd(), args.output || defaultOutput);
const outputRelative = path.relative(outputRoot, outputPath);

if (outputRelative.startsWith("..") || path.isAbsolute(outputRelative)) {
  throw new Error("Output must stay inside projects/<project-slug>/output/.");
}
if (path.dirname(outputPath) !== outputRoot) {
  throw new Error(
    "HTML files must be written directly inside projects/<project-slug>/output/.",
  );
}
if (path.extname(outputPath).toLowerCase() !== ".html") {
  throw new Error("Output must use the .html extension.");
}

if (!args.overwrite) {
  try {
    await access(outputPath);
    throw new Error(`Output already exists: ${outputPath}`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const markdown = await readFile(inputPath, "utf8");
const rendered = renderMarkdown(markdown);
const firstHeading = rendered.headings.find(({ level }) => level === 1)?.text;
const title = args.title || firstHeading || path.basename(inputPath, ".md");
const html = buildHtml({
  title,
  source: inputRelative.split(path.sep).join("/"),
  body: rendered.body,
  headings: rendered.headings,
});

await mkdir(outputRoot, { recursive: true });
await writeFile(outputPath, html, { encoding: "utf8", flag: args.overwrite ? "w" : "wx" });
console.log(`HTML exported: ${path.relative(repositoryRoot, outputPath)}`);
