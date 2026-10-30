package net.hoai2k.smoothcraft.material;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.Reader;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import net.fabricmc.fabric.api.resource.v1.reloader.SimpleReloadListener;
import net.hoai2k.smoothcraft.Smoothcraft;
import net.minecraft.client.renderer.texture.TextureAtlasSprite;
import net.minecraft.resources.Identifier;
import net.minecraft.server.packs.resources.PreparableReloadListener;
import net.minecraft.server.packs.resources.Resource;

/**
 * Picks the surface material of each terrain quad from the name of its
 * texture, using the rules in assets/smoothcraft/materials.json. The material
 * index travels to the shader in the vertex colour's alpha, stored as
 * 255 - code so an untouched vertex (alpha 255) reads as "default". The code's
 * low 5 bits are the material (so at most 32); the top 3 bits mark a blend
 * overlay and carry its weight (see {@link #withBlend}).
 */
public final class Materials {
	public static final Identifier FILE = Smoothcraft.id("materials.json");

	private record Rule(Pattern pattern, int material) {
	}

	private static volatile List<Rule> rules = List.of();
	private static volatile int water;
	private static volatile int lava;
	private static final Map<Identifier, Integer> BY_SPRITE = new ConcurrentHashMap<>();

	public static final PreparableReloadListener RELOADER = new SimpleReloadListener<List<Rule>>() {
		@Override
		protected List<Rule> prepare(PreparableReloadListener.SharedState state) {
			List<Rule> out = new ArrayList<>();
			for (Resource resource : state.resourceManager().getResourceStack(FILE)) {
				try (Reader reader = resource.openAsReader()) {
					out = parse(JsonParser.parseReader(reader).getAsJsonObject());
				} catch (Exception e) {
					Smoothcraft.LOG.warn("Bad materials.json in {}", resource.sourcePackId(), e);
				}
			}
			return out;
		}

		@Override
		protected void apply(List<Rule> prepared, PreparableReloadListener.SharedState state) {
			rules = prepared;
			BY_SPRITE.clear();
			net.hoai2k.smoothcraft.terrain.Looks.clear();
		}
	};

	private Materials() {
	}

	static List<Rule> parse(JsonObject json) {
		Map<String, Integer> index = new HashMap<>();
		JsonArray materials = json.getAsJsonArray("materials");
		for (int i = 0; i < materials.size(); i++) {
			index.put(materials.get(i).getAsJsonObject().get("name").getAsString(), i);
		}
		water = index.getOrDefault("water", 0);
		lava = index.getOrDefault("lava", 0);
		List<Rule> out = new ArrayList<>();
		for (JsonElement e : json.getAsJsonArray("rules")) {
			JsonArray rule = e.getAsJsonArray();
			Integer material = index.get(rule.get(1).getAsString());
			if (material != null) {
				out.add(new Rule(Pattern.compile(rule.get(0).getAsString()), material));
			}
		}
		return out;
	}

	/** The material index for a block-atlas sprite. */
	public static int of(TextureAtlasSprite sprite) {
		Identifier name = sprite.contents().name();
		Integer cached = BY_SPRITE.get(name);
		if (cached != null) {
			return cached;
		}
		String path = name.getPath();
		if (path.startsWith("block/")) {
			path = path.substring(6);
		}
		int material = 0;
		for (Rule rule : rules) {
			if (rule.pattern.matcher(path).find()) {
				material = rule.material;
				break;
			}
		}
		BY_SPRITE.put(name, material);
		return material;
	}

	/** Replaces a vertex colour's alpha with the encoded material. */
	public static int withMaterial(int argb, int material) {
		return (argb & 0x00FFFFFF) | (255 - (material & 31)) << 24;
	}

	/**
	 * The same for a vertex of a blend overlay, a second layer drawn where
	 * another surface type's texture reaches over the border: {@code weight}
	 * (0..1) is how much of that type surrounds the vertex; the shader keeps
	 * the overlay where the interpolated weight beats a wobbling threshold.
	 */
	public static int withBlend(int argb, int material, float weight) {
		int level = 1 + Math.round(Math.max(0f, Math.min(1f, weight)) * 6f);
		return (argb & 0x00FFFFFF) | (255 - ((material & 31) | level << 5)) << 24;
	}

	/** The water material, for fluids (which are not drawn from block models). */
	public static int water() {
		return water;
	}

	public static int lava() {
		return lava;
	}
}
