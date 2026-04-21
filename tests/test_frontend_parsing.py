"""
Non-regression test for travel-planner frontend data extraction.

Verifies that the handleSearch function in page.tsx correctly extracts
`accData?.data` and `transData?.data` (not just the top-level response objects)
when building the results state.
"""

import re
from pathlib import Path


PAGE_TSX_PATH = Path(__file__).resolve().parents[1] / "src" / "app" / "page.tsx"


def read_page_tsx() -> str:
    assert PAGE_TSX_PATH.exists(), f"page.tsx not found at {PAGE_TSX_PATH}"
    return PAGE_TSX_PATH.read_text(encoding="utf-8")


def test_handleSearch_function_exists():
    """1. The handleSearch function must exist in page.tsx."""
    content = read_page_tsx()
    assert "const handleSearch" in content, "handleSearch function not found in page.tsx"


def test_accommodation_data_extracted_from_nested_data():
    """2. Accommodation must be extracted from `accData?.data`, not just `accData`."""
    content = read_page_tsx()
    # Look for the pattern where accommodation is set using optional chaining on .data
    assert "accData?.data" in content, (
        "page.tsx does not extract accommodation from `accData?.data`. "
        "It may be using `accData` directly, which is a regression risk."
    )


def test_transport_data_extracted_from_nested_data():
    """3. Transport must be extracted from `transData?.data`, not just `transData`."""
    content = read_page_tsx()
    assert "transData?.data" in content, (
        "page.tsx does not extract transport from `transData?.data`. "
        "It may be using `transData` directly, which is a regression risk."
    )


def test_setResults_includes_proper_data_extraction():
    """4. The setResults call must use the nested .data extraction for both fields."""
    content = read_page_tsx()

    # Find the setResults call block — account for nested braces
    set_results_match = re.search(
        r"setResults\(\{.*?\}\s*\)\s*(?=\n|\r|$)",
        content,
        re.DOTALL,
    )
    assert set_results_match is not None, "setResults call not found in page.tsx"

    set_results_call = set_results_match.group(0)

    # Verify accommodation uses accData?.data
    assert "accData?.data" in set_results_call, (
        "setResults call does not use `accData?.data` for accommodation."
    )

    # Verify transport uses transData?.data
    assert "transData?.data" in set_results_call, (
        "setResults call does not use `transData?.data` for transport."
    )

    # Verify fallback values are present
    assert "|| []" in set_results_call, (
        "setResults call missing fallback `|| []` for accommodation."
    )
    assert "|| { flights: [], trains: [] }" in set_results_call, (
        "setResults call missing fallback `|| { flights: [], trains: [] }` for transport."
    )
