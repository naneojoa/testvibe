import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest


MODULE = Path(__file__).resolve().parents[1] / "run_product.py"
spec = importlib.util.spec_from_file_location("product", MODULE)
product = importlib.util.module_from_spec(spec)
spec.loader.exec_module(product)


class ProductRunnerTests(unittest.TestCase):
    def step(self):
        return {"name": "test", "command": ["test"], "cwd": Path("."), "available": True}

    def test_plan_does_not_execute(self):
        def forbidden(*args, **kwargs):
            self.fail("plan executed a command")
        self.assertEqual(product.run_steps([self.step()], runner=forbidden)[0]["status"], "NOT RUN")

    def test_failure_stops_remaining_steps(self):
        def failure(*args, **kwargs):
            return subprocess.CompletedProcess(args[0], 1, "", "failed")
        rows = product.run_steps([self.step(), self.step()], True, failure)
        self.assertEqual([row["status"] for row in rows], ["FAIL", "NOT RUN"])

    def test_missing_command_is_blocked(self):
        step = self.step()
        step["available"] = False
        self.assertEqual(product.run_steps([step], True)[0]["status"], "BLOCKED")

    def test_success_preserves_evidence(self):
        def success(*args, **kwargs):
            return subprocess.CompletedProcess(args[0], 0, "test output", "")
        row = product.run_steps([self.step()], True, success)[0]
        self.assertEqual((row["status"], row["stdout"], row["exit_code"]), ("PASS", "test output", 0))

    def test_build_steps_reads_real_layout(self):
        steps = product.build_steps(product.ROOT, "all", lambda name: f"/tools/{name}" if name == "pnpm" else None)
        self.assertEqual([step["name"] for step in steps], ["frontend:format:check", "frontend:lint", "frontend:test", "frontend:build", "backend:spotlessCheck+test"])


if __name__ == "__main__":
    unittest.main()
