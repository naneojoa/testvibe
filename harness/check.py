from datetime import datetime, timezone
from pathlib import Path
import json
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
REQUIRED = [
    "README.md",
    "AGENTS.md",
    "docs/README.md",
    "docs/workflow.md",
    "docs/product/prd.md",
    "docs/quality/strategy.md",
]
SECTIONS = [
    "## 배경과 출처",
    "## 범위",
    "## 업무 규칙",
    "## 인수 기준",
    "## 비기능 요구사항",
    "## 미해결 질문",
]
LEGACY_PATHS = [
    "docs/backend-api-spec.md",
    "docs/front-spec.md",
    "docs/database-schema-spec.md",
    "docs/engineering-playbook.md",
    "docs/quality-validation-plan.md",
]


def inside(root: Path, value: str) -> Path:
    if not isinstance(value, str) or not value:
        raise ValueError("empty or non-string path")
    path = (root / value).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError("path outside repository")
    return path


def check(root: Path) -> list[str]:
    errors: list[str] = []
    for name in REQUIRED:
        if not (root / name).is_file():
            errors.append(f"missing: {name}")
    for name in LEGACY_PATHS:
        if (root / name).exists():
            errors.append(f"legacy document path remains: {name}")

    specs = list((root / "docs/features").glob("*/spec.md"))
    if not specs:
        errors.append("missing feature specifications")

    for spec in specs:
        content = spec.read_text(encoding="utf-8-sig")
        for section in SECTIONS:
            if section not in content.splitlines():
                errors.append(f"{spec.relative_to(root)}: missing {section}")
        try:
            data = json.loads(spec.with_name("traceability.json").read_text(encoding="utf-8-sig"))
            rows = data["criteria"]
            if not isinstance(rows, list) or not rows:
                raise ValueError("criteria must be a nonempty list")
            seen: set[str] = set()
            for row in rows:
                ac = row["id"]
                if not isinstance(ac, str) or not re.fullmatch(r"AC-\d{3}", ac) or ac in seen:
                    raise ValueError("invalid or duplicate AC ID")
                seen.add(ac)
                requirement = row["requirement"]
                if not re.fullmatch(r"REQ-\d{3}", requirement):
                    raise ValueError("invalid REQ ID")
                source = inside(root, row["source"])
                if not source.is_file() or requirement not in source.read_text(encoding="utf-8-sig"):
                    raise ValueError("missing requirement source or ID")
                tests = row["tests"]
                if not isinstance(tests, list) or not tests:
                    raise ValueError("missing tests")
                for test in tests:
                    if not inside(root, test).is_file():
                        raise ValueError(f"missing test file: {test}")
            declared_ids = re.findall(r"^- (AC-\d{3}):", content, re.MULTILINE)
            if len(declared_ids) != len(set(declared_ids)):
                raise ValueError("duplicate AC in spec")
            if set(declared_ids) != seen:
                raise ValueError("spec and traceability AC mismatch")
        except (OSError, ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
            errors.append(f"{spec.parent.name}: {exc}")

    for document in root.rglob("*.md"):
        relative_parts = document.relative_to(root).parts
        if any(part in {".git", "artifacts", "node_modules", ".venv", "build"} for part in relative_parts):
            continue
        content = document.read_text(encoding="utf-8-sig")
        for link in re.findall(r"\[[^\]]*\]\(([^\s)]+)\)", content):
            if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", link) or link.startswith("#"):
                continue
            target = link.split("#")[0]
            if target and not (document.parent / target).exists():
                errors.append(f"{document.relative_to(root)}: broken link {link}")
    return errors


if __name__ == "__main__":
    failures = check(ROOT)
    result = {
        "scope": "documentation structure and references",
        "status": "FAIL" if failures else "PASS",
        "product_tests": "NOT RUN",
        "utc": datetime.now(timezone.utc).isoformat(),
        "errors": failures,
    }
    output = ROOT / "artifacts/harness-result.json"
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    sys.exit(1 if failures else 0)
