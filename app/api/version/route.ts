import { NextResponse } from "next/server";
import packageJson from "@/package.json";

// GIT_SHA isn't available inside a Docker image by default (.git is excluded
// via .dockerignore) — pass it at build time with --build-arg GIT_SHA=...
export async function GET() {
  return NextResponse.json({
    name: packageJson.name,
    version: packageJson.version,
    gitSha: process.env.GIT_SHA || "unknown",
  });
}
