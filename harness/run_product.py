"""Plan or run the repository's standard frontend and backend quality commands."""

from datetime import datetime, timezone
from pathlib import Path
import argparse
import json
import os
import shutil
import subprocess


ROOT = Path(__file__).resolve().parents[1]


def build_steps(root: Path, suite: str, executable_lookup=shutil.which):
    steps = []
    if suite in {"frontend", "all"}:
        package = json.loads((root / "frontend/package.json").read_text(encoding="utf-8-sig"))
        names = ["format:check", "lint", "test", "build"]
        if any(name not in package.get("scripts", {}) for name in names):
            raise ValueError("required frontend scripts missing")
        pnpm = executable_lookup("pnpm")
        for name in names:
            steps.append({"name": f"frontend:{name}", "command": [pnpm or "pnpm", "run", name], "cwd": root / "frontend", "available": bool(pnpm)})
    if suite in {"backend", "all"}:
        wrapper = root / "backend" / ("gradlew.bat" if os.name == "nt" else "gradlew")
        steps.append({"name": "backend:spotlessCheck+test", "command": [str(wrapper), "spotlessCheck", "test", "--no-daemon"], "cwd": root / "backend", "available": wrapper.is_file()})
    return steps


def run_steps(steps, execute=False, runner=subprocess.run):
    results = []
    stopped = False
    for step in steps:
        row = {"name": step["name"], "command": step["command"], "cwd": str(step["cwd"]), "status": "NOT RUN", "exit_code": None}
        if execute and not stopped:
            if not step["available"]:
                row.update(status="BLOCKED", stderr="required command or wrapper unavailable")
            else:
                try:
                    completed = runner(step["command"], cwd=step["cwd"], capture_output=True, text=True, encoding="utf-8", errors="replace")
                    row.update(status="PASS" if completed.returncode == 0 else "FAIL", exit_code=completed.returncode, stdout=completed.stdout, stderr=completed.stderr)
                except OSError as exc:
                    row.update(status="BLOCKED", stderr=str(exc))
            stopped = row["status"] != "PASS"
        results.append(row)
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--suite", choices=["frontend", "backend", "all"], default="all")
    parser.add_argument("--execute", action="store_true", help="run commands; without this flag only write a NOT RUN plan")
    args = parser.parse_args()

    report = {
        "utc": datetime.now(timezone.utc).isoformat(),
        "scope": args.suite,
        "source_root": str(ROOT),
        "status": "BLOCKED",
        "steps": [],
        "postgresql_integration": "NOT RUN",
        "e2e": "NOT RUN",
    }
    try:
        steps = build_steps(ROOT, args.suite)
        report["steps"] = run_steps(steps, args.execute)
        statuses = [step["status"] for step in report["steps"]]
        report["status"] = "FAIL" if "FAIL" in statuses else "BLOCKED" if "BLOCKED" in statuses else "PASS" if statuses and all(status == "PASS" for status in statuses) else "NOT RUN"
        revision = subprocess.run(["git", "-c", f"safe.directory={ROOT.as_posix()}", "-C", str(ROOT), "rev-parse", "HEAD"], capture_output=True, text=True)
        report["source_commit"] = revision.stdout.strip() if revision.returncode == 0 else "UNAVAILABLE"
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        report["reason"] = str(exc)

    output = ROOT / "artifacts/product"
    output.mkdir(parents=True, exist_ok=True)
    path = output / ("run-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ") + ".json")
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": report["status"], "report": str(path)}, ensure_ascii=False))
    return 0 if report["status"] == "PASS" else 1 if report["status"] == "FAIL" else 2


if __name__ == "__main__":
    raise SystemExit(main())
