import json
import math
import re
import sys
from pathlib import Path

import bpy


PIXELS_PER_WORLD_UNIT = 32
TEXTURE_SIZE = 64
SPRITE_TEXTURE_IDS = {
    "comet",
    "fallingLeaf",
    "firefly",
    "flickerComet",
    "healthPotion",
    "lightning",
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
    "neonTile": ("#151824", "#00d0ff", "#ff2bd6"),
    "oneBitGrid": ("#050505", "#ffffff", "#777777"),
    "shootingStar": ("#ffda78", "#ff7b38", "#fff7b8"),
    "star": ("#fff0a6", "#ffb044", "#ffffff"),
    "sun": ("#d84a54", "#77284a", "#fff0a6"),
    "water": ("#18365a", "#091624", "#52b9d6"),
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

    for scene in data["scenes"]:
        build_scene_collection(scene, materials, collision_material, walkable_material, marker_material)

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
    texture_node = nodes.new("ShaderNodeTexImage")
    texture_node.image = image
    texture_node.extension = "REPEAT"
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


def build_scene_collection(scene, materials, collision_material, walkable_material, marker_material):
    collection = bpy.data.collections.new(f"LEVEL_{scene['id']}")
    bpy.context.scene.collection.children.link(collection)

    art_items = []
    art_items.extend(scene.get("floorPieces") or [scene["floor"]])
    if scene.get("ceiling"):
        art_items.append(scene["ceiling"])
    for key in ("walls", "platforms", "crates", "props"):
        art_items.extend(scene.get(key, []))

    for item in art_items:
        add_box(collection, f"ART_{scene['id']}_{slug(item['name'])}", item, materials[item["texture"]], textured=True)
        add_box(collection, f"COLLISION_{scene['id']}_{slug(item['name'])}", item, collision_material, textured=False)
        add_box(collection, f"WALKABLE_{scene['id']}_{slug(item['name'])}", top_surface_box(item), walkable_material, textured=False)

    for mountain in scene.get("mountains", []):
        add_pyramid(collection, f"ART_{scene['id']}_{slug(mountain['name'])}", mountain, materials[mountain["texture"]])
        add_box(collection, f"COLLISION_{scene['id']}_{slug(mountain['name'])}", mountain, collision_material, textured=False)
        add_box(collection, f"WALKABLE_{scene['id']}_{slug(mountain['name'])}", top_surface_box(mountain), walkable_material, textured=False)

    for card_item in scene.get("cards", []):
        add_card(collection, f"ART_{scene['id']}_{slug(card_item['name'])}", card_item, materials[card_item["texture"]])
    for star in scene.get("stars", []):
        add_card(collection, f"ART_{scene['id']}_{slug(star['name'])}", star, materials[star["texture"]])
    for key in ("sun", "rain"):
        if scene.get(key) and "width" in scene[key] and "height" in scene[key]:
            item_name = scene[key].get("name", key)
            add_card(collection, f"ART_{scene['id']}_{slug(item_name)}", scene[key], materials[scene[key]["texture"]])
    if scene.get("shootingStar"):
        add_card(collection, f"ART_{scene['id']}_shooting_star", scene["shootingStar"], materials[scene["shootingStar"]["texture"]])

    add_markers(collection, scene, marker_material)


def add_markers(collection, scene, marker_material):
    add_marker(collection, scene, "PLAYER_SPAWN", scene["playerSpawn"], marker_material, {"yaw": scene["playerSpawn"].get("yaw", 0)})
    for index, spawn in enumerate(scene.get("zombieSpawns", []), start=1):
        add_marker(collection, scene, "ZOMBIE_SPAWN", spawn, marker_material, {"index": index})
    for index, potion in enumerate(scene.get("healthPotions", []), start=1):
        add_marker(collection, scene, "PICKUP_HEALTH", potion, marker_material, {"index": index, "texture": potion.get("texture")})
    for index, light in enumerate(scene.get("lights", []), start=1):
        add_marker(collection, scene, "LIGHT", light, marker_material, {"index": index, "color": light.get("color"), "radius": light.get("radius"), "intensity": light.get("intensity")})
    for index, light in enumerate(scene.get("torchLights", []), start=1):
        add_marker(collection, scene, "TORCH_LIGHT", light, marker_material, {"index": index, "color": light.get("color"), "radius": light.get("radius"), "intensity": light.get("intensity")})
    add_marker(collection, scene, "KILL_PLANE", {"x": 0, "y": scene.get("killY", -8), "z": 0}, marker_material, {"killY": scene.get("killY", -8)})


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


def add_box(collection, name, item, material, textured):
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
    elif name.startswith("COLLISION_"):
        obj["level_role"] = "collision"
        obj.display_type = "WIRE"
        obj.show_in_front = True
    elif name.startswith("WALKABLE_"):
        obj["level_role"] = "walkable"
        obj.display_type = "WIRE"
    if textured:
        write_box_uvs(mesh, material)
    collection.objects.link(obj)


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
    write_box_uvs(mesh, material)
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
    uv_layer = mesh.uv_layers.new(name="UVMap")
    for loop_index, uv in zip(mesh.polygons[0].loop_indices, [(0, 1), (1, 1), (1, 0), (0, 0)]):
        uv_layer.data[loop_index].uv = uv
    collection.objects.link(obj)


def write_box_uvs(mesh, material):
    uv_layer = mesh.uv_layers.new(name="UVMap")
    texture_world_units = texture_size_for_material(material) / PIXELS_PER_WORLD_UNIT
    for polygon in mesh.polygons:
        axis = dominant_axis(polygon.normal)
        for loop_index in polygon.loop_indices:
            vertex = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            uv_layer.data[loop_index].uv = projected_uv(vertex, axis, texture_world_units)


def projected_uv(point, axis, divisor):
    if axis == 2:
        return (point.x / divisor, point.y / divisor)
    if axis == 1:
        return (point.x / divisor, point.z / divisor)
    return (point.y / divisor, point.z / divisor)


def dominant_axis(normal):
    values = [abs(normal.x), abs(normal.y), abs(normal.z)]
    return values.index(max(values))


def texture_size_for_material(material):
    for node in material.node_tree.nodes:
        if node.bl_idname == "ShaderNodeTexImage" and node.image:
            return max(node.image.size[0], node.image.size[1], 1)
    return TEXTURE_SIZE


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
        for obj in collection.objects:
            obj.select_set(True)
        active = next((obj for obj in collection.objects if obj.type == "MESH"), None)
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
