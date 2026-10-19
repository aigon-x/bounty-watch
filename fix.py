def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="bounty-watch",
        description="Generate a bounty-watch report in Markdown or JSON.",
        epilog="Exit codes: 0 success, 1 I/O failure, 2 invalid data, 3 render failure.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("-f", "--format", choices=VALID_FORMATS, default="markdown", help=...)
    parser.add_argument("--compact", action="store_true", help="Emit compact JSON (no indentation). Ignored for Markdown.")
    parser.add_argument("-o", "--output", type=Path, default=None, metavar="PATH", help="Write to PATH instead of stdout ('-' for stdout).")
    verbosity = parser.add_mutually_exclusive_group()
    verbosity.add_argument("-v", "--verbose", action="count", default=0, help=...)
    verbosity.add_argument("-q", "--quiet", action="count", default=0, help=...)
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    return parser