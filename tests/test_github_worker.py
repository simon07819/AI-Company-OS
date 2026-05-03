import unittest
from types import SimpleNamespace

from workers.github_worker import WorkerPreflightError, ensure_ready, safe_branch_name


def result(returncode=0, stdout="", stderr=""):
    return SimpleNamespace(returncode=returncode, stdout=stdout, stderr=stderr)


class GitHubWorkerTests(unittest.TestCase):
    def test_safe_branch_name_slugifies_id_and_title(self):
        branch = safe_branch_name({"id": "TASK 42", "title": "Créer l'API + Tests!"})
        self.assertEqual(branch, "ai-company/task-task-42-creer-l-api-tests")

    def test_refuses_dirty_git_before_work(self):
        def runner(command, cwd):
            if command == ["git", "status", "--porcelain"]:
                return result(stdout=" M changed.py\n")
            return result()

        with self.assertRaisesRegex(WorkerPreflightError, "not clean"):
            ensure_ready("/tmp/repo", runner=runner)


if __name__ == "__main__":
    unittest.main()
