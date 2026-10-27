import importlib.util
import json
from pathlib import Path
import tempfile
import unittest


MODULE = Path(__file__).resolve().parents[1] / "check.py"
spec = importlib.util.spec_from_file_location("checker", MODULE)
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


class HarnessTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        files = checker.REQUIRED + ["docs/requirements/REQ-001.md", "tests/test_feature.py"]
        for name in files:
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("REQ-001", encoding="utf-8")
        self.feature = self.root / "docs/features/demo"
        self.feature.mkdir(parents=True)
        (self.feature / "spec.md").write_text("\n".join(checker.SECTIONS) + "\n- AC-001: result\n", encoding="utf-8")
        self.row = {"id": "AC-001", "requirement": "REQ-001", "source": "docs/requirements/REQ-001.md", "tests": ["tests/test_feature.py"]}
        self.write_rows([self.row])

    def write_rows(self, rows):
        (self.feature / "traceability.json").write_text(json.dumps({"criteria": rows}), encoding="utf-8")

    def test_valid(self):
        self.assertEqual([], checker.check(self.root))

    def test_missing_required_document(self):
        (self.root / "AGENTS.md").unlink()
        self.assertTrue(checker.check(self.root))

    def test_missing_test(self):
        (self.root / "tests/test_feature.py").unlink()
        self.assertTrue(checker.check(self.root))

    def test_duplicate_traceability_ac(self):
        self.write_rows([self.row, self.row])
        self.assertTrue(checker.check(self.root))

    def test_duplicate_spec_ac(self):
        with (self.feature / "spec.md").open("a", encoding="utf-8") as file:
            file.write("- AC-001: duplicate\n")
        self.assertTrue(checker.check(self.root))

    def test_unmapped_ac(self):
        with (self.feature / "spec.md").open("a", encoding="utf-8") as file:
            file.write("- AC-002: uncovered\n")
        self.assertTrue(checker.check(self.root))

    def test_broken_link(self):
        (self.root / "README.md").write_text("[missing](absent.md)", encoding="utf-8")
        self.assertTrue(checker.check(self.root))

    def test_path_escape(self):
        self.row["tests"] = ["../outside.py"]
        self.write_rows([self.row])
        self.assertTrue(checker.check(self.root))

    def test_malformed_json(self):
        (self.feature / "traceability.json").write_text("{", encoding="utf-8")
        self.assertTrue(checker.check(self.root))

    def test_missing_section(self):
        (self.feature / "spec.md").write_text("- AC-001: result", encoding="utf-8")
        self.assertTrue(checker.check(self.root))

    def test_legacy_path(self):
        path = self.root / checker.LEGACY_PATHS[0]
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("legacy", encoding="utf-8")
        self.assertTrue(checker.check(self.root))


if __name__ == "__main__":
    unittest.main()
