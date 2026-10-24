package net.hoai2k.smoothcraft.terrain;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.Reader;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import net.fabricmc.fabric.api.resource.v1.reloader.SimpleReloadListener;
import net.hoai2k.smoothcraft.Smoothcraft;
import net.hoai2k.smoothcraft.geom.CellField;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.server.packs.resources.PreparableReloadListener;
import net.minecraft.server.packs.resources.Resource;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.EmptyBlockGetter;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.LiquidBlock;
import net.minecraft.world.level.block.state.BlockState;

/** Sorts block states into the {@link CellField} kinds, from assets/smoothcraft/smoothing.json. */
public final class BlockRules {
	/** A block that is not part of the surface but rides on the ground below it. */
	public static final byte FOLLOW = 4;

	private static volatile Pattern smooth = Pattern.compile("$^");
	private static volatile Pattern follow = Pattern.compile("$^");
	/** Kind per block state id, plus one; 0 means not looked up yet. */
	private static volatile byte[] cache = new byte[0];

	public static final PreparableReloadListener RELOADER = new SimpleReloadListener<Pattern[]>() {
		@Override
		protected Pattern[] prepare(PreparableReloadListener.SharedState state) {
			List<String> smoothList = new ArrayList<>();
			List<String> followList = new ArrayList<>();
			for (Resource resource : state.resourceManager().getResourceStack(Smoothcraft.id("smoothing.json"))) {
				try (Reader reader = resource.openAsReader()) {
					JsonObject json = JsonParser.parseReader(reader).getAsJsonObject();
					smoothList.clear();
					followList.clear();
					add(json.getAsJsonArray("smooth"), smoothList);
					add(json.getAsJsonArray("follow"), followList);
				} catch (Exception e) {
					Smoothcraft.LOG.warn("Bad smoothing.json in {}", resource.sourcePackId(), e);
				}
			}
			return new Pattern[] {join(smoothList), join(followList)};
		}

		@Override
		protected void apply(Pattern[] prepared, PreparableReloadListener.SharedState state) {
			smooth = prepared[0];
			follow = prepared[1];
			cache = new byte[0];
		}
	};

	private BlockRules() {
	}

	/** The kind of a block state: a {@link CellField} constant or {@link #FOLLOW}. */
	public static byte kind(BlockState state) {
		int id = Block.BLOCK_STATE_REGISTRY.getId(state);
		byte[] table = cache;
		if (id < 0) {
			return compute(state);
		}
		if (id >= table.length) {
			table = new byte[Block.BLOCK_STATE_REGISTRY.size() + 1];
			cache = table;
		}
		byte k = table[id];
		if (k == 0) {
			k = (byte) (compute(state) + 1);
			table[id] = k;
		}
		return (byte) (k - 1);
	}

	private static byte compute(BlockState state) {
		if (state.isAir()) {
			return CellField.EMPTY;
		}
		if (state.getBlock() instanceof LiquidBlock) {
			return CellField.FLUID;
		}
		String name = BuiltInRegistries.BLOCK.getKey(state.getBlock()).toString();
		if (follow.matcher(name).matches()) {
			return FOLLOW;
		}
		BlockGetter empty = EmptyBlockGetter.INSTANCE;
		try {
			if (smooth.matcher(name).matches() && state.isCollisionShapeFullBlock(empty, BlockPos.ZERO)) {
				return CellField.SMOOTH;
			}
			return state.getCollisionShape(empty, BlockPos.ZERO).isEmpty() ? CellField.EMPTY : CellField.HARD;
		} catch (RuntimeException e) {
			// A block whose shape depends on a real level: keep it as it is.
			return CellField.HARD;
		}
	}

	private static void add(JsonArray array, List<String> out) {
		if (array != null) {
			for (JsonElement e : array) {
				out.add(e.getAsString());
			}
		}
	}

	private static Pattern join(List<String> parts) {
		return parts.isEmpty() ? Pattern.compile("$^") : Pattern.compile("(?:" + String.join(")|(?:", parts) + ")");
	}
}
