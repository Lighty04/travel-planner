"""
Non-regression test: Verify ONLY RapidAPI is used (not Amadeus)
in the target API / scraping files.

This test guards against accidentally re-introducing Amadeus API
references (keys or URLs) into the files that were migrated to
RapidAPI / Skyscanner.

Target files:
- src/lib/scraping/amadeus-flights.ts
- src/app/api/search/transport/route.ts
- src/app/api/search/accommodation/route.ts
"""

import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = PROJECT_ROOT / "src"

TARGET_FILES = [
    SRC_DIR / "lib" / "scraping" / "amadeus-flights.ts",
    SRC_DIR / "app" / "api" / "search" / "transport" / "route.ts",
    SRC_DIR / "app" / "api" / "search" / "accommodation" / "route.ts",
]

FLIGHTS_FILE = SRC_DIR / "lib" / "scraping" / "amadeus-flights.ts"
ENV_EXAMPLE = PROJECT_ROOT / ".env.example"


def read_file(filepath: Path) -> str:
    assert filepath.exists(), f"File not found: {filepath}"
    return filepath.read_text(encoding="utf-8")


def test_no_amadeus_api_key_in_target_files():
    """1. AMADEUS_API_KEY must NOT appear in any target file."""
    for f in TARGET_FILES:
        content = read_file(f)
        assert "AMADEUS_API_KEY" not in content, (
            f"AMADEUS_API_KEY found in {f.relative_to(PROJECT_ROOT)}. "
            "This file should not reference Amadeus credentials."
        )


def test_rapidapi_key_is_referenced():
    """2. RAPIDAPI_KEY must be referenced in the flights scraper."""
    content = read_file(FLIGHTS_FILE)
    assert "RAPIDAPI_KEY" in content, (
        "RAPIDAPI_KEY not found in amadeus-flights.ts. "
        "The flights scraper should use RapidAPI credentials."
    )


def test_no_amadeus_urls_in_target_files():
    """3. No Amadeus URLs (test.api.amadeus.com) in any target file."""
    for f in TARGET_FILES:
        content = read_file(f)
        assert "test.api.amadeus.com" not in content, (
            f"Amadeus URL (test.api.amadeus.com) found in {f.relative_to(PROJECT_ROOT)}. "
            "This file should not call Amadeus endpoints."
        )


def test_skyscanner_url_is_present():
    """4. Skyscanner RapidAPI URL must be present in the flights scraper."""
    content = read_file(FLIGHTS_FILE)
    assert "skyscanner80.p.rapidapi.com" in content, (
        "Skyscanner URL (skyscanner80.p.rapidapi.com) not found in amadeus-flights.ts. "
        "The flights scraper should call the Skyscanner RapidAPI endpoint."
    )


def test_env_example_may_list_amadeus():
    """Sanity check: .env.example is allowed to mention AMADEUS_API_KEY."""
    if ENV_EXAMPLE.exists():
        content = ENV_EXAMPLE.read_text(encoding="utf-8")
        # We don't assert presence — the key may or may not be listed —
        # we only ensure the test suite doesn't accidentally flag it.
        pass


def main() -> int:
    tests = [
        test_no_amadeus_api_key_in_target_files,
        test_rapidapi_key_is_referenced,
        test_no_amadeus_urls_in_target_files,
        test_skyscanner_url_is_present,
        test_env_example_may_list_amadeus,
    ]

    failures = 0
    for test in tests:
        try:
            test()
            print(f"[PASS] {test.__name__}")
        except AssertionError as e:
            failures += 1
            print(f"[FAIL] {test.__name__}: {e}")
        except Exception as e:
            failures += 1
            print(f"[ERROR] {test.__name__}: {e}")

    print()
    if failures:
        print(f"RESULT: {failures} test(s) failed.")
        return 1
    else:
        print(f"RESULT: All {len(tests)} tests passed — no Amadeus regression detected.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
