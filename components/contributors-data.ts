import { githubFetch } from "./github-api.ts";

const REPO = "horizon-rust/horizon-site";
const BRANCH = "contributors-data";
const FILE = "contributors.json";
const RAW_URL = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${FILE}`;
const CONTENTS_PATH = `/repos/${REPO}/contents/${FILE}?ref=${BRANCH}`;

// What scripts/contributors-data.mjs writes to the contributors-data branch every six hours.
export type ContributorsFile = {
  generatedAt: string;
  rule: string;
  contributors: { login: string; avatarUrl: string; prs: number; reviews: number }[];
};

function contributorsFile(file: ContributorsFile): ContributorsFile {
  if (!Array.isArray(file?.contributors) || file.contributors.length === 0) {
    throw new Error("no contributors in the file");
  }
  return file;
}

export async function readContributorsFile(readContents = githubFetch): Promise<ContributorsFile> {
  // The public data branch changes every six hours. Read its raw file without spending REST API quota.
  try {
    const response = await fetch(RAW_URL, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`GitHub raw file responded ${response.status}`);
    return contributorsFile(await response.json());
  } catch (rawError) {
    try {
      const response = await readContents(CONTENTS_PATH);
      if (!response.ok) throw new Error(`GitHub contents API responded ${response.status}`);
      const { content } = (await response.json()) as { content?: string };
      if (!content) throw new Error("no content in the GitHub response");
      return contributorsFile(JSON.parse(Buffer.from(content, "base64").toString("utf8")));
    } catch (contentsError) {
      throw new AggregateError([rawError, contentsError], "both contributors.json sources failed");
    }
  }
}
