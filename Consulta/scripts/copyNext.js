#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

async function copyDir(src, dest) {
    await fs.promises.mkdir(dest, { recursive: true });
    const entries = await fs.promises.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else if (entry.isSymbolicLink()) {
            const link = await fs.promises.readlink(srcPath);
            try {
                await fs.promises.symlink(link, destPath);
            } catch (err) {
                // ignore if symlink creation fails on some platforms
            }
        } else {
            await fs.promises.copyFile(srcPath, destPath);
        }
    }
}

async function collectNftFiles(dir, out = []) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await collectNftFiles(full, out);
            continue;
        }
        if (entry.isFile() && entry.name.endsWith(".nft.json")) {
            out.push(full);
        }
    }
    return out;
}

function normalizeSlashPath(value) {
    return value.split(path.sep).join("/");
}

function fixNftPathValue(nftFile, repoRoot, value) {
    if (typeof value !== "string") return value;
    const marker = "node_modules/";
    const markerIndex = value.indexOf(marker);
    if (markerIndex === -1) return value;

    const moduleSubPath = value.slice(markerIndex + marker.length);
    if (!moduleSubPath) return value;

    const nftDir = path.dirname(nftFile);
    const desiredAbs = path.join(repoRoot, "node_modules", ...moduleSubPath.split("/"));
    const currentAbs = path.resolve(nftDir, value);

    if (path.normalize(currentAbs) === path.normalize(desiredAbs)) {
        return value;
    }

    let relativeToDesired = path.relative(nftDir, desiredAbs);
    if (!relativeToDesired.startsWith(".")) {
        relativeToDesired = `./${relativeToDesired}`;
    }

    return normalizeSlashPath(relativeToDesired);
}

async function rewriteTracingPaths(nextDir, repoRoot) {
    const nftFiles = await collectNftFiles(nextDir);
    for (const file of nftFiles) {
        const raw = await fs.promises.readFile(file, "utf8");
        let json;
        try {
            json = JSON.parse(raw);
        } catch {
            continue;
        }
        if (!json || !Array.isArray(json.files)) continue;

        const fixedFiles = json.files.map((entry) => fixNftPathValue(file, repoRoot, entry));
        const changed = fixedFiles.some((v, i) => v !== json.files[i]);
        if (!changed) continue;

        json.files = fixedFiles;
        await fs.promises.writeFile(file, JSON.stringify(json));
    }
}

(async () => {
    try {
        const repoRoot = path.resolve(__dirname, "..");
        const src = path.join(repoRoot, "frontend", ".next");
        const dest = path.join(repoRoot, ".next");
        const publicSrc = path.join(repoRoot, "frontend", "public");
        const publicDest = path.join(repoRoot, "public");

        // Ensure source exists
        await fs.promises.access(src, fs.constants.R_OK);
        await fs.promises.rm(dest, { recursive: true, force: true });

        // Try to use native fs.cp if available for performance
        if (fs.promises.cp) {
            await fs.promises.cp(src, dest, { recursive: true });
        } else {
            await copyDir(src, dest);
        }

        // Build is created under frontend/.next, then copied to root/.next.
        // Adjust tracing paths so they still point to root/node_modules.
        await rewriteTracingPaths(dest, repoRoot);

        // Keep static assets from frontend/public available at runtime.
        try {
            await fs.promises.access(publicSrc, fs.constants.R_OK);
            await fs.promises.rm(publicDest, { recursive: true, force: true });
            if (fs.promises.cp) {
                await fs.promises.cp(publicSrc, publicDest, { recursive: true });
            } else {
                await copyDir(publicSrc, publicDest);
            }
            console.log("Copied", publicSrc, "to", publicDest);
        } catch {
            // ignore when frontend/public does not exist
        }

        console.log("Copied", src, "to", dest);
    } catch (err) {
        console.error("Failed to copy .next folder:", err.message || err);
        process.exit(1);
    }
})();
