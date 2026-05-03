import os
import tempfile
import unittest
from unittest.mock import patch

from task_queue import (
    mark_task_completed_real,
    mark_task_failed,
    mark_task_running,
    next_queued_task,
    write_task_file,
)


class TaskQueueTests(unittest.TestCase):
    def test_selects_next_numeric_queued_task_without_dry_run_history(self):
        with tempfile.TemporaryDirectory() as project_path:
            tasks = os.path.join(project_path, "tasks")
            os.makedirs(tasks)
            write_task_file(os.path.join(tasks, "TASK-001.json"), {
                "id": "TASK-001",
                "status": "completed_dry_run",
                "title": "Historical",
            })
            write_task_file(os.path.join(tasks, "2.json"), {
                "id": 2,
                "status": "queued",
                "title": "Second",
            })
            write_task_file(os.path.join(tasks, "1.json"), {
                "id": 1,
                "status": "queued",
                "title": "First",
            })

            task_file, task = next_queued_task(project_path)

        self.assertTrue(task_file.endswith("1.json"))
        self.assertEqual(task["id"], 1)

    def test_transition_queued_running_completed_real(self):
        with tempfile.TemporaryDirectory() as project_path:
            task_file = self._task_file(project_path)
            write_task_file(task_file, {
                "id": 1,
                "status": "queued",
                "title": "Implement Feature",
                "description": "Do the smallest safe real run.",
            })

            with patch("task_queue.utc_now", return_value="2026-05-03T00:00:00"):
                running = mark_task_running(task_file, "ai-company/task-1-implement-feature")
                completed = mark_task_completed_real(task_file, "https://github.com/acme/repo/pull/1")

        self.assertEqual(running["status"], "running")
        self.assertEqual(completed["status"], "completed_real")
        self.assertEqual(completed["mode"], "REAL")
        self.assertEqual(completed["pr_url"], "https://github.com/acme/repo/pull/1")

    def test_mark_failed_records_error_message(self):
        with tempfile.TemporaryDirectory() as project_path:
            task_file = self._task_file(project_path)
            write_task_file(task_file, {
                "id": 1,
                "status": "running",
                "title": "Implement Feature",
                "description": "Fails.",
            })

            failed = mark_task_failed(task_file, "gh auth failed")

        self.assertEqual(failed["status"], "failed")
        self.assertEqual(failed["error"], "gh auth failed")

    def _task_file(self, project_path):
        tasks = os.path.join(project_path, "tasks")
        os.makedirs(tasks)
        return os.path.join(tasks, "1.json")


if __name__ == "__main__":
    unittest.main()
