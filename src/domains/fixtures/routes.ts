import type { Application, Request, Response } from "express";

export type FixturesDeps = {
  slugify: (value: string, opts: { lower: boolean; strict: boolean }) => string;
  listFixtures: (slug: string) => Promise<Record<string, string[]>>;
};

export function mountFixturesRoutes(app: Application, deps: FixturesDeps): void {
  const { slugify, listFixtures } = deps;

  app.get("/api/fixtures/:project", async (req: Request, res: Response) => {
    try {
      const { project } = req.params as { project: string };
      const slug = slugify(project, { lower: true, strict: true });
      const sessions = await listFixtures(slug);
      return res.json({ project: slug, sessions });
    } catch (err) {
      const message = (err as Error).message || "internal error";
      return res.status(500).json({ error: message });
    }
  });
}
