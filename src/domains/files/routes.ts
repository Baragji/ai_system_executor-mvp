import type { Application, NextFunction, Request, Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { finished } from "node:stream/promises";
import { ZipFile } from "yazl";

export type FilesDeps = {
  slugify: (value: string, opts: { lower: boolean; strict: boolean }) => string;
  outputDir: string;
};

function toPosixPath(value: string): string {
  return value.replace(/\\/g, "/");
}

async function addDirectoryToZip(zip: ZipFile, absoluteDir: string, relativeDir: string): Promise<void> {
  const normalizedDir = toPosixPath(relativeDir).replace(/\/+$/, "");
  const directoryKey = normalizedDir ? `${normalizedDir}/` : "";
  if (directoryKey) {
    zip.addEmptyDirectory(directoryKey);
  }

  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(absoluteDir, entry.name);
    const rel = normalizedDir ? `${normalizedDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await addDirectoryToZip(zip, abs, rel);
    } else if (entry.isFile()) {
      zip.addFile(abs, toPosixPath(rel));
    }
  }
}

export function mountFilesRoutes(app: Application, deps: FilesDeps): void {
  const { slugify, outputDir } = deps;

  app.get("/output-archive/:project/:tail(*)?", async (req: Request, res: Response) => {
    try {
      const { project } = req.params as { project: string };
      const tail = (req.params as { tail?: string }).tail ?? "";
      const slug = slugify(project, { lower: true, strict: true });
      const projectRoot = path.join(outputDir, slug);
      const decodedTail = decodeURIComponent(tail);
      const absolute = path.resolve(projectRoot, decodedTail);
      if (!absolute.startsWith(projectRoot)) {
        return res.status(403).json({ error: "forbidden" });
      }
      let stat;
      try {
        stat = await fs.stat(absolute);
      } catch {
        return res.status(404).json({ error: "not found" });
      }
      if (!stat.isDirectory()) {
        return res.status(400).json({ error: "path must be a directory" });
      }

      const rel = path.relative(projectRoot, absolute);
      const formatRaw = typeof req.query?.format === "string" ? req.query.format.toLowerCase() : "zip";
      const safeSuffix = rel ? rel.replace(/\/+|\\+/g, "_") : "";

      if (formatRaw === "tar") {
        const archiveBase = `${slug}${safeSuffix ? `_${safeSuffix}` : ""}.tar.gz`;
        res.setHeader("Content-Type", "application/gzip");
        res.setHeader("Content-Disposition", `attachment; filename="${archiveBase}"`);

        const tarCwd = rel ? path.dirname(absolute) : projectRoot;
        const sub = rel ? path.basename(absolute) : ".";
        const args = ["-czf", "-", "-C", tarCwd, sub];
        const tar = spawn("tar", args);

        tar.stdout.pipe(res);
        tar.stderr.on("data", chunk => {
          const msg = chunk?.toString?.() || "";
          if (msg) console.warn("[Archive] tar:", msg.trim());
        });
        tar.on("error", err => {
          if ((err as { code?: string }).code === "ENOENT") {
            if (!res.headersSent) {
              res.status(501);
            }
            res.end("tar is not available on this system");
          } else {
            if (!res.headersSent) {
              res.status(500);
            }
            res.end("failed to create archive");
          }
        });
        tar.on("close", code => {
          if (code !== 0) {
            try {
              res.end();
            } catch {
              /* ignore */
            }
          }
        });
        return;
      }

      const archiveBase = `${slug}${safeSuffix ? `_${safeSuffix}` : ""}.zip`;
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${archiveBase}"`);

      const zip = new ZipFile();
      zip.outputStream.on("error", err => {
        if (!res.headersSent) {
          res.status(500);
        }
        res.end(String(err instanceof Error ? err.message : err));
      });
      zip.outputStream.pipe(res);

      const relPosix = rel ? toPosixPath(rel) : "";
      const slugPosix = toPosixPath(slug);
      if (relPosix) {
        zip.addEmptyDirectory(`${slugPosix}/`);
      }
      const rootEntry = relPosix ? `${slugPosix}/${relPosix}` : slugPosix;
      await addDirectoryToZip(zip, absolute, rootEntry);
      zip.end();
      await finished(zip.outputStream).catch(err => {
        if (!res.headersSent) {
          res.status(500).end(String(err instanceof Error ? err.message : err));
        }
      });
      return;
    } catch (err) {
      const message = (err as Error).message || "internal error";
      return res.status(500).json({ error: message });
    }
  });

  app.get("/output/:project/*?", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { project } = req.params as { project: string };
      const tail = (req.params as { "0"?: string })["0"] || "";
      const slug = slugify(project, { lower: true, strict: true });
      const projectRoot = path.join(outputDir, slug);
      const decodedTail = decodeURIComponent(tail);
      const absolute = path.resolve(projectRoot, decodedTail);
      if (!absolute.startsWith(projectRoot)) {
        return res.status(403).send("forbidden");
      }

      let stat;
      try {
        stat = await fs.stat(absolute);
      } catch {
        return next();
      }

      if (!stat.isDirectory()) {
        return next();
      }

      const entries = await fs.readdir(absolute, { withFileTypes: true });
      const rel = path.relative(projectRoot, absolute);
      const basePath = `/output/${slug}/${rel ? rel + "/" : ""}`;
      const encodedSlug = encodeURIComponent(slug);
      const encodedTail = rel
        ? rel
            .split(path.sep)
            .filter(Boolean)
            .map(segment => encodeURIComponent(segment))
            .join("/")
        : "";
      const archiveTarget = encodedTail ? `${encodedSlug}/${encodedTail}` : encodedSlug;
      const zipHref = `/output-archive/${archiveTarget}?format=zip`;
      const tarHref = `/output-archive/${archiveTarget}?format=tar`;

      const detailed = await Promise.all(
        entries.map(async entry => {
          const name = entry.name;
          const full = path.join(absolute, name);
          let size = 0;
          let modified: Date | null = null;
          try {
            const st = await fs.stat(full);
            size = st.size;
            modified = st.mtime;
          } catch {
            // ignore stat failures for transient files
          }
          const isDir = entry.isDirectory();
          const href = basePath + encodeURIComponent(name) + (isDir ? "/" : "");
          return { name, isDir, href, size, modified };
        })
      );

      const formatBytes = (n: number) => {
        if (!n || n < 0) return "—";
        const units = ["B", "KB", "MB", "GB"]; let i = 0; let v = n;
        while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
        return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
      };

      const rows = detailed
        .sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name))
        .map(d => {
          const label = d.isDir ? `${d.name}/` : d.name;
          const size = d.isDir ? "—" : formatBytes(d.size);
          const mtime = d.modified ? new Date(d.modified).toLocaleString() : "—";
          return `<tr><td><a href="${d.href}">${label}</a></td><td class="num">${size}</td><td class="muted">${mtime}</td></tr>`;
        })
        .join("\n");

      const parentRel = rel ? path.dirname(rel) : "";
      const parentHref = `/output/${slug}/${parentRel !== "." && parentRel !== "" ? encodeURIComponent(parentRel) + "/" : ""}`;

      const doc = `<!doctype html><html lang="en"><head><meta charset="utf-8" />` +
        `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
        `<title>Index of ${slug}/${rel}</title>` +
        `<style>` +
        "  body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Arial; margin:20px; background:#0b0f19; color:#e6e9ef}" +
        "  a{color:#60a5fa; text-decoration:underline}" +
        "  .container{max-width:900px; margin:0 auto; background:#111827; padding:16px 20px; border-radius:12px; border:1px solid rgba(148,163,184,.2)}" +
        "  h1{font-size:18px; margin:0 0 12px 0}" +
        "  table{width:100%; border-collapse:collapse;}" +
        "  th,td{padding:8px 6px; border-bottom:1px solid rgba(148,163,184,.15)}" +
        "  th{color:#cbd5e1; text-align:left; font-weight:600}" +
        "  td.num{text-align:right}" +
        "  .muted{color:#94a3b8}" +
        "  .top{margin-bottom:10px}" +
        "  .actions{display:flex; gap:10px; margin:8px 0 16px 0; flex-wrap:wrap}" +
        "  .btn{display:inline-block; padding:6px 12px; border-radius:8px; background:#1d4ed8; color:#e6e9ef; font-weight:600; text-decoration:none}" +
        "  .btn.secondary{background:#334155}" +
        "  .sep{opacity:.35; margin:0 4px}" +
        `</style></head>` +
        `<body><div class="container">` +
        `<div class="top"><span class="muted">Index of</span> <strong>/output/${slug}/${rel}</strong></div>` +
        `<div class="top"><a href="/">Home</a><span class="sep">/</span><a href="/output/${slug}/">${slug}</a>${rel ? `<span class="sep">/</span><span>${rel}</span>` : ""}</div>` +
        `${rel ? `<p><a href="${parentHref}">⬆ Parent directory</a></p>` : ""}` +
        `<div class="actions"><a class="btn" href="${zipHref}" download>Download .zip</a><a class="btn secondary" href="${tarHref}" download>Download .tar.gz</a></div>` +
        `<table>` +
        `  <thead><tr><th>Name</th><th class="num">Size</th><th>Modified</th></tr></thead>` +
        `  <tbody>${rows || `<tr><td class="muted" colspan="3">(empty)</td></tr>`}</tbody>` +
        `</table>` +
        `</div></body></html>`;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(doc);
    } catch (err) {
      return next(err);
    }
  });

  app.get("/api/files/:project/:path(*)", async (req: Request, res: Response) => {
    try {
      const { project } = req.params as { project: string };
      const rawPath = (req.params as { path: string }).path || "";
      const slug = slugify(project, { lower: true, strict: true });
      const projectRoot = path.join(outputDir, slug);
      const decodedRel = decodeURIComponent(rawPath);
      const absolute = path.resolve(projectRoot, decodedRel);
      if (!absolute.startsWith(projectRoot)) {
        return res.status(403).json({ error: "forbidden" });
      }
      try {
        const stat = await fs.stat(absolute);
        if (!stat.isFile()) {
          return res.status(404).json({ error: "not found" });
        }
        const buf = await fs.readFile(absolute);
        const binary = buf.includes(0);
        const content = binary ? null : buf.toString("utf-8");
        return res.json({ content, size: stat.size, modified: stat.mtime, binary });
      } catch {
        return res.status(404).json({ error: "not found" });
      }
    } catch (err) {
      const message = (err as Error).message || "internal error";
      return res.status(500).json({ error: message });
    }
  });
}
