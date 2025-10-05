import { createTwoFilesPatch, parsePatch } from "diff";

export interface FileDiff {
  file: string;
  diffText: string;
  linesAdded: number;
  linesRemoved: number;
  isMinor: boolean;
}

function calculateChangeMagnitude(linesAdded: number, linesRemoved: number): boolean {
  const totalChanged = linesAdded + linesRemoved;
  return totalChanged > 0 && totalChanged <= 5;
}

export function generateDiff(
  originalContent: string,
  repairedContent: string,
  filepath: string
): FileDiff {
  const diffText = createTwoFilesPatch(
    filepath,
    filepath,
    originalContent,
    repairedContent,
    "original",
    "repaired",
    { context: 3 }
  );

  const parsed = parsePatch(diffText);
  const diff = parsed[0];

  let linesAdded = 0;
  let linesRemoved = 0;

  if (diff) {
    for (const hunk of diff.hunks) {
      linesAdded += hunk.lines.filter(line => line.startsWith("+") && !line.startsWith("+++"))
        .length;
      linesRemoved += hunk.lines.filter(line => line.startsWith("-") && !line.startsWith("---"))
        .length;
    }
  }

  return {
    file: filepath,
    diffText,
    linesAdded,
    linesRemoved,
    isMinor: calculateChangeMagnitude(linesAdded, linesRemoved)
  };
}
