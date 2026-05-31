import json
import math
import re
import sys
from pathlib import Path

import bpy


PIXELS_PER_WORLD_UNIT = 32
TEXTURE_SIZE = 64
ART_COLLECTION_NAME = "01_ART_render_meshes"
COLLISION_COLLECTION_NAME = "02_COLLISION_blockers"
WALKABLE_COLLECTION_NAME = "03_WALKABLE_surfaces"
MARKERS_COLLECTION_NAME = "04_MARKERS_spawns_lights"
TRIGGERS_COLLECTION_NAME = "05_TRIGGERS_damage_zones"
SPRITE_TEXTURE_IDS = {
    "comet",
    "fallingLeaf",
    "firefly",
    "flickerComet",
    "healthPotion",
    "lightning",
    "moonbeam",
    "paleMoon",
    "rain",
    "shootingStar",
    "star",
    "sun",
    "torchFlame",
}


PALETTE = {
    "concrete": ("#5c5f66", "#393b42", "#7b7f88"),
    "brick": ("#5b2f35", "#2c1820", "#8a4b4f"),
    "metal": ("#59616d", "#20242c", "#a9b2be"),
    "crate": ("#76523a", "#2f2119", "#b17b4f"),
    "alienGround": ("#4b7b36", "#1f3021", "#a3c453"),
    "rotMud": ("#3d2d2d", "#151313", "#6d573f"),
    "wetAsphalt": ("#252833", "#0d1018", "#506477"),
    "starshipFloor": ("#44515b", "#111820", "#8fa3a7"),
    "shipCeiling": ("#28323c", "#0b1118", "#4f6572"),
    "darkMetal": ("#242a31", "#090d12", "#58616a"),
    "hullPanel": ("#3b4650", "#151b22", "#7d8790"),
    "reactorGlow": ("#273033", "#121719", "#ff5a38"),
    "moonbeam": ("#8da5cf", "#31415f", "#d9e6ff"),
    "neonTile": ("#151824", "#00d0ff", "#ff2bd6"),
    "oneBitGrid": ("#050505", "#ffffff", "#777777"),
    "shootingStar": ("#ffda78", "#ff7b38", "#fff7b8"),
    "star": ("#fff0a6", "#ffb044", "#ffffff"),
    "sun": ("#d84a54", "#77284a", "#fff0a6"),
    "water": ("#18365a", "#091624", "#52b9d6"),
    "lava": ("#34100c", "#ff4a16", "#ffd05a"),
}


def main():
    if len(sys.argv) < 3:
        raise SystemExit("Usage: blender --factory-startup -b --python scripts/build-level-glbs.py -- <levels-dir>")

    levels_dir = Path(sys.argv[-1]).resolve()
    seed_path = levels_dir / "level-seed-data.json"
    blend_path = levels_dir / "ps1-world-levels.blend"
    data = json.loads(seed_path.read_text(encoding="utf-8"))

    clear_scene()
    materials = build_materials(data["scenes"])
    collision_material = build_flat_material("AUTHOR_collision", (1.0, 0.12, 0.08, 0.28))
    walkable_material = build_flat_material("AUTHOR_walkable", (0.15, 0.8, 1.0, 0.25))
    marker_material = build_flat_material("AUTHOR_marker", (1.0, 0.85, 0.1, 1.0))
    damage_zone_material = build_flat_material("AUTHOR_trigger_damage_lava", (1.0, 0.28, 0.02, 0.22))

    for scene in data["scenes"]:
        build_scene_collection(scene, materials, collision_material, walkable_material, marker_material, damage_zone_material)

    bpy.context.preferences.filepaths.save_version = 0
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    exported = export_collections(levels_dir)
    print(f"Built {len(data['scenes'])} scene collections.")
    print(f"Exported {exported} GLBs.")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for collection in list(bpy.data.collections):
        bpy.data.collections.remove(collection)
    for material in list(bpy.data.materials):
        bpy.data.materials.remove(material)
    for image in list(bpy.data.images):
        bpy.data.images.remove(image)


def build_materials(scenes):
    texture_ids = []
    for scene in scenes:
        for texture in scene.get("textures", []):
            texture_id = texture["id"]
            if texture_id not in texture_ids:
                texture_ids.append(texture_id)

    return {texture_id: build_texture_material(texture_id) for texture_id in texture_ids}


def build_texture_material(texture_id):
    material = bpy.data.materials.new(f"LEVELMAT_{texture_id}")
    material.use_nodes = True
    material.blend_method = "BLEND" if is_sprite_texture(texture_id) else "OPAQUE"
    image = build_pixel_image(texture_id)
    nodes = material.node_tree.nodes
    texture_coordinate_node = nodes.new("ShaderNodeTexCoord")
    texture_node = nodes.new("ShaderNodeTexImage")
    texture_node.image = image
    texture_node.extension = "REPEAT"
    material.node_tree.links.new(texture_coordinate_node.outputs["UV"], texture_node.inputs["Vector"])
    principled = nodes.get("Principled BSDF")
    if principled:
        material.node_tree.links.new(texture_node.outputs["Color"], principled.inputs["Base Color"])
        material.node_tree.links.new(texture_node.outputs["Alpha"], principled.inputs["Alpha"])
        principled.inputs["Roughness"].default_value = 0.85
    return material


def build_flat_material(name, color):
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    if principled:
        principled.inputs["Base Color"].default_value = color
        principled.inputs["Alpha"].default_value = color[3]
    material.blend_method = "BLEND" if color[3] < 1 else "OPAQUE"
    return material


def build_pixel_image(texture_id):
    image = bpy.data.images.new(
        f"LEVELTEX_{texture_id}",
        TEXTURE_SIZE,
        TEXTURE_SIZE,
        alpha=is_sprite_texture(texture_id),
    )
    image.alpha_mode = "STRAIGHT"
    primary, secondary, accent = [hex_to_rgb(color) for color in palette_for(texture_id)]
    pixels = []
    for y in range(TEXTURE_SIZE):
        for x in range(TEXTURE_SIZE):
            color = texture_pixel(texture_id, x, y, primary, secondary, accent)
            pixels.extend(color)
    image.pixels.foreach_set(pixels)
    image.update()
    image.pack()
    return image


def palette_for(texture_id):
    if texture_id in PALETTE:
        return PALETTE[texture_id]
    hue = stable_hash(texture_id)
    base = hsl_to_rgb((hue % 360) / 360, 0.42, 0.34)
    dark = hsl_to_rgb((hue % 360) / 360, 0.48, 0.18)
    light = hsl_to_rgb(((hue + 28) % 360) / 360, 0.48, 0.58)
    return (rgb_to_hex(base), rgb_to_hex(dark), rgb_to_hex(light))


def texture_pixel(texture_id, x, y, primary, secondary, accent):
    sprite = sprite_texture_pixel(texture_id, x, y, primary, secondary, accent)
    if sprite:
        return sprite

    if "brick" in texture_id.lower() or "stone" in texture_id.lower():
        mortar = x % 16 == 0 or y % 8 == 0 or ((y // 8) % 2 and x % 16 == 8)
        color = secondary if mortar else dither(primary, accent, x, y, 0.10)
        return (*color, 1.0)
    if "grid" in texture_id.lower() or "tile" in texture_id.lower() or "floor" in texture_id.lower():
        line = x % 8 == 0 or y % 8 == 0
        color = accent if line else dither(primary, secondary, x, y, 0.08)
        return (*color, 1.0)
    if "water" in texture_id.lower():
        wave = (x + (y // 4) * 3) % 16 < 3
        color = accent if wave else dither(primary, secondary, x, y, 0.12)
        return (*color, 1.0)
    if "lava" in texture_id.lower():
        hot_crack = x % 13 == 0 or y % 11 == 0
        flow = math.sin((x + y) * 0.22) + math.sin((x * 0.48 - y) * 0.16)
        color = accent if hot_crack or flow > 1.18 else dither(primary, secondary, x, y, 0.32)
        return (*color, 1.0)
    if "metal" in texture_id.lower() or "panel" in texture_id.lower():
        seam = x % 16 == 0 or y % 16 == 0
        rivet = (x % 16 in (3, 4)) and (y % 16 in (3, 4))
        color = accent if rivet else (secondary if seam else dither(primary, accent, x, y, 0.08))
        return (*color, 1.0)
    if "onebit" in texture_id.lower():
        color = accent if ((x // 8) + (y // 8)) % 2 == 0 else primary
        return (*color, 1.0)
    color = dither(primary, secondary if (x + y) % 11 else accent, x, y, 0.10)
    return (*color, 1.0)


def sprite_texture_pixel(texture_id, x, y, primary, secondary, accent):
    center_x = x + 0.5 - TEXTURE_SIZE / 2
    center_y = y + 0.5 - TEXTURE_SIZE / 2
    distance = math.hypot(center_x, center_y)

    if texture_id in ("sun", "paleMoon"):
        if distance > 25:
            return (0.0, 0.0, 0.0, 0.0)
        color = accent if distance < 11 else (primary if distance < 21 else secondary)
        if (x + y) % 9 == 0 and distance < 21:
            color = dither(color, accent, x, y, 0.45)
        return (*color, 1.0)

    if texture_id == "star":
        cross = abs(center_x) <= 2 and abs(center_y) <= 14
        cross = cross or (abs(center_y) <= 2 and abs(center_x) <= 14)
        core = distance <= 4
        diagonal = abs(abs(center_x) - abs(center_y)) <= 1 and distance <= 10
        if not (cross or core or diagonal):
            return (0.0, 0.0, 0.0, 0.0)
        color = accent if core else primary
        return (*color, 1.0)

    if texture_id in ("shootingStar", "flickerComet", "comet"):
        head = math.hypot(x - 50, y - 32) <= 8
        tail = 10 <= x <= 50 and abs(y - 32) <= max(1, (50 - x) / 9)
        if not (head or tail):
            return (0.0, 0.0, 0.0, 0.0)
        color = accent if head else primary
        return (*color, 1.0)

    if texture_id == "rain":
        streak = ((x + y * 2) % 17) < 2 and 4 < y < 61
        return (*accent, 0.75) if streak else (0.0, 0.0, 0.0, 0.0)

    if texture_id == "moonbeam":
        center = abs(x + 0.5 - TEXTURE_SIZE / 2) / (TEXTURE_SIZE / 2)
        vertical = 1 - y / TEXTURE_SIZE
        dust = ((x * 13 + y * 7) % 29) == 0
        alpha = max(0.0, (1 - center) * 0.42 * (0.35 + vertical * 0.65))
        if dust:
            alpha = min(0.58, alpha + 0.18)
        if alpha <= 0.03:
            return (0.0, 0.0, 0.0, 0.0)
        color = dither(primary, accent, x, y, 0.18)
        return (*color, alpha)

    if texture_id in ("firefly", "torchFlame"):
        if distance > 18:
            return (0.0, 0.0, 0.0, 0.0)
        color = accent if distance < 7 else primary
        return (*color, 1.0 if distance < 13 else 0.7)

    if texture_id == "fallingLeaf":
        leaf = ((center_x * 0.7) ** 2 + (center_y * 1.25) ** 2) <= 250 and center_x + center_y * 0.35 > -16
        if not leaf:
            return (0.0, 0.0, 0.0, 0.0)
        return (*primary, 1.0)

    if texture_id == "lightning":
        bolt_x = 22 + (y // 8) * 4
        visible = abs(x - bolt_x) <= 2 or abs(x - bolt_x - 6) <= 1
        return (*accent, 1.0) if visible else (0.0, 0.0, 0.0, 0.0)

    if texture_id == "healthPotion":
        bottle = 20 <= x <= 44 and 18 <= y <= 52 and (24 <= x <= 40 or y >= 30)
        if not bottle:
            return (0.0, 0.0, 0.0, 0.0)
        color = accent if 26 <= x <= 38 and y >= 34 else primary
        return (*color, 1.0)

    return None


def is_sprite_texture(texture_id):
    return texture_id in SPRITE_TEXTURE_IDS


def dither(a, b, x, y, amount):
    return b if ((x * 17 + y * 31) % 100) / 100 < amount else a


def build_scene_collection(scene, materials, collision_material, walkable_material, marker_material, damage_zone_material):
    collection = bpy.data.collections.new(f"LEVEL_{scene['id']}")
    bpy.context.scene.collection.children.link(collection)
    groups = create_level_groups(collection, scene["id"])

    art_items = []
    art_items.extend(("floor", item) for item in (scene.get("floorPieces") or [scene["floor"]]))
    if scene.get("ceiling"):
        art_items.append(("ceiling", scene["ceiling"]))
    for key in ("walls", "platforms", "crates", "props"):
        art_items.extend((key, item) for item in scene.get(key, []))

    for category, item in art_items:
        if item.get("mesh") == "whole-tree":
            add_whole_tree(groups["art"], f"ART_{scene['id']}_{slug(item['name'])}", item, materials)
        else:
            add_box(groups["art"], f"ART_{scene['id']}_{slug(item['name'])}", item, materials[item["texture"]], textured=True, uv_scale=uv_scale_for_box_category(category))
        if category in ("walls", "platforms", "crates"):
            add_box(groups["collision"], f"COLLISION_{scene['id']}_{slug(item['name'])}", item, collision_material, textured=False)
        if category in ("floor", "walls", "platforms", "crates"):
            add_box(groups["walkable"], f"WALKABLE_{scene['id']}_{slug(item['name'])}", top_surface_box(item), walkable_material, textured=False)

    for mountain in scene.get("mountains", []):
        add_pyramid(groups["art"], f"ART_{scene['id']}_{slug(mountain['name'])}", mountain, materials[mountain["texture"]])

    for card_item in scene.get("cards", []):
        add_card(groups["art"], f"ART_{scene['id']}_{slug(card_item['name'])}", card_item, materials[card_item["texture"]])
    for card_item in scene.get("movingBillboards", []):
        add_card(groups["art"], f"ART_{scene['id']}_{slug(card_item['name'])}", card_item, materials[card_item["texture"]])
    for star in scene.get("stars", []):
        add_card(groups["art"], f"ART_{scene['id']}_{slug(star['name'])}", star, materials[star["texture"]])
    for key in ("sun", "rain"):
        if scene.get(key) and "width" in scene[key] and "height" in scene[key]:
            item_name = scene[key].get("name", key)
            add_card(groups["art"], f"ART_{scene['id']}_{slug(item_name)}", scene[key], materials[scene[key]["texture"]])
    if scene.get("shootingStar"):
        add_card(groups["art"], f"ART_{scene['id']}_shooting_star", scene["shootingStar"], materials[scene["shootingStar"]["texture"]])
    if scene.get("lightning"):
        add_lightning_bolts(groups["art"], scene, materials[scene["lightning"]["texture"]])
    if scene.get("rain"):
        add_rain(groups["art"], scene, materials[scene["rain"]["texture"]])

    for index, zone in enumerate(scene.get("damageZones", []) or [], start=1):
        add_damage_zone(groups["triggers"], scene, zone, damage_zone_material, index)

    add_markers(groups["markers"], scene, marker_material)

def create_level_groups(level_collection, scene_id):
    groups = {
        "art": bpy.data.collections.new(f"{ART_COLLECTION_NAME}__{scene_id}"),
        "collision": bpy.data.collections.new(f"{COLLISION_COLLECTION_NAME}__{scene_id}"),
        "walkable": bpy.data.collections.new(f"{WALKABLE_COLLECTION_NAME}__{scene_id}"),
        "markers": bpy.data.collections.new(f"{MARKERS_COLLECTION_NAME}__{scene_id}"),
        "triggers": bpy.data.collections.new(f"{TRIGGERS_COLLECTION_NAME}__{scene_id}"),
    }
    for child in groups.values():
        level_collection.children.link(child)
    return groups


def add_markers(collection, scene, marker_material):
    add_marker(collection, scene, "PLAYER_SPAWN", scene["playerSpawn"], marker_material, {"yaw": scene["playerSpawn"].get("yaw", 0)})
    for index, spawn in enumerate(scene.get("zombieSpawns", []), start=1):
        add_marker(collection, scene, "ZOMBIE_SPAWN", spawn, marker_material, {"index": index})
    for index, spawn in enumerate(scene.get("enemySpawns", []), start=1):
        add_marker(collection, scene, "ENEMY_SPAWN", spawn, marker_material, {
            "index": index,
            **marker_extras_from_item(spawn),
        })
    for index, potion in enumerate(scene.get("healthPotions", []), start=1):
        add_marker(collection, scene, "PICKUP_HEALTH", potion, marker_material, {
            "index": index,
            **marker_extras_from_item(potion),
        })
    for index, light in enumerate(scene.get("lights", []), start=1):
        add_marker(collection, scene, "LIGHT", light, marker_material, {"index": index, "color": light.get("color"), "radius": light.get("radius"), "intensity": light.get("intensity")})
    for index, light in enumerate(scene.get("torchLights", []), start=1):
        add_marker(collection, scene, "TORCH_LIGHT", light, marker_material, {"index": index, "color": light.get("color"), "radius": light.get("radius"), "intensity": light.get("intensity")})
    add_marker(collection, scene, "KILL_PLANE", {"x": 0, "y": scene.get("killY", -8), "z": 0}, marker_material, {"killY": scene.get("killY", -8)})


def marker_extras_from_item(item):
    return {
        key: value for key, value in item.items()
        if key not in ("name", "x", "y", "z", "collider")
    }


def add_marker(collection, scene, role, point, material, extras):
    bpy.ops.mesh.primitive_cube_add(size=0.25, location=to_blender_point(point))
    obj = bpy.context.object
    obj.name = f"MARKER_{scene['id']}_{role}_{extras.get('index', 1)}"
    obj.data.name = obj.name
    obj.data.materials.append(material)
    obj["level_role"] = role
    obj["scene_id"] = scene["id"]
    for key, value in extras.items():
        if value is not None:
            obj[key] = json.dumps(value) if isinstance(value, (list, dict)) else value
    link_to_collection(obj, collection)


def add_damage_zone(collection, scene, zone, material, index):
    item = {
        "x": zone["x"],
        "y": zone.get("y", zone.get("height", 0.5) / 2),
        "z": zone["z"],
        "width": zone["width"],
        "depth": zone["depth"],
        "height": zone.get("height", 0.5),
    }
    bpy.ops.mesh.primitive_cube_add(size=1, location=to_blender_point(item))
    obj = bpy.context.object
    obj.name = f"TRIGGER_{scene['id']}_DAMAGE_ZONE_{index}_{slug(zone.get('name', 'damage_zone'))}"
    obj.data.name = obj.name
    obj.scale = (item["width"], item["depth"], item["height"])
    obj.data.materials.append(material)
    obj.display_type = "WIRE"
    obj.show_in_front = True
    obj["level_role"] = "DAMAGE_ZONE"
    obj["scene_id"] = scene["id"]
    obj["name"] = zone.get("name", obj.name)
    obj["surfaceType"] = zone.get("surfaceType", "damage")
    obj["damagePerSecond"] = zone.get("damagePerSecond", 0)
    obj["width"] = item["width"]
    obj["depth"] = item["depth"]
    obj["height"] = item["height"]
    obj["authoringNote"] = "Gameplay trigger: player takes damage while inside this volume."
    link_to_collection(obj, collection)


def uv_scale_for_box_category(category):
    if category == "floor":
        return 2.5
    if category == "ceiling":
        return 2.0
    return 1.0


def add_box(collection, name, item, material, textured, uv_scale=1.0):
    min_x = item["x"] - item["width"] / 2
    max_x = item["x"] + item["width"] / 2
    min_y = item["z"] - item["depth"] / 2
    max_y = item["z"] + item["depth"] / 2
    min_z = item.get("y", 0)
    max_z = min_z + item["height"]
    vertices = [
        (min_x, min_y, min_z), (max_x, min_y, min_z), (max_x, min_y, max_z), (min_x, min_y, max_z),
        (max_x, max_y, min_z), (min_x, max_y, min_z), (min_x, max_y, max_z), (max_x, max_y, max_z),
        (min_x, max_y, min_z), (min_x, min_y, min_z), (min_x, min_y, max_z), (min_x, max_y, max_z),
        (max_x, min_y, min_z), (max_x, max_y, min_z), (max_x, max_y, max_z), (max_x, min_y, max_z),
        (min_x, min_y, max_z), (max_x, min_y, max_z), (max_x, max_y, max_z), (min_x, max_y, max_z),
        (min_x, max_y, min_z), (max_x, max_y, min_z), (max_x, min_y, min_z), (min_x, min_y, min_z),
    ]
    faces = [(0, 1, 2, 3), (4, 5, 6, 7), (8, 9, 10, 11), (12, 13, 14, 15), (16, 17, 18, 19), (20, 21, 22, 23)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(material)
    obj["scene_id"] = name.split("_")[1]
    if name.startswith("ART_"):
        obj["level_role"] = "art"
        obj["texture_id"] = material_texture_id(material)
        if item.get("motion"):
            obj["motion"] = item["motion"]
        if item.get("surfaceType"):
            obj["surfaceType"] = item["surfaceType"]
        if item.get("damagePerSecond"):
            obj["damagePerSecond"] = item["damagePerSecond"]
    elif name.startswith("COLLISION_"):
        obj["level_role"] = "collision"
        obj.display_type = "WIRE"
        obj.show_in_front = True
    elif name.startswith("WALKABLE_"):
        obj["level_role"] = "walkable"
        obj.display_type = "WIRE"
    if textured:
        write_box_uvs(mesh, uv_scale)
    collection.objects.link(obj)


def add_whole_tree(collection, name, item, materials):
    mesh = bpy.data.meshes.new(name)
    vertices = []
    faces = []
    material_indices = []
    bark_material = materials[item.get("texture", "rotBark")]
    canopy_material = materials[item.get("canopyTexture", "rotPine")]

    add_prism_geometry(
        vertices,
        faces,
        material_indices,
        item["x"],
        item["z"],
        item.get("y", 0),
        item["width"],
        item["depth"],
        item.get("trunkHeight", item["height"] * 0.7),
        item.get("leanX", 0),
        item.get("leanZ", 0),
        0,
    )

    trunk_height = item.get("trunkHeight", item["height"] * 0.7)
    canopy_height = item.get("canopyHeight", item["height"] - trunk_height)
    canopy_x = item["x"] + item.get("canopyOffsetX", 0) + item.get("leanX", 0)
    canopy_z = item["z"] + item.get("canopyOffsetZ", 0) + item.get("leanZ", 0)
    canopy_y = item.get("y", 0) + trunk_height
    canopy_width = item.get("canopyWidth", item["width"] * 4.2)
    canopy_depth = item.get("canopyDepth", item["depth"] * 4.0)
    add_prism_geometry(vertices, faces, material_indices, canopy_x, canopy_z, canopy_y, canopy_width, canopy_depth, canopy_height, 0, 0, 1)
    add_prism_geometry(vertices, faces, material_indices, canopy_x - canopy_width * 0.22, canopy_z + canopy_depth * 0.16, canopy_y - canopy_height * 0.18, canopy_width * 0.68, canopy_depth * 0.58, canopy_height * 0.72, 0, 0, 1)
    add_prism_geometry(vertices, faces, material_indices, canopy_x + canopy_width * 0.24, canopy_z - canopy_depth * 0.18, canopy_y - canopy_height * 0.08, canopy_width * 0.62, canopy_depth * 0.62, canopy_height * 0.62, 0, 0, 1)

    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(bark_material)
    obj.data.materials.append(canopy_material)
    for polygon, material_index in zip(mesh.polygons, material_indices):
        polygon.material_index = material_index
    obj["level_role"] = "art"
    obj["scene_id"] = name.split("_")[1]
    write_box_uvs(mesh, 1.0)
    collection.objects.link(obj)


def add_prism_geometry(vertices, faces, material_indices, x, z, y, width, depth, height, lean_x, lean_z, material_index):
    min_x = x - width / 2
    max_x = x + width / 2
    min_y = z - depth / 2
    max_y = z + depth / 2
    min_z = y
    max_z = y + height
    top_lean_x = lean_x
    top_lean_y = lean_z
    start = len(vertices)
    vertices.extend([
        (min_x, min_y, min_z), (max_x, min_y, min_z), (max_x + top_lean_x, min_y + top_lean_y, max_z), (min_x + top_lean_x, min_y + top_lean_y, max_z),
        (max_x, max_y, min_z), (min_x, max_y, min_z), (min_x + top_lean_x, max_y + top_lean_y, max_z), (max_x + top_lean_x, max_y + top_lean_y, max_z),
        (min_x, max_y, min_z), (min_x, min_y, min_z), (min_x + top_lean_x, min_y + top_lean_y, max_z), (min_x + top_lean_x, max_y + top_lean_y, max_z),
        (max_x, min_y, min_z), (max_x, max_y, min_z), (max_x + top_lean_x, max_y + top_lean_y, max_z), (max_x + top_lean_x, min_y + top_lean_y, max_z),
        (min_x + top_lean_x, min_y + top_lean_y, max_z), (max_x + top_lean_x, min_y + top_lean_y, max_z), (max_x + top_lean_x, max_y + top_lean_y, max_z), (min_x + top_lean_x, max_y + top_lean_y, max_z),
        (min_x, max_y, min_z), (max_x, max_y, min_z), (max_x, min_y, min_z), (min_x, min_y, min_z),
    ])
    prism_faces = [(0, 1, 2, 3), (4, 5, 6, 7), (8, 9, 10, 11), (12, 13, 14, 15), (16, 17, 18, 19), (20, 21, 22, 23)]
    faces.extend(tuple(start + index for index in face) for face in prism_faces)
    material_indices.extend([material_index] * len(prism_faces))


def add_pyramid(collection, name, item, material):
    min_x = item["x"] - item["width"] / 2
    max_x = item["x"] + item["width"] / 2
    min_y = item["z"] - item["depth"] / 2
    max_y = item["z"] + item["depth"] / 2
    base_z = item.get("y", 0)
    apex = (item["x"], item["z"], base_z + item["height"])
    vertices = [(min_x, min_y, base_z), (max_x, min_y, base_z), (max_x, max_y, base_z), (min_x, max_y, base_z), apex]
    faces = [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4), (3, 2, 1, 0)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(material)
    obj["level_role"] = "art"
    obj["scene_id"] = name.split("_")[1]
    obj["texture_id"] = material_texture_id(material)
    if item.get("motion"):
        obj["motion"] = item["motion"]
    write_box_uvs(mesh, 4.0)
    collection.objects.link(obj)


def add_card(collection, name, item, material):
    half_width = item["width"] / 2
    half_height = item["height"] / 2
    x = item["x"]
    y = item["z"]
    z = item.get("y", 0)
    vertices = [(x - half_width, y, z - half_height), (x + half_width, y, z - half_height), (x + half_width, y, z + half_height), (x - half_width, y, z + half_height)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], [(0, 1, 2, 3)])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(material)
    obj["level_role"] = "art"
    obj["scene_id"] = name.split("_")[1]
    obj["texture_id"] = material_texture_id(material)
    if item.get("motion"):
        obj["motion"] = item["motion"]
    uv_layer = mesh.uv_layers.new(name="UVMap")
    for loop_index, uv in zip(mesh.polygons[0].loop_indices, [(0, 1), (1, 1), (1, 0), (0, 0)]):
        uv_layer.data[loop_index].uv = uv
    collection.objects.link(obj)


def add_lightning_bolts(collection, scene, material):
    for bolt_index, bolt in enumerate(scene["lightning"].get("bolts", []), start=1):
        points = bolt.get("points", [])
        for point_index in range(len(points) - 1):
            add_lightning_segment(
                collection,
                f"ART_{scene['id']}_lightning_{bolt_index}_{point_index + 1}",
                points[point_index],
                points[point_index + 1],
                bolt.get("width", 0.14),
                material,
            )


def add_lightning_segment(collection, name, start, end, width, material):
    dx = end["x"] - start["x"]
    dy = end["y"] - start["y"]
    length = math.hypot(dx, dy) or 1
    ox = -dy / length * width
    oy = dx / length * width
    item = {
        "x": (start["x"] + end["x"]) / 2,
        "y": (start["y"] + end["y"]) / 2,
        "z": (start["z"] + end["z"]) / 2,
        "width": 1,
        "height": 1,
        "texture": material_texture_id(material),
    }
    add_custom_card(collection, name, [
        (start["x"] - ox, start["z"], start["y"] - oy),
        (start["x"] + ox, start["z"], start["y"] + oy),
        (end["x"] + ox, end["z"], end["y"] + oy),
        (end["x"] - ox, end["z"], end["y"] - oy),
    ], item, material, uvs=[(0, 1), (1, 1), (1, 0), (0, 0)])


def add_rain(collection, scene, material):
    for index, drop in enumerate(scene["rain"].get("drops", []), start=1):
        add_custom_card(collection, f"ART_{scene['id']}_rain_{index}", [
            (drop["x"] - drop["width"] / 2, drop["z"], drop["y"] - drop["height"]),
            (drop["x"] + drop["width"] / 2, drop["z"], drop["y"] - drop["height"]),
            (drop["x"] + drop["width"] / 2, drop["z"], drop["y"]),
            (drop["x"] - drop["width"] / 2, drop["z"], drop["y"]),
        ], {
            **drop,
            "texture": material_texture_id(material),
        }, material, uvs=[(0, 4), (1, 4), (1, 0), (0, 0)])


def add_custom_card(collection, name, vertices, item, material, uvs):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], [(0, 1, 2, 3)])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    obj.data.materials.append(material)
    obj["level_role"] = "art"
    obj["scene_id"] = name.split("_")[1]
    obj["texture_id"] = material_texture_id(material)
    if item.get("motion"):
        obj["motion"] = item["motion"]
    uv_layer = mesh.uv_layers.new(name="UVMap")
    for loop_index, uv in zip(mesh.polygons[0].loop_indices, uvs):
        uv_layer.data[loop_index].uv = uv
    collection.objects.link(obj)


def write_box_uvs(mesh, uv_scale):
    uv_layer = mesh.uv_layers.new(name="UVMap")
    for polygon in mesh.polygons:
        axis = dominant_axis(polygon.normal)
        for loop_index in polygon.loop_indices:
            vertex = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            uv_layer.data[loop_index].uv = projected_uv(vertex, axis, uv_scale)


def projected_uv(point, axis, divisor):
    if axis == 2:
        return (point.x / divisor, point.y / divisor)
    if axis == 1:
        return (point.x / divisor, point.z / divisor)
    return (point.y / divisor, point.z / divisor)


def dominant_axis(normal):
    values = [abs(normal.x), abs(normal.y), abs(normal.z)]
    return values.index(max(values))


def material_texture_id(material):
    return material.name.removeprefix("LEVELMAT_")


def top_surface_box(item):
    return {
        **item,
        "y": item.get("y", 0) + item["height"] - 0.01,
        "height": 0.02,
    }


def export_collections(levels_dir):
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


def link_to_collection(obj, collection):
    for existing in list(obj.users_collection):
        existing.objects.unlink(obj)
    collection.objects.link(obj)


def to_blender_point(point):
    return (point["x"], point["z"], point.get("y", 0))


def slug(value):
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def stable_hash(value):
    result = 0
    for char in value:
        result = (result * 31 + ord(char)) % 360
    return result


def hex_to_rgb(value):
    value = value.lstrip("#")
    return tuple(int(value[index:index + 2], 16) / 255 for index in (0, 2, 4))


def rgb_to_hex(rgb):
    return "#" + "".join(f"{max(0, min(255, round(channel * 255))):02x}" for channel in rgb)


def hsl_to_rgb(h, s, lightness):
    def hue_to_rgb(p, q, t):
        if t < 0:
            t += 1
        if t > 1:
            t -= 1
        if t < 1 / 6:
            return p + (q - p) * 6 * t
        if t < 1 / 2:
            return q
        if t < 2 / 3:
            return p + (q - p) * (2 / 3 - t) * 6
        return p

    if s == 0:
        return (lightness, lightness, lightness)
    q = lightness * (1 + s) if lightness < 0.5 else lightness + s - lightness * s
    p = 2 * lightness - q
    return (hue_to_rgb(p, q, h + 1 / 3), hue_to_rgb(p, q, h), hue_to_rgb(p, q, h - 1 / 3))


if __name__ == "__main__":
    main()
