import sys
from pathlib import Path

import bpy


def main():
    if len(sys.argv) < 3:
        raise SystemExit("Usage: blender -b assets/models/levels/ps1-world-levels.blend --python scripts/reexport-level-glbs.py -- <levels-dir>")

    levels_dir = Path(sys.argv[-1]).resolve()
    exported = export_collections(levels_dir)
    print(f"Exported {exported} GLBs.")


def export_collections(levels_dir):
    levels_dir.mkdir(parents=True, exist_ok=True)
    exported = 0
    for collection in sorted(bpy.data.collections, key=lambda item: item.name):
        if not collection.name.startswith("LEVEL_"):
            continue

        bpy.ops.object.select_all(action="DESELECT")
        objects = objects_recursive(collection)
        for obj in objects:
            obj.select_set(True)

        active = next((obj for obj in objects if obj.type == "MESH"), None)
        if active:
            bpy.context.view_layer.objects.active = active

        filepath = levels_dir / f"{collection.name.removeprefix('LEVEL_')}.glb"
        bpy.ops.export_scene.gltf(
            filepath=str(filepath),
            export_format="GLB",
            use_selection=True,
            export_texcoords=True,
            export_normals=True,
            export_materials="EXPORT",
            export_image_format="AUTO",
            export_extras=True,
            export_yup=True,
            export_apply=False,
        )
        exported += 1

    return exported


def objects_recursive(collection):
    objects = list(collection.objects)
    for child in collection.children:
        objects.extend(objects_recursive(child))
    return objects


if __name__ == "__main__":
    main()
