## Parallel execution results

### Subtask 1/1
#!/usr/bin/env python3
"""
fix.py
======

Production‑grade script to update the list of in‑scope targets for
bug‑bounty programs.

The script is idempotent – running it multiple times will not
duplicate entries.  It reads a JSON file that contains a mapping
from program names to a list of target patterns, adds the new
targets for the programs **MercadoLibre** and **Marriott**, and writes
the updated mapping back to the same file.

The JSON file is expected to have the following structure::

    {
        "mercadolibre": [
            "*.oldpattern.mercadolivre.com.br",
            ...
        ],
        "marriott": [
            "old.uat.marriott.com",
            ...
        ]
    }

If the file does not exist, it will be created with an empty mapping.
"""



