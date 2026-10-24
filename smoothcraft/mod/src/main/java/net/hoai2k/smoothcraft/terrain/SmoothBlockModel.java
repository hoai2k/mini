package net.hoai2k.smoothcraft.terrain;

import java.util.function.Predicate;
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
import net.hoai2k.smoothcraft.geom.SmoothSurface;
import net.hoai2k.smoothcraft.material.Materials;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.block.BlockAndTintGetter;
import net.minecraft.client.renderer.block.dispatch.BlockStateModel;
import net.minecraft.client.renderer.chunk.RenderSectionRegion;
import net.minecraft.client.renderer.texture.TextureAtlasSprite;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.data.AtlasIds;
import net.minecraft.util.ARGB;
import net.minecraft.util.RandomSource;
import net.minecraft.world.level.block.state.BlockState;
import org.jspecify.annotations.Nullable;

/**
 * Wraps every block model. While a chunk section is meshed it
 * <ul>
 * <li>tags each quad with its surface material (from the texture name),</li>
 * <li>for natural terrain, cuts each face into a grid and moves every point
 *     onto the smooth surface, with smooth per-vertex normals, and</li>
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
		int[] counter = {0};
		mesh.forEach(quad -> {
			int index = counter[0]++;
			if (isFullFace(quad)) {
				Direction face = quad.nominalFace();
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
		float[][] corners = new float[4][3];
		float[][] normals = new float[4][3];
		float[][] st = new float[4][2];
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
					place(corners[v], normals[v], quad, surface);
					write(emitter, v, corners[v], normals[v], pos, quad.u(v), quad.v(v), Materials.withMaterial(quad.color(v), own.material), quad.lightmap(v));
				}
				emitter.shadeMode(ShadeMode.ENHANCED);
				emitter.emit();
				return;
			}
			Direction face = quad.nominalFace();
			boolean side = face.getAxis().isHorizontal();
			for (int i = 0; i < divisions; i++) {
				for (int j = 0; j < divisions; j++) {
					float s0 = (float) i / divisions, s1 = (float) (i + 1) / divisions;
					float t0 = (float) j / divisions, t1 = (float) (j + 1) / divisions;
					float[][] params = {{s0, t0}, {s1, t0}, {s1, t1}, {s0, t1}};
					float ny = 0;
					for (int v = 0; v < 4; v++) {
						st[v][0] = params[v][0];
						st[v][1] = params[v][1];
						bilinearPos(quad, st[v][0], st[v][1], pos, corners[v]);
						place(corners[v], normals[v], quad, surface);
						ny += normals[v][1] * 0.25f;
					}
					// A side face the smoothing has turned to face the sky (a grass slope) wears
					// the top's texture, and one turned to face down wears the bottom's: no
					// stripes of dirt across a smoothed hillside.
					Look look = own;
					if (side && (ny > 0.6f && caps[0] != null || ny < -0.6f && caps[1] != null)) {
						if (index != firstOfFace[face.ordinal()]) {
							continue;
						}
						look = ny > 0 ? caps[0] : caps[1];
					}
					emitter.copyFrom(quad);
					emitter.tintIndex(look.tintIndex);
					for (int v = 0; v < 4; v++) {
						write(emitter, v, corners[v], normals[v], pos, look.u(st[v][0], st[v][1]), look.v(st[v][0], st[v][1]),
								Materials.withMaterial(look.color(st[v][0], st[v][1]), look.material), quad.lightmap(0));
					}
					emitter.shadeMode(ShadeMode.ENHANCED);
					emitter.emit();
				}
			}
		});
		mesh.clear();
	}

	/** How a face is painted: texture coordinates, colours and tint at its corners, and its material. */
	private record Look(float[] us, float[] vs, int[] colors, int tintIndex, int material) {
		static Look of(QuadView quad, int material) {
			float[] us = new float[4], vs = new float[4];
			int[] colors = new int[4];
			for (int v = 0; v < 4; v++) {
				us[v] = quad.u(v);
				vs[v] = quad.v(v);
				colors[v] = quad.color(v);
			}
			return new Look(us, vs, colors, quad.tintIndex(), material);
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
	private static boolean isFullFace(QuadView quad) {
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

	private static int material(QuadView quad, SpriteFinder sprites) {
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
