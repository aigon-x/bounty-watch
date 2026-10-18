#!/usr/bin/env python3
"""
parse_digest.py

A small, production‑grade utility that parses a daily scope digest
written in Markdown and returns a structured representation.

The digest is expected to be a plain text file containing sections
for each bug‑bounty program.  The parser extracts:

* The digest date
* The number of scope changes
* The list of programs with their identifiers
* The list of added/removed scopes per program

The output is a :class:`dict` that can be serialised to JSON or
consumed by other tooling.

Author:   abdulsalam-create
License:  MIT
"""

from __future__ import annotations

import logging
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, NamedTuple, Optional

# --------------------------------------------------------------------------- #
# Logging configuration
# --------------------------------------------------------------------------- #

LOGGER = logging.getLogger(__name__)
LOGGER.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter(
    fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
handler.setFormatter(formatter)
LOGGER.addHandler(handler)

# --------------------------------------------------------------------------- #
# Data structures
# --------------------------------------------------------------------------- #

class ScopeChange(NamedTuple):
    """Represents a single scope change entry."""
    action: str  # 'added' or 'removed'
    scope_type: str  # 'out-of-scope' or 'scope'
    pattern: str

class ProgramChange(NamedTuple):
    """Represents all changes for a single bug‑bounty program."""
    program_name: str
    program_id: str
    changes: List[ScopeChange]

class Digest(NamedTuple):
    """Represents the entire digest."""
    date: str
    total_changes: int
    programs: List[ProgramChange]

# --------------------------------------------------------------------------- #
# Parser implementation
# --------------------------------------------------------------------------- #

class DigestParser:
    """
    Parses a daily scope digest Markdown file.

    Parameters
    ----------
    file_path : str | Path
        Path to the digest file.

    Raises
    ------
    FileNotFoundError
        If the file does not exist.
    ValueError
        If the file format is invalid or required sections are missing.
    """

    _DIGEST_HEADER_RE = re.compile(
        r"^# Daily scope digest (\d{4}-\d{2}-\d{2})$",
        re.MULTILINE,
    )
    _CHANGES_COUNT_RE = re.compile(
        r"^(\d+) scope change\(s\) across (\d+) bug bounty program\(s\) since the last digest\.$",
        re.MULTILINE,
    )
    _PROGRAM_HEADER_RE = re.compile(
        r"^### ([^`]+) \(`([^`]+)`\)$",
        re.MULTILINE,
    )
    _CHANGE_RE = re.compile(
        r"^- \s*➕ \*\*(?P<type>out-of-scope|scope)\*\* added: `(?P<pattern>[^`]+)`$|"
        r"^- \s*➖ \*\*(?P<type>out-of-scope|scope)\*\* removed: `(?P<pattern>[^`]+)`$",
        re.MULTILINE,
    )

    def __init__(self, file_path: str | Path) -> None:
        self.file_path = Path(file_path)
        if not self.file_path.is_file():
            LOGGER.error("Digest file not found: %s", self.file_path)
            raise FileNotFoundError(f"Digest file not found: {self.file_path}")

    def parse(self) -> Digest:
        """Parse the digest file and return a :class:`Digest` instance."""
        content = self._read_file()
        date = self._extract_date(content)
        total_changes = self._extract_total_changes(content)
        programs = self._extract_programs(content)
        return Digest(date=date, total_changes=total_changes, programs=programs)

    def _read_file(self) -> str:
        """Read the file content with UTF‑8 encoding."""
        try:
            return self.file_path.read_text(encoding="utf-8")
        except Exception as exc:  # pragma: no cover
            LOGGER.exception("Failed to read digest file")
            raise RuntimeError(f"Failed to read digest file: {exc}") from exc

    def _extract_date(self, content: str) -> str:
        """Extract the digest date from the header."""
        match = self._DIGEST_HEADER_RE.search(content)
        if not match:
            LOGGER.error("Digest header missing or malformed")
            raise ValueError("Digest header missing or malformed")
        return match.group(1)

    def _extract_total_changes(self, content: str) -> int:
        """Extract the total number of scope changes."""
        match = self._CHANGES_COUNT_RE.search(content)
        if not match:
            LOGGER.error("Scope changes count line missing or malformed")
            raise ValueError("Scope changes count line missing or malformed")
        return int(match.group(1))

    def _extract_programs(self, content: str) -> List[ProgramChange]:
        """Extract all program sections and their changes."""
        programs: List[ProgramChange] = []
        program_iter = self._PROGRAM_HEADER_RE.finditer(content)
        for prog_match in program_iter:
            program_name = prog_match.group(1).strip()
            program_id = prog_match.group(2).strip()
            start = prog_match.end()
            # Find the next program header or end of content
            next_match = next(
                (m for m in self._PROGRAM_HEADER_RE.finditer(content, start)),
                None,
            )
            end = next_match.start() if next_match else len(content)
            section = content[start:end]
            changes = self._extract_changes(section)
            programs.append(ProgramChange(program_name, program_id, changes))
        if not programs:
            LOGGER.warning("No program sections found in digest")
        return programs

    def _extract_changes(self, section: str) -> List[ScopeChange]:
        """Extract all scope changes within a program section."""
        changes: List[ScopeChange] = []
        for match in self._CHANGE_RE.finditer(section):
            action = "added" if "added" in match.group(0) else "removed"
            scope_type = match.group("type")
            pattern = match.group("pattern")
            changes.append(ScopeChange(action, scope_type, pattern))
        return changes

# --------------------------------------------------------------------------- #
# CLI entry point
# --------------------------------------------------------------------------- #

def main(argv: Optional[List[str]] = None) -> None:
    """Command‑line interface."""
    argv = argv or sys.argv[1:]
    if not argv:
        LOGGER.error("Usage: parse_digest.py <path-to-digest-file>")
        sys.exit(1)

    file_path = argv[0]
    try:
        parser = DigestParser(file_path)
        digest = parser.parse()
        # Pretty‑print the result
        import json

        def serialize(obj):
            if isinstance(obj, (Digest, ProgramChange, ScopeChange)):
                return obj._asdict()
            raise TypeError(f"Object of type {type(obj).__name__} is not JSON serialisable")

        print(json.dumps(digest, default=serialize, indent=2))
    except Exception as exc:  # pragma: no cover
        LOGGER.exception("Failed to parse digest")
        sys.exit(1)

if __name__ == "__main__":  # pragma: no cover
    main()