import sys
from pathlib import Path

import bpy


SCENE_ID = "dungeon"
COLLECTIBLE_ID = "dungeon-golden-goblet"
GOBLET_POSITION = {"x": -6.8, "y": 0.15, "z": 6.6}
GOBLET_SCALE = 0.85
LOW_POLY_TARGET_TRIANGLES = 850
TEXTURE_SIZE = 64


def main():
    if len(sys.argv) < 4:
        raise SystemExit(
            "Usage: blender -b assets/models/levels/ps1-world-levels.blend "
            "--python scripts/import-meshy-goblet-prop.py -- <prop-glb> <blend-output>"
        )

    prop_path = Path(sys.argv[-2]).resolve()
    blend_output = Path(sys.argv[-1]).resolve()
    if not prop_path.exists():
        raise SystemExit(f"Missing prop GLB: {prop_path}")

    remove_existing()
    art_collection = require_collection(f"01_ART_render_meshes__{SCENE_ID}")
    marker_collection = require_collection(f"04_MARKERS_spawns_lights__{SCENE_ID}")

    imported = import_prop(prop_path)
    downscale_imported_textures(imported)
    normalize_imported_materials(imported)
    for index, obj in enumerate(imported, start=1):
        decimate_to_target(obj, LOW_POLY_TARGET_TRIANGLES)
        obj.name = "ART_dungeon_meshy_golden_goblet" if index == 1 else f"ART_dungeon_meshy_golden_goblet_{index}"
        obj.data.name = obj.name
        obj.location = to_blender_point(GOBLET_POSITION)
        obj.rotation_euler[2] = 0.35
        obj.scale = (GOBLET_SCALE, GOBLET_SCALE, GOBLET_SCALE)
        obj["level_role"] = "art"
        obj["scene_id"] = SCENE_ID
        obj["motion"] = "pickup-bob"
        obj["collectibleId"] = COLLECTIBLE_ID
        obj["texture_id"] = material_texture_id(obj)
        link_to_collection(obj, art_collection)

    add_marker(marker_collection)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_output))


def remove_existing():
    for obj in list(bpy.data.objects):
        if obj.get("collectibleId") == COLLECTIBLE_ID or obj.name.startswith("MARKER_dungeon_PICKUP_COLLECTIBLE"):
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.outliner.orphans_purge(do_recursive=True)


def require_collection(name):
    collection = bpy.data.collections.get(name)
    if not collection:
        raise SystemExit(f"Missing Blender collection: {name}")
    return collection


def import_prop(prop_path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(prop_path))
    imported = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
    if not imported:
        raise SystemExit(f"Imported GLB did not contain mesh objects: {prop_path}")
    return imported


def downscale_imported_textures(objects):
    images = {
        texture_node.image
        for obj in objects
        for material in obj.data.materials
        if material and material.use_nodes
        for texture_node in material.node_tree.nodes
        if texture_node.type == "TEX_IMAGE" and texture_node.image
    }
    for image in images:
        image.scale(TEXTURE_SIZE, TEXTURE_SIZE)
        image.pack()


def normalize_imported_materials(objects):
    for obj in objects:
        for material in obj.data.materials:
            if material:
                material.name = "LEVELMAT_meshyGoldGoblet"


def decimate_to_target(obj, target_triangles):
    triangles = sum(max(0, len(polygon.vertices) - 2) for polygon in obj.data.polygons)
    if triangles <= target_triangles:
        return

    ratio = max(0.05, min(1.0, target_triangles / triangles))
    modifier = obj.modifiers.new("PS1 low-poly decimate", "DECIMATE")
    modifier.ratio = ratio
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def add_marker(collection):
    material = bpy.data.materials.get("AUTHOR_marker")
    bpy.ops.mesh.primitive_cube_add(size=0.25, location=to_blender_point(GOBLET_POSITION))
    obj = bpy.context.object
    obj.name = "MARKER_dungeon_PICKUP_COLLECTIBLE_1_golden_goblet"
    obj.data.name = obj.name
    if material:
        obj.data.materials.append(material)
    obj["level_role"] = "PICKUP_COLLECTIBLE"
    obj["scene_id"] = SCENE_ID
    obj["collectibleId"] = COLLECTIBLE_ID
    obj["collectibleType"] = "goblet"
    obj["label"] = "You found the goblet."
    obj["radius"] = 0.82
    obj["height"] = 1.2
    link_to_collection(obj, collection)


def material_texture_id(obj):
    if not obj.data.materials:
        return "meshyGoldGoblet"
    name = obj.data.materials[0].name
    if name.startswith("LEVELMAT_"):
        return name.removeprefix("LEVELMAT_")
    return f"meshyGoldGoblet_{name}"


def to_blender_point(point):
    return (point["x"], point["z"], point.get("y", 0))


def link_to_collection(obj, collection):
    for existing in list(obj.users_collection):
        existing.objects.unlink(obj)
    collection.objects.link(obj)


if __name__ == "__main__":
    main()
