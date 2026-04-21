"""
Non-regression test: Verify no mock data functions exist in API scraping files.

This test scans specific source files for occurrences of "mock" and "getMock"
to ensure no mock data is accidentally committed to production scraping code.
"""

import sys
import re
from pathlib import Path


# Files to scan for mock data
FILES_TO_SCAN = [
    "/home/openclaw/.openclaw/workspace/travel-planner/src/lib/scraping/amadeus-flights.ts",
    "/home/openclaw/.openclaw/workspace/travel-planner/src/lib/scraping/rapidapi-hotels.ts",
    "/home/openclaw/.openclaw/workspace/travel-planner/src/app/api/search/transport/route.ts",
    "/home/openclaw/.openclaw/workspace/travel-planner/src/app/api/search/accommodation/route.ts",
]

# Patterns to search for
PATTERNS = ["mock", "getMock"]


def check_file(filepath: str) -> list:
    """
    Scan a single file for occurrences of any pattern.
    Returns a list of (line_number, line_content, matched_pattern) tuples.
    """
    findings = []
    path = Path(filepath)

    if not path.exists():
        print(f"ERROR: File not found: {filepath}")
        return findings

    try:
        with path.open("r", encoding="utf-8") as f:
            for line_number, line in enumerate(f, start=1):
                for pattern in PATTERNS:
                    if pattern in line:
                        findings.append((line_number, line.rstrip("\n"), pattern))
    except Exception as e:
        print(f"ERROR reading {filepath}: {e}")

    return findings


def main() -> int:
    """
    Scan all target files for mock references.
    Print findings and exit with code 1 if any found, 0 otherwise.
    """
    total_findings = 0
    has_errors = False

    for filepath in FILES_TO_SCAN:
        findings = check_file(filepath)

        if findings:
            total_findings += len(findings)
            print(f"\n[FAIL] {filepath}")
            for line_number, line_content, matched in findings:
                print(f"  Line {line_number}: matched '{matched}'")
                print(f"    {line_content.strip()}")
        else:
            print(f"[PASS] {filepath} — no mock references found")

        # If file doesn't exist, that's also an error
        if not Path(filepath).exists():
            has_errors = True

    print()
    if total_findings > 0:
        print(f"RESULT: {total_findings} mock reference(s) found across {len(FILES_TO_SCAN)} file(s).")
        print("Remove all mock/getMock references from production scraping code.")
        return 1
    elif has_errors:
        print("RESULT: Some target files could not be read.")
        return 1
    else:
        print(f"RESULT: All {len(FILES_TO_SCAN)} files clean — no mock references found.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
