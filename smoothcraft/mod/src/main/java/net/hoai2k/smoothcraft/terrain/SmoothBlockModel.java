package net.hoai2k.smoothcraft.terrain;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Predicate;
import net.fabricmc.fabric.api.util.TriState;
import net.fabricmc.fabric.api.client.model.loading.v1.wrapper.WrapperBlockStateModel;
import net.fabricmc.fabric.api.client.renderer.v1.Renderer;
import net.fabricmc.fabric.api.client.renderer.v1.mesh.MutableMesh;
import net.fabricmc.fabric.api.client.renderer.v1.mesh.MutableQuadView;
import net.fabricmc.fabric.api.client.renderer.v1.mesh.QuadAtlas;
import net.fabricmc.fabric.api.client.renderer.v1.mesh.QuadEmitter;
import net.fabricmc.fabric.api.client.renderer.v1.mesh.QuadTransform;
import net.fabricmc.fabric.api.client.renderer.v1.mesh.QuadView;
import net.fabricmc.fabric.api.client.renderer.v1.mesh.ShadeMode;
import net.fabricmc.fabric.api.client.renderer.v1.sprite.FabricTextureAtlas;
import net.fabricmc.fabric.api.client.renderer.v1.sprite.SpriteFinder;
import net.hoai2k.smoothcraft.SmoothConfig;
import net.hoai2k.smoothcraft.geom.CellField;
import net.hoai2k.smoothcraft.geom.FaceBlend;
import net.hoai2k.smoothcraft.geom.SmoothSurface;
import net.hoai2k.smoothcraft.material.Materials;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.BiomeColors;
import net.minecraft.client.renderer.block.BlockAndTintGetter;
import net.minecraft.client.renderer.chunk.ChunkSectionLayer;
import net.minecraft.client.renderer.block.dispatch.BlockStateModel;
import net.minecraft.client.renderer.chunk.RenderSectionRegion;
import net.minecraft.client.renderer.texture.TextureAtlasSprite;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.data.AtlasIds;
import net.minecraft.resources.Identifier;
import net.minecraft.tags.FluidTags;
import net.minecraft.util.ARGB;
import net.minecraft.util.LightCoordsUtil;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import org.jspecify.annotations.Nullable;

/**
 * Wraps every block model. While a chunk section is meshed it
 * <ul>
 * <li>tags each quad with its surface material (from the texture name),</li>
 * <li>for natural terrain, cuts each face into a grid and moves every point
 *     onto the smooth surface, with smooth per-vertex normals, and</li>
 * <li>blends the textures of neighbouring terrain types along curved borders,</li>
 * <li>lays a strip of water over shore blocks so the waterline follows the ground, and</li>
 * <li>moves plants and snow layers with the smoothed ground under them.</li>
 * </ul>
 * Everywhere else (items, falling blocks, pistons) it draws the model as is.
 */
public final class SmoothBlockModel extends WrapperBlockStateModel {
	private static final ThreadLocal<MutableMesh> CAPTURE = ThreadLocal.withInitial(() -> Renderer.get().mutableMesh());

	public SmoothBlockModel(BlockStateModel wrapped) {
		super(wrapped);
	}

	@Override
	public void emitQuads(QuadEmitter emitter, BlockAndTintGetter level, BlockPos pos, BlockState state, RandomSource random, Predicate<@Nullable Direction> cullTest) {
		if (!(level instanceof RenderSectionRegion)) {
			wrapped.emitQuads(emitter, level, pos, state, random, cullTest);
			return;
		}
		SpriteFinder sprites = spriteFinder();
		SmoothConfig config = SmoothConfig.get();
		byte kind = config.smoothTerrain && config.terrainStrength > 0f ? BlockRules.kind(state) : CellField.HARD;

		if (kind == CellField.SMOOTH) {
			emitSmooth(emitter, level, pos, state, random, cullTest, sprites, config);
			return;
		}

		float[] lift = kind == BlockRules.FOLLOW ? groundOffset(level, pos, config) : null;
		emitter.pushTransform(quad -> {
			tagMaterial(quad, sprites);
			if (lift != null) {
				quad.translate(lift[0], lift[1], lift[2]);
			}
			return true;
		});
		try {
			wrapped.emitQuads(emitter, level, pos, state, random, cullTest);
		} finally {
			emitter.popTransform();
		}
	}

	@Override
	public @Nullable Object createGeometryKey(BlockAndTintGetter level, BlockPos pos, BlockState state, RandomSource random) {
		// The shape depends on the neighbours, so no two positions can share a mesh.
		return null;
	}

	private void emitSmooth(QuadEmitter emitter, BlockAndTintGetter level, BlockPos pos, BlockState state, RandomSource random,
			Predicate<@Nullable Direction> cullTest, SpriteFinder sprites, SmoothConfig config) {
		MutableMesh mesh = CAPTURE.get();
		mesh.clear();
		QuadEmitter capture = mesh.emitter();
		QuadTransform grab = quad -> {
			capture.copyFrom(quad);
			capture.emit();
			return false;
		};
		emitter.pushTransform(grab);
		try {
			wrapped.emitQuads(emitter, level, pos, state, random, cullTest);
		} finally {
			emitter.popTransform();
		}

		RegionCells cells = RegionCells.of(level, pos);
		SmoothSurface surface = new SmoothSurface(cells, config.terrainStrength);
		int divisions = config.terrainSubdivisions;

		// First pass: the block's top and bottom looks, and the first quad of each face.
		Look[] caps = new Look[2];
		int[] firstOfFace = {-1, -1, -1, -1, -1, -1};
		int[] quadsOnFace = new int[6];
		int[] counter = {0};
		mesh.forEach(quad -> {
			int index = counter[0]++;
			if (isFullFace(quad)) {
				Direction face = quad.nominalFace();
				quadsOnFace[face.ordinal()]++;
				if (firstOfFace[face.ordinal()] < 0) {
					firstOfFace[face.ordinal()] = index;
				}
				if (face == Direction.UP && caps[0] == null) {
					caps[0] = Look.of(quad, material(quad, sprites));
				} else if (face == Direction.DOWN && caps[1] == null) {
					caps[1] = Look.of(quad, material(quad, sprites));
				}
			}
		});

		counter[0] = 0;
		int grid = divisions + 1;
		float[][] raw = new float[grid * grid][3];
		float[][] points = new float[grid * grid][3];
		float[][] normals = new float[grid * grid][3];
		float[][] corners = new float[4][3];
		float[][] cornerNormals = new float[4][3];
		mesh.forEach(quad -> {
			int index = counter[0]++;
			Direction cull = quad.cullFace();
			if (cull != null && cells.cell(pos.getX() + cull.getStepX(), pos.getY() + cull.getStepY(), pos.getZ() + cull.getStepZ()) == CellField.SMOOTH) {
				// Faces between two smoothed blocks (leaves draw them) would poke through the surface.
				return;
			}
			Look own = Look.of(quad, material(quad, sprites));
			if (!isFullFace(quad)) {
				emitter.copyFrom(quad);
				for (int v = 0; v < 4; v++) {
					corners[v][0] = quad.x(v) + pos.getX();
					corners[v][1] = quad.y(v) + pos.getY();
					corners[v][2] = quad.z(v) + pos.getZ();
					place(corners[v], cornerNormals[v], quad, surface);
					write(emitter, v, corners[v], cornerNormals[v], pos, quad.u(v), quad.v(v), Materials.withMaterial(quad.color(v), own.material), quad.lightmap(v));
				}
				emitter.shadeMode(ShadeMode.ENHANCED);
				emitter.emit();
				return;
			}
			Direction face = quad.nominalFace();
			boolean side = face.getAxis().isHorizontal();
			for (int i = 0; i < grid; i++) {
				for (int j = 0; j < grid; j++) {
					int g = i * grid + j;
					bilinearPos(quad, (float) i / divisions, (float) j / divisions, pos, raw[g]);
					points[g][0] = raw[g][0];
					points[g][1] = raw[g][1];
					points[g][2] = raw[g][2];
					place(points[g], normals[g], quad, surface);
				}
			}
			boolean primary = index == firstOfFace[face.ordinal()];
			Blend blend = config.blendBorders && primary && quadsOnFace[face.ordinal()] == 1
					? Blend.of(cells, level, pos, state, face, own, raw, sprites) : null;

			for (int i = 0; i < divisions; i++) {
				for (int j = 0; j < divisions; j++) {
					int[] g = {i * grid + j, (i + 1) * grid + j, (i + 1) * grid + j + 1, i * grid + j + 1};
					float[][] st = {{(float) i / divisions, (float) j / divisions}, {(float) (i + 1) / divisions, (float) j / divisions},
						{(float) (i + 1) / divisions, (float) (j + 1) / divisions}, {(float) i / divisions, (float) (j + 1) / divisions}};
					float ny = 0;
					for (int v = 0; v < 4; v++) {
						ny += normals[g[v]][1] * 0.25f;
					}
					// A side face the smoothing has turned to face the sky (a grass slope) wears
					// the top's texture, and one turned to face down wears the bottom's: no
					// stripes of dirt across a smoothed hillside.
					if (side && (ny > 0.6f && caps[0] != null || ny < -0.6f && caps[1] != null)) {
						if (primary) {
							emitLayer(emitter, quad, ny > 0 ? caps[0] : caps[1], points, normals, g, st, pos, null, 0);
						}
						continue;
					}
					if (blend == null) {
						emitLayer(emitter, quad, own, points, normals, g, st, pos, null, 0);
						continue;
					}
					// Blended borders: the lowest-ranked type underneath, then each type above
					// it as an overlay where its share reaches; skip layers fully covered.
					int bottom = 0;
					for (int k = blend.looks.length - 1; k > 0; k--) {
						if (blend.min(k, g) >= 0.9f) {
							bottom = k;
							break;
						}
					}
					emitLayer(emitter, quad, blend.looks[bottom], points, normals, g, st, pos, null, 0);
					for (int k = bottom + 1; k < blend.looks.length; k++) {
						if (blend.max(k, g) >= 0.15f) {
							emitLayer(emitter, quad, blend.looks[k], points, normals, g, st, pos, blend.cumulative[k], k - bottom);
						}
					}
				}
			}
		});
		mesh.clear();
		emitShoreWater(emitter, cells, level, pos);
	}

	/**
	 * Draws one layer of a sub-quad. With {@code shares}, it is a blend overlay:
	 * each corner carries the share of this layer's type, and the layer sits a
	 * hair above the ones below it.
	 */
	private static void emitLayer(QuadEmitter emitter, QuadView quad, Look look, float[][] points, float[][] normals, int[] g, float[][] st,
			BlockPos pos, float @Nullable [] shares, int lift) {
		emitter.copyFrom(quad);
		emitter.tintIndex(look.tintIndex);
		float[] p = new float[3];
		for (int v = 0; v < 4; v++) {
			float[] n = normals[g[v]];
			for (int c = 0; c < 3; c++) {
				p[c] = points[g[v]][c] + n[c] * 0.002f * lift;
			}
			float s = st[v][0], t = st[v][1];
			int color = shares == null
					? Materials.withMaterial(look.color(s, t), look.material)
					: Materials.withBlend(look.color(s, t), look.material, shares[g[v]]);
			write(emitter, v, p, n, pos, look.u(s, t), look.v(s, t), color, quad.lightmap(0));
		}
		emitter.shadeMode(ShadeMode.ENHANCED);
		emitter.emit();
	}

	/**
	 * A strip of water surface over a shore block, at the water's height. Where
	 * the smoothed ground dips below the waterline it shows; elsewhere the
	 * ground hides it. So the shoreline follows the curved ground instead of the
	 * edges of the water blocks.
	 */
	private static void emitShoreWater(QuadEmitter emitter, RegionCells cells, BlockAndTintGetter level, BlockPos pos) {
		int x = pos.getX(), y = pos.getY(), z = pos.getZ();
		BlockState above = cells.state(x, y + 1, z);
		if (CellField.solid(cells.cell(x, y + 1, z)) || !above.getFluidState().isEmpty()) {
			return;
		}
		boolean shore = false;
		// Two blocks in from the water: smoothing can lower the ground below the waterline that far.
		for (int dx = -2; dx <= 2 && !shore; dx++) {
			for (int dz = -2; dz <= 2 && !shore; dz++) {
				shore = (dx != 0 || dz != 0) && cells.state(x + dx, y, z + dz).getFluidState().is(FluidTags.WATER);
			}
		}
		if (!shore) {
			return;
		}
		TextureAtlasSprite water = Minecraft.getInstance().getAtlasManager().getAtlasOrThrow(AtlasIds.BLOCKS)
				.getSprite(Identifier.withDefaultNamespace("block/water_still"));
		int color = Materials.withMaterial(0xFF000000 | BiomeColors.getAverageWaterColor(level, pos), Materials.water());
		int light = LightCoordsUtil.getLightCoords(level, pos.above());
		float h = 8f / 9f - 0.002f;
		float[][] corners = {{0, h, 0}, {0, h, 1}, {1, h, 1}, {1, h, 0}};
		for (int v = 0; v < 4; v++) {
			emitter.pos(v, corners[v][0], corners[v][1], corners[v][2]);
			emitter.uv(v, water.getU(corners[v][0]), water.getV(corners[v][2]));
			emitter.color(v, color);
			emitter.lightmap(v, light);
			emitter.normal(v, 0f, 1f, 0f);
		}
		emitter.nominalFace(Direction.UP);
		emitter.atlas(QuadAtlas.BLOCK);
		emitter.chunkLayer(ChunkSectionLayer.TRANSLUCENT);
		emitter.animated(true);
		emitter.ambientOcclusion(TriState.FALSE);
		emitter.emit();
	}

	/** The surface types around one face, ready to draw in layers. */
	private static final class Blend {
		final Look[] looks;
		/** Per layer, per grid point: the share of this layer's type and every layer above it. */
		final float[][] cumulative;

		private Blend(Look[] looks, float[][] cumulative) {
			this.looks = looks;
			this.cumulative = cumulative;
		}

		float min(int layer, int[] g) {
			float m = 1;
			for (int i : g) {
				m = Math.min(m, cumulative[layer][i]);
			}
			return m;
		}

		float max(int layer, int[] g) {
			float m = 0;
			for (int i : g) {
				m = Math.max(m, cumulative[layer][i]);
			}
			return m;
		}

		static @Nullable Blend of(RegionCells cells, BlockAndTintGetter level, BlockPos pos, BlockState own, Direction face, Look ownLook,
				float[][] raw, @Nullable SpriteFinder sprites) {
			if (!ownLook.blendable()) {
				return null;
			}
			int axis = face.getAxis().ordinal();
			int layer = axis == 0 ? pos.getX() : axis == 1 ? pos.getY() : pos.getZ();
			int dx = face.getStepX(), dy = face.getStepY(), dz = face.getStepZ();
			FaceBlend.Surface surface = (x, y, z) -> cells.kind(x, y, z) == CellField.SMOOTH && !CellField.solid(cells.cell(x + dx, y + dy, z + dz))
					? Block.BLOCK_STATE_REGISTRY.getId(cells.state(x, y, z)) : -1;

			int points = raw.length;
			int[] allTypes = new int[8];
			int typeCount = 0;
			int[][] types = new int[points][8];
			float[][] weights = new float[points][8];
			int[] counts = new int[points];
			for (int g = 0; g < points; g++) {
				float a = raw[g][(axis + 1) % 3], b = raw[g][(axis + 2) % 3];
				counts[g] = FaceBlend.weigh(surface, axis, layer, a, b, types[g], weights[g]);
				for (int k = 0; k < counts[g]; k++) {
					int type = types[g][k];
					boolean seen = false;
					for (int m = 0; m < typeCount; m++) {
						seen |= allTypes[m] == type;
					}
					if (!seen && typeCount < allTypes.length) {
						allTypes[typeCount++] = type;
					}
				}
			}
			if (typeCount <= 1) {
				return null;
			}
			// Keep the types that can be drawn as a plain opaque face, lowest state id first.
			int ownId = Block.BLOCK_STATE_REGISTRY.getId(own);
			int[] sorted = java.util.Arrays.copyOf(allTypes, typeCount);
			java.util.Arrays.sort(sorted);
			List<Look> looks = new ArrayList<>();
			List<Integer> kept = new ArrayList<>();
			for (int type : sorted) {
				Look look = type == ownId ? ownLook : Looks.tinted(Block.BLOCK_STATE_REGISTRY.byId(type), face, level, pos, sprites);
				if (look != null && look.blendable()) {
					looks.add(look);
					kept.add(type);
				}
			}
			if (looks.size() <= 1 || !kept.contains(ownId)) {
				return null;
			}
			float[][] cumulative = new float[looks.size()][points];
			for (int g = 0; g < points; g++) {
				float total = 0;
				float[] share = new float[looks.size()];
				for (int k = 0; k < counts[g]; k++) {
					int at = kept.indexOf(types[g][k]);
					if (at >= 0) {
						share[at] += weights[g][k];
						total += weights[g][k];
					}
				}
				float above = 0;
				for (int k = looks.size() - 1; k >= 0; k--) {
					above += total > 0 ? share[k] / total : 0;
					cumulative[k][g] = above;
				}
			}
			return new Blend(looks.toArray(new Look[0]), cumulative);
		}
	}

	/** How a face is painted: texture coordinates, colours and tint at its corners, its material and render layer. */
	record Look(float[] us, float[] vs, int[] colors, int tintIndex, int material, ChunkSectionLayer layer) {
		static Look of(QuadView quad, int material) {
			float[] us = new float[4], vs = new float[4];
			int[] colors = new int[4];
			for (int v = 0; v < 4; v++) {
				us[v] = quad.u(v);
				vs[v] = quad.v(v);
				colors[v] = quad.color(v);
			}
			return new Look(us, vs, colors, quad.tintIndex(), material, quad.chunkLayer());
		}

		/** Only plain opaque faces take part in border blending (not leaves, glass or overlays). */
		boolean blendable() {
			return layer == ChunkSectionLayer.SOLID;
		}

		/** The same look with a tint colour already applied, for drawing on a block of another kind. */
		Look withTint(int tint) {
			int[] tinted = new int[4];
			for (int v = 0; v < 4; v++) {
				tinted[v] = ARGB.multiply(colors[v], 0xFF000000 | tint);
			}
			return new Look(us, vs, tinted, -1, material, layer);
		}

		float u(float s, float t) {
			return bilinear(us, s, t);
		}

		float v(float s, float t) {
			return bilinear(vs, s, t);
		}

		int color(float s, float t) {
			return ARGB.srgbLerp(t, ARGB.srgbLerp(s, colors[0], colors[1]), ARGB.srgbLerp(s, colors[3], colors[2]));
		}

		private static float bilinear(float[] c, float s, float t) {
			return c[0] * (1 - s) * (1 - t) + c[1] * s * (1 - t) + c[2] * s * t + c[3] * (1 - s) * t;
		}
	}

	/** The point (s, t) of a face, in world coordinates. */
	private static void bilinearPos(QuadView quad, float s, float t, BlockPos pos, float[] out) {
		float w0 = (1 - s) * (1 - t), w1 = s * (1 - t), w2 = s * t, w3 = (1 - s) * t;
		out[0] = pos.getX() + quad.x(0) * w0 + quad.x(1) * w1 + quad.x(2) * w2 + quad.x(3) * w3;
		out[1] = pos.getY() + quad.y(0) * w0 + quad.y(1) * w1 + quad.y(2) * w2 + quad.y(3) * w3;
		out[2] = pos.getZ() + quad.z(0) * w0 + quad.z(1) * w1 + quad.z(2) * w2 + quad.z(3) * w3;
	}

	private static void write(MutableQuadView out, int v, float[] p, float[] n, BlockPos pos, float u, float tv, int color, int light) {
		out.pos(v, p[0] - pos.getX(), p[1] - pos.getY(), p[2] - pos.getZ());
		out.normal(v, n[0], n[1], n[2]);
		out.uv(v, u, tv);
		out.color(v, color);
		out.lightmap(v, light);
	}

	/** Moves a point onto the smooth surface and finds its normal there (the face's, where the field is flat). */
	private static void place(float[] p, float[] n, QuadView quad, SmoothSurface surface) {
		surface.project(p);
		if (!surface.normal(p[0], p[1], p[2], n)) {
			n[0] = quad.faceNormal().x();
			n[1] = quad.faceNormal().y();
			n[2] = quad.faceNormal().z();
		}
	}

	/** True for a quad covering a whole side of the block: those are the ones that get cut into a grid. */
	static boolean isFullFace(QuadView quad) {
		Direction face = quad.nominalFace();
		if (face == null) {
			return false;
		}
		int axis = face.getAxis().ordinal();
		float plane = face.getAxisDirection() == Direction.AxisDirection.POSITIVE ? 1f : 0f;
		for (int v = 0; v < 4; v++) {
			if (Math.abs(quad.posByIndex(v, axis) - plane) > 1e-4f) {
				return false;
			}
		}
		int a = (axis + 1) % 3, b = (axis + 2) % 3;
		float minA = 1, maxA = 0, minB = 1, maxB = 0;
		for (int v = 0; v < 4; v++) {
			minA = Math.min(minA, quad.posByIndex(v, a));
			maxA = Math.max(maxA, quad.posByIndex(v, a));
			minB = Math.min(minB, quad.posByIndex(v, b));
			maxB = Math.max(maxB, quad.posByIndex(v, b));
		}
		return (maxA - minA) * (maxB - minB) > 0.999f;
	}

	/** How far the smoothed ground under a plant moved: the plant moves with it. */
	private static float @Nullable [] groundOffset(BlockAndTintGetter level, BlockPos pos, SmoothConfig config) {
		RegionCells cells = RegionCells.of(level, pos);
		int y = pos.getY();
		for (int i = 0; i < 4 && cells.kind(pos.getX(), y - 1, pos.getZ()) == BlockRules.FOLLOW; i++) {
			y--;
		}
		if (cells.cell(pos.getX(), y - 1, pos.getZ()) != CellField.SMOOTH) {
			return null;
		}
		float[] p = {pos.getX() + 0.5f, y, pos.getZ() + 0.5f};
		new SmoothSurface(cells, config.terrainStrength).project(p);
		float dx = p[0] - (pos.getX() + 0.5f), dy = p[1] - y, dz = p[2] - (pos.getZ() + 0.5f);
		return Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < 1e-4f ? null : new float[] {dx, dy, dz};
	}

	private static void tagMaterial(MutableQuadView quad, SpriteFinder sprites) {
		int material = material(quad, sprites);
		for (int v = 0; v < 4; v++) {
			quad.color(v, Materials.withMaterial(quad.color(v), material));
		}
	}

	static int material(QuadView quad, @Nullable SpriteFinder sprites) {
		if (sprites == null || quad.atlas() != QuadAtlas.BLOCK) {
			return 0;
		}
		TextureAtlasSprite sprite = sprites.find(quad);
		return sprite == null ? 0 : Materials.of(sprite);
	}

	private static @Nullable SpriteFinder spriteFinder() {
		try {
			return ((FabricTextureAtlas) Minecraft.getInstance().getAtlasManager().getAtlasOrThrow(AtlasIds.BLOCKS)).spriteFinder();
		} catch (RuntimeException e) {
			return null;
		}
	}
}
