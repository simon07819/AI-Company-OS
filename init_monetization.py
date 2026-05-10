import argparse
import json
import os


PRICING = {
    "currency": "CAD",
    "plans": [
        {
            "id": "starter",
            "name": "Starter",
            "monthly_price": 29,
            "annual_discount_percent": 20,
            "features": [],
        },
        {
            "id": "pro",
            "name": "Pro",
            "monthly_price": 79,
            "annual_discount_percent": 20,
            "features": [],
        },
    ],
}


REVENUE_NOTES = """# Revenue Notes

## Target Customer

## Pricing Hypothesis

## Acquisition Channels

## Validation Checklist
"""


def write_json_if_missing(path, data):
    if os.path.exists(path):
        print(f"File already exists, not overwritten: {path}")
        return
    with open(path, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=2)
        file.write("\n")
    print(f"Created: {path}")


def write_text_if_missing(path, content):
    if os.path.exists(path):
        print(f"File already exists, not overwritten: {path}")
        return
    with open(path, "w", encoding="utf-8") as file:
        file.write(content)
    print(f"Created: {path}")


def init_monetization(repo_path, project_name):
    project_path = os.path.join(repo_path, "projects", project_name)
    monetization_path = os.path.join(project_path, "monetization")

    os.makedirs(monetization_path, exist_ok=True)
    write_json_if_missing(os.path.join(monetization_path, "pricing.json"), PRICING)
    write_text_if_missing(os.path.join(monetization_path, "revenue_notes.md"), REVENUE_NOTES)

    print(f"Monetization initialized: {project_name}")
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--project", required=True)
    parser.add_argument("--repo-path", default=os.getcwd())
    args = parser.parse_args()

    repo_path = os.path.abspath(os.path.expanduser(args.repo_path))
    return init_monetization(repo_path, args.project)


if __name__ == "__main__":
    raise SystemExit(main())
