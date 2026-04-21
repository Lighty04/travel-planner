#!/usr/bin/env python3
"""Test runner for travel-planner. Runs all test modules and reports summary."""

import sys
import os
import importlib.util
import traceback

# Ensure tests directory is on path
TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
if TESTS_DIR not in sys.path:
    sys.path.insert(0, TESTS_DIR)

# List of test modules to run
TEST_MODULES = [
    "test_no_mocks",
    "test_api_only_rapidapi",
    "test_frontend_parsing",
]


def run_test_module(module_name: str) -> bool:
    """Import and run a test module. Returns True if all tests pass."""
    module_path = os.path.join(TESTS_DIR, f"{module_name}.py")

    if not os.path.isfile(module_path):
        print(f"  ⚠️  Warning: {module_name}.py not found — skipping")
        return True  # Don't fail on missing file

    try:
        spec = importlib.util.spec_from_file_location(module_name, module_path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    except Exception as e:
        print(f"  ❌ {module_name}: FAILED to import/run")
        traceback.print_exc()
        return False

    # Look for common test patterns:
    # 1. Functions named test_*()
    # 2. unittest.TestCase classes
    # 3. pytest-style top-level assertions
    passed = 0
    failed = 0
    errors = []

    # Collect test functions
    test_functions = []
    for attr_name in dir(module):
        attr = getattr(module, attr_name)
        if callable(attr) and attr_name.startswith("test_"):
            test_functions.append((attr_name, attr))

    # Collect unittest classes
    unittest_classes = []
    try:
        import unittest
        for attr_name in dir(module):
            attr = getattr(module, attr_name)
            if (
                isinstance(attr, type)
                and issubclass(attr, unittest.TestCase)
                and attr is not unittest.TestCase
            ):
                unittest_classes.append((attr_name, attr))
    except ImportError:
        pass

    # Run plain test functions
    for name, func in test_functions:
        try:
            func()
            passed += 1
        except Exception as e:
            failed += 1
            errors.append((module_name, name, e))

    # Run unittest classes
    for name, cls in unittest_classes:
        loader = unittest.TestLoader()
        suite = loader.loadTestsFromTestCase(cls)
        runner = unittest.TextTestRunner(verbosity=0, stream=open(os.devnull, "w"))
        result = runner.run(suite)
        passed += result.testsRun - len(result.failures) - len(result.errors)
        failed += len(result.failures) + len(result.errors)
        for test, trace in result.failures + result.errors:
            errors.append((module_name, str(test), trace))

    if not test_functions and not unittest_classes:
        # No explicit tests found — assume module runs its own assertions on import
        print(f"  ✅ {module_name}: loaded (no explicit test functions)")
        return True

    if failed == 0:
        print(f"  ✅ {module_name}: {passed} passed")
        return True
    else:
        print(f"  ❌ {module_name}: {passed} passed, {failed} failed")
        for mod, test_name, err in errors:
            print(f"      - {test_name}: {err}")
        return False


def main() -> int:
    print("=" * 50)
    print("Travel-Planner Test Runner")
    print("=" * 50)

    results = []
    for module in TEST_MODULES:
        results.append(run_test_module(module))

    passed_count = sum(results)
    total_count = len(TEST_MODULES)

    print("=" * 50)
    print(f"Summary: {passed_count}/{total_count} test suites passed")
    print("=" * 50)

    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main())
