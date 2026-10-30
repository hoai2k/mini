package net.hoai2k.smoothcraft.terrain;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import net.fabricmc.fabric.api.client.renderer.v1.Renderer;
import net.fabricmc.fabric.api.client.renderer.v1.mesh.MutableMesh;
import net.fabricmc.fabric.api.client.renderer.v1.sprite.SpriteFinder;
import net.minecraft.client.Minecraft;
import net.minecraft.client.color.block.BlockTintSource;
import net.minecraft.client.renderer.block.BlockAndTintGetter;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import org.jspecify.annotations.Nullable;

/**
 * The face looks of other blocks, for painting a neighbour's texture across a
 * border. Read once from each block's model and kept until resources reload.
 */
public final class Looks {
	private static final Map<Long, Optional<SmoothBlockModel.Look>> CACHE = new ConcurrentHashMap<>();
	private static final ThreadLocal<MutableMesh> MESH = ThreadLocal.withInitial(() -> Renderer.get().mutableMesh());

	private Looks() {
	}

	public static void clear() {
		CACHE.clear();
	}

	/** The face of {@code state} toward {@code face}, tinted for the given position; null if it has no single plain face. */
	static SmoothBlockModel.@Nullable Look tinted(BlockState state, Direction face, BlockAndTintGetter level, BlockPos pos, @Nullable SpriteFinder sprites) {
		long key = (long) Block.BLOCK_STATE_REGISTRY.getId(state) << 3 | face.ordinal();
		SmoothBlockModel.Look look = CACHE.computeIfAbsent(key, k -> Optional.ofNullable(read(state, face, sprites))).orElse(null);
		if (look == null || look.tintIndex() < 0) {
			return look;
		}
		List<BlockTintSource> sources = Minecraft.getInstance().getBlockColors().getTintSources(state);
		int tint = look.tintIndex() < sources.size() ? sources.get(look.tintIndex()).colorInWorld(state, level, pos) : -1;
		return look.withTint(tint);
	}

	private static SmoothBlockModel.@Nullable Look read(BlockState state, Direction face, @Nullable SpriteFinder sprites) {
		MutableMesh mesh = MESH.get();
		mesh.clear();
		Minecraft.getInstance().getModelManager().getBlockStateModelSet().get(state)
				.emitQuads(mesh.emitter(), BlockAndTintGetter.EMPTY, BlockPos.ZERO, state, RandomSource.create(42L), d -> false);
		SmoothBlockModel.Look[] found = new SmoothBlockModel.Look[1];
		int[] count = {0};
		mesh.forEach(quad -> {
			if (quad.nominalFace() == face && SmoothBlockModel.isFullFace(quad)) {
				count[0]++;
				if (found[0] == null) {
					found[0] = SmoothBlockModel.Look.of(quad, SmoothBlockModel.material(quad, sprites));
				}
			}
		});
		mesh.clear();
		return count[0] == 1 ? found[0] : null;
	}
}
