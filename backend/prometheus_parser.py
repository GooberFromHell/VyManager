"""Lightweight Prometheus text exposition format parser."""


def parse_prometheus_text(text: str) -> dict[str, list[dict]]:
    """Parse Prometheus text format into structured dict.

    Returns dict keyed by metric family name, each value is a list of
    {"name": str, "labels": dict, "value": float} dicts.
    """
    metrics: dict[str, list[dict]] = {}

    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue

        try:
            # Parse labels if present
            if "{" in line:
                name_part, rest = line.split("{", 1)
                labels_str, value_part = rest.split("}", 1)
                name = name_part.strip()

                # Parse labels
                labels = {}
                for pair in _split_labels(labels_str):
                    if "=" in pair:
                        k, v = pair.split("=", 1)
                        labels[k.strip()] = v.strip().strip('"')

                value_str = value_part.strip().split()[0]
            else:
                parts = line.split()
                name = parts[0]
                labels = {}
                value_str = parts[1] if len(parts) > 1 else "0"

            # Parse value
            if value_str in ("+Inf", "Inf"):
                value = float("inf")
            elif value_str == "-Inf":
                value = float("-inf")
            elif value_str == "NaN":
                value = float("nan")
            else:
                value = float(value_str)

            # Group by base metric name
            family = name
            if family not in metrics:
                metrics[family] = []
            metrics[family].append({"name": name, "labels": labels, "value": value})

        except (ValueError, IndexError):
            continue

    return metrics


def _split_labels(labels_str: str) -> list[str]:
    """Split label string handling commas inside quoted values."""
    result = []
    current = []
    in_quotes = False

    for char in labels_str:
        if char == '"':
            in_quotes = not in_quotes
            current.append(char)
        elif char == "," and not in_quotes:
            result.append("".join(current))
            current = []
        else:
            current.append(char)

    if current:
        result.append("".join(current))

    return result
