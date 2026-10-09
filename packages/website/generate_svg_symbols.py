import argparse
from pathlib import Path
import xml.etree.ElementTree as ET


SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("inputs", nargs="+")
    args = parser.parse_args()

    atlas = ET.Element(f"{{{SVG_NS}}}svg")
    ids = set()
    for path in args.inputs:
        svg = ET.parse(path).getroot()
        symbol_id = Path(path).stem
        if svg.tag != f"{{{SVG_NS}}}svg" or not svg.get("viewBox"):
            raise ValueError(f"{path}: expected an SVG with a viewBox")
        if symbol_id in ids:
            raise ValueError(f"Duplicate symbol ID: {symbol_id}")
        ids.add(symbol_id)
        attributes = {k: v for k, v in svg.attrib.items() if k not in ("width", "height", "id")}
        symbol = ET.SubElement(atlas, f"{{{SVG_NS}}}symbol", {**attributes, "id": symbol_id})
        symbol.extend(svg)

    ET.ElementTree(atlas).write(args.output, encoding="utf-8", xml_declaration=False)


if __name__ == "__main__":
    main()
