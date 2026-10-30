package net.hoai2k.smoothcraft.geom;

/**
 * Turns the voxel grid into a continuous surface.
 *
 * <p>The occupancy of the cells, sampled at their centres, is blended into a
 * density field: part trilinear (tight, so a lone block survives as a lump),
 * part cubic B-spline (wide, so a staircase of one-block steps becomes a
 * slope). A point on a cube face is moved onto the field's half-density level
 * set with a few Newton steps, and its normal is taken from the gradient of the
 * cubic part, which is smooth everywhere. Both are functions of position alone, so
 * the faces of neighbouring blocks that share a corner move that corner to the
 * same place and the mesh stays closed. Flat ground, walls and one-block-thick
 * features keep their faces where they were; edges and corners round off; a
 * lone block becomes a rounded lump. Points touching a {@link CellField#HARD}
 * cell are pinned, so terrain meets buildings without gaps.
 */
public final class SmoothSurface {
	private static final int ITERATIONS = 4;
	private static final float MAX_STEP = 0.35f;
	private static final float MAX_OFFSET = 0.6f;
	/** Share of the wide cubic field in the density; the rest is trilinear. */
	private static final float WIDE = 0.6f;

	private final CellField field;
	private final float strength;

	/** @param strength 0 keeps the cubes, 1 is the full smooth surface. */
	public SmoothSurface(CellField field, float strength) {
		this.field = field;
		this.strength = strength;
	}

	/** True when any of the eight cells around the point is HARD. */
	public boolean pinned(float x, float y, float z) {
		int x0 = floor(x - 0.5f), y0 = floor(y - 0.5f), z0 = floor(z - 0.5f);
		for (int dx = 0; dx <= 1; dx++) {
			for (int dy = 0; dy <= 1; dy++) {
				for (int dz = 0; dz <= 1; dz++) {
					if (field.cell(x0 + dx, y0 + dy, z0 + dz) == CellField.HARD) {
						return true;
					}
				}
			}
		}
		return false;
	}

	/**
	 * Moves a point of the voxel surface onto the smooth surface.
	 *
	 * @param p the point, in world block coordinates; overwritten with the result
	 */
	public void project(float[] p) {
		if (strength <= 0f || pinned(p[0], p[1], p[2])) {
			return;
		}
		float sx = p[0], sy = p[1], sz = p[2];
		float x = sx, y = sy, z = sz;
		float[] g = new float[3];
		for (int i = 0; i < ITERATIONS; i++) {
			float f = density(x, y, z, g) - 0.5f;
			float g2 = g[0] * g[0] + g[1] * g[1] + g[2] * g[2];
			if (Math.abs(f) < 1e-3f || g2 < 1e-6f) {
				break;
			}
			float sxStep = -f * g[0] / g2, syStep = -f * g[1] / g2, szStep = -f * g[2] / g2;
			float len = (float) Math.sqrt(sxStep * sxStep + syStep * syStep + szStep * szStep);
			if (len > MAX_STEP) {
				float k = MAX_STEP / len;
				sxStep *= k;
				syStep *= k;
				szStep *= k;
			}
			x += sxStep;
			y += syStep;
			z += szStep;
		}
		float dx = (x - sx) * strength, dy = (y - sy) * strength, dz = (z - sz) * strength;
		float len = (float) Math.sqrt(dx * dx + dy * dy + dz * dz);
		if (len > MAX_OFFSET) {
			float k = MAX_OFFSET / len;
			dx *= k;
			dy *= k;
			dz *= k;
		}
		p[0] = sx + dx;
		p[1] = sy + dy;
		p[2] = sz + dz;
	}

	/**
	 * The outward surface normal at a point, from the gradient of the cubic
	 * B-spline density. Leaves {@code n} untouched and returns false where the
	 * field is flat, so the caller keeps the face normal.
	 */
	public boolean normal(float x, float y, float z, float[] n) {
		float[] g = new float[3];
		cubic(x, y, z, g);
		float len = (float) Math.sqrt(g[0] * g[0] + g[1] * g[1] + g[2] * g[2]);
		if (len < 1e-4f) {
			return false;
		}
		n[0] = -g[0] / len;
		n[1] = -g[1] / len;
		n[2] = -g[2] / len;
		return true;
	}

	/** The blended density; writes its gradient to {@code g}. */
	float density(float x, float y, float z, float[] g) {
		float[] gc = new float[3];
		float tri = trilinear(x, y, z, g);
		float wide = cubic(x, y, z, gc);
		for (int i = 0; i < 3; i++) {
			g[i] = g[i] * (1 - WIDE) + gc[i] * WIDE;
		}
		return tri * (1 - WIDE) + wide * WIDE;
	}

	/** Density by cubic B-spline over the 4x4x4 nearest cells; writes its gradient to {@code g}. */
	float cubic(float x, float y, float z, float[] g) {
		float[] wx = new float[4], wy = new float[4], wz = new float[4];
		float[] dwx = new float[4], dwy = new float[4], dwz = new float[4];
		int ix = cubicWeights(x, wx, dwx), iy = cubicWeights(y, wy, dwy), iz = cubicWeights(z, wz, dwz);
		float rho = 0, gx = 0, gy = 0, gz = 0;
		for (int a = 0; a < 4; a++) {
			for (int b = 0; b < 4; b++) {
				for (int c = 0; c < 4; c++) {
					if (CellField.solid(field.cell(ix + a, iy + b, iz + c))) {
						rho += wx[a] * wy[b] * wz[c];
						gx += dwx[a] * wy[b] * wz[c];
						gy += wx[a] * dwy[b] * wz[c];
						gz += wx[a] * wy[b] * dwz[c];
					}
				}
			}
		}
		g[0] = gx;
		g[1] = gy;
		g[2] = gz;
		return rho;
	}

	/** Density by trilinear blending of the eight nearest cell centres; writes its gradient to {@code g}. */
	float trilinear(float x, float y, float z, float[] g) {
		float ux = x - 0.5f, uy = y - 0.5f, uz = z - 0.5f;
		int x0 = floor(ux), y0 = floor(uy), z0 = floor(uz);
		float tx = ux - x0, ty = uy - y0, tz = uz - z0;
		float rho = 0, gx = 0, gy = 0, gz = 0;
		for (int dx = 0; dx <= 1; dx++) {
			float wx = dx == 0 ? 1 - tx : tx, dwx = dx == 0 ? -1 : 1;
			for (int dy = 0; dy <= 1; dy++) {
				float wy = dy == 0 ? 1 - ty : ty, dwy = dy == 0 ? -1 : 1;
				for (int dz = 0; dz <= 1; dz++) {
					if (!CellField.solid(field.cell(x0 + dx, y0 + dy, z0 + dz))) {
						continue;
					}
					float wz = dz == 0 ? 1 - tz : tz, dwz = dz == 0 ? -1 : 1;
					rho += wx * wy * wz;
					gx += dwx * wy * wz;
					gy += wx * dwy * wz;
					gz += wx * wy * dwz;
				}
			}
		}
		g[0] = gx;
		g[1] = gy;
		g[2] = gz;
		return rho;
	}

	/** Uniform cubic B-spline weights over cells i .. i+3 (returns i) and their derivatives. */
	private static int cubicWeights(float x, float[] w, float[] dw) {
		float u = x - 0.5f;
		int i = floor(u);
		float t = u - i, s = 1 - t, t2 = t * t, t3 = t2 * t;
		w[0] = s * s * s / 6f;
		w[1] = (3 * t3 - 6 * t2 + 4) / 6f;
		w[2] = (-3 * t3 + 3 * t2 + 3 * t + 1) / 6f;
		w[3] = t3 / 6f;
		dw[0] = -s * s / 2f;
		dw[1] = (3 * t2 - 4 * t) / 2f;
		dw[2] = (-3 * t2 + 2 * t + 1) / 2f;
		dw[3] = t2 / 2f;
		return i - 1;
	}

	private static int floor(float v) {
		int i = (int) v;
		return v < i ? i - 1 : i;
	}
}
