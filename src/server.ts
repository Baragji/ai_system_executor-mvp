import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "node:path";
import fs from "node:fs/promises";
import slugify from "slugify";

import { generateJSON } from "./llm/index.js";
import { validateExecutorOutput } from "./executor/schema.js";
import { writeFiles } from "./executor/writeFiles.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

const PORT = Number(process.env.PORT || 3000);
const OUTPUT_DIR = path.resolve("output");
const PUBLIC_DIR = path.resolve("public");

app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

app.use("/", express.static(PUBLIC_DIR, { extensions: ["html"] }));
app.use("/output", express.static(OUTPUT_DIR, { extensions: ["html"] }));

app.post("/api/execute", async (req, res) => {
  try {
    const prompt: string = (req.body?.prompt || "").toString();
    const projectNameRaw: string | undefined = req.body?.projectName;
    if (!prompt || prompt.length < 3) return res.status(400).json({ error: "prompt required" });

    const systemPrompt = await fs.readFile("src/executor/systemPrompt.md", "utf-8");
    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: prompt }
    ];

    const raw = await generateJSON(messages);
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      return res.status(422).json({ error: "Model did not return valid JSON", raw });
    }

    const result = validateExecutorOutput(data);
    if (!result.ok) {
      return res.status(422).json({ error: "JSON failed schema validation", details: result.errors });
    }

    const projectName = (projectNameRaw && projectNameRaw.trim().length > 0) ? projectNameRaw.trim() : (result.value.project_name || "generated-project");
    const slug = slugify(projectName, { lower: true, strict: true });
    const targetRoot = path.join(OUTPUT_DIR, slug);

    await fs.mkdir(targetRoot, { recursive: true });
    await writeFiles(targetRoot, result.value.files);

    await fs.writeFile(path.join(targetRoot, "_executor_meta.json"), JSON.stringify({
      created_at: new Date().toISOString(),
      notes: result.value.notes || [],
      source_prompt: prompt
    }, null, 2), "utf-8");

    return res.json({
      ok: true,
      project: slug,
      files_written: result.value.files.length,
      browse_url: `/output/${slug}/`,
      abs_path: targetRoot
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err?.message || "internal error" });
  }
});

app.listen(PORT, () => {
  console.log(`Executor MVP listening on http://localhost:${PORT}`);
  console.log(`UI: http://localhost:${PORT}/`);
});
